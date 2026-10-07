// import React, { useEffect, useRef, useState } from "react";

// import {
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   View,
//   TouchableOpacity,
// } from "react-native";

// import * as Location from "expo-location";

// import SOSButton from "./components/SOSButton";
// import socket from "./services/socket";
// import BeaconService from "./services/BeaconService";

// export default function App() {
//   const [sosActive, setSOSActive] = useState(false);
//   const [volunteerAssigned, setVolunteerAssigned] = useState(false);
//   const [volunteerName, setVolunteerName] = useState("");
//   const [indoorSearch, setIndoorSearch] = useState(false);
//   const [victimId, setVictimId] = useState("");

//   const locationSubscription = useRef<Location.LocationSubscription | null>(
//     null,
//   );
//   const sosInProgress = useRef(false);

//   useEffect(() => {
//     socket.connect();

//     socket.on("connect", () => {
//       console.log("Connected:", socket.id);
//     });

//     socket.on("mission_accepted", (data) => {
//       console.log("Volunteer Accepted:", data);
//       setVolunteerAssigned(true);
//       setVolunteerName(data.volunteerName || data.name);
//     });

//     socket.on("indoor_search_started", async () => {
//       console.log("Indoor Search Started");
//       setIndoorSearch(true);
//       await BeaconService.startBeacon();
//     });

//     socket.on("mission_completed", () => {
//       console.log("Mission Completed");
//       resetToIdle();
//     });

//     return () => {
//       socket.off("connect");
//       socket.off("mission_accepted");
//       socket.off("indoor_search_started");
//       socket.off("mission_completed");

//       if (locationSubscription.current) {
//         locationSubscription.current.remove();
//         locationSubscription.current = null;
//       }

//       socket.disconnect();
//     };
//   }, []);

//   const startLocationTracking = async (id: string) => {
//     locationSubscription.current = await Location.watchPositionAsync(
//       {
//         accuracy: Location.Accuracy.BestForNavigation,
//         timeInterval: 0,
//         distanceInterval: 0,
//       },
//       (location) => {
//         const latitude = location.coords.latitude;
//         const longitude = location.coords.longitude;

//         console.log("Victim Location:", latitude, longitude);

//         socket.emit("location_update", {
//           victimId: id,
//           latitude,
//           longitude,
//         });
//       },
//     );
//   };

//   const handleSOS = async () => {
//     if (sosInProgress.current) return;

//     sosInProgress.current = true;

//     console.log("🚨 SOS PRESSED");

//     const permission = await Location.requestForegroundPermissionsAsync();

//     if (permission.status !== "granted") {
//       console.log("❌ Location permission denied");
//       sosInProgress.current = false;
//       return;
//     }

//     // Make sure socket is connected
//     if (!socket.connected) {
//       console.log("⏳ Waiting for socket connection...");

//       socket.connect();

//       await new Promise<void>((resolve) => {
//         socket.once("connect", () => {
//           console.log("✅ Socket connected:", socket.id);
//           resolve();
//         });
//       });
//     }

//     const location = await Location.getCurrentPositionAsync({
//       accuracy: Location.Accuracy.BestForNavigation,
//     });

//     const latitude = location.coords.latitude;
//     const longitude = location.coords.longitude;

//     const id = Date.now().toString();

//     setVictimId(id);

//     console.log("📍 SOS Location:", latitude, longitude);
//     console.log("🆔 Victim ID:", id);

//     socket.emit("send_sos", {
//       victimId: id,
//       latitude,
//       longitude,
//       timestamp: Date.now(),
//     });

//     console.log("🚨 send_sos emitted");

//     await startLocationTracking(id);

//     setSOSActive(true);

//     console.log("✅ Mission Started:", id);
//   };

//   const handleCancel = () => {
//     socket.emit("cancel_sos", { victimId });
//     resetToIdle();
//     console.log("SOS Cancelled");
//   };

//   const resetToIdle = () => {
//     if (locationSubscription.current) {
//       locationSubscription.current.remove();
//       locationSubscription.current = null;
//     }

//     setVolunteerAssigned(false);
//     setVolunteerName("");
//     setSOSActive(false);
//     setIndoorSearch(false);
//     setVictimId("");
//     sosInProgress.current = false;

//     BeaconService.stopBeacon();
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {!sosActive ? (
//         <View style={styles.centerContainer}>
//           <Text style={styles.title}>Rescue beacon</Text>
//           <Text style={styles.subtitle}>Need emergency help?</Text>

//           <View style={styles.sosWrapper}>
//             <SOSButton onPress={handleSOS} />
//           </View>

//           <Text style={styles.info}>
//             Tap the SOS button to request emergency assistance.
//           </Text>
//         </View>
//       ) : (
//         <View style={styles.centerContainer}>
//           <Text style={styles.activeTitle}>Help is on the way</Text>

//           <Text style={styles.successText}>
//             Your SOS request has been sent.
//           </Text>

//           <View style={styles.successCircle}>
//             <Text style={styles.checkMark}>✓</Text>
//           </View>

//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>SOS active</Text>
//             <Text style={styles.cardSubtitle}>
//               Emergency request is active.
//             </Text>
//             <Text style={styles.cardSubtitle}>
//               Volunteers are being notified.
//             </Text>

//             <View style={styles.divider} />

//             <Text style={styles.locationText}>
//               Your location is being shared live
//             </Text>

//             {volunteerAssigned && (
//               <Text style={[styles.locationText, styles.volunteerText]}>
//                 {volunteerName} is coming to help you
//               </Text>
//             )}

//             {indoorSearch && (
//               <Text
//                 style={[
//                   styles.locationText,
//                   { marginTop: 10, color: "#2563EB", fontWeight: "700" },
//                 ]}
//               >
//                 Indoor search started
//               </Text>
//             )}
//           </View>

//           <View style={styles.infoCard}>
//             <Text style={styles.infoTitle}>Stay where you are if possible</Text>
//             <Text style={styles.infoSubtitle}>
//               Help is on the way to your location. Do not move unless necessary.
//             </Text>
//           </View>

//           <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
//             <Text style={styles.cancelText}>Cancel request</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#FFFFFF" },
//   centerContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 24,
//   },
//   title: { fontSize: 34, fontWeight: "700", color: "#0F172A" },
//   subtitle: { marginTop: 10, fontSize: 17, color: "#64748B" },
//   sosWrapper: { marginVertical: 50 },
//   info: { fontSize: 15, textAlign: "center", color: "#64748B" },
//   activeTitle: {
//     fontSize: 30,
//     fontWeight: "700",
//     color: "#0F172A",
//     textAlign: "center",
//   },
//   successText: {
//     fontSize: 15,
//     color: "#64748B",
//     textAlign: "center",
//     marginTop: 10,
//     marginBottom: 25,
//   },
//   successCircle: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     backgroundColor: "#ECFDF5",
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 6,
//     borderColor: "#D1FAE5",
//     marginBottom: 30,
//   },
//   checkMark: { fontSize: 64, color: "#22C55E", fontWeight: "bold" },
//   card: {
//     width: "100%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     marginBottom: 16,
//   },
//   cardTitle: { fontSize: 18, fontWeight: "700", color: "#EF4444" },
//   cardSubtitle: { marginTop: 5, fontSize: 14, color: "#64748B" },
//   divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
//   locationText: { fontSize: 14, color: "#475569" },
//   volunteerText: { marginTop: 12, color: "#16A34A", fontWeight: "600" },
//   infoCard: {
//     width: "100%",
//     backgroundColor: "#F8FAFC",
//     borderRadius: 16,
//     padding: 16,
//     marginBottom: 20,
//   },
//   infoTitle: { fontSize: 15, fontWeight: "600", color: "#2563EB" },
//   infoSubtitle: {
//     marginTop: 6,
//     fontSize: 13,
//     color: "#64748B",
//     lineHeight: 19,
//   },
//   cancelButton: {
//     width: "100%",
//     height: 54,
//     backgroundColor: "#EF4444",
//     borderRadius: 14,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   cancelText: { color: "#fff", fontSize: 16, fontWeight: "700" },
// });

import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Location from "expo-location";

import SOSButton from "./components/SOSButton";
import socket from "./services/socket";
import BeaconService from "./services/BeaconService";

export default function App() {
  const [sosActive, setSOSActive] = useState(false);
  const [volunteerAssigned, setVolunteerAssigned] = useState(false);
  const [volunteerName, setVolunteerName] = useState("");
  const [indoorSearch, setIndoorSearch] = useState(false);
  const [victimId, setVictimId] = useState("");

  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  const sosInProgress = useRef(false);

  // =========================================================
  // SOCKET CONNECTION + LISTENERS
  // =========================================================

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      console.log("✅ Victim socket connected:", socket.id);
    };

    const handleConnectError = (error: any) => {
      console.log("❌ Socket connection error:", error?.message || error);
    };

    const handleMissionAccepted = (data: any) => {
      console.log("🚑 Volunteer Accepted:", data);

      setVolunteerAssigned(true);
      setVolunteerName(data.volunteerName || data.name || "Volunteer");
    };

    const handleIndoorSearchStarted = async () => {
      console.log("🔊 Indoor Search Started");

      setIndoorSearch(true);

      // Start audio beacon ONLY when volunteer starts indoor search
      await BeaconService.startBeacon();
    };

    const handleMissionCompleted = () => {
      console.log("✅ Mission Completed");
      resetToIdle();
    };

    const handleSOSCancelled = (data: any) => {
      console.log("SOS Cancelled:", data);

      if (data?.victimId === victimId) {
        resetToIdle();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("mission_accepted", handleMissionAccepted);
    socket.on("indoor_search_started", handleIndoorSearchStarted);
    socket.on("mission_completed", handleMissionCompleted);
    socket.on("sos_cancelled", handleSOSCancelled);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("mission_accepted", handleMissionAccepted);
      socket.off("indoor_search_started", handleIndoorSearchStarted);
      socket.off("mission_completed", handleMissionCompleted);
      socket.off("sos_cancelled", handleSOSCancelled);

      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      BeaconService.stopBeacon();
    };
  }, [victimId]);

  // =========================================================
  // WAIT FOR SOCKET CONNECTION
  // =========================================================

  const waitForSocketConnection = async () => {
    if (socket.connected) {
      console.log("✅ Socket already connected:", socket.id);
      return true;
    }

    console.log("⏳ Connecting victim socket...");

    socket.connect();

    return new Promise<boolean>((resolve) => {
      let finished = false;

      const cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      };

      const finish = (result: boolean) => {
        if (finished) return;

        finished = true;
        cleanup();
        resolve(result);
      };

      const onConnect = () => {
        console.log("✅ Socket connected:", socket.id);
        finish(true);
      };

      const onError = (error: any) => {
        console.log("❌ Socket connection failed:", error?.message || error);

        finish(false);
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);

      // Do not wait forever
      setTimeout(() => {
        if (!socket.connected) {
          console.log("❌ Socket connection timeout");
          finish(false);
        }
      }, 10000);
    });
  };

  // =========================================================
  // START LIVE LOCATION TRACKING
  // =========================================================

  const startLocationTracking = async (id: string) => {
    try {
      // Remove old watcher if one exists
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (location) => {
          const latitude = location.coords.latitude;
          const longitude = location.coords.longitude;

          console.log("📍 Victim live location:", latitude, longitude);

          if (!socket.connected) {
            console.log("⚠️ Socket disconnected. Reconnecting...");
            socket.connect();
            return;
          }

          socket.emit("location_update", {
            victimId: id,
            latitude,
            longitude,
          });
        },
      );

      console.log("✅ Live location tracking started");
    } catch (error) {
      console.log("❌ Location tracking failed:", error);
    }
  };

  // =========================================================
  // SOS BUTTON
  // =========================================================

  const handleSOS = async () => {
    if (sosInProgress.current) {
      console.log("⚠️ SOS already in progress");
      return;
    }

    sosInProgress.current = true;

    try {
      console.log("🚨 SOS PRESSED");

      // -----------------------------------------------------
      // 1. REQUEST LOCATION PERMISSION
      // -----------------------------------------------------

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        console.log("❌ Location permission denied");

        Alert.alert(
          "Location Required",
          "Please allow location permission to send an SOS.",
        );

        sosInProgress.current = false;
        return;
      }

      console.log("✅ Location permission granted");

      // -----------------------------------------------------
      // 2. GET CURRENT LOCATION
      // -----------------------------------------------------

      console.log("📍 Getting current location...");

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      console.log("📍 SOS Location:", latitude, longitude);

      // -----------------------------------------------------
      // 3. CONNECT SOCKET
      // -----------------------------------------------------

      const connected = await waitForSocketConnection();

      if (!connected) {
        console.log("❌ Could not connect to RescueBeacon server");

        Alert.alert(
          "Connection Error",
          "Unable to connect to the rescue server. Please try again.",
        );

        sosInProgress.current = false;
        return;
      }

      // -----------------------------------------------------
      // 4. CREATE VICTIM ID
      // -----------------------------------------------------

      const id = Date.now().toString();

      setVictimId(id);

      console.log("🆔 Victim ID:", id);

      // -----------------------------------------------------
      // 5. SEND SOS TO BACKEND
      // -----------------------------------------------------

      const sosData = {
        victimId: id,
        latitude,
        longitude,
        timestamp: Date.now(),
      };

      console.log("🚨 Sending SOS:", sosData);

      socket.emit("send_sos", sosData);

      console.log("✅ send_sos emitted");

      // -----------------------------------------------------
      // 6. CHANGE SCREEN IMMEDIATELY
      // -----------------------------------------------------

      setSOSActive(true);

      console.log("✅ SOS screen activated");

      // -----------------------------------------------------
      // 7. START LIVE LOCATION IN BACKGROUND
      // -----------------------------------------------------

      startLocationTracking(id);

      console.log("✅ SOS mission started:", id);
    } catch (error: any) {
      console.log("❌ SOS ERROR:", error?.message || error);

      Alert.alert("SOS Error", "Something went wrong while sending the SOS.");

      sosInProgress.current = false;
    }
  };

  // =========================================================
  // CANCEL SOS
  // =========================================================

  const handleCancel = () => {
    if (!victimId) return;

    console.log("🛑 Cancelling SOS:", victimId);

    socket.emit("cancel_sos", {
      victimId: victimId,
    });

    resetToIdle();

    console.log("✅ SOS Cancelled");
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetToIdle = () => {
    console.log("🔄 Resetting victim app to idle");

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    setSOSActive(false);
    setVolunteerAssigned(false);
    setVolunteerName("");
    setIndoorSearch(false);
    setVictimId("");

    sosInProgress.current = false;

    BeaconService.stopBeacon();
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <SafeAreaView style={styles.container}>
      {!sosActive ? (
        // ===================================================
        // IDLE SCREEN
        // ===================================================
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Rescue Beacon</Text>

          <Text style={styles.subtitle}>Need emergency help?</Text>

          <View style={styles.sosWrapper}>
            <SOSButton onPress={handleSOS} />
          </View>

          <Text style={styles.info}>
            Tap the SOS button to request emergency assistance.
          </Text>
        </View>
      ) : (
        // ===================================================
        // ACTIVE SOS SCREEN
        // ===================================================
        <View style={styles.centerContainer}>
          <Text style={styles.activeTitle}>Help is on the way</Text>

          <Text style={styles.successText}>
            Your SOS request has been sent.
          </Text>

          <View style={styles.successCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>SOS Active</Text>

            <Text style={styles.cardSubtitle}>
              Emergency request is active.
            </Text>

            <Text style={styles.cardSubtitle}>
              Volunteers are being notified.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.locationText}>
              Your location is being shared live.
            </Text>

            {volunteerAssigned && (
              <Text style={[styles.locationText, styles.volunteerText]}>
                {volunteerName} is coming to help you.
              </Text>
            )}

            {indoorSearch && (
              <Text style={styles.indoorText}>🔊 Indoor search started</Text>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Stay where you are if possible</Text>

            <Text style={styles.infoSubtitle}>
              Help is on the way to your location. Do not move unless necessary.
            </Text>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel request</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 18,
    color: "#64748B",
    marginBottom: 45,
  },

  sosWrapper: {
    marginBottom: 35,
  },

  info: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 280,
  },

  activeTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#16A34A",
    textAlign: "center",
    marginBottom: 8,
  },

  successText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 25,
  },

  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },

  checkMark: {
    fontSize: 50,
    color: "#16A34A",
    fontWeight: "700",
  },

  card: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 20,
    marginBottom: 15,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 15,
  },

  locationText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },

  volunteerText: {
    marginTop: 10,
    color: "#2563EB",
  },

  indoorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
  },

  infoCard: {
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 5,
  },

  infoSubtitle: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },

  cancelButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#EF4444",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
