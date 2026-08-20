import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { getActiveUserId } from '@/utils/deviceUser';
import { triggerHaptic } from '@/utils/haptics';

export type NotificationType =
  | 'project_member_joined'
  | 'project_member_left'
  | 'project_member_removed'
  | 'milestone_completed'
  | 'system';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  projectId?: string;
  projectName?: string;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  read: boolean;
  actorName?: string;
  actorUserId?: string;
}

interface NotificationStoreState {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoaded: boolean;
  activeToast: InAppNotification | null;
  loadNotifications: () => Promise<void>;
  addNotification: (item: Omit<InAppNotification, 'id' | 'time' | 'timestamp' | 'read'> & { id?: string }) => Promise<void>;
  showToast: (item: InAppNotification) => void;
  hideToast: () => void;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearStore: () => void;
}

const getStorageKey = (userId: string) => `trak_notifications_${userId}`;

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,
  activeToast: null,

  clearStore: () => {
    set({ notifications: [], unreadCount: 0, isLoaded: false, activeToast: null });
  },

  showToast: (item) => {
    triggerHaptic([0, 30, 40, 30]);
    set({ activeToast: item });
  },

  hideToast: () => {
    set({ activeToast: null });
  },

  loadNotifications: async () => {
    try {
      const activeUserId = await getActiveUserId();
      if (!activeUserId) {
        set({ notifications: [], unreadCount: 0, isLoaded: true });
        return;
      }

      // 1. First check local storage for instant render for this specific user
      const localRaw = await safeStorage.getItem(getStorageKey(activeUserId));
      let localList: InAppNotification[] = [];
      if (localRaw) {
        try {
          localList = JSON.parse(localRaw);
        } catch (_) {}
      }

      const unread = localList.filter((n) => !n.read).length;
      set({ notifications: localList, unreadCount: unread, isLoaded: true });

      // 2. Fetch authoritative notifications from Supabase
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        const mapped: InAppNotification[] = data.map((row: any) => ({
          id: row.id,
          type: row.type as NotificationType,
          projectId: row.project_id || undefined,
          title: row.title,
          desc: row.message,
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(row.created_at).getTime(),
          read: row.is_read ?? false,
          actorUserId: row.actor_id || undefined,
        }));

        const finalUnread = mapped.filter((n) => !n.read).length;
        set({ notifications: mapped, unreadCount: finalUnread, isLoaded: true });
        await safeStorage.setItem(getStorageKey(activeUserId), JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('[NotificationStore] Failed to load notifications:', err);
    }
  },

  addNotification: async (item) => {
    try {
      const activeUserId = await getActiveUserId();
      const id = item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const newNotif: InAppNotification = {
        ...item,
        id,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        read: false,
      };

      triggerHaptic([0, 40, 50, 40]);

      set((state) => {
        // Prevent duplicates by ID or identical content within a 4-second window
        if (state.notifications.some((n) => n.id === id || (n.title === item.title && n.desc === item.desc && Math.abs(n.timestamp - newNotif.timestamp) < 4000))) {
          return { ...state, activeToast: newNotif };
        }
        const updated = [newNotif, ...state.notifications].slice(0, 30);
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
          activeToast: newNotif,
        };
      });

      if (activeUserId) {
        await safeStorage.setItem(getStorageKey(activeUserId), JSON.stringify(get().notifications));
      }
    } catch (_) {}
  },

  markAllAsRead: async () => {
    try {
      const activeUserId = await getActiveUserId();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));

      if (activeUserId) {
        await safeStorage.setItem(getStorageKey(activeUserId), JSON.stringify(get().notifications));
        try {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', activeUserId);
        } catch (_) {}
      }
    } catch (_) {}
  },

  clearNotification: async (id: string) => {
    try {
      const activeUserId = await getActiveUserId();
      triggerHaptic(15);
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        };
      });

      if (activeUserId) {
        await safeStorage.setItem(getStorageKey(activeUserId), JSON.stringify(get().notifications));
        try {
          await supabase.from('notifications').delete().eq('id', id).eq('user_id', activeUserId);
        } catch (_) {}
      }
    } catch (_) {}
  },

  clearAll: async () => {
    try {
      const activeUserId = await getActiveUserId();
      triggerHaptic(20);
      set({ notifications: [], unreadCount: 0 });

      if (activeUserId) {
        await safeStorage.setItem(getStorageKey(activeUserId), JSON.stringify([]));
        try {
          await supabase.from('notifications').delete().eq('user_id', activeUserId);
        } catch (_) {}
      }
    } catch (_) {}
  },
}));
