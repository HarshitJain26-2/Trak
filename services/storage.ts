import { Platform } from 'react-native';

// Memory cache fallback in case native storage or localStorage is unavailable
const memoryStorage: Record<string, string> = {};

let getAsyncStorage = (): any => {
  try {
    const mod = require('@react-native-async-storage/async-storage');
    return mod.default || mod;
  } catch (e) {
    return null;
  }
};

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const asyncStorage = getAsyncStorage();
      if (asyncStorage && typeof asyncStorage.getItem === 'function') {
        const val = await asyncStorage.getItem(key);
        return val ?? memoryStorage[key] ?? null;
      }
      return memoryStorage[key] ?? null;
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
      const asyncStorage = getAsyncStorage();
      if (asyncStorage && typeof asyncStorage.setItem === 'function') {
        await asyncStorage.setItem(key, value);
      }
    } catch (e) {
      // Silently fall back to memory storage
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      delete memoryStorage[key];
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const asyncStorage = getAsyncStorage();
      if (asyncStorage && typeof asyncStorage.removeItem === 'function') {
        await asyncStorage.removeItem(key);
      }
    } catch (e) {
      // Silently handle
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      const asyncStorage = getAsyncStorage();
      if (asyncStorage && typeof asyncStorage.getAllKeys === 'function') {
        const keys = await asyncStorage.getAllKeys();
        return Array.from(new Set([...keys, ...Object.keys(memoryStorage)]));
      }
      return Object.keys(memoryStorage);
    } catch (e) {
      return Object.keys(memoryStorage);
    }
  },
};
