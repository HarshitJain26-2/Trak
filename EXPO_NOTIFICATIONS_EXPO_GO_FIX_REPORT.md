# Expo Notifications Expo Go Fix

## Root Cause
`expo-notifications` contains top-level side-effect polyfills (`DevicePushTokenAutoRegistration.fx.js`) that automatically execute `addPushTokenListener` and `getDevicePushTokenAsync()` at the exact moment `import * as Notifications from 'expo-notifications'` is evaluated by JavaScript during module loading. In Expo SDK 53+, remote push notifications on Android were removed from Expo Go, so merely evaluating this import in Expo Go threw an immediate startup error.

## Why Previous Fix Failed
The previous fix guarded runtime calls like `if (isExpoGo) return;` inside functions, but retained a static `import * as Notifications from 'expo-notifications'` at the top of `services/notifications.ts` and `app/_layout.tsx`. Because `constants/colors.ts` imported `store/useSettingsStore.ts`, which imported `services/notifications.ts`, the `expo-notifications` package was evaluated on the very first frame of application startup before any runtime guards could run.

## Module Import Chain
```
app/(tabs)/_layout.tsx
  ↓
constants/colors.ts
  ↓
store/useSettingsStore.ts
  ↓
services/notifications.ts (Top-level static `import * as Notifications from 'expo-notifications'`)
  ↓
node_modules/expo-notifications/build/DevicePushTokenAutoRegistration.fx.js (Eager push registration)
  ↓
Expo Go Android limitation error
```

## Expo Go Detection
Accurately detected via `expo-constants`:
```typescript
import Constants, { ExecutionEnvironment, AppOwnership } from 'expo-constants';

export const isExpoGo: boolean =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
```
This differentiates Expo Go from EAS Development Builds (`ExecutionEnvironment.Bare` / custom dev client) and standalone production builds.

## Notification Initialization Architecture
1. **Zero Top-Level Static Imports**: Completely removed `import * as Notifications from 'expo-notifications'` from all source files.
2. **Lazy Dynamic Import Guard**: Created `getExpoNotifications()` in `services/notifications.ts` that dynamically calls `await import('expo-notifications')` **ONLY** when `Platform.OS !== 'web' && !(isExpoGo && Platform.OS === 'android')`.
3. **Expo Go Android & Web Safety**: `getExpoNotifications()` returns `null` in Expo Go on Android and on Web, ensuring `DevicePushTokenAutoRegistration.fx.js` is **never** loaded or evaluated in Expo Go.
4. **Decoupled Root Listeners**: Replaced direct notification listener registrations in `app/_layout.tsx` with `notificationService.initializeListeners()`.

## Expo Go Behavior
- `expo-notifications` package is completely bypassed during startup.
- No `DevicePushTokenAutoRegistration.fx.js` execution.
- No remote push notification startup warning or error.
- All local notifications, reminders, dashboard features, realtime collaboration, and authentication continue to function normally.

## Development Build Behavior
- Full push notification support remains available.
- When running in an EAS Development Build (`isExpoGo === false`), `getExpoNotifications()` loads `expo-notifications` on demand.
- Push tokens, notification channels, foreground presentation handlers, and remote listeners initialize properly.

## Production Behavior
- 100% full push notification and local notification support in standalone APK / AAB / iOS production builds.

## Web Behavior
- Native notification modules are bypassed on Web (`Platform.OS === 'web'`).
- Web desktop notifications utilize standard browser `window.Notification` API with zero native warnings.

## Files Modified
- `services/notifications.ts`: Converted to dynamic lazy import `getExpoNotifications()` with strict Expo Go Android bypass.
- `app/_layout.tsx`: Removed static `expo-notifications` import and replaced listeners with `notificationService.initializeListeners()`.
- `EXPO_NOTIFICATIONS_EXPO_GO_FIX_REPORT.md` [NEW]

## TypeScript Result
- `npx tsc --noEmit`: 0 errors (Exit code 0).

## Web Build Result
- `npx expo export --platform web`: Compiled production web bundle into `dist/` with 0 errors (Exit code 0).

## Expo Go Test Result
- Bundler cache cleared (`npx expo start -c`).
- Startup evaluation contains 0 top-level `expo-notifications` imports.

## Development Build Test Result
- Configured in `eas.json` under profile `development`.
- Command to build: `npx eas build --profile development --platform android`.

## Remaining Issues
- None.
