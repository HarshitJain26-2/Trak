# Trak Project Join Code + QR Report

## 1. Existing Architecture
Trak previously managed project collaboration using `public.projects` (keyed by `id TEXT` and `user_id UUID`), `public.project_members` (mapping `project_id TEXT` and `user_id UUID` with default role `'member'`), and authenticated sessions via Supabase Auth (`auth.uid()`). The new collaboration system cleanly extends this architecture without adding secondary membership systems or external URL dependencies.

## 2. Database Changes
Created migration `supabase/migrations/00018_project_join_code.sql`:
- Added column `join_code TEXT` to `public.projects`.
- Added PostgreSQL uniqueness constraint `projects_join_code_key UNIQUE(join_code)`.
- Added index `idx_projects_join_code` on `projects(join_code)`.
- Backfilled all existing projects with cryptographically random join codes.
- Added `BEFORE INSERT` trigger `trg_set_project_join_code` to auto-populate unique join codes for newly created projects.
- Added security definer RPC `public.join_project_by_code(code TEXT) RETURNS JSONB`.
- Added security definer RPC `public.regenerate_project_join_code(p_project_id TEXT) RETURNS JSONB`.

## 3. Join Code Format
- **Format**: `TRK-XXXXXX`
- **Character Set**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 uppercase alphanumeric characters).
- **Readability**: Visually ambiguous characters (`0`, `O`, `1`, `I`) are omitted.
- **Example**: `TRK-7K4P9Q`

## 4. Code Generation
- Generated via PostgreSQL `public.generate_unique_join_code()` using `gen_random_bytes(6)` mapped across the 32-character alphabet.
- Guaranteed unique at database level via collision loop and `UNIQUE` constraint.
- Completely decoupled from sequential IDs, project UUIDs, timestamps, user IDs, and emails.

## 5. QR Implementation
- Implemented using `react-native-qrcode-svg` with high contrast, quiet zone padding, and crisp vector SVG rendering on iOS, Android, and Web.
- **Payload**: Contains strictly the plain join code string (e.g. `TRK-7K4P9Q`).
- Contains zero tokens, URLs, user IDs, or sensitive authentication parameters.

## 6. Join Flow
1. User enters code manually in `JoinProjectModal` or scans with `QRScannerModal`.
2. Client normalizes input (trims whitespace, converts to uppercase, prepends `TRK-` if omitted) and validates format with `^TRK-[A-Z0-9]{6}$`.
3. Client executes `supabase.rpc('join_project_by_code', { code })`.
4. The database securely identifies the user from `auth.uid()` (client cannot specify user ID or role).
5. Database checks if user is owner (`already_owner`), already member (`already_member`), or new member (`joined`).
6. If new member, creates `project_members` row with default role `'member'`.
7. Local Zustand state triggers silent background sync (`fetchProjects({ forceRefresh: true })`), seamlessly adding the project to the user's dashboard without flashing skeletons or full-screen reloads.

## 7. Duplicate Protection
- PostgreSQL level constraint `UNIQUE(project_id, user_id)` on `public.project_members`.
- Database RPC verifies ownership and existing membership before insertion, returning explicit `already_owner` or `already_member` status.

## 8. Security
- Authentication is strictly derived from server-side `auth.uid()`.
- Client cannot pass `user_id` or escalate `role`.
- No sensitive credentials, tokens, or emails are encoded in QR codes or stored in logs.
- RLS remains fully enabled and protected.

## 9. RLS
- All member lookups and inserts are handled through security definer RPCs that strictly enforce `auth.uid() = user_id`.
- Read and update policies on `projects` and `project_members` verify membership via `user_can_access_project()`.

## 10. Realtime
- Reuses existing `trak-collab` Supabase Realtime channel.
- Listens to `INSERT` and `DELETE` on `project_members` and `UPDATE` on `projects`.
- When a teammate joins, the owner's screen updates member chips instantly without refreshing or flashing skeletons.

## 11. Regeneration
- Project owners can tap **Regenerate Code** in `ProjectCodeModal`.
- Protected by `ask()` confirmation dialog.
- Invokes `regenerate_project_join_code(p_project_id)`.
- Replaces the code in the database and invalidates the previous code instantly.
- Updates owner's local state and propagates to other admin sessions via Realtime.

## 12. Web Behavior
- Manual code entry is available in `JoinProjectModal` on Web.
- `QRScannerModal` on Web gracefully informs the user that camera scanning is available on mobile and redirects to manual entry.
- QR code rendering works cleanly on Web via SVG.

## 13. Android Behavior
- Mobile camera viewfinder via `expo-camera` (`CameraView`) scans `TRK-XXXXXX` QR codes with corner framing and haptic feedback.
- Handles camera permissions (grant, deny, open settings).

## 14. Tests
- **TEST 1 (Code Generation)**: `trg_set_project_join_code` automatically creates `TRK-XXXXXX` on insert.
- **TEST 2 (Migration Backfill)**: Existing projects backfilled with unique join codes.
- **TEST 3 (Format Validation)**: Rejects invalid codes client-side and server-side.
- **TEST 4 (Owner & Duplicate Checks)**: Returns `already_owner` and `already_member` with direct "Open Project" option.
- **TEST 5 (Regeneration)**: Non-owners blocked; old codes immediately rejected by RPC.
- **TEST 6 (TypeScript Check)**: `npx tsc --noEmit` exited with code 0.
- **TEST 7 (Expo Web Export)**: `npx expo export --platform web` built production bundle with code 0.

## 15. TypeScript Result
`npx tsc --noEmit` passed with 0 errors (Exit code 0).

## 16. Expo Web Build Result
`npx expo export --platform web` compiled bundle to `dist/` with 0 errors (Exit code 0).

## 17. Files Modified
- `supabase/migrations/00018_project_join_code.sql` [NEW]
- `components/modals/ProjectCodeModal.tsx` [NEW]
- `components/modals/JoinProjectModal.tsx` [NEW]
- `components/modals/QRScannerModal.tsx` [NEW]
- `store/useProjectStore.ts` [MODIFY]
- `app/(tabs)/project/[id].tsx` [MODIFY]
- `app/(tabs)/index.tsx` [MODIFY]
- `package.json` [MODIFY]

## 18. Supabase Migration
`supabase/migrations/00018_project_join_code.sql`

## 19. Remaining Issues
None.
