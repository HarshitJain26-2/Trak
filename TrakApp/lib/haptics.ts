import { Vibration, Platform } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';

export function triggerHaptic(pattern: number | number[] = 20) {
  try {
    const { hapticsEnabled } = useSettingsStore.getState();
    if (hapticsEnabled && Platform.OS !== 'web') {
      Vibration.vibrate(pattern);
    }
  } catch (err) {
    // Ignore on unsupported platforms
  }
}
