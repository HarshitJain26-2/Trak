import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the API base URL for Expo / React Native applications.
 *
 * Why hardcoding `http://192.168.1.5:3000` breaks:
 * 1. Static Local IP: 192.168.1.5 breaks when changing Wi-Fi networks, router subnets, or team machines.
 * 2. Android Emulator Loopback: Android emulators cannot resolve `localhost` directly; they require `10.0.2.2`.
 * 3. Physical Devices (Expo Go): Need the host computer's active local IP dynamically retrieved via Expo manifest.
 * 4. Production Security: Production builds require HTTPS or environment-configured base URLs.
 */
export const getApiUrl = (): string => {
  // 1. Prioritize explicit environment variable (e.g., from .env or deployment config)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. In Development, resolve IP dynamically based on Expo host URI
  if (__DEV__) {
    // Extract host IP address from Expo bundler connection (works on physical Expo Go devices & emulators)
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.manifest?.hostUri;
    const devHostIp = hostUri ? hostUri.split(':')[0] : null;

    if (devHostIp) {
      return `http://${devHostIp}:3000`;
    }

    // Fallbacks if Expo host URI is not available
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000'; // Android emulator localhost alias
    }

    return 'http://localhost:3000'; // iOS simulator / Web
  }

  // 3. Fallback URL for production builds if EXPO_PUBLIC_API_URL is missing
  return 'https://api.trak.com';
};

export const API_URL = getApiUrl();
