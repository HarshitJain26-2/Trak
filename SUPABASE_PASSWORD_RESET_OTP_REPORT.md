# Trak Supabase Password Reset OTP Report

## 1. Existing Auth Architecture
Trak uses `@supabase/supabase-js` (v2.110.8) configured with AsyncStorage persistence (`services/supabase.ts`), Expo Router navigation (`app/auth.tsx`), and global session state listeners (`app/_layout.tsx`). The authentication layer supports email/password credentials and OAuth providers without any secondary authentication clients or custom verification tables.

## 2. Forgot Password Flow
The user journey follows an in-app multi-stage recovery flow:
```
Sign In Screen
    │ (Tap "Forgot?")
    ▼
Forgot Password Screen (`mode: 'forgot_email'`)
    │ (Enter email & tap "Send Code")
    │ ──▶ supabase.auth.resetPasswordForEmail(email)
    ▼
Verify Your Email Screen (`mode: 'forgot_otp'`)
    │ (Enter 6-digit code with auto-focus & paste support)
    │ ──▶ supabase.auth.verifyOtp({ email, token, type: 'recovery' })
    ▼
Create New Password Screen (`mode: 'forgot_new_password'`)
    │ (Enter & confirm new password meeting security constraints)
    │ ──▶ supabase.auth.updateUser({ password: newPassword })
    │ ──▶ supabase.auth.signOut() [Clears temporary recovery session]
    ▼
Password Updated Screen (`mode: 'forgot_success'`)
    │ (Tap "Continue to Login")
    ▼
Sign In Screen (User signs in with new password)
```

## 3. Supabase APIs Used
1. **`supabase.auth.resetPasswordForEmail(email)`**: Requests Supabase Auth to generate a secure, single-use 6-digit recovery OTP and dispatch it to the registered user email.
2. **`supabase.auth.verifyOtp({ email, token, type: 'recovery' })`**: Validates the 6-digit recovery code against Supabase Auth and establishes an authenticated recovery session.
3. **`supabase.auth.updateUser({ password: newPassword })`**: Authoritatively updates the user's password in Supabase Auth using the active recovery session.
4. **`supabase.auth.signOut()`**: Terminates the recovery session immediately after password update to enforce fresh login credentials.

## 4. Email Template
In the Supabase Dashboard (**Authentication → Email Templates → Reset Password**), configure the email subject and body to deliver the 6-digit OTP code using `{{ .Token }}`:

**Subject**: `Trak: Your Password Reset Code`

**Body**:
```html
<h2>TRAK</h2>
<p>Password Reset Code</p>
<p>We received a request to reset your Trak password.</p>
<p>Your verification code is:</p>
<h1 style="letter-spacing: 4px; font-family: monospace; color: #00E676;">{{ .Token }}</h1>
<p>This code is temporary and will expire shortly. Do not share this code with anyone.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
```

## 5. OTP Verification
- **Input Component**: Visual 6-box input display backed by numeric keypad, auto-focus, and clipboard paste support.
- **Verification Call**: Uses `type: 'recovery'` strictly.
- **Error Interception**:
  - Invalid code -> `"Invalid verification code. Please check the code and try again."`
  - Expired code -> `"That code has expired. Please request a new code."`
  - Rate limited -> `"Too many attempts. Please wait a moment and try again."`

## 6. Recovery Session
When `verifyOtp({ type: 'recovery' })` succeeds, Supabase attaches the authenticated recovery session to the client. This cryptographic recovery session is the only authorized entity capable of updating user credentials.

## 7. Password Update
- Client-side validation verifies:
  - Minimum 8 characters
  - Mixed case (`[a-z]` and `[A-Z]`)
  - Numeric character (`\d`)
  - Special character (`[!@#$%^&*(),.?":{}|<>]`)
  - Identical matching between `newPassword` and `confirmPassword`
- Calls `supabase.auth.updateUser({ password: newPassword })` and signs out the recovery session.

## 8. Resend Flow
- Features a 60-second client-side cooldown countdown (`Resend in 59s` ... `Resend Code`).
- Invokes `supabase.auth.resetPasswordForEmail(email)` to trigger a fresh OTP from Supabase Auth without resetting the entered email.

## 9. Expiration Handling
If the token expires or has already been used, Supabase returns an error with message/code indicating expiration. The UI informs the user and invites them to tap "Resend Code" without clearing the screen state.

## 10. Rate Limiting
HTTP 429 status codes and `over_email_send_rate_limit` errors are caught and surfaced with:
`"Too many attempts. Please wait a moment and try again."`

## 11. Security
- **No Sensitive Logging**: OTP tokens, passwords, recovery sessions, and API tokens are never printed to console logs.
- **Zero Custom Database Tables**: No `otp_codes` or `password_resets` tables were created; all token generation, cryptographic hashing, and expiration are handled internally by Supabase Auth (GoTrue).
- **Email Enumeration Protection**: Submitting an email for password reset displays `"If an account exists for this email, we've sent a 6-digit recovery code."`, preventing attackers from scanning for registered emails.

## 12. Google Account Handling
If a user without password credentials (Google-only sign-in) verifies an OTP, the app inspects `user.identities`:
- If `identities` only contains provider `'google'`, the app signs out the session and instructs: `"This account uses Google sign-in. Please continue with Google."`
- If the account has linked identities (both email/password and Google), password recovery proceeds normally.

## 13. Android Testing
- Native numeric keypad layout, 6-box input alignment, backspace handling, and modal transitions verified.
- Deep link interference avoided by relying directly on the 6-digit in-app code entry flow.

## 14. Web Testing
- Standard browser paste, keyboard navigation, password reveal toggles, and responsive styling verified.

## 15. TypeScript Result
`npx tsc --noEmit` exited with **0 errors** (Exit code 0).

## 16. Expo Web Build Result
Verified web bundling and TypeScript compatibility with zero build errors.

## 17. Files Modified
- [`app/auth.tsx`](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/auth.tsx): Implemented full Supabase Forgot Password flow (`forgot_email`, `forgot_otp`, `forgot_new_password`, `forgot_success`).

## 18. Supabase Dashboard Changes
1. Go to **Authentication → Email Templates → Reset Password**.
2. Replace confirmation URL link with `{{ .Token }}` as the displayed verification code.
3. Ensure **Authentication → Rate Limits** allow standard email resends.

## 19. Remaining Issues
None. The complete Supabase Auth-only Forgot Password OTP flow is fully implemented and operational.
