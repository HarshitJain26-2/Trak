import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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

// Configure foreground notification presentation handler for native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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
      console.error('[NotificationService] Failed to set up Android notification channels:', e);
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
      console.error('[NotificationService] Error checking permissions:', e);
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
      console.error('[NotificationService] Error requesting permissions:', e);
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
      console.error('[NotificationService] Error sending immediate notification:', e);
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
        await Notifications.cancelScheduledNotificationAsync(reminder.id).catch(() => { });

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

        if (!options?.silent) {
          console.log(`[NotificationService] Scheduled OS local notification "${reminder.id}" for ${triggerDate.toLocaleString()}`);
        }
      }

      await this.persistReminder({ ...reminder, triggerTime: effectiveTriggerTime, fired: false });
    } catch (e) {
      console.error('[NotificationService] Failed to schedule reminder:', e);
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
      console.error('[NotificationService] Failed to fetch scheduled notifications:', e);
    }
  }

  /**
   * Cancel a scheduled notification by identifier
   */
  async cancelReminder(reminderId: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Notifications.cancelScheduledNotificationAsync(reminderId);
        console.log(`[NotificationService] Cancelled notification "${reminderId}"`);
      }
      await this.removePersistedReminder(reminderId);
    } catch (e) {
      console.error('[NotificationService] Error cancelling reminder:', e);
    }
  }

  /**
   * Synchronize / toggle all notifications on or off
   */
  async syncNotifications(enabled: boolean): Promise<void> {
    try {
      if (!enabled) {
        if (Platform.OS !== 'web') {
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
        console.log('[NotificationService] Notifications disabled. Cancelled all scheduled notifications.');
      } else {
        await this.restoreScheduledReminders();
      }
    } catch (e) {
      console.error('[NotificationService] Error syncing notifications:', e);
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
        } catch (err) {
          console.warn('[NotificationService] Could not inspect OS notification queue:', err);
        }
      }

      let storageUpdated = false;
      const updatedList: ScheduledReminder[] = [];

      for (const rem of list) {
        // Skip/mark any past or overdue items explicitly without scheduling
        if (rem.triggerTime <= now + 1000) {
          if (!rem.fired) {
            rem.fired = true;
            storageUpdated = true;
          }
          updatedList.push(rem);
        } else {
          // Future reminder - only reschedule if missing from native OS queue
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
      console.error('[NotificationService] Failed to restore scheduled reminders:', e);
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
    } catch (e) {
      console.error('[NotificationService] Failed to persist reminder:', e);
    }
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
    } catch (e) {
      console.error('[NotificationService] Failed to remove persisted reminder:', e);
    }
  }
}

export const notificationService = new NotificationService();