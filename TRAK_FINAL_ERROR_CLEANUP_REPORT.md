# Trak Final Console Cleanup and Supabase Profile Error Fix Report

## 1. 409 Profile Error

* **Exact Cause**: 
  When a user signed in with email (e.g. `harshit.jain24@vit.edu`), the active `userId` from Supabase Auth (`auth.users.id`) was used to query `public.profiles` via `.eq('id', userId)`. If the user's profile row in PostgreSQL had been created previously with a different/legacy ID format (e.g. via `00010_create_user_directly.sql`, `emailToUUID()`, or pre-existing seed data), `.eq('id', userId)` returned `null`.
  
  The code then fell through to create/upsert a new profile with `.upsert({ id: userId, email: authEmail, ... }, { onConflict: 'id' })`. In PostgreSQL, `ON CONFLICT (id)` only handles conflicts on the primary key `id`. Because the user's email was already present on another row with a `UNIQUE` constraint (`profiles_email_key`), PostgreSQL rejected the insert with error code `23505 (unique_violation)`. PostgREST mapped this to `HTTP 409 Conflict: duplicate key value violates unique constraint "profiles_email_key"`.
* **Exact File**: [store/useProfileStore.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/store/useProfileStore.ts)
* **Exact Fix**:
  1. Updated `fetchProfile` to first query by `id = userId`.
  2. If not found by `id`, it automatically queries by `email = authEmail`.
  3. When an existing profile is matched by email, it loads the profile data and synchronizes `id = userId` using a direct `UPDATE`, seamlessly linking the active auth session with the existing profile without attempting a conflicting insert.
  4. If and only if no profile exists by `id` or `email`, it safely inserts a new profile with a collision-resistant username.

---

## 2. Duplicate Profile Upsert

* **Why it Happened**:
  On application initialization in [app/_layout.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/_layout.tsx), both `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange` triggered almost simultaneously. Because `fetchProfile` in [store/useProfileStore.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/store/useProfileStore.ts) lacked in-flight promise deduplication, two separate async execution stacks ran in parallel. Both queried the database at the same millisecond, found no row by `id`, and both executed the `upsert` call, triggering the 409 error twice.
* **Fix**:
  1. Implemented `inFlightFetchProfile` promise locking in `store/useProfileStore.ts`. Any concurrent calls now await the existing in-flight request rather than firing parallel network operations.
  2. Unified auth session initialization in `app/_layout.tsx` using `isSessionInitialized` tracking to prevent redundant parallel triggers from `getSession()` and `onAuthStateChange`.

---

## 3. expo-notifications Web Warning

* **Cause**: Top-level invocation of `Notifications.setNotificationHandler(...)` in `services/notifications.ts` was executing at module load time on web browsers, where native push token listeners are unsupported.
* **Fix**: Wrapped `Notifications.setNotificationHandler(...)` inside an `if (Platform.OS !== 'web')` condition in [services/notifications.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/services/notifications.ts), preserving full foreground notification presentation handling on iOS/Android while eliminating the web warning.

---

## 4. pointerEvents Warning

* **Cause**: Passing `pointerEvents="none"` as a direct JSX component prop on `View` and `Animated.View` components is deprecated in React Native Web 0.19+ (e.g. `props.pointerEvents is deprecated. Use style.pointerEvents`).
* **Fix**: Moved all `pointerEvents` declarations from JSX element props into the `style` array (e.g. `style={[styles.container, { pointerEvents: 'none' }]}`) across all affected components:
  - [components/FuturisticLoadingScreen.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/FuturisticLoadingScreen.tsx)
  - [components/OrbitParticles.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/OrbitParticles.tsx)
  - [components/GlowRings.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/GlowRings.tsx)
  - [components/FloatingParticles.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/FloatingParticles.tsx)
  - [components/EnergyBeam.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/EnergyBeam.tsx)
  - [components/ShineSweep.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/ShineSweep.tsx)
  - [components/MotionTrail.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/MotionTrail.tsx)
  - [components/LogoVectorOverlay.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/LogoVectorOverlay.tsx)
  - [components/common/AestheticCheckbox.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/common/AestheticCheckbox.tsx)
  - [app/setup-profile.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/setup-profile.tsx)
  - [app/onboarding.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/onboarding.tsx)

---

## 5. Shadow / textShadow Warnings

* **Files**:
  - [components/ProgressCounter.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/ProgressCounter.tsx)
  - [components/common/ConfirmDialog.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/common/ConfirmDialog.tsx)
  - [components/FuturisticLoadingScreen.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/FuturisticLoadingScreen.tsx)
* **Fixes**:
  - Replaced individual `textShadowColor`, `textShadowOffset`, `textShadowRadius` with `Platform.select({ web: { textShadow: '0px 0px 8px rgba(57, 255, 136, 0.5)' }, default: { ... } })` in `ProgressCounter.tsx`.
  - Replaced `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` with `Platform.select({ web: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.5)' }, default: { ... } })` in `ConfirmDialog.tsx` and `FuturisticLoadingScreen.tsx`.

---

## 6. useNativeDriver Warning

* **Cause**: `useNativeDriver: true` in React Native `Animated` animations triggers a warning on Web browsers because React Native Web uses JS/CSS execution without the native Animated C++/Java bridge.
* **Fix**: Updated all `useNativeDriver` values across all `Animated.timing` and `Animated.spring` invocations to `useNativeDriver: Platform.OS !== 'web'`. This retains 60fps native thread execution on Android and iOS while cleanly disabling native driver on Web.
* **Files updated**:
  - `components/project/ProjectCard.tsx`
  - `components/modals/QRScannerModal.tsx`
  - `components/common/StatusDot.tsx`
  - `components/common/EmptyState.tsx`
  - `components/common/AestheticCheckbox.tsx`
  - `app/new-project.tsx`
  - `app/onboarding.tsx`
  - `app/(tabs)/deleted.tsx`
  - `app/(tabs)/completed.tsx`
  - `app/(tabs)/search.tsx`
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/project/[id].tsx`

---

## 7. Realtime

* **Subscription status**: `SUBSCRIBED` (Channel: `trak-collab`).
* **INSERT behavior**: Listens to postgres `INSERT` on `projects`, `milestones`, `project_members`, and automatically synchronizes full relational project state via `fetchProjects({ forceRefresh: true })`.
* **UPDATE behavior**: Receives `UPDATE` on `projects` and immediately applies in-memory optimistic updates to Zustand state (`projects: state.projects.map(...)`), instantly updating the card UI without page refresh.
* **DELETE behavior**: Receives `DELETE` on `projects` and immediately removes the item from Zustand store state (`projects: state.projects.filter(...)`) and local cache.

---

## 8. Live Project Update

* **Hard Refresh Status**: **NOT REQUIRED**. All project updates synchronize reactively through Zustand state management; neither `window.location.reload()`, `router.reload()`, nor polling are needed.

---

## 9. Files Modified

1. `store/useProfileStore.ts`
2. `store/useProjectStore.ts`
3. `services/notifications.ts`
4. `app/_layout.tsx`
5. `components/FuturisticLoadingScreen.tsx`
6. `components/ProgressCounter.tsx`
7. `components/common/ConfirmDialog.tsx`
8. `components/common/StatusDot.tsx`
9. `components/common/EmptyState.tsx`
10. `components/common/AestheticCheckbox.tsx`
11. `components/project/ProjectCard.tsx`
12. `components/OrbitParticles.tsx`
13. `components/GlowRings.tsx`
14. `components/FloatingParticles.tsx`
15. `components/EnergyBeam.tsx`
16. `components/ShineSweep.tsx`
17. `components/MotionTrail.tsx`
18. `components/LogoVectorOverlay.tsx`
19. `components/modals/QRScannerModal.tsx`
20. `app/new-project.tsx`
21. `app/onboarding.tsx`
22. `app/setup-profile.tsx`
23. `app/(tabs)/deleted.tsx`
24. `app/(tabs)/completed.tsx`
25. `app/(tabs)/search.tsx`
26. `app/(tabs)/index.tsx`
27. `app/(tabs)/project/[id].tsx`
28. `TRAK_FINAL_ERROR_CLEANUP_REPORT.md`

---

## 10. Remaining Console Warnings / Errors

* **Errors**: 0 active errors (409 Conflict completely eliminated).
* **Deprecation Warnings**: 0 web deprecation warnings (pointerEvents, shadow, textShadow, useNativeDriver, and expo-notifications warnings resolved).
* **TypeScript Compilation**: `npx tsc --noEmit` exits with code 0 (0 errors).
