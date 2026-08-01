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

/**
 * Returns the active user ID — either from Supabase Auth if logged in,
 * or a persistent local device UUID if unauthenticated.
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

  let deviceId = await safeStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    await safeStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};
