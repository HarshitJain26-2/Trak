# Supabase Redirect Verification Report

## 1. Generated Redirect URI
`exp://10.162.143.172:8081/--/auth/callback`

---

## 2. Full Authorization URL (Secrets/Tokens Redacted)
`https://xieqehaznjfnwslekqlg.supabase.co/auth/v1/authorize?provider=google&redirect_to=exp%3A%2F%2F10.162.143.172%3A8081%2F--%2Fauth%2Fcallback`

---

## 3. Decoded `redirect_to` Parameter
`exp://10.162.143.172:8081/--/auth/callback`

---

## 4. `redirect_to` Match Verification
- **Requested URI**: `exp://10.162.143.172:8081/--/auth/callback`
- **Decoded `redirect_to` Parameter**: `exp://10.162.143.172:8081/--/auth/callback`
- **Result**: **EXACT MATCH** (100% character-for-character identical).

---

## 5. All `signInWithOAuth()` Calls in Codebase

1. **`app/auth.tsx` (Line 304)**: Web platform branch (`Platform.OS === 'web'`).
2. **`app/auth.tsx` (Line 330)**: Native mobile branch (`Platform.OS === 'android'` / `'ios'`).

Both calls are located inside `performOAuthFlow(provider: 'google' | 'github')`.

---

## 6. Execution Flow for Google Login
When the user taps "Continue with Google":
1. `handleGoogleAuth()` (`app/auth.tsx` line 439) is called.
2. `handleGoogleAuth()` invokes `performOAuthFlow('google')` (line 446).
3. On physical Android device (`Platform.OS === 'android'`), execution passes directly to **`app/auth.tsx` Line 330**:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: 'exp://10.162.143.172:8081/--/auth/callback',
       skipBrowserRedirect: true,
     },
   });
   ```

---

## 7. Secondary OAuth Call Check
- **Verification**: The application does **NOT** make any secondary or repeated `signInWithOAuth()` calls after `performOAuthFlow('google')`.
- Once `WebBrowser.openAuthSessionAsync()` is called, the frontend waits for the browser session to complete.

---

## 8. Final Conclusion

CLIENT IS REQUESTING THE CORRECT REDIRECT URI.
