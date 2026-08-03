import { create } from 'zustand';
import { safeStorage } from '../lib/storage';
import { triggerHaptic } from '../lib/haptics';
import { notificationService } from '../lib/notifications';
import { SupportedLanguage, getDeviceLanguage } from '../lib/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SettingsState {
  themeMode: ThemeMode;
  language: SupportedLanguage;
  notificationsEnabled: boolean;
  autoSync: boolean;
  compactCards: boolean;
  hapticsEnabled: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleNotification: (enabled: boolean) => Promise<void>;
  toggleAutoSync: (enabled: boolean) => Promise<void>;
  toggleCompactCards: (enabled: boolean) => Promise<void>;
  toggleHaptics: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeMode: 'system',
  language: getDeviceLanguage(),
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
        await notificationService.syncNotifications(parsed.notificationsEnabled ?? true);
      } else {
        // First visit default
        const deviceLang = getDeviceLanguage();
        set({ language: deviceLang });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    triggerHaptic(15);
    set({ themeMode: mode });
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, themeMode: mode }));
  },

  setLanguage: async (lang: SupportedLanguage) => {
    triggerHaptic(15);
    set({ language: lang });
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, language: lang }));
  },

  toggleNotification: async (enabled: boolean) => {
    triggerHaptic(15);
    set({ notificationsEnabled: enabled });
    await notificationService.syncNotifications(enabled);
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, notificationsEnabled: enabled }));
  },

  toggleAutoSync: async (enabled: boolean) => {
    triggerHaptic(15);
    set({ autoSync: enabled });
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, autoSync: enabled }));
  },

  toggleCompactCards: async (enabled: boolean) => {
    triggerHaptic(15);
    set({ compactCards: enabled });
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, compactCards: enabled }));
  },

  toggleHaptics: async (enabled: boolean) => {
    if (enabled) {
      triggerHaptic([0, 30, 50, 30]);
    }
    set({ hapticsEnabled: enabled });
    const { loadSettings, setThemeMode, setLanguage, toggleNotification, toggleAutoSync, toggleCompactCards, toggleHaptics, ...dataToSave } = get();
    await safeStorage.setItem('trak_user_settings', JSON.stringify({ ...dataToSave, hapticsEnabled: enabled }));
  },
}));
