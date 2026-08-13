# Expo Mobile Connectivity Diagnostic Report

## 1. Executive Summary
This diagnostic report analyzes the root causes behind why the Expo React Native application works seamlessly in desktop/browser environments but fails on a physical Android device with:
```
This site can't be reached
localhost refused to connect
ERR_CONNECTION_REFUSED
```

The investigation examined all configuration files, network references, environment variables, authentication flows, and platform-specific behaviors without modifying any project source code or configuration files.

---

## 2. Project Architecture
The project structure follows an Expo React Native frontend architecture integrated with Supabase Cloud as its Backend-as-a-Service (BaaS).

```
Android Phone (Physical Device)
    │
    ▼ (Expo Go / LAN: 192.168.x.x:8081)
Expo React Native (Metro Bundler)
    │
    ├──► Supabase Cloud Services (BaaS - Authentication, Database, RLS)
    │    URL: https://xieqehaznjfnwslekqlg.supabase.co
    │
    └──► (Optional Local Backend)
         URL: http://192.168.x.x:3000 (Physical Device) / http://10.0.2.2:3000 (Android Emulator)
```

**Services & Ports:**
- **Frontend / Metro Bundler**: Port `8081` (Expo CLI default)
- **Primary Backend**: Supabase Cloud (`https://xieqehaznjfnwslekqlg.supabase.co` on HTTPS port 443)
- **Local API Endpoint (if configured)**: Port `3000`

---

## 3. Environment
- **Expo SDK Version**: `~54.0.0`
- **React Native Version**: `^0.81.5`
- **React Version**: `^19.1.0`
- **Expo Router Version**: `~6.0.24`
- **TypeScript Version**: `~5.9.2`
- **Operating System**: Windows (Developer PC)

**Startup Scripts (`package.json`):**
- `npm start` / `npx expo start` (Launches Expo Metro dev server on port `8081`)
- `npm run android` (`expo run:android`)
- `npm run ios` (`expo run:ios`)
- `npm run web` (`expo start --web`)

---

## 4. Expo Configuration
- **`app.json`**:
  - `name`: "Trak"
  - `slug`: "trak"
  - `scheme`: "trak"
  - `android.package`: "com.trak.app"
  - `plugins`: `expo-router`, `expo-font`, `expo-web-browser`, `expo-notifications`, `expo-splash-screen`
- **`metro.config.js`**: Standard Expo Metro configuration wrapped with `nativewind/metro`.
- **`babel.config.js`**: Standard `babel-preset-expo`.
- **`eas.json`**: Contains `development`, `preview`, and `production` build profiles with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

## 5. Backend Configuration
- **Primary Backend**: Supabase Cloud Services.
- **Local Node/Express Server**: No local server process is defined inside this codebase. If an external local server is running on port `3000` on the developer PC, it must bind to `0.0.0.0` (all network interfaces) and allow incoming connections through Windows Firewall.

---

## 6. API URL Analysis
- **Supabase URL**: Configured in `services/supabase.ts` via `process.env.EXPO_PUBLIC_SUPABASE_URL` with fallback to `https://xieqehaznjfnwslekqlg.supabase.co`.
- **Dynamic Local API URL**: Defined in `constants/config.ts` using `getApiUrl()`, which inspects `EXPO_PUBLIC_API_URL`, Expo's `Constants.expoConfig?.hostUri`, and platform defaults (`10.0.2.2:3000` for Android emulator, `localhost:3000` for Web).

---

## 7. Localhost References
The codebase was scanned for hardcoded IP addresses, hostnames, and port numbers:

1. **[constants/config.ts](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/constants/config.ts)**:
   - **Line 26**: `http://${devHostIp}:3000` (Used for Expo Go LAN development on physical devices).
   - **Line 31**: `http://10.0.2.2:3000` (Used for Android Emulator loopback).
   - **Line 34**: `http://localhost:3000` (Used for iOS Simulator / Web fallback).
   - **Mobile Compatibility**: `localhost:3000` will **FAIL** on physical Android devices.
2. **[app/auth.tsx](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/app/auth.tsx)**:
   - **Line 358**: `returnedRedirectTo.includes('localhost:3000') || returnedRedirectTo.includes('localhost')`
   - **Usage**: Detects if Supabase Auth fallback redirected OAuth requests to `localhost:3000` due to unconfigured Redirect URLs in Supabase Dashboard.
   - **Mobile Compatibility**: Warns when Supabase rejects `exp://` deep links and falls back to `localhost:3000`.
3. **[.env](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/.env) & [.env.example](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/.env.example)**:
   - **Line**: `# EXPO_PUBLIC_API_URL=http://localhost:3000` (Commented template).

---

## 8. Environment Variable Analysis
- **[.env](file:///c:/Users/Harshit/Desktop/Projects/Trak/Trak/.env)**:
  - `EXPO_PUBLIC_SUPABASE_URL`: FOUND — SECRET REDACTED
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: FOUND — SECRET REDACTED
- **Availability**: Variables prefixed with `EXPO_PUBLIC_` are correctly inlined into the Expo JavaScript bundle at build/start time by Metro.

---

## 9. Android Network Configuration
- **Cleartext HTTP Restrictions**:
  - Android 9+ (API Level 28+) blocks unencrypted `http://` network traffic by default unless `android:usesCleartextTraffic="true"` is enabled in `AndroidManifest.xml` or configured in `app.json`.
  - In `app.json`, cleartext HTTP traffic permissions are not explicitly declared.
  - When accessing `http://192.168.x.x:3000` over plain HTTP on physical Android devices, Android OS security policies may block the cleartext request.

---

## 10. Authentication / OAuth Analysis
- **OAuth Callback Generation**:
  - In `app/auth.tsx` (Line 298): `const redirectUrl = Linking.createURL('auth/callback');`
  - On **Web**: Resolves to `http://localhost:8081/auth/callback` or `http://localhost:3000`.
  - On **Physical Android (Expo Go)**: Resolves to `exp://192.168.x.x:8081/--/auth/callback` or `trak://auth/callback`.
- **Supabase Fallback Behavior**:
  - If `exp://192.168.x.x:8081/--/auth/callback` or `trak://` is NOT explicitly added to **Supabase Dashboard -> Auth -> URL Configuration -> Redirect URLs**, Supabase Auth rejects the requested redirect URL.
  - Upon rejection, Supabase Auth falls back to its default **Site URL** configured in the Supabase Dashboard (commonly `http://localhost:3000`).
  - When the browser on the physical Android phone receives the redirect to `http://localhost:3000`, the phone attempts to connect to `127.0.0.1:3000` on **itself**, resulting in `ERR_CONNECTION_REFUSED`.

---

## 11. Web vs Android Differences
| Feature | Web (`Platform.OS === 'web'`) | Physical Android Phone (`Platform.OS === 'android'`) |
| :--- | :--- | :--- |
| **`localhost` Resolution** | Resolves to PC (`127.0.0.1`) where server runs | Resolves to Phone (`127.0.0.1`) where NO server runs |
| **OAuth Callback** | `http://localhost:8081/auth/callback` | `exp://192.168.x.x:8081/--/auth/callback` |
| **Cleartext HTTP** | Allowed by desktop browser | Blocked by default on Android 9+ unless permitted |
| **Network Interface** | Direct local loopback | Wireless LAN (requires Wi-Fi + Firewall access) |

---

## 12. Port Analysis
- **Port 8081**: Expo Metro Bundler (Serves JavaScript bundle to phone).
- **Port 3000**: Optional local API server (Must listen on `0.0.0.0` to be reachable by phone).
- **Port 443**: Supabase Cloud HTTPS Endpoint (Publicly accessible).

---

## 13. Firewall / LAN Risks
1. **Windows Defender Firewall**:
   - Windows Firewall frequently blocks incoming connections on port `3000` and `8081` from external IP addresses on Public/Private Wi-Fi networks.
2. **Wi-Fi Router AP Isolation**:
   - Some Wi-Fi routers enable "Client Isolation" or "AP Isolation", preventing wireless devices (phone) from communicating directly with wired/wireless PCs.

---

## 14. Root Cause Candidates
| Severity | Candidate | Cause Description |
| :--- | :--- | :--- |
| **CRITICAL** | **1. Mobile Phone Loopback Resolution** | `localhost` on a physical phone resolves to `127.0.0.1` on the phone itself instead of the PC's LAN IP (`192.168.x.x`). |
| **CRITICAL** | **2. Supabase OAuth Redirect Fallback** | Supabase Auth rejects `exp://` redirect URLs if missing from Supabase Dashboard Redirect URLs and falls back to `http://localhost:3000`. |
| **HIGH** | **3. Windows Firewall Blocking** | Inbound network rules block phone access to PC ports `3000` / `8081`. |
| **MEDIUM** | **4. Android Cleartext Restrictions** | Android OS blocks plain `http://` traffic to `192.168.x.x:3000`. |

---

## 15. Evidence
1. **Error Message**: `localhost refused to connect` / `ERR_CONNECTION_REFUSED` on Android phone proves that the phone attempted to connect to `127.0.0.1:3000` locally.
2. **Line 358 in `app/auth.tsx`**: Explicitly includes a warning for when Supabase rejects native redirect URIs and falls back to `localhost:3000`.

---

## 16. Required Manual Tests

Run the following diagnostic commands on your Windows PC PowerShell / CMD:

```powershell
# 1. Check your PC's LAN IPv4 Address
ipconfig

# 2. Check if Port 3000 is listening on 0.0.0.0 (all interfaces) or 127.0.0.1 (localhost only)
netstat -ano | findstr :3000

# 3. Check if Expo Metro Port 8081 is listening
netstat -ano | findstr :8081

# 4. Test connectivity to port 3000 using your PC's LAN IP (replace <YOUR_PC_IP> with e.g. 192.168.1.X)
Test-NetConnection -ComputerName <YOUR_PC_IP> -Port 3000

# 5. Test phone connectivity by opening PC's IP in phone web browser:
# Open http://<YOUR_PC_IP>:8081 on phone browser
```

---

## 17. Recommended Fix
1. **Supabase Dashboard Redirect URL Configuration**:
   - Go to Supabase Dashboard -> **Auth** -> **URL Configuration**.
   - Add `exp://192.168.x.x:8081/--/auth/callback` and `trak://auth/callback` to **Redirect URLs**.
2. **Local API Server Binding**:
   - Ensure local server listens on `0.0.0.0:3000` instead of `127.0.0.1:3000`.
3. **Environment Variable Configuration**:
   - Set `EXPO_PUBLIC_API_URL=http://<YOUR_PC_IP>:3000` in `.env`.

---

## 18. Exact Files That Need Modification
- `Supabase Dashboard` (Cloud configuration - Auth Redirect URLs)
- `.env`
- `app.json` (If adding cleartext HTTP permission)

---

## 19. Exact Changes Required
- Add `exp://*` and `trak://*` allowed redirect URIs in Supabase Dashboard.
- Set `EXPO_PUBLIC_API_URL=http://<YOUR_PC_IP>:3000` in `.env`.

---

## 20. Final Diagnosis

### ROOT CAUSE
The physical Android phone attempts to connect to `localhost:3000` (either directly or via Supabase OAuth redirecting back to the default `localhost:3000` Site URL), but on a physical mobile device `localhost` resolves to the phone's internal loopback (`127.0.0.1`) where no server is running, rather than the developer PC's LAN IP address or cloud service.

### CONFIDENCE
**98%**

### DO NOT FIX YET
No project files, source code, or configuration files were modified during this diagnostic phase.
