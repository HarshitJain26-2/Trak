import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Suppress Expo Go SDK 53+ Android push notification RedBox error on module load
if (
  Platform.OS === 'android' &&
  (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient')
) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Android Push notifications') || args[0].includes('removed from Expo Go'))
    ) {
      console.warn('[Expo Go Notice]', args[0]);
      return;
    }
    originalConsoleError(...args);
  };
}

export interface PushRegistrationResult {
  token: string | null;
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable_expo_go' | 'simulator';
  message?: string;
}

/**
 * Configure foreground notification behavior
 */
export function setupNotificationHandler() {
  const isExpoGoAndroid =
    Platform.OS === 'android' &&
    (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient');

  if (isExpoGoAndroid) {
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[PushNotifications] Skipping notification handler setup:', e);
  }
}

/**
 * Register for Expo Push Notifications
 * Handles permissions, Android channels, Expo Go restrictions, and token generation using EAS projectId.
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return {
      token: null,
      status: 'unavailable_expo_go',
      message: 'Web browser push notifications require VAPID keys. Use an Android or iOS device for Expo push notifications.',
    };
  }

  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient';

  if (isExpoGo && Platform.OS === 'android') {
    console.warn('[PushNotifications] Expo Go on Android does not support remote push notifications');
    return {
      token: null,
      status: 'unavailable_expo_go',
      message: 'Expo Go on Android has push limitations (SDK 53+). Please use a development build (eas build).',
    };
  }

  // Check if physical device
  if (!Device.isDevice) {
    console.warn('[PushNotifications] Must use a physical device for Push Notifications');
    return {
      token: null,
      status: 'simulator',
      message: 'Push notifications are not supported on simulator/emulator. Use a physical device.',
    };
  }

  try {
    // Setup Android Notification Channel first
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0b0e14',
        sound: 'default',
      });
    }

    // Check permission status
    let { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotifications] Permission not granted for push notifications');
      return {
        token: null,
        status: 'denied',
        message: 'Notification permissions were denied by the user.',
      };
    }

    // Retrieve EAS Project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      'f08c49a2-de31-422d-a9b8-1fb39670bac8';

    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = pushTokenData.data;

    // Save token to Supabase if user is logged in
    await savePushTokenToSupabase(token);

    return {
      token,
      status: 'granted',
    };
  } catch (error: any) {
    console.error('[PushNotifications] Failed to get push token:', error);
    return {
      token: null,
      status: 'undetermined',
      message: error?.message || 'Failed to fetch Expo push token',
    };
  }
}

/**
 * Save / Upsert Expo Push Token into Supabase `push_tokens` table
 * Uses onConflict: 'token' to safely update user_id and timestamps without constraint errors.
 */
export async function savePushTokenToSupabase(token: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.log('[PushNotifications] No active Supabase session. Token deferred.');
      return false;
    }

    const userId = session.user.id;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          device_type: Platform.OS,
          updated_at: now,
          last_used_at: now,
        },
        { onConflict: 'token' }
      );

    if (error) {
      console.error('[PushNotifications] Supabase token upsert error:', error.message);
      return false;
    }

    console.log('[PushNotifications] Token saved/updated in Supabase successfully');
    return true;
  } catch (e: any) {
    console.error('[PushNotifications] Unexpected error saving push token:', e);
    return false;
  }
}
