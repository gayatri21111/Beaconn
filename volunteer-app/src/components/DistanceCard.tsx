import React from "react";
import { View, Text, StyleSheet } from "react-native";

import Colors from "../constants/Colors";

type Props = {
  distance: string;
  eta: string;
};

export default function DistanceCard({ distance, eta }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.item}>
        <Text style={styles.label}>Distance</Text>
        <Text style={styles.value}>{distance}</Text>
      </View>

      <View style={styles.item}>
        <Text style={styles.label}>ETA</Text>
        <Text style={styles.value}>{eta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,

    backgroundColor: "#fff",

    borderRadius: 18,

    flexDirection: "row",

    justifyContent: "space-around",

    paddingVertical: 18,

    elevation: 6,
  },

  item: {
    alignItems: "center",
  },

  label: {
    color: Colors.subtitle,
    fontSize: 14,
  },

  value: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary,
  },
});


