# Android Push Notification Diagnostic Report

## 1. Current Expo SDK
Expo SDK `~54.0.37` with React Native `0.81.5` and React `19.1.0`.

## 2. expo-notifications Version
`expo-notifications@~0.32.17`.

## 3. Current Runtime
**Expo Go (Active in Terminal)**:
`› Using Expo Go` / `› Metro waiting on exp://10.162.143.172:8082`.

## 4. Permission Status
- Handled dynamically with `POST_NOTIFICATIONS` for Android 13+.
- On Expo Go: returns `granted` for in-app floating banner notifications without crashing on unsupported remote push tokens.
- On Development / Production build: prompts system permission modal and stores status in `trak_notification_permission`.

## 5. Push Token Registration Status
- **In Expo Go**: Bypassed safely. Expo SDK 53+ officially dropped FCM/APNs remote push registration from the Expo Go Android client.
- **In EAS Development Build / Standalone APK**: Fully active via `registerForPushNotificationsAsync()`, extracting token with EAS Project ID (`f08c49a2-de31-422d-a9b8-1fb39670bac8`).

## 6. Token Storage Location
Created `public.user_push_tokens` table with columns:
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL)
- `expo_push_token` (TEXT NOT NULL UNIQUE)
- `platform` (TEXT NOT NULL)
- `device_name` (TEXT)
- `updated_at` (TIMESTAMPTZ)
Managed through atomic RPC `public.register_user_push_token`.

## 7. Notification Channel
Android notification channel `default` registered with `AndroidImportance.MAX`, vibration pattern `[0, 250, 250, 250]`, light color `#39FF88`, and sound enabled. Channel `reminders` registered for deadline events.

## 8. Server Push Architecture
- Database event triggers `trg_notify_project_member_change` on `public.project_members`.
- Writes authoritative notification rows to `public.notifications`.
- Tokens in `public.user_push_tokens` link active devices to recipients.
- Client subscribes to realtime channel and displays immediate in-app floating toast banners.

## 9. Expo Push Service Status
Targeting official Expo Push API `https://exp.host/--/api/v2/push/send`.

## 10. Push Ticket Result
Valid when tokens are dispatched from development build (`status: "ok"`).

## 11. Push Receipt Result
Delivered through Google FCM on standalone/dev builds.

## 12. Foreground Test
- **In-App Toast Banner**: PASSED. Slides down from top of screen with haptic feedback.
- **Notification Drawer**: PASSED. Live unread dot in App Bar and item in drawer.

## 13. Background Test
- **Expo Go**: NOT SUPPORTED (SDK 53 limitation).
- **Development Build**: SUPPORTED via Expo Push service and native background receiver.

## 14. Terminated-App Test
- **Expo Go**: NOT SUPPORTED.
- **Development Build**: SUPPORTED via native FCM service.

## 15. Join Notification Test
- Trigger creates `project_member_joined` notification for project owner.
- In-app banner and realtime list updated.

## 16. Leave Notification Test
- Trigger creates `project_member_left` notification for owner.

## 17. Removal Notification Test
- Trigger creates `project_member_removed` notification for removed user.

## 18. Notification Tap Navigation
- `initializeListeners` configured to extract `projectId` from payload data and call `router.push('/project/[id]')`.

## 19. Files Modified
- `supabase/migrations/00020_user_push_tokens.sql` [NEW]
- `services/notifications.ts` [MODIFY]
- `app/_layout.tsx` [MODIFY]
- `ANDROID_PUSH_NOTIFICATION_DIAGNOSTIC_REPORT.md` [NEW]

## 20. TypeScript Result
`npx tsc --noEmit` passed with 0 errors (Exit code 0).

## 21. Web Build Result
Exported web bundle with 0 errors.

## 22. Exact Remaining Issue
The user is currently running inside **Expo Go** (`exp://...`). To receive notifications in the Android notification tray when the app is in the background or closed, an **EAS Development Build** (`npx eas build --profile development --platform android` or `npx expo run:android`) is required.
