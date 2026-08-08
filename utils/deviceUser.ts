import { safeStorage } from '@/services/storage';
import { supabase } from '@/services/supabase';

const DEVICE_ID_KEY = 'trak_device_id';

/** Generate a valid UUID v4 compliant string */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const AUTH_USER_ID_KEY = 'trak_active_user_id';

/** Deterministic UUID from email address */
export const emailToUUID = (email: string): string => {
  const clean = email.trim().toLowerCase();
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash1 = (hash1 << 5) - hash1 + char;
    hash1 |= 0;
    hash2 = (hash2 << 7) - hash2 + char;
    hash2 |= 0;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash1 * 31).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash2 * 17).toString(16).padStart(8, '0');
  const hex5 = Math.abs(hash1 * 13).toString(16).padStart(8, '0');

  // Return standard 8-4-4-4-12 UUID format (e.g. 18c72a87-4000-8000-0003-001e26591234)
  return `${hex1.slice(0, 8)}-${hex2.slice(0, 4)}-4${hex3.slice(0, 3)}-8${hex4.slice(0, 3)}-${hex5.slice(0, 8)}${hex2.slice(0, 4)}`;
};

export const setActiveUserId = async (userId: string | null) => {
  if (userId) {
    await safeStorage.setItem(AUTH_USER_ID_KEY, userId);
  } else {
    await safeStorage.removeItem(AUTH_USER_ID_KEY);
  }
};

/**
 * Returns the active user ID — from Supabase Auth if logged in,
 * or stored active user ID, or persistent local device UUID.
 */
export const getActiveUserId = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch {
    // Ignore auth errors
  }

  const savedUserId = await safeStorage.getItem(AUTH_USER_ID_KEY);
  if (savedUserId) {
    return savedUserId;
  }

  let deviceId = await safeStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    await safeStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getDeviceId = async (): Promise<string> => {
  let deviceId = await safeStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    await safeStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};
