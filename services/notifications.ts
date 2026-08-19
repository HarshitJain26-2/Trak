import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { safeStorage } from './storage';
import { triggerHaptic } from '@/utils/haptics';

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
 * Uses official Expo-supported Constants check (SDK 50+ / SDK 54).
 */
export const isExpoGo: boolean =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Check if remote push notifications are supported in the current runtime.
 * Remote push via expo-notifications is removed from Expo Go on Android starting with SDK 53.
 */
export const isPushNotificationSupported: boolean =
  Platform.OS !== 'web' && !(isExpoGo && Platform.OS === 'android');

let handlerConfigured = false;
let expoGoWarningLogged = false;

/**
 * Safe configuration of foreground notification presentation handler.
 * Called explicitly during initialization, avoiding unsafe module load execution.
 */
export function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  } catch (err) {
    if (__DEV__ && !expoGoWarningLogged) {
      console.warn('[NotificationService] Foreground notification handler notice:', err);
    }
  }
}

// Initialize handler safely for native platforms
configureNotificationHandler();

class NotificationService {
  private channelInitialized = false;

  /**
   * Ensure Android notification channels are set up (required for Android 8.0+)
   */
  async ensureAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android' || this.channelInitialized) return;

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C4DFF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Project Reminders',
        description: 'Deadline reminder notifications for your projects',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C4DFF',
        sound: 'default',
      });

      this.channelInitialized = true;
    } catch (e) {
      if (__DEV__ && !isExpoGo) {
        console.error('[NotificationService] Failed to set up Android notification channels:', e);
      }
    }
  }

  /**
   * Register for remote push notifications (Dev Build / Standalone Production only).
   * Safely bypassed in Expo Go (Android) and Web without throwing errors.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    if (isExpoGo && Platform.OS === 'android') {
      if (__DEV__ && !expoGoWarningLogged) {
        console.log('[NotificationService] Push notifications are unavailable in Expo Go; use a development build.');
        expoGoWarningLogged = true;
      }
      return null;
    }

    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('[NotificationService] Remote push tokens require a physical device.');
      }
      return null;
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
    } catch (err) {
      if (__DEV__) {
        console.warn('[NotificationService] Push token registration notice:', err);
      }
      return null;
    }
  }

  /**
   * Get current notification permission status across platforms
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const perm = window.Notification.permission;
          if (perm === 'granted') return 'granted';
          if (perm === 'denied') return 'denied';
          return 'pending';
        }
        return 'denied';
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return 'granted';
      if (status === 'denied') return 'denied';
      return 'pending';
    } catch (e) {
      return 'pending';
    }
  }

  /**
   * Request system notification permissions
   */
  async requestPermission(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const res = await window.Notification.requestPermission();
          await safeStorage.setItem('trak_notification_permission', res);
          return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'pending';
        }
        return 'denied';
      }

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
    } catch (e) {
      return 'pending';
    }
  }

  /**
   * Deliver an immediate notification (local)
   */
  async sendImmediateNotification(title: string, body: string): Promise<boolean> {
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
        },
        trigger: null, // Immediate delivery
      });
      return true;
    } catch (e) {
      if (__DEV__ && !isExpoGo) {
        console.error('[NotificationService] Error sending immediate notification:', e);
      }
      return false;
    }
  }

  /**
   * Send a test notification from Settings screen
   */
  async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    const status = await this.getPermissionStatus();

    if (status === 'denied') {
      return {
        success: false,
        message: 'Notification permission is blocked. Please allow notifications in device/browser settings.',
      };
    }

    if (status === 'pending') {
      const newStatus = await this.requestPermission();
      if (newStatus !== 'granted') {
        return {
          success: false,
          message: 'Notification permission was not granted.',
        };
      }
    }

    const sent = await this.sendImmediateNotification(
      'Test Notification',
      'Your Trak local notification settings are working correctly!'
    );

    return {
      success: sent,
      message: sent
        ? 'Test notification sent successfully!'
        : 'Failed to send notification. Check system permission settings.',
    };
  }

  /**
   * Schedule a local reminder notification
   */
  async scheduleReminder(
    reminder: ScheduledReminder,
    options?: { isTest?: boolean; silent?: boolean }
  ): Promise<void> {
    const now = Date.now();
    let effectiveTriggerTime = reminder.triggerTime;

    // Buffer to ensure past or immediate times don't accidentally fire
    if (effectiveTriggerTime <= now + 1000) {
      if (options?.isTest) {
        effectiveTriggerTime = now + 10000;
      } else {
        // Mark as fired and DO NOT pass to OS scheduler
        await this.persistReminder({ ...reminder, fired: true });
        return;
      }
    }

    try {
      if (Platform.OS === 'web') {
        const delay = effectiveTriggerTime - now;
        if (delay > 0) {
          setTimeout(() => {
            this.sendImmediateNotification(
              `Reminder: ${reminder.projectName}`,
              `Upcoming Deadline (${reminder.offsetLabel}): Prepare to ship!`
            );
          }, delay);
        }
      } else {
        await this.ensureAndroidChannels();

        // Cancel any existing notification with the same ID before rescheduling
        await Notifications.cancelScheduledNotificationAsync(reminder.id).catch(() => {});

        const triggerDate = new Date(effectiveTriggerTime);

        await Notifications.scheduleNotificationAsync({
          identifier: reminder.id,
          content: {
            title: `Reminder: ${reminder.projectName}`,
            body: `Upcoming Deadline (${reminder.offsetLabel}): Prepare to ship!`,
            sound: 'default',
            vibrate: [0, 250, 250, 250],
            data: {
              projectId: reminder.projectId,
              reminderId: reminder.id,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: 'reminders',
          } as any,
        });

        if (!options?.silent && __DEV__) {
          console.log(`[NotificationService] Scheduled OS local notification "${reminder.id}" for ${triggerDate.toLocaleString()}`);
        }
      }

      await this.persistReminder({ ...reminder, triggerTime: effectiveTriggerTime, fired: false });
    } catch (e) {
      if (__DEV__ && !isExpoGo) {
        console.error('[NotificationService] Failed to schedule reminder:', e);
      }
    }
  }

  /**
   * Print all queued scheduled notifications on device for debugging
   */
  async logScheduledNotifications(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`[NotificationService] === Active Queued OS Notifications: ${scheduled.length} ===`);
      scheduled.forEach((n, idx) => {
        console.log(`  [${idx + 1}] ID: "${n.identifier}" | Title: "${n.content.title}" | Trigger:`, JSON.stringify(n.trigger));
      });
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Cancel a scheduled notification by identifier
   */
  async cancelReminder(reminderId: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Notifications.cancelScheduledNotificationAsync(reminderId).catch(() => {});
      }
      await this.removePersistedReminder(reminderId);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Synchronize / toggle all notifications on or off
   */
  async syncNotifications(enabled: boolean): Promise<void> {
    try {
      if (!enabled) {
        if (Platform.OS !== 'web') {
          await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
        }
      } else {
        await this.restoreScheduledReminders();
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Restore and re-schedule saved reminders (e.g. after app update or restart)
   */
  private async restoreScheduledReminders(): Promise<void> {
    try {
      const raw = await safeStorage.getItem('trak_scheduled_reminders');
      if (!raw) return;

      const list: ScheduledReminder[] = JSON.parse(raw);
      const now = Date.now();

      let scheduledInOS = new Set<string>();
      if (Platform.OS !== 'web') {
        try {
          const osNotifications = await Notifications.getAllScheduledNotificationsAsync();
          scheduledInOS = new Set(osNotifications.map((n) => n.identifier));
        } catch (_) {}
      }

      let storageUpdated = false;
      const updatedList: ScheduledReminder[] = [];

      for (const rem of list) {
        if (rem.triggerTime <= now + 1000) {
          if (!rem.fired) {
            rem.fired = true;
            storageUpdated = true;
          }
          updatedList.push(rem);
        } else {
          if (!scheduledInOS.has(rem.id)) {
            await this.scheduleReminder(rem, { silent: true });
          }
          updatedList.push(rem);
        }
      }

      if (storageUpdated) {
        await safeStorage.setItem('trak_scheduled_reminders', JSON.stringify(updatedList));
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Save reminder to local storage
   */
  private async persistReminder(reminder: ScheduledReminder): Promise<void> {
    try {
      const raw = await safeStorage.getItem('trak_scheduled_reminders');
      const list: ScheduledReminder[] = raw ? JSON.parse(raw) : [];
      const existingIdx = list.findIndex((r) => r.id === reminder.id);
      if (existingIdx >= 0) {
        list[existingIdx] = reminder;
      } else {
        list.push(reminder);
      }
      await safeStorage.setItem('trak_scheduled_reminders', JSON.stringify(list));
    } catch (e) {}
  }

  /**
   * Remove reminder from local storage
   */
  private async removePersistedReminder(reminderId: string): Promise<void> {
    try {
      const raw = await safeStorage.getItem('trak_scheduled_reminders');
      if (!raw) return;
      const list: ScheduledReminder[] = JSON.parse(raw);
      const updated = list.filter((r) => r.id !== reminderId);
      await safeStorage.setItem('trak_scheduled_reminders', JSON.stringify(updated));
    } catch (e) {}
  }
}

export const notificationService = new NotificationService();