

import * as Location from "expo-location";
import socket from "./socket";

export const startVictimTracking = async (victimId: string) => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    console.log("Location permission denied");
    return null;
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000, // was effectively unused before due to wrong event name
      distanceInterval: 1,
    },
    (location) => {
      socket.emit("location_update", {
        // ✅ matches backend event name
        victimId, // ✅ matches backend key (was "missionId")
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    },
  );

  return subscription; // caller can call subscription.remove() to stop tracking
};

export const stopVictimTracking = (
  subscription: Location.LocationSubscription | null,
) => {
  subscription?.remove();
};
