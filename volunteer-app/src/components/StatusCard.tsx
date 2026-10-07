import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

type Props = {
  title: string;
  value: string;
};

export default function StatusCard({ title, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    marginHorizontal: 5,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  value: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
  },

  title: {
    marginTop: 6,
    color: Colors.subtitle,
    fontSize: 14,
  },
});
