import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VolunteerDashboard from "./src/screens/VolunteerDashboard";
import MissionMap from "./src/screens/MissionMap";
import BeaconSearch from "./src/screens/BeaconSearch";

import { RootStackParamList } from "./src/types/Navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={VolunteerDashboard}
          options={{
            title: "Volunteer Dashboard",
          }}
        />

        <Stack.Screen
          name="MissionMap"
          component={MissionMap}
          options={{
            title: "Mission",
          }}
        />

        <Stack.Screen
          name="BeaconSearch"
          component={BeaconSearch}
          options={{
            title: "Indoor Search",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
