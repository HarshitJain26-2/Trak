import { Vibration, Platform } from 'react-native';

let isHapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) {
  isHapticsEnabled = enabled;
}

export function triggerHaptic(pattern: number | number[] = 20) {
  try {
    if (isHapticsEnabled && Platform.OS !== 'web') {
      Vibration.vibrate(pattern);
    }
  } catch (err) {
    // Ignore on unsupported platforms
  }
}
