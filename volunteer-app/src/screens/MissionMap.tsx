// import React, { useEffect, useRef, useState } from "react";
// import { View, StyleSheet, TouchableOpacity, Text } from "react-native";

// import MapView, { Marker, Polyline } from "react-native-maps";
// import * as Location from "expo-location";

// import { NativeStackScreenProps } from "@react-navigation/native-stack";
// import { RootStackParamList } from "../types/Navigation";

// import DistanceCard from "../components/DistanceCard";
// import socket from "../services/socket";

// type Props = NativeStackScreenProps<RootStackParamList, "MissionMap">;

// export default function MissionMap({ navigation, route }: Props) {
//   const { victimId } = route.params;

//   const [victim, setVictim] = useState({
//     latitude: route.params.latitude,
//     longitude: route.params.longitude,
//   });

//   const [volunteer, setVolunteer] = useState({
//     latitude: 0,
//     longitude: 0,
//   });

//   const [distance, setDistance] = useState(0);
//   const [eta, setEta] = useState(0);
//   const [showIndoorButton, setShowIndoorButton] = useState(false);

//   const watcher = useRef<Location.LocationSubscription | null>(null);
//   const mapRef = useRef<MapView | null>(null);

//   useEffect(() => {
//     const startTracking = async () => {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") return;

//       watcher.current = await Location.watchPositionAsync(
//         {
//           accuracy: Location.Accuracy.BestForNavigation,
//           timeInterval: 2000,
//           distanceInterval: 2,
//         },
//         (location) => {
//           const latitude = location.coords.latitude;
//           const longitude = location.coords.longitude;

//           setVolunteer({ latitude, longitude });

//           socket.emit("volunteer_location", { victimId, latitude, longitude });
//         },
//       );
//     };

//     startTracking();

//     return () => {
//       watcher.current?.remove();
//     };
//   }, []);

//   useEffect(() => {
//     const handleVictimLocation = (data: any) => {
//       if (data.victimId !== victimId) return;
//       setVictim({ latitude: data.latitude, longitude: data.longitude });
//     };

//     const handleDistanceUpdate = (data: any) => {
//       if (data.victimId !== victimId) return;

//       setDistance(data.distance ?? 0);
//       setEta(data.eta ?? 0);
//       setShowIndoorButton((data.distance ?? Infinity) <= 20);
//     };

//     const handleMissionCompleted = () => {
//       alert("Victim rescued successfully");
//       navigation.popToTop();
//     };

//     socket.on("victim_location", handleVictimLocation);
//     socket.on("distance_update", handleDistanceUpdate);
//     socket.on("mission_completed", handleMissionCompleted);

//     return () => {
//       socket.off("victim_location", handleVictimLocation);
//       socket.off("distance_update", handleDistanceUpdate);
//       socket.off("mission_completed", handleMissionCompleted);
//     };
//   }, [victimId]);

//   // ✅ NEW: keep both markers visible on screen as they move apart/closer
//   useEffect(() => {
//     if (volunteer.latitude === 0) return;

//     mapRef.current?.fitToCoordinates([victim, volunteer], {
//       edgePadding: { top: 100, right: 80, bottom: 200, left: 80 },
//       animated: true,
//     });
//   }, [victim, volunteer]);

//   const startIndoorSearch = () => {
//     socket.emit("start_indoor_search", { victimId });

//     navigation.navigate("BeaconSearch", {
//       victimId,
//       victimLatitude: victim.latitude,
//       victimLongitude: victim.longitude,
//     });
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <MapView
//         ref={mapRef}
//         style={{ flex: 1 }}
//         initialRegion={{
//           latitude: victim.latitude,
//           longitude: victim.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         <Marker coordinate={victim} title="Victim" pinColor="#EF4444" />
//         <Marker coordinate={volunteer} title="You" pinColor="#2563EB" />

//         {/* ✅ NEW: route line from volunteer (start) to victim (end) */}
//         {volunteer.latitude !== 0 && (
//           <Polyline
//             coordinates={[volunteer, victim]}
//             strokeColor="#2563EB"
//             strokeWidth={4}
//             lineDashPattern={[8, 6]}
//           />
//         )}
//       </MapView>

//       <DistanceCard
//         distance={`${distance.toFixed(1)} m`}
//         eta={`${eta.toFixed(0)} mins`}
//       />

//       {showIndoorButton && (
//         <TouchableOpacity style={styles.button} onPress={startIndoorSearch}>
//           <Text style={styles.text}>Start indoor search</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   button: {
//     position: "absolute",
//     bottom: 20,
//     left: 20,
//     right: 20,
//     height: 60,
//     borderRadius: 18,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#2563EB",
//   },
//   text: {
//     color: "#fff",
//     fontWeight: "700",
//     fontSize: 18,
//   },
// });

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/Navigation";

import DistanceCard from "../components/DistanceCard";
import socket from "../services/socket";

type Props = NativeStackScreenProps<RootStackParamList, "MissionMap">;

// Builds the HTML page that runs Leaflet inside the WebView.
// Uses OpenStreetMap tiles — no API key, no billing, no restrictions needed.
function buildMapHtml(initialVictimLat: number, initialVictimLng: number) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var victimLatLng = [${initialVictimLat}, ${initialVictimLng}];
    var volunteerLatLng = null;

    var map = L.map('map', { zoomControl: false }).setView(victimLatLng, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var victimIcon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    var volunteerIcon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    var victimMarker = L.marker(victimLatLng, { icon: victimIcon }).addTo(map).bindPopup('Victim');
    var volunteerMarker = null;
    var routeLine = null;

    function updateVictim(lat, lng) {
      victimLatLng = [lat, lng];
      victimMarker.setLatLng(victimLatLng);
      fitBoth();
    }

    function updateVolunteer(lat, lng) {
      volunteerLatLng = [lat, lng];
      if (!volunteerMarker) {
        volunteerMarker = L.marker(volunteerLatLng, { icon: volunteerIcon }).addTo(map).bindPopup('You');
      } else {
        volunteerMarker.setLatLng(volunteerLatLng);
      }
      updateRoute();
      fitBoth();
    }

    function updateRoute() {
      if (!volunteerLatLng) return;
      var coords = [volunteerLatLng, victimLatLng];
      if (routeLine) {
        routeLine.setLatLngs(coords);
      } else {
        routeLine = L.polyline(coords, { color: '#2563EB', weight: 4, dashArray: '8, 6' }).addTo(map);
      }
    }

    function fitBoth() {
      if (!volunteerLatLng) return;
      var bounds = L.latLngBounds([victimLatLng, volunteerLatLng]);
      map.fitBounds(bounds, { padding: [80, 80] });
    }

    // Let React Native call these functions via injectJavaScript
    window.updateVictim = updateVictim;
    window.updateVolunteer = updateVolunteer;
  </script>
</body>
</html>
  `;
}

export default function MissionMap({ navigation, route }: Props) {
  const { victimId } = route.params;

  const [victim, setVictim] = useState({
    latitude: route.params.latitude,
    longitude: route.params.longitude,
  });

  const [volunteer, setVolunteer] = useState({
    latitude: 0,
    longitude: 0,
  });

  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [showIndoorButton, setShowIndoorButton] = useState(false);

  const watcher = useRef<Location.LocationSubscription | null>(null);
  const webviewRef = useRef<WebView | null>(null);

  const mapHtml = useRef(
    buildMapHtml(route.params.latitude, route.params.longitude),
  ).current;

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      watcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 0,
          distanceInterval: 0,
        },
        (location) => {
          const latitude = location.coords.latitude;
          const longitude = location.coords.longitude;

          setVolunteer({ latitude, longitude });

          socket.emit("volunteer_location", { victimId, latitude, longitude });
        },
      );
    };
    startTracking();

    return () => {
      watcher.current?.remove();
    };
  }, []);

  useEffect(() => {
    const handleVictimLocation = (data: any) => {
      if (data.victimId !== victimId) return;
      setVictim({ latitude: data.latitude, longitude: data.longitude });
    };

    const handleDistanceUpdate = (data: any) => {
      if (data.victimId !== victimId) return;

      setDistance(data.distance ?? 0);
      setEta(data.eta ?? 0);
      setShowIndoorButton((data.distance ?? Infinity) <= 20);
    };

    const handleMissionCompleted = () => {
      alert("Victim rescued successfully");
      navigation.popToTop();
    };

    socket.on("victim_location", handleVictimLocation);
    socket.on("distance_update", handleDistanceUpdate);
    socket.on("mission_completed", handleMissionCompleted);

    return () => {
      socket.off("victim_location", handleVictimLocation);
      socket.off("distance_update", handleDistanceUpdate);
      socket.off("mission_completed", handleMissionCompleted);
    };
  }, [victimId]);

  // Push victim marker updates into the WebView map
  useEffect(() => {
    webviewRef.current?.injectJavaScript(
      `window.updateVictim(${victim.latitude}, ${victim.longitude}); true;`,
    );
  }, [victim]);

  // Push volunteer marker updates into the WebView map
  useEffect(() => {
    if (volunteer.latitude === 0) return;
    webviewRef.current?.injectJavaScript(
      `window.updateVolunteer(${volunteer.latitude}, ${volunteer.longitude}); true;`,
    );
  }, [volunteer]);

  const startIndoorSearch = () => {
    socket.emit("start_indoor_search", { victimId });

    navigation.navigate("BeaconSearch", {
      victimId,
      victimLatitude: victim.latitude,
      victimLongitude: victim.longitude,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
      />

      <DistanceCard
        distance={`${distance.toFixed(1)} m`}
        eta={`${eta.toFixed(0)} mins`}
      />

      {showIndoorButton && (
        <TouchableOpacity style={styles.button} onPress={startIndoorSearch}>
          <Text style={styles.text}>Start indoor search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2563EB",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});
