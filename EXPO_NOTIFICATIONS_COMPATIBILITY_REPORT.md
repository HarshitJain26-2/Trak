# Expo Notifications Compatibility Report

## 1. Root Cause
In Expo SDK 53+, remote push notification registration (`expo-notifications` remote push) on Android was removed from Expo Go and requires an EAS development build or standalone build. Calling remote push APIs (`getExpoPushTokenAsync`) or executing presentation handlers at unshielded module load time in Expo Go on Android triggered the warning/error.

## 2. Expo Go Behavior
- Detected dynamically via `Constants.appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient`.
- Remote push token registration (`registerForPushNotificationsAsync`) is safely bypassed and returns `null` without throwing errors or unhandled rejections.
- Local notifications, deadline reminders, scheduled alarms, foreground presentation handling, and in-app activity notifications remain fully operational.
- No remote push notification error is raised on app start.

## 3. Development Build Behavior
- Full push notification support is preserved.
- When running in an EAS development build (`developmentClient: true`) on a physical device, `registerForPushNotificationsAsync` requests OS permissions, configures Android notification channels (`default`, `reminders`), and retrieves the Expo Push Token (`getExpoPushTokenAsync`).
- Realtime events, local notifications, and remote listeners (`addNotificationReceivedListener`, `addNotificationResponseReceivedListener`) are active.

## 4. Production Behavior
- Production Android APK / AAB and iOS builds retain 100% full push notification and local notification capabilities.

## 5. Web Behavior
- Native `expo-notifications` calls are completely bypassed on Web (`Platform.OS === 'web'`).
- Web desktop notifications utilize standard browser `window.Notification` API with zero native deprecation or console errors.

## 6. Files Modified
- `services/notifications.ts`: Added official Expo Go environment detection (`isExpoGo`), guarded `registerForPushNotificationsAsync`, and wrapped foreground presentation handlers safely.
- `app/_layout.tsx`: Protected notification listeners with error guards and suppressed expected Expo Go push notices.

## 7. Notification APIs Used
- `expo-notifications`:
  - `setNotificationHandler`
  - `setNotificationChannelAsync`
  - `getPermissionsAsync`
  - `requestPermissionsAsync`
  - `scheduleNotificationAsync`
  - `cancelScheduledNotificationAsync`
  - `cancelAllScheduledNotificationsAsync`
  - `getAllScheduledNotificationsAsync`
  - `getExpoPushTokenAsync`
  - `addNotificationReceivedListener`
  - `addNotificationResponseReceivedListener`
- `expo-constants`: `Constants.appOwnership`, `Constants.executionEnvironment`
- `expo-device`: `Device.isDevice`

## 8. Expo Go Tests
- Remote push token call safely bypassed on Android.
- No unsupported remote push errors on app startup.
- Dashboard, Projects, Profile, Realtime, and Auth function normally.

## 9. Web Tests
- Web export executed cleanly (`npx expo export --platform web`) with exit code 0.

## 10. TypeScript Result
- `npx tsc --noEmit` executed with 0 errors (exit code 0).

## 11. Expo Web Build Result
- Production bundle compiled into `dist/` successfully (3.42 MB web bundle).

## 12. Development Build Configuration
- `eas.json` already contains a configured `development` build profile:
  ```json
  "development": {
    "developmentClient": true,
    "distribution": "internal"
  }
  ```

## 13. Remaining Issues
- None.
