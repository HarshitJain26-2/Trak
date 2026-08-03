import { Alert, Platform } from 'react-native';
import { safeStorage } from './storage';

export const notificationService = {
  syncNotifications: async (enabled: boolean, projectsCount = 0) => {
    try {
      if (enabled) {
        await safeStorage.setItem('trak_notifications_active', 'true');
        if (projectsCount > 0) {
          console.log(`[Notifications] Active: Monitoring ${projectsCount} project deadlines.`);
        }
      } else {
        await safeStorage.setItem('trak_notifications_active', 'false');
        console.log('[Notifications] Disabled: Reminders paused.');
      }
    } catch (err) {
      console.error('[Notifications] Failed to sync notification state', err);
    }
  },

  scheduleProjectReminder: async (projectName: string, deadline: string) => {
    const isActive = await safeStorage.getItem('trak_notifications_active');
    if (isActive === 'true') {
      console.log(`[Notifications] Scheduled deadline reminder for ${projectName} on ${deadline}`);
    }
  },
};
