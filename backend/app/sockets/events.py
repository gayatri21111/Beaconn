
from app.firebase.firebase_service import (
    save_victim,
    update_victim_location,
    delete_victim,
    save_volunteer,
    update_volunteer_location,
    delete_volunteer,
)

from app.socket_manager import sio
from app.services.mission_service import victims, missions, volunteers

import math


# =====================================================
# CONNECT
# =====================================================

@sio.event
async def connect(sid, environ):
    print("✅ Connected:", sid)


@sio.event
async def disconnect(sid):
    print("❌ Disconnected:", sid)

    for volunteer_id in list(volunteers.keys()):
        if volunteers[volunteer_id]["sid"] == sid:
            try:
                delete_volunteer(volunteer_id)
            except Exception as e:
                print(f"⚠️ Firebase delete_volunteer failed: {e}")
            del volunteers[volunteer_id]
            print("👨‍🚒 Volunteer removed")

    for victim_id in list(victims.keys()):
        if victims[victim_id]["sid"] == sid:
            try:
                delete_victim(victim_id)
            except Exception as e:
                print(f"⚠️ Firebase delete_victim failed: {e}")
            del victims[victim_id]
            missions.pop(victim_id, None)
            print("🗑 Victim removed")


# =====================================================
# REGISTER VOLUNTEER
# =====================================================

@sio.on("register_volunteer")
async def register_volunteer(sid, data):
    volunteer_id = data["volunteerId"]

    volunteers[volunteer_id] = {
        "sid": sid,
        "name": data["name"],
        "latitude": 0,
        "longitude": 0,
    }

    try:
        save_volunteer({
            "volunteerId": volunteer_id,
            "name": data["name"],
            "latitude": 0,
            "longitude": 0,
            "status": "ONLINE",
        })
    except Exception as e:
        print(f"⚠️ Firebase save_volunteer failed: {e}")

    print("👨‍🚒 Volunteer Registered:", volunteer_id)

    # Send all currently active SOS victims to this newly registered volunteer,
    # so they see active SOS requests even if they connected after
    # the SOS was triggered (Socket.IO does not replay past events)
    for victim in victims.values():
        await sio.emit("new_sos", victim, room=sid)


# =====================================================
# SEND SOS
# =====================================================

@sio.on("send_sos")
async def send_sos(sid, data):
    victim_id = data["victimId"]

    if victim_id in victims:
        print("⚠ SOS already active")
        return

    victims[victim_id] = {
        "sid": sid,
        "victimId": victim_id,
        "latitude": data["latitude"],
        "longitude": data["longitude"],
        "status": "SOS",
        "timestamp": data.get("timestamp"),
    }

    try:
        save_victim({
            "victimId": victim_id,
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "status": "SOS",
            "timestamp": data.get("timestamp"),
        })
    except Exception as e:
        print(f"⚠️ Firebase save_victim failed: {e}")

    await sio.emit("new_sos", victims[victim_id])


# =====================================================
# UPDATE VICTIM LOCATION (real-time, also recalculates distance)
# =====================================================

@sio.on("location_update")
async def location_update(sid, data):
    victim_id = data["victimId"]

    if victim_id not in victims:
        return

    victims[victim_id]["latitude"] = data["latitude"]
    victims[victim_id]["longitude"] = data["longitude"]

    try:
        update_victim_location(victim_id, data["latitude"], data["longitude"])
    except Exception as e:
        print(f"⚠️ Firebase update_victim_location failed: {e}")

    await sio.emit("victim_location", victims[victim_id])

    # if a mission is active, recompute distance using the volunteer's
    # last known position, so distance updates even when only the victim moves
    mission = missions.get(victim_id)
    if mission and mission.get("volunteerLat") is not None:
        dist = haversine(
            data["latitude"], data["longitude"],
            mission["volunteerLat"], mission["volunteerLon"],
        )
        await sio.emit(
            "distance_update",
            {
                "victimId": victim_id,
                "distance": round(dist * 1000, 1),
                "eta": estimate_eta_minutes(dist),
            },
            room=mission["volunteerSid"],
        )


# =====================================================
# ACCEPT MISSION
# =====================================================

@sio.on("accept_mission")
async def accept_mission(sid, data):
    victim_id = data["victimId"]

    missions[victim_id] = {
        "volunteerSid": sid,
        "volunteerName": data["volunteerName"],
        "status": "ACCEPTED",
        "indoorSearch": False,
        "victimFound": False,
        "volunteerLat": None,
        "volunteerLon": None,
    }

    victim = victims.get(victim_id)

    if victim:
        await sio.emit(
            "mission_accepted",
            {
                "victimId": victim_id,
                "volunteerName": data["volunteerName"],
                "status": "ACCEPTED",
            },
            room=victim["sid"],
        )


# =====================================================
# CANCEL SOS
# =====================================================

@sio.on("cancel_sos")
async def cancel_sos(sid, data):
    victim_id = data["victimId"]

    mission = missions.get(victim_id)

    victims.pop(victim_id, None)
    missions.pop(victim_id, None)

    try:
        delete_victim(victim_id)
    except Exception as e:
        print(f"⚠️ Firebase delete_victim failed: {e}")

    # notify the assigned volunteer directly (guaranteed delivery)
    if mission:
        await sio.emit(
            "sos_cancelled",
            {"victimId": victim_id},
            room=mission["volunteerSid"],
        )

    # also broadcast so volunteers who haven't accepted yet remove it from their list
    await sio.emit("sos_cancelled", {"victimId": victim_id})

    print("🗑 Victim removed from Firebase")


# =====================================================
# HAVERSINE (returns km)
# =====================================================

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# =====================================================
# ETA (walking speed estimate, ~4.5 km/h = 1.25 m/s)
# =====================================================

def estimate_eta_minutes(distance_km):
    distance_m = distance_km * 1000
    walking_speed_mps = 1.25
    seconds = distance_m / walking_speed_mps
    return round(seconds / 60, 1)


# =====================================================
# VOLUNTEER LOCATION (now stores lat/lon on the mission too)
# =====================================================

# @sio.on("volunteer_location")
# async def volunteer_location(sid, data):
#     victim_id = data["victimId"]

#     volunteer_id = None
#     for v_id, volunteer in volunteers.items():
#         if volunteer["sid"] == sid:
#             volunteer_id = v_id
#             volunteer["latitude"] = data["latitude"]
#             volunteer["longitude"] = data["longitude"]
#             break

#     if volunteer_id:
#         try:
#             update_volunteer_location(volunteer_id, data["latitude"], data["longitude"])
#         except Exception as e:
#             print(f"⚠️ Firebase update_volunteer_location failed: {e}")

#     if victim_id not in victims:
#         return

#     victim = victims[victim_id]

#     dist = haversine(
#         victim["latitude"], victim["longitude"],
#         data["latitude"], data["longitude"],
#     )

#     mission = missions.get(victim_id)

#     if mission:
#         # remember volunteer's position on the mission for location_update to use
#         mission["volunteerLat"] = data["latitude"]
#         mission["volunteerLon"] = data["longitude"]

#         await sio.emit(
#             "distance_update",
#             {
#                 "victimId": victim_id,
#                 "distance": round(dist * 1000, 1),
#                 "eta": estimate_eta_minutes(dist),
#             },
#             room=mission["volunteerSid"],
#         )

@sio.on("volunteer_location")
async def volunteer_location(sid, data):
    victim_id = data["victimId"]

    volunteer_id = None

    for v_id, volunteer in volunteers.items():
        if volunteer["sid"] == sid:
            volunteer_id = v_id
            volunteer["latitude"] = data["latitude"]
            volunteer["longitude"] = data["longitude"]
            break

    if volunteer_id:
        try:
            update_volunteer_location(
                volunteer_id,
                data["latitude"],
                data["longitude"]
            )
        except Exception as e:
            print(f"⚠️ Firebase update_volunteer_location failed: {e}")

    if victim_id not in victims:
        return

    victim = victims[victim_id]
    mission = missions.get(victim_id)

    if not mission:
        return

    # Store volunteer's latest location
    mission["volunteerLat"] = data["latitude"]
    mission["volunteerLon"] = data["longitude"]

    # Send volunteer's REAL-TIME location to victim
    await sio.emit(
        "volunteer_location",
        {
            "victimId": victim_id,
            "latitude": data["latitude"],
            "longitude": data["longitude"],
        },
        room=victim["sid"],
    )

    # Calculate distance
    dist = haversine(
        victim["latitude"],
        victim["longitude"],
        data["latitude"],
        data["longitude"],
    )

    # Send updated distance to volunteer
    await sio.emit(
        "distance_update",
        {
            "victimId": victim_id,
            "distance": round(dist * 1000, 1),
            "eta": estimate_eta_minutes(dist),
        },
        room=mission["volunteerSid"],
    )

# =====================================================
# START INDOOR SEARCH
# =====================================================

@sio.on("start_indoor_search")
async def start_indoor_search(sid, data):
    victim_id = data["victimId"]

    if victim_id not in missions:
        return

    missions[victim_id]["status"] = "INDOOR_SEARCH"
    missions[victim_id]["indoorSearch"] = True

    victim = victims.get(victim_id)

    if victim:
        await sio.emit(
            "indoor_search_started",
            {"victimId": victim_id, "status": "INDOOR_SEARCH"},
            room=victim["sid"],
        )

    await sio.emit(
        "indoor_search_started",
        {"victimId": victim_id, "status": "INDOOR_SEARCH"},
        room=sid,
    )


# =====================================================
# VICTIM FOUND
# =====================================================

@sio.on("victim_found")
async def victim_found(sid, data):
    victim_id = data["victimId"]

    if victim_id not in missions:
        return

    missions[victim_id]["status"] = "COMPLETED"
    missions[victim_id]["victimFound"] = True

    victim = victims.get(victim_id)
    mission = missions.get(victim_id)

    if victim:
        await sio.emit(
            "mission_completed",
            {"victimId": victim_id, "status": "COMPLETED"},
            room=victim["sid"],
        )

    if mission:
        await sio.emit(
            "mission_completed",
            {"victimId": victim_id, "status": "COMPLETED"},
            room=mission["volunteerSid"],
        )


# =====================================================
# BEACON SIGNAL
# =====================================================

@sio.on("beacon_signal")
async def beacon_signal(sid, data):
    await sio.emit(
        "beacon_update",
        {"victimId": data["victimId"], "strength": data["strength"]},
    )