import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache fallback in case native storage or localStorage is unavailable
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const val = await AsyncStorage.getItem(key);
      return val ?? memoryStorage[key] ?? null;
    } catch (e) {
      return memoryStorage[key] ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      memoryStorage[key] = value;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Silently fall back to memory storage without throwing to LogBox
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      delete memoryStorage[key];
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Silently handle
    }
  },
};
