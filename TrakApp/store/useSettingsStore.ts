import { create } from 'zustand';
import { safeStorage } from '../lib/storage';

export interface SettingsState {
  notificationsEnabled: boolean;
  autoSync: boolean;
  compactCards: boolean;
  hapticsEnabled: boolean;
  toggleNotification: (enabled: boolean) => Promise<void>;
  toggleAutoSync: (enabled: boolean) => Promise<void>;
  toggleCompactCards: (enabled: boolean) => Promise<void>;
  toggleHaptics: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  notificationsEnabled: true,
  autoSync: true,
  compactCards: false,
  hapticsEnabled: true,

  loadSettings: async () => {
    try {
      const raw = await safeStorage.getItem('trak_user_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        set((state) => ({ ...state, ...parsed }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  },

  toggleNotification: async (enabled: boolean) => {
    set({ notificationsEnabled: enabled });
    const { loadSettings, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, notificationsEnabled: enabled }));
  },

  toggleAutoSync: async (enabled: boolean) => {
    set({ autoSync: enabled });
    const { loadSettings, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, autoSync: enabled }));
  },

  toggleCompactCards: async (enabled: boolean) => {
    set({ compactCards: enabled });
    const { loadSettings, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, compactCards: enabled }));
  },

  toggleHaptics: async (enabled: boolean) => {
    set({ hapticsEnabled: enabled });
    const { loadSettings, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, hapticsEnabled: enabled }));
  },
}));
