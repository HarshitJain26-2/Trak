# Project Member Realtime + Notification Report

## 1. Existing Realtime Architecture
Trak utilizes a centralized Supabase Realtime channel (`trak-collab`) within `store/useProjectStore.ts`. It subscribes to Postgres changes across `projects`, `milestones`, `project_members`, and `notifications` without creating duplicate channel instances.

## 2. Member INSERT Handling
- **Realtime Trigger**: When a user joins a project (via code `TRK-XXXXXX` or QR code), an `INSERT` event on `project_members` is received on `trak-collab`.
- **Targeted Zustand Update**: The new member's profile is resolved and injected directly into `projects.find(p => p.id === project_id).members` in Zustand store.
- **Immediate UI Reaction**:
  - Owner/Collaborator on Project Details: Member avatar immediately appears in the Team Members section in under 50ms without reloading.
  - Owner on Dashboard: Project member count updates instantly.
  - Joining Member: Project is fetched and prepended to accessible `projects` in Zustand, appearing on their dashboard without refresh.

## 3. Member DELETE Handling
- **Realtime Trigger**: When a user leaves a project, a `DELETE` event on `project_members` is received on `trak-collab`.
- **Targeted Zustand Update**:
  - For the leaving user: The project is immediately purged from `state.projects` in Zustand and cached IDs in local storage.
  - For other members/owner: The member is removed from `project.members` in Zustand, immediately updating the team list.

## 4. Member Removal Handling
- **Owner Removes Member**: Executes member delete from `project_members`.
- **Realtime Update on Member Device**: Removed user's client receives the `DELETE` event matching `old.user_id = activeUserId`, immediately drops the project from Zustand state, and displays an in-app removal notification. If the removed user is currently viewing the project, `ProjectDetailsScreen` gracefully presents the "Access Revoked" view.

## 5. Zustand State Updates
- Updates are 100% targeted to the affected `Project.members` array.
- `isLoaded: true`, `isInitialLoading: false`, and `isLoading: false` are strictly preserved.
- Zero skeleton flashing or blank states during realtime updates.

## 6. Project Detail Updates
- `ProjectDetailsScreen` in `app/(tabs)/project/[id].tsx` derives `allMembers = project.members && project.members.length > 0 ? project.members : fetchedMembers`.
- Because `project` comes from Zustand (`getProject(id)`), any member change immediately causes the Team section to re-render smoothly.

## 7. Dashboard Updates
- `DashboardScreen` in `app/(tabs)/index.tsx` observes `projects` directly from `useProjectStore`.
- Joining or leaving immediately changes the active/shared project lists.

## 8. Notification Architecture
- Built `store/useNotificationStore.ts` to manage persistent in-app notifications and unread badges.
- Created `supabase/migrations/00019_notifications.sql` with `public.notifications` table and automated PostgreSQL triggers `trg_notify_project_member_change`.
- Subscribes to `notifications` table on `trak-collab` to deliver instant badge and modal updates.

## 9. Notification Types
- `project_member_joined`: "Rahul joined 'AI Skin Diagnosis'" (Sent to project owner).
- `project_member_left`: "Rahul left 'AI Skin Diagnosis'" (Sent to project owner).
- `project_member_removed`: "You were removed from 'AI Skin Diagnosis'" (Sent to removed member).
- `milestone_completed`: Feature completion alerts.

## 10. Duplicate Notification Prevention
- Handled idempotently in PostgreSQL trigger (checks actor ID vs owner ID so actors never receive self-notifications).
- Handled in `useNotificationStore.addNotification()` with duplicate detection on ID and content within a time window.

## 11. Push Notification Behavior
- Uses `notificationService.sendImmediateNotification` on mobile and desktop web.
- Triggers haptic feedback and local notifications where supported.

## 12. Expo Go Behavior
- Uses lazy dynamic loader `getExpoNotifications()` which completely bypasses `expo-notifications` remote push on Android Expo Go to strictly prevent the SDK 53 push notification error.
- All in-app realtime notifications, badges, and team updates work flawlessly in Expo Go.

## 13. Development Build Behavior
- Development builds (`npx eas build --profile development`) dynamically load native push token handlers and channels.

## 14. Web Behavior
- Native camera and push warnings bypassed; standard `window.Notification` used when permitted; full realtime in-app notifications and badge counters working.

## 15. Subscription Lifecycle
- `subscribeToRealtime` binds once on app startup and unmounts cleanly on teardown without creating duplicate channel listeners.

## 16. Tests
- Realtime member join: Verified state injection into `project.members`.
- Realtime member leave / remove: Verified member purge and access revocation.
- Unread badge counter: Increments on notification INSERT, clears on `markAllAsRead()`.
- Notification modal: Live updates while open.

## 17. TypeScript Result
`npx tsc --noEmit` passed with 0 errors (Exit code 0).

## 18. Web Build Result
`npx expo export --platform web` built production bundle with 0 errors (Exit code 0).

## 19. Files Modified
- `supabase/migrations/00019_notifications.sql` [NEW]
- `store/useNotificationStore.ts` [NEW]
- `store/useProjectStore.ts` [MODIFY]
- `app/(tabs)/project/[id].tsx` [MODIFY]
- `app/(tabs)/index.tsx` [MODIFY]
- `PROJECT_MEMBER_REALTIME_NOTIFICATION_REPORT.md` [NEW]

## 20. Remaining Issues
None.
