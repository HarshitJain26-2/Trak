# Trak Project Link Sharing Implementation Report

## 1. Existing Project Architecture

In Trak:
- **Projects (`public.projects`)**: Each project is identified by `id` (TEXT) and owned by `user_id` (UUID / text `auth.uid()`). A project has title `name`, `status`, `tech_stack`, `deadline`, `progress`, `milestones`, and `invite_code`.
- **Project Members (`public.project_members`)**: Maps users to projects with `id`, `project_id`, `user_id`, `role` (`owner` | `member`), `joined_at`, with a unique constraint on `(project_id, user_id)`.
- **Ownership Model**: `projects.user_id` is the authoritative project owner (project leader). In Zustand (`store/useProjectStore.ts`), `project.isShared` is false for the owner and true for joined collaborators.
- **State Management & Persistence**: Projects are cached locally in AsyncStorage (`safeStorage`) and synced to Supabase with in-flight request deduplication and background fetching.

---

## 2. Database Migrations

### Migration `00015_project_invites.sql`
- **Table**: `public.project_invites` with `id`, `project_id`, `created_by`, `token_hash`, `expires_at`, `max_uses`, `uses`, `is_active`, `created_at`.
- **Indexes**: `idx_project_invites_token_hash`, `idx_project_invites_project_id`, `idx_project_invites_is_active`.
- **Row Level Security**: Project owners have full select/insert/update/delete control.
- **RPCs**:
  - `create_project_invite(p_project_id, p_token_hash, p_expires_at, p_max_uses)`
  - `revoke_project_invite(p_project_id, p_invite_id)`
  - `get_project_active_invite(p_project_id)`
  - `validate_project_invite(p_token_hash)`
  - `join_project_with_invite(p_token_hash, p_user_id)`

### Migration `00016_project_invite_custom_settings.sql`
- **RPC `update_project_invite_settings(p_project_id, p_invite_id, p_expires_at, p_max_uses)`**: Allows project owners to update expiration or max usage limits on an existing active invite without changing its URL or regenerating tokens.
- **Enhanced `join_project_with_invite(p_token_hash)`**: Strictly derives authenticated user identity from PostgreSQL `auth.uid()` rather than trusting client-provided parameters.

---

## 3. Custom Expiration

- **Presets**: `[ Never ] [ 1 Hour ] [ 24 Hours ] [ 7 Days ] [ 30 Days ]`
- **Custom Option**: `[ Custom → ]`
- **Date & Time Picker**:
  - Native-style modal with month navigation, interactive day selection, and precise hour/minute time controls.
  - Validates `selectedTime > Date.now()`. If in the past, alerts `"Expiration time must be in the future."`.
  - Persisted in UTC timestamp `expires_at` (timestamptz).
  - Selected chip dynamically displays formatted date & time:
    ```
    Custom
    18 Aug 2026, 10:30 PM
    ```

---

## 4. Custom Maximum Uses

- **Presets**: `[ Unlimited ] [ 1 Use ] [ 5 Uses ] [ 10 Uses ] [ 25 Uses ]`
- **Custom Option**: `[ Custom → ]`
- **Numeric Limit Picker**:
  - Validates whole numbers between 1 and 10,000.
  - Rejects 0, negatives, decimals, text, empty values, or values > 10,000.
  - Persisted as integer `max_uses` (INT).
  - Selected chip dynamically displays:
    ```
    Custom
    50 Uses
    ```

---

## 5. Custom Settings UX

- Compact, dark futuristic modal matching Trak design aesthetics.
- Horizontally scrollable option lists for both Expiration and Max Uses chips (`showsHorizontalScrollIndicator={false}`).
- Responsive and tested across Android, iOS, and Web viewports.

---

## 6. Edit Existing Active Invite

- Opening **Share Project** loads the active invite's current configuration without resetting values to default.
- If settings are changed:
  - **[ Save Changes to Active Link ]** updates existing invite via `update_project_invite_settings` RPC.
  - **[ Generate New Link ]** creates a brand new token and deactivates the previous invite.

---

## 7. Realtime Invite Synchronization

- Global Realtime channel `trak-collab` and local modal channel subscribe to PostgreSQL changes on `public.project_invites`.
- When settings (`expires_at`, `max_uses`, `is_active`) change or link is revoked:
  - Connected clients and active modal instances receive the update immediately with zero hard refresh.
- When an invite is used:
  - Usage counter (`uses`) increments in real time for the project owner (`Uses: 4 / 10` or `Uses: 4` for unlimited).

---

## 8. Realtime Member Synchronization

- Subscribed to `public.project_members` `INSERT` and `DELETE` events.
- When a recipient accepts an invite:
  - Project members list and project count update reactively across connected devices.
  - Project owner receives an in-app notification (`👥 New Member Joined`).
  - No polling or manual refresh required.

---

## 9. Atomic Join Verification

- PostgreSQL RPC `join_project_with_invite` locks the invite row using `FOR UPDATE`.
- Enforces user identity using PostgreSQL `auth.uid()`.
- Validates active status, expiration, and remaining uses within a single atomic database transaction.
- Atomically inserts membership into `public.project_members` and increments `uses = uses + 1`.

---

## 10. Security & Logging

- Zero logging of raw tokens or token hashes.
- 256 bits of cryptographic entropy (`expo-crypto`) per raw token.
- Raw token is never stored in PostgreSQL (only SHA-256 hash).
- No secrets or service-role keys exposed in client bundles.

---

## 11. Production Deployment

- **Deployment Platform**: Expo Application Services (EAS) Hosting
- **Production URL**: [https://trak.expo.app](https://trak.expo.app)
- **Deployment URL**: [https://trak--jod7c4f2ol.expo.app](https://trak--jod7c4f2ol.expo.app)
- **EAS Project Dashboard**: [https://expo.dev/projects/f08c49a2-de31-422d-a9b8-1fb39670bac8/hosting/deployments](https://expo.dev/projects/f08c49a2-de31-422d-a9b8-1fb39670bac8/hosting/deployments)
- **Build Commands**:
  ```bash
  npx tsc --noEmit
  npx expo export --platform web
  npx eas-cli deploy --prod
  ```

---

## 12. Verification Checklist

| Requirement | Result |
|---|---|
| TypeScript compilation (`tsc --noEmit`) | **0 Errors** |
| Web Production Export (`expo export --platform web`) | **Success** (`dist/` 3.52 MB) |
| EAS Production Web Deployment | **Live & Promoted** at `https://trak.expo.app` |
| Custom Expiration (Date + Time + Validation) | **Implemented & Verified** |
| Custom Maximum Uses (1-10k Validation) | **Implemented & Verified** |
| Realtime Invite Settings & Use Count | **Connected via Supabase Realtime** |
| Realtime Member Joining | **Connected via Supabase Realtime** |
| Atomic Join using `auth.uid()` | **Secured in PostgreSQL** |
