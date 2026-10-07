import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

// Matches victim-app's beep.mp3: a ~1035Hz tone with a ~2145Hz harmonic
const TARGET_FREQ_HZ = 1035;
const TARGET_FREQ_HARMONIC_HZ = 2145;
const SAMPLE_RATE = 44100;
// beep.mp3 loops every ~1.75s but is only "on" for the first ~0.9s of that
// (3 short beeps then silence). The window must exceed one full loop
// period, or it can land entirely in the silent gap and falsely read "far".
const CLIP_DURATION_MS = 2000;

let stopped = false;
let iosRecording: Audio.Recording | null = null;
let androidRecording: Audio.Recording | null = null;

/**
 * Runs the Goertzel algorithm to measure signal energy at one target
 * frequency from a buffer of normalized (-1..1) PCM samples.
 * Far cheaper than a full FFT when you only care about one known tone.
 */
function goertzelMagnitude(
  samples: Float32Array,
  targetFreq: number,
  sampleRate: number,
): number {
  const n = samples.length;
  if (n === 0) return 0;

  const k = Math.round((n * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / n;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const coeff = 2 * cosine;

  let q0 = 0;
  let q1 = 0;
  let q2 = 0;

  for (let i = 0; i < n; i++) {
    q0 = coeff * q1 - q2 + samples[i];
    q2 = q1;
    q1 = q0;
  }

  const real = q1 - q2 * cosine;
  const imag = q2 * sine;
  return Math.sqrt(real * real + imag * imag) / (n / 2);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses a standard 44-byte-header PCM WAV file into normalized float samples.
 */
function decodeWavToFloat32(bytes: Uint8Array): Float32Array {
  const headerSize = 44;
  const dataView = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const sampleCount = Math.floor((bytes.length - headerSize) / 2);
  const out = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const offset = headerSize + i * 2;
    if (offset + 1 >= bytes.length) break;
    const sample = dataView.getInt16(offset, true); // little-endian
    out[i] = sample / 32768;
  }

  return out;
}

function magnitudeToDbLike(magnitude: number): number {
  const eps = 1e-6;
  const db = 20 * Math.log10(magnitude + eps);
  return Math.max(-160, Math.min(0, db));
}

/**
 * iOS path: record short WAV clips, decode raw PCM, isolate energy at
 * the beacon frequency via Goertzel. This is real, frequency-selective
 * tone detection — not ambient noise.
 */
async function runIosDetectionLoop(onLevelUpdate: (db: number) => void) {
  const recordingOptions: Audio.RecordingOptions = {
    isMeteringEnabled: false,
    android: {
      extension: ".m4a",
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      outputFormat: Audio.IOSOutputFormat.LINEARPCM,
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 1,
      bitRate: 705600,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {},
  };

  while (!stopped) {
    try {
      const recording = new Audio.Recording();
      iosRecording = recording;

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      await new Promise((res) => setTimeout(res, CLIP_DURATION_MS));
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      iosRecording = null;

      if (uri && !stopped) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = base64ToUint8Array(base64);
        const samples = decodeWavToFloat32(bytes);
        const fundamental = goertzelMagnitude(
          samples,
          TARGET_FREQ_HZ,
          SAMPLE_RATE,
        );
        const harmonic = goertzelMagnitude(
          samples,
          TARGET_FREQ_HARMONIC_HZ,
          SAMPLE_RATE,
        );
        const magnitude = Math.max(fundamental, harmonic);
        onLevelUpdate(magnitudeToDbLike(magnitude));

        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (err) {
      console.log("iOS tone detection loop error:", err);
      await new Promise((res) => setTimeout(res, 500));
    }
  }
}

/**
 * Android fallback: expo-av's MediaRecorder-based recording can't output
 * raw PCM on Android, so true Goertzel/FFT tone isolation isn't possible
 * here without a native streaming module (e.g. react-native-live-audio-stream).
 * This uses live dB metering instead. It's still a REAL signal now — the
 * victim's phone is actually emitting the tone being measured — just not
 * frequency-isolated, so it's more sensitive to ambient noise than iOS.
 */
async function runAndroidMeteringLoop(onLevelUpdate: (db: number) => void) {
  try {
    const recording = new Audio.Recording();
    androidRecording = recording;

    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    });

    recording.setOnRecordingStatusUpdate((status) => {
      if (status.metering !== undefined && status.metering !== null) {
        onLevelUpdate(status.metering);
      }
    });

    await recording.startAsync();
  } catch (err) {
    console.log("Android metering loop error:", err);
  }
}

export async function startProximityListening(
  onLevelUpdate: (db: number) => void,
): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Microphone permission denied");
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    stopped = false;

    if (Platform.OS === "ios") {
      runIosDetectionLoop(onLevelUpdate); // fire and forget; loops until stopped
    } else {
      await runAndroidMeteringLoop(onLevelUpdate);
    }

    console.log(`🔊 Proximity listening started (${Platform.OS})`);
    return true;
  } catch (err) {
    console.log("Proximity listener error:", err);
    return false;
  }
}

export async function stopProximityListening() {
  stopped = true;
  try {
    if (iosRecording) {
      await iosRecording.stopAndUnloadAsync().catch(() => {});
      iosRecording = null;
    }
    if (androidRecording) {
      await androidRecording.stopAndUnloadAsync().catch(() => {});
      androidRecording = null;
    }
    console.log("🔊 Proximity listening stopped");
  } catch (err) {
    console.log("Stop proximity listener error:", err);
  }
}
