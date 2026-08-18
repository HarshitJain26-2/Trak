# Trak Project Link Sharing Implementation

## 1. Existing Project Architecture

In Trak:
- **Projects (`public.projects`)**: Each project is identified by `id` (TEXT) and owned by `user_id` (UUID / text `auth.uid()`). A project has title `name`, `status`, `tech_stack`, `deadline`, `progress`, `milestones`, and `invite_code`.
- **Project Members (`public.project_members`)**: Maps users to projects with `id`, `project_id`, `user_id`, `role` (`owner` | `member`), `joined_at`, with a unique constraint on `(project_id, user_id)`.
- **Ownership Model**: `projects.user_id` is the authoritative project owner (project leader). In Zustand (`store/useProjectStore.ts`), `project.isShared` is false for the owner and true for joined collaborators.
- **State Management & Persistence**: Projects are cached locally in AsyncStorage (`safeStorage`) and synced to Supabase with in-flight request deduplication and background fetching.

---

## 2. Database Changes

Created migration file [`supabase/migrations/00015_project_invites.sql`](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/supabase/migrations/00015_project_invites.sql):

### 1. `public.project_invites` Table:
```sql
CREATE TABLE IF NOT EXISTS public.project_invites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. Indexes:
- `idx_project_invites_token_hash` on `(token_hash)` for O(1) indexed lookup.
- `idx_project_invites_project_id` on `(project_id)` for relational project joins and cascade deletes.
- `idx_project_invites_is_active` on `(is_active)` for active invite filtering.

### 3. Stored Procedures / RPCs:
- `create_project_invite(p_project_id, p_token_hash, p_expires_at, p_max_uses)`: Authenticated SECURITY DEFINER function that verifies caller is project owner, deactivates older invites for this project, and inserts a new invite record.
- `revoke_project_invite(p_project_id, p_invite_id)`: Deactivates the active invite (`is_active = false`) for the project.
- `get_project_active_invite(p_project_id)`: Fetches current active invite details for project owner.
- `validate_project_invite(p_token_hash)`: STABLE SECURITY DEFINER function callable by anyone (including anonymous prospective joiners) returning safe metadata without exposing user internal IDs or credentials.
- `join_project_with_invite(p_token_hash, p_user_id)`: Atomic transaction with `FOR UPDATE` row locking to prevent race conditions on concurrent joins and max_uses limits.

---

## 3. Invite Token Design

- **Entropy & Generation**: Generated on client side via `expo-crypto` (`Crypto.getRandomBytesAsync(32)` = 256 bits of cryptographic entropy) and encoded into a 43-character URL-safe base64 string.
- **No Predictability**: Not based on user ID, email, project ID, timestamp-only, or sequential sequences.
- **Hashing**: Tokens are hashed with SHA-256 (`Crypto.digestStringAsync(SHA256, token)`).
- **Bearer Credential Safety**: The database only stores `token_hash`. The raw token is NEVER stored in the database, never logged to console or analytics, and never returned in general queries.

---

## 4. RLS Policies

Row Level Security is enabled on `public.project_invites`:
- **SELECT**: Restricted to project owners (`created_by = auth.uid()::text` or `projects.user_id = auth.uid()::text`).
- **INSERT / UPDATE / DELETE**: Restricted to project owners.
- **Anonymous / Non-Member Validation**: Performed strictly through hardened PostgreSQL RPCs (`validate_project_invite`, `join_project_with_invite`) using SECURITY DEFINER functions with explicit parameter checks.

---

## 5. Invite Creation

1. Project Owner opens the **Share Project** modal from the Project Details screen or the Project Action sheet.
2. Owner chooses expiration option (Never, 1 hour, 24 hours, 7 days, 30 days) and maximum uses (Unlimited, 1, 5, 10, 25).
3. Client generates a 256-bit cryptographic token and calculates its SHA-256 hash.
4. Client executes `create_project_invite` RPC.
5. Previous active invites for that project are deactivated so only the latest invite is valid.
6. The full HTTPS link (`https://<domain>/invite/<rawToken>`) is displayed ready for copying or native sharing.

---

## 6. Invite Validation

When an invite link (`/invite/[token]`) is opened:
1. Client extracts `token` from route parameters without logging it.
2. Client hashes token with SHA-256 and calls `validate_project_invite(p_token_hash)`.
3. Validation verifies:
   - Invite exists in DB.
   - `is_active = true`.
   - `expires_at IS NULL OR expires_at > now()`.
   - `max_uses IS NULL OR uses < max_uses`.
   - Parent project exists and is not soft-deleted.
4. If caller is logged in:
   - Returns `'ALREADY_OWNER'` if caller is the project owner.
   - Returns `'ALREADY_MEMBER'` if caller is already in `project_members`.
   - Returns `'VALID'` if ready to join.
5. Returns safe payload `{ valid, status, projectId, projectName, projectDescription, ownerName, expiresAt, maxUses, uses }`.

---

## 7. Join Flow

### Unauthenticated User:
1. Opens `/invite/[token]`.
2. Token is saved in local pending storage (`trak_pending_invite_token`).
3. Screen displays safe preview card: "You've been invited to join <Project Name>" by <Owner Name>.
4. User taps "Sign In to Join" or "Create Account".
5. User completes sign in / sign up / Google OAuth.
6. Auth layer detects pending invite token and automatically navigates back to `/invite/[token]`.

### Authenticated User:
1. Opens `/invite/[token]` or returns after login.
2. Screen displays project details and "[ Join Project ]" button.
3. User clicks "Join Project" -> triggers `join_project_with_invite` RPC.
4. The database row is locked `FOR UPDATE`, validated, creates membership record in `project_members`, and increments `uses` atomically.
5. Local Zustand store refreshes (`fetchProjects({ forceRefresh: true })`), sends an in-app success notification, and opens the project detail screen immediately.

---

## 8. Share UI

Updated [`components/modals/InviteCodeModal.tsx`](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/components/modals/InviteCodeModal.tsx) into a full **Share Project Modal**:
- **Invite Link Tab**:
  - Live HTTPS link display with middle ellipsis.
  - **[ Copy Link ]** (copies HTTPS link to clipboard, toast confirmation "Link Copied!").
  - **[ Share ]** (triggers native iOS/Android share sheet or Web Share API).
  - Expiration & Usage limit display chips.
  - Collapsible **Link Settings** panel (expiration: Never/1h/24h/7d/30d; max uses: Unlimited/1/5/10/25).
  - **[ Revoke Link ]** and **[ Generate New Link ]** controls.
- **QR Code Tab**:
  - High-resolution SVG QR code encoding the invite link for in-person device scanning.
- **Code Tab**:
  - Legacy short code copy for backwards compatibility.
- Styled using Trak's dark futuristic design tokens (`colors.surfaceContainer`, `colors.primaryFixed`, `colors.glassBorder`).

---

## 9. Web Deep Link

- URL format: `https://<domain>/invite/<raw-token>`
- Dynamic route: `app/invite/[token].tsx`
- Web fallback for native sharing: Uses Web Share API (`navigator.share`) when available, falls back to `expo-clipboard` with feedback banner.

---

## 10. Android Deep Link

- URL formats:
  - HTTPS link: `https://<domain>/invite/<raw-token>`
  - Custom scheme: `trak://invite/<raw-token>`
- Registered in `app.json` under `expo.scheme = "trak"` and package `com.trak.app`.
- Native sharing uses React Native `Share.share` with Android Intent chooser.

---

## 11. Realtime Behavior

- Supabase Realtime channel `trak-collab` listens to changes on `projects`, `project_members`, `milestones`, `profiles`, and `project_invites`.
- When a recipient joins via an invite link:
  - An `INSERT` event on `public.project_members` is pushed to all subscribed clients.
  - The project owner's screen updates immediately without a page refresh, showing the new team member in the Team Members card.
  - An in-app notification ("👥 New Member Joined") is delivered to the owner.

---

## 12. Security

- **Cryptographic Randomness**: 32 bytes (256 bits) from `expo-crypto` (OS CSPRNG).
- **One-Way Hashing**: Database only stores SHA-256 digest (`token_hash`).
- **No Token Logging**: Zero console logs or error messages outputting raw tokens.
- **Race Condition Prevention**: Database-level `FOR UPDATE` row lock during join transactions prevents concurrent over-use.
- **Zero RLS Bypass**: All client-side direct access to `project_invites` is restricted to owners; non-members interact solely via security-definer RPC functions with parameterized inputs.

---

## 13. Test Results

- `npx tsc --noEmit`: **PASSED** (0 TypeScript errors across the entire codebase).
- `test_invite.js` cryptographic tests: **PASSED**:
  - 256-bit token entropy & URL-safe base64 generation verified.
  - SHA-256 64-character hex hash calculation matching PostgreSQL `pgcrypto` verified.
  - HTTPS and Deep Link URL formatting verified.

---

## 14. Files Modified / Created

### New Files:
1. `supabase/migrations/00015_project_invites.sql` - Table schema, indexes, RLS, and RPC functions.
2. `services/inviteService.ts` - Token generator, hashing, URL builder, storage, and Supabase RPC service.
3. `app/invite/[token].tsx` - Expo Router screen for invite handling, validation, preview, and join flow.
4. `PROJECT_LINK_SHARING_IMPLEMENTATION_REPORT.md` - Technical implementation report.

### Modified Files:
1. `store/useProjectStore.ts` - Added project invite actions and Realtime `project_invites` listener.
2. `components/modals/InviteCodeModal.tsx` - Full Share Project modal with Link, QR Code, Expiration, Max Uses, and Revocation.
3. `components/modals/ProjectActionModal.tsx` - Added "Share Project" action in project action sheet.
4. `app/(tabs)/project/[id].tsx` - Connected Share buttons to project details.
5. `app/_layout.tsx` - Registered `invite/[token]` screen in Stack navigator.
6. `app/auth.tsx` - Added seamless return to pending invite link after sign in / sign up / Google OAuth.
7. `app/auth/callback.tsx` - Added seamless return to pending invite link after OAuth callback.
8. `app/setup-profile.tsx` - Added return to pending invite link after profile completion/skip.

---

## 15. Supabase Manual Configuration

To activate the link sharing system in Supabase:
1. Go to **Supabase Dashboard → SQL Editor**.
2. Run [`supabase/migrations/00015_project_invites.sql`](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/supabase/migrations/00015_project_invites.sql).
3. Under **Database → Replication**, verify `project_invites` is enabled in the `supabase_realtime` publication.

---

## 16. Deployment Requirements

- **Production Domain**: The web deployment serves links from the production domain host (e.g. `https://trak.app/invite/<token>`).
- **Android App Links (Optional)**: For Android Universal Links, add `.well-known/assetlinks.json` on the domain with SHA-256 fingerprint matching the APK signing key.

---

## 17. Remaining Issues

None. All TypeScript checks pass and the architecture adheres to the 3-layer architecture and user specifications.
