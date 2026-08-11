import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://xieqehaznjfnwslekqlg.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_YkD37MtqKEGulG25l2-1OA_8h4bV1HL';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing in environment variables.');
}

// In-memory fallback map if AsyncStorage native module is null (e.g. in certain Expo Go versions or Web)
const memoryStorage = new Map<string, string>();

const CustomStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const val = await AsyncStorage.getItem(key);
      return val;
    } catch (e) {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      memoryStorage.delete(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CustomStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Utility function to extract OAuth session parameters (hash or query) from a redirect URL
 * and establish the Supabase session in Expo.
 */
export const createSessionFromUrl = async (url: string) => {
  if (!url) return null;

  const params: Record<string, string> = {};

  // Extract hash parameters (#access_token=...&refresh_token=...) or query parameters (?code=...)
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  let paramString = '';
  if (hashIndex !== -1) {
    paramString = url.substring(hashIndex + 1);
  } else if (queryIndex !== -1) {
    paramString = url.substring(queryIndex + 1);
  }

  if (paramString) {
    paramString.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
  }

  // Handle PKCE auth code exchange
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  // Handle direct implicit token pair
  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return data.session;
  }

  return null;
};

