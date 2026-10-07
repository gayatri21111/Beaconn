// import { Audio } from "expo-av";

// class BeaconService {
//   private sound: Audio.Sound | null = null;

//   async startBeacon() {
//     try {
//       await Audio.setAudioModeAsync({
//         playsInSilentModeIOS: true,
//         staysActiveInBackground: true,
//       });

//       const { sound } = await Audio.Sound.createAsync(
//         require("../assets/beep.mp3"),
//         { isLooping: true, volume: 1.0 },
//       );

//       this.sound = sound;
//       await sound.playAsync();
//       console.log("🔊 Beacon started");
//     } catch (err) {
//       console.log("Beacon start error:", err);
//     }
//   }

//   async stopBeacon() {
//     try {
//       if (this.sound) {
//         await this.sound.stopAsync();
//         await this.sound.unloadAsync();
//         this.sound = null;
//       }
//       console.log("🛑 Beacon stopped");
//     } catch (err) {
//       console.log("Beacon stop error:", err);
//     }
//   }
// }

// export default new BeaconService();
import { Audio } from "expo-av";

class BeaconService {
  private sound: Audio.Sound | null = null;

  async startBeacon() {
    try {
      // Prevent creating multiple beacons
      if (this.sound) {
        console.log("🔊 Beacon is already running");
        return;
      }

      console.log("🔊 Starting victim beacon...");

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/beep.mp3"),
        {
          isLooping: true,
          volume: 1.0,
        },
      );

      this.sound = sound;

      await sound.playAsync();

      console.log("🔊 Beacon started successfully");
    } catch (error) {
      console.log("❌ Beacon start error:", error);
    }
  }

  async stopBeacon() {
    try {
      if (this.sound) {
        console.log("🛑 Stopping victim beacon...");

        await this.sound.stopAsync();
        await this.sound.unloadAsync();

        this.sound = null;

        console.log("🛑 Beacon stopped");
      }
    } catch (error) {
      console.log("❌ Beacon stop error:", error);

      this.sound = null;
    }
  }
}

export default new BeaconService();
