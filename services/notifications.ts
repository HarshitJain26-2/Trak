import { Alert, Platform } from 'react-native';
import { safeStorage } from './storage';
import { triggerHaptic } from './haptics';

export type PermissionStatus = 'granted' | 'denied' | 'pending';

export interface ScheduledReminder {
  id: string;
  projectId: string;
  projectName: string;
  triggerTime: number; // Unix timestamp
  offsetLabel: string;
  fired?: boolean;
}

class NotificationService {
  private scheduledReminders: ScheduledReminder[] = [];
  private activeTimers: Map<string, any> = new Map();

  async getPermissionStatus(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        const perm = window.Notification.permission;
        if (perm === 'granted') return 'granted';
        if (perm === 'denied') return 'denied';
        return 'pending';
      }
      const stored = await safeStorage.getItem('trak_notification_permission');
      if (stored === 'granted') return 'granted';
      if (stored === 'denied') return 'denied';
      return 'granted'; // Default mobile fallback
    } catch (e) {
      return 'pending';
    }
  }

  async requestPermission(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        const res = await window.Notification.requestPermission();
        await safeStorage.setItem('trak_notification_permission', res);
        return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'pending';
      }
      await safeStorage.setItem('trak_notification_permission', 'granted');
      return 'granted';
    } catch (e) {
      return 'pending';
    }
  }

  async sendImmediateNotification(title: string, body: string): Promise<boolean> {
    const status = await this.getPermissionStatus();
    triggerHaptic([0, 40, 60, 40]);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (status === 'granted') {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        return true;
      }
    }

    // Platform UI Fallback Alert
    Alert.alert(`🔔 ${title}`, body, [{ text: 'OK' }]);
    return true;
  }

  async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    const status = await this.getPermissionStatus();
    if (status === 'denied') {
      return {
        success: false,
        message: 'Notification permission is blocked in browser/system settings. Please allow notifications in your site settings.',
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
      'Your notification settings are working correctly.'
    );

    return {
      success: sent,
      message: 'Test notification sent successfully!',
    };
  }

  async scheduleReminder(reminder: ScheduledReminder): Promise<void> {
    this.scheduledReminders.push(reminder);
    await this.persistReminders();

    const delay = reminder.triggerTime - Date.now();
    if (delay > 0) {
      const timerId = setTimeout(() => {
        this.fireReminder(reminder);
      }, delay);
      this.activeTimers.set(reminder.id, timerId);
    }
  }

  private async fireReminder(reminder: ScheduledReminder) {
    await this.sendImmediateNotification(
      `Reminder: ${reminder.projectName}`,
      `Upcoming Deadline (${reminder.offsetLabel}): Prepare to ship!`
    );
    reminder.fired = true;
    await this.persistReminders();
    this.activeTimers.delete(reminder.id);
  }

  async syncNotifications(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.activeTimers.forEach((timer) => clearTimeout(timer));
      this.activeTimers.clear();
      console.log('[NotificationService] Paused scheduled timers.');
    } else {
      await this.restoreScheduledReminders();
    }
  }

  private async restoreScheduledReminders(): Promise<void> {
    try {
      const raw = await safeStorage.getItem('trak_scheduled_reminders');
      if (raw) {
        const list: ScheduledReminder[] = JSON.parse(raw);
        this.scheduledReminders = list;
        const now = Date.now();

        list.forEach((rem) => {
          if (!rem.fired && rem.triggerTime > now) {
            const delay = rem.triggerTime - now;
            const timerId = setTimeout(() => this.fireReminder(rem), delay);
            this.activeTimers.set(rem.id, timerId);
          }
        });
      }
    } catch (e) {
      console.error('Failed to restore reminders:', e);
    }
  }

  private async persistReminders(): Promise<void> {
    try {
      await safeStorage.setItem('trak_scheduled_reminders', JSON.stringify(this.scheduledReminders));
    } catch (e) {
      // Ignore storage error
    }
  }
}

export const notificationService = new NotificationService();
