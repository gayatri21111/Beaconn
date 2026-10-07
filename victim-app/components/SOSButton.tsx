

import React, { useEffect, useRef } from "react";
import { Animated, TouchableOpacity, StyleSheet, Text } from "react-native";

type Props = {
  onPress: () => void;
};

export default function SOSButton({ onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.06,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ring, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: ring.interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 0],
            }),
            transform: [
              {
                scale: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.35],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text style={styles.text}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#EF4444",
  },
  button: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "#FEE2E2",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 46,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
