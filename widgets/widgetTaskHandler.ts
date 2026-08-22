import { Platform } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getWidgetProjectData } from '@/services/widget';
import { renderTrakWidgetContent, DARK_THEME, LIGHT_THEME } from './TrakWidget';

// ─── Widget Task Handler ──────────────────────────────────────────────────────

/**
 * Handles all widget lifecycle events:
 * - WIDGET_ADDED: Widget placed on home screen
 * - WIDGET_UPDATE: Periodic or manual update
 * - WIDGET_RESIZED: User resized the widget
 * - WIDGET_DELETED: Widget removed from home screen
 * - WIDGET_CLICK: User tapped a clickable area
 *
 * Reads pinned project data from AsyncStorage and renders the widget UI.
 */
const widgetTaskHandler = async (props: WidgetTaskHandlerProps): Promise<void> => {
  const { widgetInfo, widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_CLICK':
      // Click actions are handled via clickAction props on FlexWidget
      // (OPEN_URI for deep links, OPEN_APP for opening the app)
      break;

    case 'WIDGET_DELETED':
      // Clean up is handled by the app when user signs out
      break;

    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    default: {
      const projects = await getWidgetProjectData();
      const { width, height } = widgetInfo;

      const lightWidget = renderTrakWidgetContent(projects, width, height, LIGHT_THEME);
      const darkWidget = renderTrakWidgetContent(projects, width, height, DARK_THEME);

      renderWidget({
        light: lightWidget,
        dark: darkWidget,
      });
      break;
    }
  }
};

/**
 * Register the widget task handler on Android.
 * Called from the root layout on app launch.
 * No-op on non-Android platforms.
 */
export const registerTrakWidgetHandler = (): void => {
  if (Platform.OS !== 'android') return;

  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Package not available — silently ignore (web/iOS or Expo Go)
  }
};
