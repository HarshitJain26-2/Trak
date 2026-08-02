import { safeStorage } from './storage';
import { supabase } from './supabase';

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
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash * 31).toString(16).padStart(12, '0');
  return `${hex1.slice(0, 8)}-4000-8000-${hex2.slice(0, 12)}`;
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
