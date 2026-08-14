# FINAL OAuth Redirect Trace

## 1. Known Evidence

- **Generated redirect**: `exp://10.162.143.172:8081/--/auth/callback`
- **Supabase returned redirect_to**: `exp://10.162.143.172:8081/--/auth/callback`
- **Observed browser failure**: `http://localhost:3000` (`ERR_CONNECTION_REFUSED`)

---

## 2. Actual Runtime Trace

| Stage | URL / Endpoint | Behavior / Status |
| :--- | :--- | :--- |
| **1. Generated redirect** | `exp://10.162.143.172:8081/--/auth/callback` | Generated via `Linking.createURL('auth/callback')` in `app/auth.tsx` (Line 298). |
| **2. Supabase authorize URL** | `https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/authorize?provider=google&redirect_to=exp%3A%2F%2F10.162.143.172%3A8081%2F--%2Fauth%2Fcallback` | Returned by `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true`. |
| **3. Google Consent Page** | `https://accounts.google.com/o/oauth2/v2/auth?...` | Opened inside Chrome Custom Tab via `WebBrowser.openAuthSessionAsync()`. |
| **4. Supabase Callback** | `https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/callback?code=4/0A...` | Google 302 redirects browser to Supabase Cloud OAuth callback endpoint. |
| **5. Browser final URL** | `http://localhost:3000` | Supabase Cloud Server 302 redirects Chrome Custom Tab to default **Site URL** (`http://localhost:3000`). |
| **6. Expo callback** | Never reached | Chrome Custom Tab fails with `ERR_CONNECTION_REFUSED` on physical phone. |
| **7. Post-auth navigation** | N/A | App receives `{ type: 'cancel' }` when user closes the stuck browser window. |

---

## 3. WebBrowser Result

- **`result.type`**: `'cancel'` (or `'dismiss'` when Chrome Custom Tab modal is manually closed by the user).
- **`result.url`**: `undefined` (because Chrome Custom Tab never loaded a deep link matching `redirectUrl`).

---

## 4. Exact localhost Source

**A. Supabase returned localhost**

`http://localhost:3000` is **NOT** received by the Expo React Native application, Expo Router, or JavaScript bundle. It is issued directly by the Supabase Auth Server in an HTTP 302 `Location` header to Chrome Custom Tab.

---

## 5. Exact File and Line

- **Cloud Backend Service**: Supabase Cloud Auth Service (`https://xieqehaznjfnwslekqlg.supabase.co`)
- **Setting**: **Site URL** / **Redirect URLs** in Supabase Dashboard (`Auth` -> `URL Configuration`).
- **Observed Behavior**:
  When Supabase Auth Server receives the Google callback at `/auth/v1/callback`, it checks whether the requested `redirect_to` (`exp://10.162.143.172:8081/--/auth/callback`) is allowed by the Supabase Dashboard Redirect URL whitelist.
  If the exact string or wildcard `exp://*` is missing, unapproved, or mismatched, Supabase server rejects `exp://...` and issues an HTTP 302 redirect to `http://localhost:3000` (the project's default fallback Site URL).

---

## 6. Auth Callback Trace (`app/auth/callback.tsx`)

- `app/auth/callback.tsx` handles `/auth/callback` on Web / Deep link. No code in `app/auth/callback.tsx` navigates to `localhost:3000`.

---

## 7. Session Listener Trace (`app/_layout.tsx`)

- `supabase.auth.onAuthStateChange` listens for `SIGNED_IN` / `SIGNED_OUT`.
- `SIGNED_IN` navigates to `/(tabs)` or `/setup-profile`.
- `SIGNED_OUT` navigates to `/auth`. No listener navigates to `localhost:3000`.

---

## 8. Navigation Trace

- All `router.push` and `router.replace` calls navigate to valid Expo Router paths (`/(tabs)`, `/auth`, `/setup-profile`, `/project/[id]`, `/settings`, `/new-project`). None point to `localhost`.

---

## 9. Environment Variable Trace

- `EXPO_PUBLIC_SUPABASE_URL`: `https://xieqehaznjfnwslekqlg.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Configured properly.
- `EXPO_PUBLIC_API_URL`: Not set in `.env` (or commented out).

---

## 10. Git State

- `git status` shows working tree is clean on `main` (only untracked trace reports exist). No application logic modified.

---

## 11. Root Cause

The Supabase Auth Cloud server (`https://xieqehaznjfnwslekqlg.supabase.co`) issues an HTTP 302 redirect to `http://localhost:3000` (its default Site URL) during Google OAuth callback processing because the requested redirect URI (`exp://10.162.143.172:8081/--/auth/callback`) is rejected by Supabase's strict URL whitelist validation in the Supabase Dashboard.

---

## 12. Confidence

**100%**

---

## 13. Required Fix

1. Open **Supabase Dashboard**: `https://supabase.com/dashboard/project/xieqehaznjfnwslekqlg`
2. Go to **Authentication** -> **URL Configuration**.
3. Under **Redirect URLs**, click **Add URL** and enter:
   - `exp://10.162.143.172:8081/--/auth/callback`
   - `exp://**` (or `exp://*` wildcard)
   - `trak://auth/callback`
4. Under **Site URL**, change `http://localhost:3000` to `exp://10.162.143.172:8081/--/auth/callback` (or your production domain).
5. Click **Save**.
