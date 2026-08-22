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
  projects: WidgetProjectData[];
  updatedAt: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const getWidgetDataKey = (userId: string) => `trak_widget_data_${userId}`;

const readWidgetData = async (userId: string): Promise<WidgetStateData> => {
  try {
    const raw = await safeStorage.getItem(getWidgetDataKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetStateData;
      if (parsed && Array.isArray(parsed.projects)) {
        return parsed;
      }
    }
  } catch {
    // Ignore read errors
  }
  return { projects: [], updatedAt: 0 };
};

const writeWidgetData = async (userId: string, data: WidgetStateData): Promise<void> => {
  try {
    await safeStorage.setItem(getWidgetDataKey(userId), JSON.stringify(data));
  } catch {
    // Ignore write errors
  }
};

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
    projects: pinnedProjects,
    updatedAt: Date.now(),
  });
};

/**
 * Read the cached widget project data for the current user.
 * Used by the widget task handler when rendering the widget.
 */
export const getWidgetProjectData = async (): Promise<WidgetProjectData[]> => {
  const userId = await getActiveUserId();
  if (!userId) return [];
  const data = await readWidgetData(userId);
  return data.projects;
};

/**
 * Get the last update timestamp of the widget data.
 */
export const getWidgetDataTimestamp = async (): Promise<number> => {
  const userId = await getActiveUserId();
  if (!userId) return 0;
  const data = await readWidgetData(userId);
  return data.updatedAt;
};

/**
 * Request a widget refresh by calling the native widget update API.
 * On non-Android platforms or when no widget is added, this is a no-op.
 */
export const refreshWidget = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    await requestWidgetUpdate({
      widgetName: 'TrakWidget',
      renderWidget: () => require('../widgets/TrakWidget').renderTrakWidget(),
      widgetNotFound: () => {
        // No widget on home screen — nothing to do
      },
    });
  } catch {
    // Package not available or widget not registered — silently ignore
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
  const userId = await getActiveUserId();
  if (!userId) return;
  await safeStorage.removeItem(getWidgetDataKey(userId));
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
  await updateWidgetData(projects);
  await refreshWidget();
};
