// export type RootStackParamList = {
//   Dashboard: undefined;

//   MissionMap: {
//     victimId: string;
//     latitude: number;
//     longitude: number;
//   };

//   BeaconSearch: {
//     victimId: string;
//   };
// };


export type RootStackParamList = {
  Dashboard: undefined;

  MissionMap: {
    victimId: string;
    latitude: number;
    longitude: number;
  };

  BeaconSearch: {
    victimId: string;
    victimLatitude: number;
    victimLongitude: number;
  };
};