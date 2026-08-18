# Trak Account Linking Analysis

## 1. Current Authentication Architecture

Trak uses **Supabase Authentication (GoTrue)** with `@supabase/supabase-js` for identity management, user sessions, and database Row Level Security (RLS).

### Core Components
- **`auth.users`**: Supabase internal authentication table. Each user has a unique `id` (UUIDv4) and an `email`.
- **`auth.identities`**: Supabase table storing linked authentication providers (e.g. `email`, `google`, `github`) associated with an `auth.users.id`.
- **`public.profiles`**: Application profile table where `public.profiles.id` is designed to have a strict 1:1 relation with `auth.users.id`.
- **`public.projects` & `public.project_members`**: Relies on `user_id` pointing directly to `auth.users.id`.
- **Session Persistence**: `@react-native-async-storage/async-storage` stores the JWT session (`access_token`, `refresh_token`), managed by Supabase client in [services/supabase.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/services/supabase.ts).

---

## 2. Email/Password Flow

### Signup Flow (`mode === 'signup'` in `app/auth.tsx`)
1. User enters Full Name, Email, and Password.
2. Calls `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
3. Database trigger `handle_new_user()` on `auth.users` automatically creates a corresponding row in `public.profiles` (`id = NEW.id`, `name = full_name`, `email = NEW.email`).
4. If the account already exists, Supabase returns error `user_already_exists` (or `identities: []`). The app catches this and instructs the user to log in.
5. On success, `setActiveUserId(user.id)` is stored and the user navigates to `setup-profile` / `(tabs)`.

### Login Flow (`mode === 'login'` in `app/auth.tsx`)
1. User enters Email and Password.
2. Calls `supabase.auth.signInWithPassword({ email, password })`.
3. On success, returns `session` containing `user.id`.
4. The app hydrates Zustand stores via `useProfileStore.getState().fetchProfile(true)` and `useProjectStore.getState().fetchProjects({ forceRefresh: true })`.

---

## 3. Google OAuth Flow

### Initiation (`app/auth.tsx` -> `performOAuthFlow('google')`)
1. Generates redirect URI via `Linking.createURL('auth/callback')`:
   - **Web**: `https://trak.expo.app/auth/callback` (or local `http://localhost:8081/auth/callback`).
   - **Mobile**: `trak://auth/callback` (or Expo Go `exp://.../--/auth/callback`).
2. Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect } })`.
3. Opens in-app browser (`WebBrowser.openAuthSessionAsync` on mobile) or redirects `window.location` (on web).

### Callback & Token Exchange (`app/auth/callback.tsx` or in-app browser return)
1. Receives callback containing either:
   - **PKCE Code** (`?code=...`): Calls `supabase.auth.exchangeCodeForSession(code)`.
   - **Implicit Token Hash** (`#access_token=...&refresh_token=...`): Calls `supabase.auth.setSession(...)`.
2. Establishes the authenticated session in GoTrue.
3. Calls `fetchProfile(true)` to load user data from `public.profiles` matching `auth.users.id`.

---

## 4. Current Supabase Identity Behavior

When an email/password account already exists for `user@example.com` (User A, `id: UUID_A`), what happens when the user clicks "Continue with Google" using `user@example.com`?

1. **If Automatic Identity Linking is disabled in Supabase (Default)**:
   - Google returns the authenticated Google identity (`user@example.com`, verified).
   - GoTrue checks `auth.users`. It sees `user@example.com` already belongs to User A via provider `email`.
   - Because Google is a different provider, GoTrue **refuses** to automatically create a duplicate user OR merge identities without explicit linking.
   - GoTrue redirects to callback with an error parameter:
     `error=access_denied&error_code=identity_already_exists&error_description=An+account+with+this+email+already+exists...`
   - In Trak's current `app/auth/callback.tsx`, this is displayed as a generic failure: `"Google sign-in failed: An account with this email already exists."`

2. **If Supabase were misconfigured or multiple accounts per email were allowed**:
   - Supabase would create User B (`id: UUID_B`) in `auth.users`.
   - User B would have zero projects, zero memberships, and a blank profile, creating severe data fragmentation.

---

## 5. Current Profile Creation Behavior

In [store/useProfileStore.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/store/useProfileStore.ts):
```ts
// 1. Fetch by user ID
const { data } = await supabase.from('profiles').select(...).eq('id', userId).maybeSingle();

// 2. If not found by ID, fallback to authEmail
if (!profileData && authEmail) {
  const { data: emailData } = await supabase.from('profiles').select(...).eq('email', authEmail).maybeSingle();
  if (emailData) {
    profileData = emailData;
    if (emailData.id !== userId) {
      await supabase.from('profiles').update({ id: userId }).eq('id', emailData.id);
    }
  }
}
```

### Risk with Current Fallback
While this fallback prevented 409 crashes during legacy data migrations, **client-side database re-assignment of `profiles.id` is not identity linking**.
- If Supabase created a separate user `UUID_B` in `auth.users`, updating `public.profiles.id` to `UUID_B` breaks project ownership (`projects.user_id = UUID_A` whereas active session is `UUID_B`), and violates RLS policies where `auth.uid() != UUID_A`.
- Therefore, identity linking **must occur at the Supabase Auth layer** so `auth.users.id` remains `UUID_A`.

---

## 6. Duplicate Account Risk

| Scenario | What Happens Without Secure Linking | Risk Level |
| :--- | :--- | :--- |
| **Email/Password user clicks Google Login** | Receives `identity_already_exists` error OR creates orphaned `UUID_B` with 0 projects | **High UX Friction / Data Fragmentation** |
| **Google user tries Email/Password signup** | Supabase returns `user_already_exists` | **Expected (Handled)** |
| **Unlinked secondary user created** | User A projects not visible to User B; collaborator permissions split | **High Data Inconsistency** |

---

## 7. Recommended Secure Flow

The modern, secure architecture standard (used by Slack, Notion, GitHub, Linear, Supabase) consists of two complementary flows:

### Flow A: In-App "Link Google Account" (Explicit Linking)
For users already logged in via Email/Password:
1. User navigates to **Settings → Account → Connected Accounts** (or **Security**).
2. Screen displays connection status:
   - **Email / Password**: Connected (`user@example.com`)
   - **Google**: *Not connected* → `[Connect Google Account]` button.
3. Tapping `[Connect Google Account]` calls:
   ```ts
   const { data, error } = await supabase.auth.linkIdentity({
     provider: 'google',
     options: {
       redirectTo: Linking.createURL('auth/callback'),
     },
   });
   ```
4. User authenticates with Google.
5. GoTrue attaches the Google identity to the existing `auth.users.id` in `auth.identities`.
6. From that point onward, the user can log in with **either** email/password **or** "Continue with Google". Both resolve to the exact same `auth.users.id` (User A).

### Flow B: Graceful "Account Exists" Detection on Login Screen
When an unauthenticated user with an existing email/password account clicks "Continue with Google":
1. Google OAuth executes; GoTrue detects the existing email and returns `error_code=identity_already_exists` (or error containing `already registered` / `account exists`).
2. `app/auth/callback.tsx` (and in-app OAuth handler in `app/auth.tsx`) intercepts `identity_already_exists`.
3. Instead of a generic failure screen, it presents a helpful Action Dialog:
   - **Title**: *"Existing Account Found"*
   - **Message**: *"An account with this email already exists using email and password. Please sign in with your password, then link your Google account in Settings."*
   - **Action Buttons**:
     - `[Sign in with Password]` → Navigates to `auth.tsx` with email prefilled in login mode.
     - `[Cancel]`

---

## 8. Required Supabase Settings

In **Supabase Dashboard**:

1. **Authentication → Providers → Google**:
   - Ensure **Google** is enabled.
   - **"Skip nonce checks"** / standard configuration.
2. **Authentication → Configuration (Auth Settings)**:
   - **Allow manual linking**: **Enabled** (Required for `supabase.auth.linkIdentity`).
   - If your Supabase version provides **"Automatic Identity Linking for verified emails"**, enable it only if you want Google OAuth to automatically link on first login when Google returns `email_verified: true`.

---

## 9. Required Code Changes (When Implementation Begins)

1. **Add `linkIdentity` flow in `services/auth.ts` or `app/settings.tsx`**:
   - Helper function `linkGoogleIdentity()` calling `supabase.auth.linkIdentity({ provider: 'google', ... })`.
   - Helper function `unlinkGoogleIdentity()` calling `supabase.auth.unlinkIdentity(identity)`.
2. **Add "Connected Accounts" Section in `app/settings.tsx`**:
   - Query user identities via `supabase.auth.getUser()`.
   - Inspect `user.identities` array to check if `provider === 'google'` is attached.
   - Display a Google tile showing status (*Connected* or *Not Linked*) with a button to Connect / Disconnect.
3. **Enhance Error Handling in `app/auth/callback.tsx` & `app/auth.tsx`**:
   - Detect `identity_already_exists` or `multiple_accounts_with_same_email`.
   - Provide direct navigation back to `/auth` with prompt to sign in via password.
4. **Refine `useProfileStore.ts`**:
   - Keep profile queries strictly bound to `auth.users.id`.
   - Remove any unsafe client-side cross-user database re-assignment.

---

## 10. Required UX

### Settings Screen (`app/settings.tsx`)
```
┌────────────────────────────────────────────────────────┐
│ 🔐 CONNECTED ACCOUNTS                                  │
├────────────────────────────────────────────────────────┤
│ ✉️  Email & Password                                   │
│     harshit@example.com                      [Active]  │
├────────────────────────────────────────────────────────┤
│ 🌐  Google Account                                     │
│     Not linked                     [ Connect Google ]  │
└────────────────────────────────────────────────────────┘
```
When connected:
```
│ 🌐  Google Account                                     │
│     Linked (harshit@example.com)       [ Disconnect ]  │
```

### Auth Error Screen (`app/auth/callback.tsx` / `app/auth.tsx`)
```
┌────────────────────────────────────────────────────────┐
│ ⚠️  Existing Account Detected                          │
│                                                        │
│  An account with this email already exists using       │
│  email & password.                                     │
│                                                        │
│  Please sign in with your password first, then connect │
│  Google from Settings → Connected Accounts.            │
│                                                        │
│  [ Sign in with Password ]          [ Cancel ]         │
└────────────────────────────────────────────────────────┘
```

---

## 11. Migration Considerations

- **Existing users**:
  - Users with existing email/password accounts do **not** need database migration.
  - Their `auth.users.id` and `public.profiles.id` remain unchanged.
  - Linking Google via `linkIdentity` adds an entry to `auth.identities` without altering `auth.users.id` or `public.profiles.id`.

---

## 12. Security Considerations

1. **No Client-Side Account Merging**: Never merge or link accounts in frontend code based simply on matching email strings without cryptographic identity verification through GoTrue.
2. **Prevent Account Takeover**: Unverified OAuth providers must never automatically overwrite an existing password-authenticated account. Supabase's `linkIdentity()` requires the user to already hold an active, authenticated session.
3. **No Account Enumeration**: Error messages must not expose whether an arbitrary unregistered email exists to unauthenticated attackers.

---

## 13. Files That Would Need Modification

1. [app/settings.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/settings.tsx): Add "Connected Accounts" section with Google linking/unlinking UI and handlers.
2. [app/auth.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/auth.tsx): Add friendly detection and action prompt for `identity_already_exists`.
3. [app/auth/callback.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/auth/callback.tsx): Handle `identity_already_exists` query/hash params with custom redirection options.
4. [store/useProfileStore.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/store/useProfileStore.ts): Ensure profile operations rely strictly on `auth.users.id`.

---

## 14. Final Recommendation

1. **Implement In-App Identity Linking (`supabase.auth.linkIdentity`)** in `app/settings.tsx` under an **"ACCOUNT & IDENTITIES"** section.
2. **Intercept `identity_already_exists` in OAuth callback screens** to guide users with existing email/password accounts to sign in and link Google from Settings.
3. **Preserve `auth.users.id` as the single source of truth** so all projects, milestones, and collaborations remain intact.
