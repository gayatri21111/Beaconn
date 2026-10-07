
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/Navigation";
import { Mission } from "../types/Mission";

import Colors from "../constants/Colors";
import socket from "../services/socket";

import MissionCard from "../components/MissionCard";
import StatusCard from "../components/StatusCard";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export default function VolunteerDashboard({ navigation }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      console.log("✅ Connected:", socket.id);
      socket.emit("register_volunteer", {
        volunteerId: "V101",
        name: "Volunteer 1",
      });
      console.log("👨‍🚒 Volunteer Registered");
    };

    const handleNewSOS = (mission: Mission) => {
      console.log("🚨 NEW_SOS EVENT");
      console.log(mission);

      setMissions((prev) => {
        const exists = prev.find((m) => m.victimId === mission.victimId);
        if (exists) return prev;
        return [...prev, mission];
      });
    };

    // removes the mission from the dashboard the moment the victim cancels
    const handleSOSCancelled = (data: { victimId: string }) => {
      console.log("🗑 SOS Cancelled:", data.victimId);

      setMissions((prev) => prev.filter((m) => m.victimId !== data.victimId));

      // if this volunteer is currently viewing that mission's map/compass screen,
      // send them back to the dashboard
      navigation.popToTop?.();
    };

    // ✅ NEW: removes the mission from the dashboard once "Victim Found" is
    // confirmed and the backend marks the mission COMPLETED. Without this,
    // a completed mission stayed in the list because nothing here was
    // listening for "mission_completed" at all.
    const handleMissionCompleted = (data: { victimId: string }) => {
      console.log("✅ Mission Completed:", data.victimId);

      setMissions((prev) => prev.filter((m) => m.victimId !== data.victimId));
    };

    const handleDisconnect = () => {
      console.log("❌ Volunteer Disconnected");
    };

    const handleError = (err: any) => {
      console.log("❌ Socket Error:", err.message);
    };

    socket.on("connect", handleConnect);
    socket.on("new_sos", handleNewSOS);
    socket.on("sos_cancelled", handleSOSCancelled);
    socket.on("mission_completed", handleMissionCompleted); // ✅ NEW
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_sos", handleNewSOS);
      socket.off("sos_cancelled", handleSOSCancelled);
      socket.off("mission_completed", handleMissionCompleted); // ✅ NEW
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
    };
  }, []);

  const acceptMission = (mission: Mission) => {
    socket.emit("accept_mission", {
      victimId: mission.victimId,
      volunteerName: "Volunteer 1",
    });

    navigation.navigate("MissionMap", {
      victimId: mission.victimId,
      latitude: mission.latitude,
      longitude: mission.longitude,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Rescue control center</Text>
      <Text style={styles.subHeader}>Waiting for emergency requests...</Text>

      <View style={styles.statusRow}>
        <StatusCard title="Active SOS" value={missions.length.toString()} />
        <StatusCard title="Volunteer" value="Online" />
      </View>

      <FlatList
        data={missions}
        keyExtractor={(item) => item.victimId}
        ListEmptyComponent={
          <Text style={styles.empty}>No active rescue missions.</Text>
        }
        renderItem={({ item }) => (
          <MissionCard
            victimId={item.victimId}
            onAccept={() => acceptMission(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  subHeader: {
    marginTop: 6,
    color: Colors.secondaryText,
    fontSize: 15,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  empty: {
    marginTop: 60,
    textAlign: "center",
    color: Colors.secondaryText,
    fontSize: 15,
  },
});
