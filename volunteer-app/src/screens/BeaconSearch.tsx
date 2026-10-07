import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/Navigation";
import socket from "../services/socket";
import { calculateBearing, calculateDistance } from "../utils/locationUtils";
import {
  startProximityListening,
  stopProximityListening,
} from "../services/proximityListener";

type Props = NativeStackScreenProps<RootStackParamList, "BeaconSearch">;

const AUDIO_VERY_CLOSE = -20;
const AUDIO_CLOSE = -35;
const AUDIO_WARM = -50;

// Below this GPS distance, GPS bearing is no longer trustworthy indoors —
// hand off fully to the audio beacon signal instead of rotating the needle
// based on noisy position data.
const GPS_TRUST_THRESHOLD_M = 12;

// Ignore GPS readings worse than this accuracy (meters). Indoors, phones
// commonly report 30-100m+ accuracy due to walls/roof blocking satellites —
// that's normal, not broken. Only reject genuinely unusable fixes.
const MAX_ACCEPTABLE_ACCURACY_M = 100;

// Exponential smoothing factor for position. Lower = smoother but slower
// to react; higher = more responsive but jitterier.
const POSITION_SMOOTHING_ALPHA = 0.35;

export default function BeaconSearch({ route, navigation }: Props) {
  const { victimId, victimLatitude, victimLongitude } = route.params;

  const [heading, setHeading] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [gpsDistance, setGpsDistance] = useState(0);

  const [audioLevel, setAudioLevel] = useState(-160);
  const [audioReady, setAudioReady] = useState(false);

  const [status, setStatus] = useState("Searching victim...");
  const [ringColor, setRingColor] = useState("#F97316");
  const [bearingLocked, setBearingLocked] = useState(false);

  // Smoothed volunteer position (what the UI/bearing math actually uses)
  const [volunteerLocation, setVolunteerLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  // Raw last-known GPS reading, used only to feed the smoothing filter
  const rawVolunteerLocation = useRef({ latitude: 0, longitude: 0 });
  const hasFirstFix = useRef(false);

  
  const [victimLocation, setVictimLocation] = useState({
    latitude: victimLatitude,
    longitude: victimLongitude,
  });

  const compassRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let headingSubscription: Location.LocationHeadingSubscription;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      headingSubscription = await Location.watchHeadingAsync((headingData) => {
        let currentHeading = headingData.trueHeading;
        if (currentHeading < 0) currentHeading = headingData.magHeading;
        setHeading(currentHeading);
      });
    })();

    return () => headingSubscription?.remove();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 0,
          distanceInterval: 0,
        },
        (location) => {
          const lat = location.coords.latitude;
          const lon = location.coords.longitude;
          const accuracy = location.coords.accuracy ?? 999;

          console.log("📍 GPS fix — accuracy:", accuracy.toFixed(1), "m");

          // Drop only genuinely broken fixes — indoors, 30-100m accuracy
          // is expected and should still be used, just smoothed.
          if (accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
            console.log(
              "⚠️ Dropped — accuracy too poor even for indoor tolerance",
            );
            return;
          }

          rawVolunteerLocation.current = { latitude: lat, longitude: lon };

          setVolunteerLocation((prev) => {
            if (!hasFirstFix.current) {
              hasFirstFix.current = true;
              return { latitude: lat, longitude: lon };
            }

            // Exponential moving average smooths out jitter from GPS noise
            // instead of snapping to every raw reading.
            const smoothedLat =
              prev.latitude + POSITION_SMOOTHING_ALPHA * (lat - prev.latitude);
            const smoothedLon =
              prev.longitude +
              POSITION_SMOOTHING_ALPHA * (lon - prev.longitude);

            return { latitude: smoothedLat, longitude: smoothedLon };
          });

          socket.emit("volunteer_location", {
            victimId,
            latitude: lat,
            longitude: lon,
          });
        },
      );
    })();

    return () => locationSubscription?.remove();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const ok = await startProximityListening((db) => {
        if (!mounted) return;
        console.log("🔊 Raw audio level:", db.toFixed(1), "dB");
        setAudioLevel(db);
      });
      if (mounted) setAudioReady(ok);
    })();

    return () => {
      mounted = false;
      stopProximityListening();
    };
  }, []);

  useEffect(() => {
    const handleVictimLocation = (data: {
      victimId: string;
      latitude: number;
      longitude: number;
    }) => {
      if (data.victimId !== victimId) return;
      setVictimLocation({ latitude: data.latitude, longitude: data.longitude });
    };

    socket.on("victim_location", handleVictimLocation);
    return () => {
      socket.off("victim_location", handleVictimLocation);
    };
  }, [victimId]);

  useEffect(() => {
    if (volunteerLocation.latitude === 0) return;

    const currentDistance = calculateDistance(
      volunteerLocation.latitude,
      volunteerLocation.longitude,
      victimLocation.latitude,
      victimLocation.longitude,
    );

    setGpsDistance(currentDistance);

    // Once close enough that GPS error is comparable to (or bigger than)
    // the actual distance, bearing math becomes meaningless noise. Freeze
    // the needle at its last good heading and lean on the audio beacon
    // (color/status/haptics) instead of spinning it around randomly.
    const shouldLockBearing =
      currentDistance <= GPS_TRUST_THRESHOLD_M && audioReady;
    setBearingLocked(shouldLockBearing);

    if (shouldLockBearing) {
      return;
    }

    const victimBearing = calculateBearing(
      volunteerLocation.latitude,
      volunteerLocation.longitude,
      victimLocation.latitude,
      victimLocation.longitude,
    );

    setBearing(victimBearing);

    let rotation = victimBearing - heading;
    if (rotation > 180) rotation -= 360;
    if (rotation < -180) rotation += 360;

    Animated.timing(compassRotation, {
      toValue: rotation,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [volunteerLocation, victimLocation, heading, audioReady]);

  useEffect(() => {
    let intervalTime = 2000;
    let newStatus = "Searching victim...";
    let newColor = "#EF4444";

    if (audioReady) {
      if (audioLevel > AUDIO_VERY_CLOSE) {
        newStatus = "Victim nearby — look around";
        newColor = "#22C55E";
        intervalTime = 200;
      } else if (audioLevel > AUDIO_CLOSE) {
        newStatus = "Very close";
        newColor = "#EAB308";
        intervalTime = 500;
      } else if (audioLevel > AUDIO_WARM) {
        newStatus = "Getting warmer";
        newColor = "#F97316";
        intervalTime = 1000;
      } else {
        newStatus = "Move around — getting colder";
        newColor = "#EF4444";
        intervalTime = 2000;
      }
    } else {
      if (gpsDistance <= 5) {
        newStatus = "Victim nearby — look around";
        newColor = "#22C55E";
        intervalTime = 200;
      } else if (gpsDistance <= 10) {
        newStatus = "Very close";
        newColor = "#EAB308";
        intervalTime = 500;
      } else if (gpsDistance <= 15) {
        newStatus = "Getting closer";
        newColor = "#F97316";
        intervalTime = 1000;
      }
    }

    setStatus(newStatus);
    setRingColor(newColor);

    const interval = setInterval(() => {
      if (newColor === "#22C55E") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (newColor === "#EAB308" || newColor === "#F97316") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [audioLevel, audioReady, gpsDistance]);

  useEffect(() => {
    const handleCompleted = () => {
      alert("Victim rescued successfully");
      navigation.popToTop();
    };

    const handleCancelled = (data: { victimId: string }) => {
      if (data.victimId !== victimId) return;
      alert("This SOS was cancelled by the victim");
      navigation.popToTop();
    };

    socket.on("mission_completed", handleCompleted);
    socket.on("sos_cancelled", handleCancelled);

    return () => {
      socket.off("mission_completed", handleCompleted);
      socket.off("sos_cancelled", handleCancelled);
    };
  }, [victimId]);

  const handleVictimFound = () => {
    socket.emit("victim_found", { victimId });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Rescue compass</Text>
      <Text style={styles.subtitle}>
        {bearingLocked
          ? "You're close — trust the color, not the arrow"
          : "Rotate until the arrow points forward"}
      </Text>

      <View style={[styles.compass, { borderColor: ringColor }]}>
        <Text style={styles.north}>N</Text>

        <Animated.View
          style={[
            styles.needle,
            bearingLocked && styles.needleLocked,
            {
              transform: [
                {
                  rotate: compassRotation.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ["-360deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.arrow, { borderBottomColor: ringColor }]} />
        </Animated.View>

        <View style={styles.center} />
      </View>

      <View style={[styles.statusPill, { backgroundColor: ringColor + "20" }]}>
        <Text style={[styles.statusText, { color: ringColor }]}>{status}</Text>
      </View>

      <Text style={styles.distance}>{gpsDistance.toFixed(1)} m (gps)</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Your heading</Text>
          <Text style={styles.infoValue}>{heading.toFixed(0)}°</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Signal level</Text>
          <Text style={styles.infoValue}>
            {audioReady ? `${audioLevel.toFixed(0)} dB` : "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to navigate</Text>
        <Text style={styles.cardText}>
          {bearingLocked
            ? "GPS isn't precise enough this close indoors. Walk slowly in a small circle and watch the color/status — it gets greener the closer you are to the victim's phone."
            : "Use the arrow for rough direction. As you get within " +
              GPS_TRUST_THRESHOLD_M +
              "m, the arrow will lock and you'll switch to the signal level instead."}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleVictimFound}>
        <Text style={styles.buttonText}>Victim found</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { alignItems: "center", padding: 20, paddingBottom: 48 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
  },
  compass: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  north: {
    position: "absolute",
    top: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
  },
  needle: {
    position: "absolute",
    height: 100,
    width: 22,
    alignItems: "center",
  },
  needleLocked: {
    opacity: 0.3,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 80,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  center: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0F172A",
  },
  statusPill: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: { fontSize: 14, fontWeight: "600" },
  distance: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    width: "100%",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    flex: 1,
  },
  infoLabel: { fontSize: 12, color: "#64748B" },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  card: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  cardText: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  button: {
    marginTop: 22,
    width: "100%",
    height: 52,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
