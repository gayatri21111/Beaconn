# from app.firebase.firebase import root_ref   # <-- This initializes Firebase
# from firebase_admin import db


# def save_victim(victim_data):
#     victim_id = victim_data["victimId"]

#     db.reference(f"victims/{victim_id}").set(victim_data)


# def update_victim_location(victim_id, latitude, longitude):

#     db.reference(f"victims/{victim_id}").update({
#         "latitude": latitude,
#         "longitude": longitude
#     })


# def delete_victim(victim_id):

#     db.reference(f"victims/{victim_id}").delete()

from firebase_admin import db


# ==========================
# VICTIM
# ==========================

def save_victim(victim_data):

    victim_id = victim_data["victimId"]

    db.reference(f"victims/{victim_id}").set(victim_data)


def update_victim_location(victim_id, latitude, longitude):

    db.reference(f"victims/{victim_id}").update({
        "latitude": latitude,
        "longitude": longitude
    })


def delete_victim(victim_id):

    db.reference(f"victims/{victim_id}").delete()


# ==========================
# VOLUNTEER
# ==========================

def save_volunteer(volunteer_data):

    volunteer_id = volunteer_data["volunteerId"]

    db.reference(f"volunteers/{volunteer_id}").set(volunteer_data)


def update_volunteer_location(volunteer_id, latitude, longitude):

    db.reference(f"volunteers/{volunteer_id}").update({
        "latitude": latitude,
        "longitude": longitude
    })


def delete_volunteer(volunteer_id):

    db.reference(f"volunteers/{volunteer_id}").delete()