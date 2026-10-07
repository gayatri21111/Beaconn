import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import Colors from "../constants/Colors";

type Props = {
  victimId: string;
  onAccept: () => void;
};

export default function MissionCard({ victimId, onAccept }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🚨 Rescue Mission</Text>

      <Text style={styles.id}>Victim ID : {victimId}</Text>

      <Text style={styles.subtitle}>Emergency assistance required.</Text>

      <TouchableOpacity style={styles.button} onPress={onAccept}>
        <Text style={styles.buttonText}>Accept Mission</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.danger,
  },

  id: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },

  subtitle: {
    marginTop: 8,
    color: Colors.subtitle,
    fontSize: 15,
  },

  button: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});



