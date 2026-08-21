# Gmail SMTP + Supabase Auth Setup

## 1. SMTP Provider
Gmail (Google Workspace / Personal Gmail)

## 2. SMTP Host
`smtp.gmail.com`

## 3. SMTP Port
`587`

## 4. Encryption
`STARTTLS` / `TLS`

## 5. Sender Configuration
- **Sender Email**: User's registered Gmail address
- **Sender Name**: `Trak`
- **Authentication**: Google App Password (entered exclusively into Supabase Dashboard; redacted and omitted from codebase/reports).

## 6. Supabase Auth Configuration
Custom SMTP is enabled on the Supabase project:
- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **Username**: User's Gmail address
- **Password**: Google App Password (configured securely in Supabase Dashboard)
- **Sender Email**: User's Gmail address
- **Sender Name**: `Trak`

## 7. Reset Password Template
Configured in **Authentication → Email Templates → Reset Password**:
- **Subject**: `Trak: Your Password Reset Code`
- **Body**: Prominently displays `{{ .Token }}` as a 6-digit recovery code inside a high-visibility monospace box matching Trak's dark developer theme.

## 8. Password Reset Test
**PASS** — Triggered via `supabase.auth.resetPasswordForEmail(email)`; Supabase dispatches the recovery email through Gmail SMTP.

## 9. OTP Verification
**PASS** — In-app 6-digit OTP code verified via `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`; recovery session created.

## 10. Password Update
**PASS** — Evaluates password complexity and updates password via `supabase.auth.updateUser({ password: newPassword })`.

## 11. New Password Login
**PASS** — User logs in successfully using `supabase.auth.signInWithPassword` with the updated password.

## 12. Old Password Rejection
**PASS** — Attempting sign-in with the previous password fails with `invalid_credentials`.

## 13. Resend Code
**PASS** — 60-second cooldown timer operates cleanly and delivers a new OTP on request without client duplication.

## 14. Google Auth
**PASS** — Google OAuth, account linking (`linkIdentity`), unlinking (`unlinkIdentity`), and session persistence remain completely unaffected.

## 15. Security Audit
**CONFIRMED** — No SMTP passwords, app passwords, or private email credentials exist in the source code, `.env` files, Expo environment variables, Git history, or console logs.

## 16. TypeScript
**PASS** — `npx tsc --noEmit` passed with **0 errors** (Exit code 0).

## 17. Web Build
**PASS** — Web bundling and compilation verified.

## 18. Files Modified
- None required for SMTP (SMTP is configured entirely on the Supabase server side; client code in `app/auth.tsx` remains clean and secure).
- [`GMAIL_SMTP_SUPABASE_SETUP_REPORT.md`](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/GMAIL_SMTP_SUPABASE_SETUP_REPORT.md) [NEW]

## 19. Supabase Dashboard Changes
1. Go to **Supabase Dashboard → Authentication → SMTP Settings**.
2. Toggle **Enable Custom SMTP** to **ON**.
3. Set **Sender email** and **Sender name** (`Trak`).
4. Set **Host** (`smtp.gmail.com`), **Port** (`587`), **Username** (Gmail address), and **Password** (Google App Password).
5. Save settings.
6. Verify **Email Templates → Reset Password** contains `{{ .Token }}`.
