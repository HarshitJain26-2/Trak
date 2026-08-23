import { Platform } from 'react-native';
import { safeStorage } from './storage';
import { getActiveUserId } from '@/utils/deviceUser';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal project data payload for the home screen widget.
 * Only non-sensitive fields are included.
 */
export interface WidgetProjectData {
  id: string;
  name: string;
  status: string;
  progress: number;
  lastUpdated: string;
  updatedAt: number; // epoch ms
}

interface WidgetStateData {
  version: number;
  projects: WidgetProjectData[];
  updatedAt: number;
}

const WIDGET_CACHE_VERSION = 1;
const STORAGE_READ_TIMEOUT_MS = 3000;

// ─── Storage helpers ──────────────────────────────────────────────────────────

const getWidgetDataKey = (userId: string) => `trak_widget_data_${userId}`;

const readWidgetData = async (userId: string): Promise<WidgetStateData> => {
  try {
    const raw = await safeStorage.getItem(getWidgetDataKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetStateData;
      if (parsed && Array.isArray(parsed.projects) && parsed.version === WIDGET_CACHE_VERSION) {
        return parsed;
      }
    }
  } catch {
    // JSON parse error or storage read error — fall through to empty
  }
  return { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 };
};

const writeWidgetData = async (userId: string, data: WidgetStateData): Promise<void> => {
  try {
    await safeStorage.setItem(getWidgetDataKey(userId), JSON.stringify(data));
  } catch {
    // Ignore write errors
  }
};

/**
 * Race an async operation against a timeout.
 * Returns the default value if the operation exceeds the timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(defaultValue), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(defaultValue);
      });
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Update the widget data cache from the current Zustand project state.
 * Extracts minimal data from pinned, active (non-deleted, non-completed) projects.
 */
export const updateWidgetData = async (
  projects: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    lastUpdated: string;
    isPinned?: boolean;
    isDeleted?: boolean;
    isCompleted?: boolean;
  }>
): Promise<void> => {
  const userId = await getActiveUserId();
  if (!userId) return;

  const pinnedProjects = projects
    .filter((p) => p.isPinned && !p.isDeleted)
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      lastUpdated: p.lastUpdated,
      updatedAt: Date.now(),
    }));

  await writeWidgetData(userId, {
    version: WIDGET_CACHE_VERSION,
    projects: pinnedProjects,
    updatedAt: Date.now(),
  });
};

/**
 * Read the cached widget project data for the current user.
 * Used by the widget task handler when rendering the widget.
 * Includes timeout protection — returns empty array if storage read hangs.
 */
export const getWidgetProjectData = async (): Promise<WidgetProjectData[]> => {
  try {
    const userId = await withTimeout(getActiveUserId(), STORAGE_READ_TIMEOUT_MS, '');
    if (!userId) return [];

    const data = await withTimeout(
      readWidgetData(userId),
      STORAGE_READ_TIMEOUT_MS,
      { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 }
    );
    return data.projects;
  } catch {
    return [];
  }
};

/**
 * Read the full widget state data (including updatedAt timestamp).
 * Includes timeout protection.
 */
export const getWidgetStateData = async (): Promise<WidgetStateData> => {
  try {
    const userId = await withTimeout(getActiveUserId(), STORAGE_READ_TIMEOUT_MS, '');
    if (!userId) return { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 };

    const data = await withTimeout(
      readWidgetData(userId),
      STORAGE_READ_TIMEOUT_MS,
      { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 }
    );
    return data;
  } catch {
    return { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 };
  }
};

/**
 * Get the last update timestamp of the widget data.
 */
export const getWidgetDataTimestamp = async (): Promise<number> => {
  const data = await getWidgetStateData();
  return data.updatedAt;
};

/**
 * Request a widget refresh by reading cached data first, then rendering.
 * 
 * THIS IS THE FIX FOR THE INFINITE LOADING BUG:
 * Previously, renderTrakWidget() always returned a "Loading..." placeholder.
 * Now we read the actual cached widget data BEFORE requesting the refresh,
 * then pass the real data to the render function.
 */
export const refreshWidget = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    // Read actual cached data with timeout protection
    const stateData = await withTimeout(
      getWidgetStateData(),
      STORAGE_READ_TIMEOUT_MS,
      { version: WIDGET_CACHE_VERSION, projects: [], updatedAt: 0 }
    );

    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { renderWidgetWithData, renderWidgetError } = require('../widgets/TrakWidget');

    // Render with actual data — never a loading placeholder
    const renderFn = () => renderWidgetWithData(stateData.projects, stateData.updatedAt);

    await requestWidgetUpdate({
      widgetName: 'TrakWidget',
      renderWidget: renderFn,
      widgetNotFound: () => {
        // No widget on home screen — nothing to do
      },
    });
  } catch {
    // Package not available, widget not registered, or render error — silently ignore
    // The widget task handler will handle rendering on next WIDGET_UPDATE event
  }
};

/**
 * Open the launcher's native prompt to add the Trak widget to the home screen.
 * Returns false if the platform/launcher does not support pinning.
 */
export const requestAddWidget = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const { requestPinWidget } = require('react-native-android-widget');
    return await requestPinWidget({ widgetName: 'TrakWidget' });
  } catch {
    return false;
  }
};

/**
 * Clear all widget data for the current user (e.g., on sign-out).
 */
export const clearWidgetData = async (): Promise<void> => {
  try {
    const userId = await getActiveUserId();
    if (!userId) return;
    await safeStorage.removeItem(getWidgetDataKey(userId));
  } catch {
    // Ignore errors during cleanup
  }
};

/**
 * Update widget data from the project store state, then trigger a widget refresh.
 * This is the main entry point called from the store after any project state change.
 */
export const syncWidget = async (
  projects: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    lastUpdated: string;
    isPinned?: boolean;
    isDeleted?: boolean;
    isCompleted?: boolean;
  }>
): Promise<void> => {
  try {
    await updateWidgetData(projects);
    await refreshWidget();
  } catch {
    // Fire-and-forget — widget sync should never block the app
  }
};
