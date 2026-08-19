import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment, AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import { safeStorage } from './storage';
import { triggerHaptic } from '@/utils/haptics';
import { supabase } from './supabase';

export type PermissionStatus = 'granted' | 'denied' | 'pending';

export interface ScheduledReminder {
  id: string;
  projectId: string;
  projectName: string;
  triggerTime: number; // Unix timestamp
  offsetLabel: string;
  fired?: boolean;
}

/**
 * Accurately detect if the app is currently running inside Expo Go.
 * SDK 53/54 officially identifies Expo Go via AppOwnership.Expo or ExecutionEnvironment.StoreClient.
 */
export const isExpoGo: boolean =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Type-only reference to expo-notifications module.
 */
type ExpoNotificationsModule = typeof import('expo-notifications');

let _notificationsModule: ExpoNotificationsModule | null = null;
let _isHandlerConfigured = false;

/**
 * Dynamically and lazily load expo-notifications only when supported.
 * On Web and inside Expo Go on Android, this returns null to strictly prevent
 * DevicePushTokenAutoRegistration.fx from executing unsupported remote push initialization.
 */
async function getExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (isExpoGo && Platform.OS === 'android') {
    return null;
  }

  if (!_notificationsModule) {
    try {
      _notificationsModule = await import('expo-notifications');
      if (!_isHandlerConfigured && _notificationsModule) {
        _notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        _isHandlerConfigured = true;
      }
    } catch (_) {
      return null;
    }
  }

  return _notificationsModule;
}

class NotificationService {
  private channelInitialized = false;

  /**
   * Ensure Android notification channels are set up (required for Android 8.0+)
   */
  async ensureAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.channelInitialized) return;

    const Notifications = await getExpoNotifications();
    if (!Notifications) return;

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#39FF88',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Project Reminders',
        description: 'Deadline reminder notifications for your projects',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#39FF88',
        sound: 'default',
      });

      this.channelInitialized = true;
    } catch (_) {}
  }

  /**
   * Register for remote push notifications (Dev Build / Standalone Production only).
   * Safely returns null in Expo Go and Web without throwing errors.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web' || (isExpoGo && Platform.OS === 'android') || !Device.isDevice) {
      return null;
    }

    const Notifications = await getExpoNotifications();
    if (!Notifications) return null;

    try {
      await this.ensureAndroidChannels();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      return tokenData.data ?? null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Sync push token to Supabase user_push_tokens table securely
   */
  async syncPushTokenWithSupabase(userId: string): Promise<boolean> {
    if (!userId) return false;

    // Safe diagnostic logging (No secret or token exposure)
    if (__DEV__) {
      console.log(`[Push Diagnostic] Environment: ${isExpoGo ? 'Expo Go (Android Push Unsupported)' : 'Dev Build / Standalone'}`);
      console.log(`[Push Diagnostic] Platform: ${Platform.OS}, Physical Device: ${Device.isDevice}`);
    }

    if (Platform.OS === 'web' || (isExpoGo && Platform.OS === 'android') || !Device.isDevice) {
      return false;
    }

    try {
      const token = await this.registerForPushNotificationsAsync();
      if (!token) {
        if (__DEV__) console.log('[Push Diagnostic] Token generated: NO');
        return false;
      }

      if (__DEV__) console.log('[Push Diagnostic] Token generated: YES');

      const { error } = await supabase.rpc('register_user_push_token', {
        p_token: token,
        p_platform: Platform.OS,
        p_device_name: Device.modelName || Device.deviceName || 'Android Device',
      });

      if (error) {
        if (__DEV__) console.log('[Push Diagnostic] Token saved: NO (RPC error)');
        return false;
      }

      if (__DEV__) console.log('[Push Diagnostic] Token saved: YES');
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Initialize native notification listeners safely (Dev Build / Standalone Production).
   */
  async initializeListeners(
    onReceived?: (notification: any) => void,
    onResponse?: (response: any) => void
  ): Promise<() => void> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) {
      return () => {};
    }

    try {
      const receivedSub = onReceived
        ? Notifications.addNotificationReceivedListener(onReceived)
        : null;
      const responseSub = onResponse
        ? Notifications.addNotificationResponseReceivedListener(onResponse)
        : null;

      return () => {
        receivedSub?.remove();
        responseSub?.remove();
      };
    } catch (_) {
      return () => {};
    }
  }

  /**
   * Get current notification permission status across platforms
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = window.Notification.permission;
        if (perm === 'granted') return 'granted';
        if (perm === 'denied') return 'denied';
        return 'pending';
      }
      return 'denied';
    }

    const Notifications = await getExpoNotifications();
    if (!Notifications) {
      const cached = await safeStorage.getItem('trak_notification_permission');
      return (cached as PermissionStatus) || 'granted';
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return 'granted';
      if (status === 'denied') return 'denied';
      return 'pending';
    } catch (_) {
      return 'pending';
    }
  }

  /**
   * Request system notification permissions
   */
  async requestPermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await window.Notification.requestPermission();
        const status: PermissionStatus =
          res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'pending';
        await safeStorage.setItem('trak_notification_permission', status);
        return status;
      }
      return 'denied';
    }

    const Notifications = await getExpoNotifications();
    if (!Notifications) {
      await safeStorage.setItem('trak_notification_permission', 'granted');
      return 'granted';
    }

    try {
      await this.ensureAndroidChannels();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      const resultStatus: PermissionStatus =
        finalStatus === 'granted' ? 'granted' : finalStatus === 'denied' ? 'denied' : 'pending';
      await safeStorage.setItem('trak_notification_permission', resultStatus);
      return resultStatus;
    } catch (_) {
      return 'pending';
    }
  }

  /**
   * Deliver an immediate notification (local)
   */
  async sendImmediateNotification(title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    triggerHaptic([0, 40, 60, 40]);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const status = await this.getPermissionStatus();
        if (status === 'granted') {
          new window.Notification(title, { body, icon: '/favicon.ico' });
          return true;
        }
      }
      return false;
    }

    const Notifications = await getExpoNotifications();
    if (!Notifications) {
      return true;
    }

    try {
      await this.ensureAndroidChannels();
      const status = await this.getPermissionStatus();
      if (status !== 'granted') {
        const requested = await this.requestPermission();
        if (requested !== 'granted') return false;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          data: data || {},
        },
        trigger: null, // Immediate delivery
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    triggerHaptic(20);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const status = await this.getPermissionStatus();
        if (status === 'granted') {
          new window.Notification('Trak Test', {
            body: 'Push notifications are working.',
            icon: '/favicon.ico',
          });
          return { success: true, message: 'Web notification sent.' };
        } else {
          const req = await this.requestPermission();
          if (req === 'granted') {
            new window.Notification('Trak Test', {
              body: 'Push notifications are working.',
              icon: '/favicon.ico',
            });
            return { success: true, message: 'Web notification sent.' };
          }
          return { success: false, message: 'Web notifications blocked.' };
        }
      }
      return { success: false, message: 'Web notifications not supported.' };
    }

    if (isExpoGo && Platform.OS === 'android') {
      return {
        success: true,
        message: 'In-app notification banner & haptics active (Android Remote Push requires an EAS Development Build per Expo SDK 53+).',
      };
    }

    const Notifications = await getExpoNotifications();
    if (!Notifications) {
      return { success: true, message: 'In-app notification active.' };
    }

    try {
      await this.ensureAndroidChannels();
      const perm = await this.requestPermission();
      if (perm !== 'granted') {
        return { success: false, message: 'System notification permission not granted.' };
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trak Test',
          body: 'Push notifications are working.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });

      return { success: true, message: 'Test notification delivered to system tray.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to deliver notification.' };
    }
  }

  /**
   * Schedule deadline reminder notification
   */
  async scheduleReminder(reminder: ScheduledReminder): Promise<string | null> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return null;

    if (reminder.triggerTime <= Date.now()) {
      return null;
    }

    try {
      await this.ensureAndroidChannels();
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Project Deadline: ${reminder.projectName}`,
          body: `Deadline is approaching (${reminder.offsetLabel} remaining).`,
          sound: 'default',
          data: { projectId: reminder.projectId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminder.triggerTime),
          channelId: 'reminders',
        },
      });

      return id;
    } catch (_) {
      return null;
    }
  }

  /**
   * Schedule deadline reminder notification by date
   */
  async scheduleReminderNotification(
    projectId: string,
    projectName: string,
    deadlineDate: Date,
    offsetLabel: '1h' | '24h' | '48h'
  ): Promise<string | null> {
    const offsetMs =
      offsetLabel === '1h'
        ? 60 * 60 * 1000
        : offsetLabel === '24h'
        ? 24 * 60 * 60 * 1000
        : 48 * 60 * 60 * 1000;

    return this.scheduleReminder({
      id: `rem_${projectId}_${offsetLabel}`,
      projectId,
      projectName,
      triggerTime: deadlineDate.getTime() - offsetMs,
      offsetLabel,
    });
  }

  /**
   * Cancel reminder
   */
  async cancelNotification(notificationId: string): Promise<void> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (_) {}
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    const Notifications = await getExpoNotifications();
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (_) {}
  }

  /**
   * Sync notifications setting
   */
  async syncNotifications(enabled: boolean): Promise<void> {
    if (!enabled) {
      await this.cancelAllNotifications();
    }
  }
}

export const notificationService = new NotificationService();