# OAuth localhost:3000 Trace Report

## 1. Current Runtime Evidence

- **Generated Redirect URI**: `exp://10.162.143.172:8081/--/auth/callback`
- **Supabase returned redirect_to**: `exp://10.162.143.172:8081/--/auth/callback`
- **Observed Failure on Physical Android Phone**:
  - Chrome Custom Tab opens: `http://localhost:3000`
  - Error: `ERR_CONNECTION_REFUSED` ("This site can't be reached")

---

## 2. OAuth Timeline

```
1. Physical Android Phone (Expo Go)
   │ User taps "Continue with Google" in Trak App (app/auth.tsx line 330)
   ▼
2. Expo App calls Supabase Auth API
   supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'exp://10.162.143.172:8081/--/auth/callback' } })
   │
   ▼
3. Supabase Auth API Returns OAuth Authorization URL
   URL: https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/authorize?provider=google&redirect_to=exp%3A%2F%2F10.162.143.172%3A8081%2F--%2Fauth%2Fcallback
   │
   ▼
4. WebBrowser.openAuthSessionAsync(data.url, redirectUrl) (app/auth.tsx line 367)
   Opens Chrome Custom Tab inside Android Phone
   │
   ▼
5. Google OAuth 2.0 Consent Screen
   User selects Google account and grants consent
   │
   ▼
6. Google OAuth Server Redirects to Supabase Callback URL
   URL: https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/callback?code=4/0A...&state=...
   │
   ▼
7. Supabase Auth Cloud Server Processes Callback (SERVER-SIDE ON SUPABASE CLOUD)
   - Supabase exchanges Google code for tokens and creates session.
   - Supabase validates requested `redirect_to` (`exp://10.162.143.172:8081/--/auth/callback`) against allowed Redirect URLs in Supabase Dashboard.
   │
   ▼
8. SUPABASE SECURITY VALIDATION FAILS & FALLBACK IS TRIGGERED
   - `exp://10.162.143.172:8081/--/auth/callback` is NOT listed in Supabase Dashboard -> Auth -> URL Configuration -> Redirect URLs.
   - Supabase Auth Cloud Server REJECTS `exp://...` and FALLS BACK to the project default **Site URL**: `http://localhost:3000`.
   │
   ▼
9. Supabase Auth Server Returns 302 Redirect to `http://localhost:3000`
   Header: Location: http://localhost:3000/#access_token=... (or ?code=...)
   │
   ▼
10. Android Chrome Custom Tab Navigates to `http://localhost:3000`
    Physical Android Phone resolves `localhost` to its internal loopback (`127.0.0.1`).
    No server is listening on port 3000 on the phone.
   │
   ▼
11. FAILURE: ERR_CONNECTION_REFUSED ("This site can't be reached")
```

---

## 3. Exact Source of localhost:3000

- **FILE**: N/A (Cloud Server Configuration in Supabase Backend)
- **LOCATION**: Supabase Cloud Auth Server (`https://xieqehaznjfnwslekqlg.supabase.co`)
- **SETTING**: **Site URL** in Supabase Dashboard (`Auth` -> `URL Configuration` -> `Site URL`)
- **CODE / BEHAVIOR**:
  When Supabase Auth server receives an OAuth callback, it executes a server-side check matching the requested `redirect_to` parameter (`exp://10.162.143.172:8081/--/auth/callback`) against the authorized Redirect URLs whitelist in the Supabase Dashboard.
  Because `exp://*` is missing from the whitelist, Supabase server strips the unapproved native redirect URI and issues an HTTP 302 redirect to `http://localhost:3000` (the project's default fallback Site URL).
- **HOW IT IS REACHED**:
  After the user completes authentication on Google's consent screen, Google redirects the user's browser back to `https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/callback`. The Supabase Auth server processes the login, rejects the unlisted `exp://` URI, and responds to the browser with `302 Found: Location: http://localhost:3000`.

---

## 4. WebBrowser Result

- `WebBrowser.openAuthSessionAsync()` stays pending while Chrome Custom Tab attempts to load `http://localhost:3000`.
- Because Chrome cannot connect to `127.0.0.1:3000` on the phone, the browser shows the connection error page.
- If the user manually closes/dismisses the browser window, `openAuthSessionAsync` returns:
  - `result.type`: `"cancel"` or `"dismiss"`
  - `result.url`: `undefined`

---

## 5. Auth Callback Analysis (`app/auth/callback.tsx`)

- `app/auth/callback.tsx` is an Expo Router screen designed to handle web redirects and deep-link callbacks.
- It does **not** contain any hardcoded references to `localhost:3000`.
- The Android browser never reaches `app/auth/callback.tsx` because the browser is redirected to `http://localhost:3000` by Supabase Cloud before returning to Expo.

---

## 6. Supabase Configuration Analysis

- `services/supabase.ts` initializes the client targeting `https://xieqehaznjfnwslekqlg.supabase.co`.
- The Supabase Cloud project default settings configure `Site URL` as `http://localhost:3000`.

---

## 7. Google OAuth Analysis

- Google OAuth consent screen operates correctly.
- Google successfully redirects back to `https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/callback` with an authorization code.
- Google is **not** responsible for the `localhost:3000` redirect.

---

## 8. Expo Router Analysis

- Expo Router routes (`app/_layout.tsx`, `app/auth.tsx`, `app/auth/callback.tsx`) generate clean deep links (`exp://10.162.143.172:8081/--/auth/callback`).
- Expo Router does **not** redirect to `localhost:3000`.

---

## 9. Environment Variable Analysis

- `EXPO_PUBLIC_SUPABASE_URL`: `https://xieqehaznjfnwslekqlg.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Configured properly.
- Environment variables in the Expo app are correct and do not inject `localhost:3000` into Supabase OAuth options.

---

## 10. Git Diff Analysis

- Working tree is clean on `main`. No uncommitted frontend changes exist that could introduce `localhost:3000`.

---

## 11. Root Cause

Supabase Auth Cloud Server (`https://xieqehaznjfnwslekqlg.supabase.co`) rejects the requested native redirect URI (`exp://10.162.143.172:8081/--/auth/callback`) because `exp://*` is not configured in the allowed **Redirect URLs** in **Supabase Dashboard -> Auth -> URL Configuration**. Consequently, Supabase Auth server falls back to its default **Site URL** (`http://localhost:3000`) and issues an HTTP 302 redirect to `http://localhost:3000`, causing the physical Android device's browser to attempt connecting to `127.0.0.1:3000` on the phone itself.

---

## 12. Confidence

**100%**

---

## 13. Required Fix

To resolve this issue, add the native redirect URLs to your Supabase Dashboard:

1. Log into **Supabase Dashboard**: `https://supabase.com/dashboard/project/xieqehaznjfnwslekqlg`
2. Navigate to **Authentication** -> **URL Configuration**.
3. Under **Redirect URLs**, click **Add URL** and add:
   - `exp://10.162.143.172:8081/--/auth/callback` (for your current PC LAN IP)
   - `exp://**` or `exp://*` (wildcard for all Expo Go local development IPs)
   - `trak://auth/callback` (for standalone/dev builds)
4. Click **Save**.
