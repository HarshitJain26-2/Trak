# FONT STANDARDIZATION REPORT — Trak

**Date:** August 2026  
**Status:** ✅ Complete  
**Font:** Inter (single consistent font family across all pages)

---

## 1. Objective

Standardize the entire Trak application to use ONE consistent font family across all screens, platforms, and components. Eliminated the separate monospace font (JetBrainsMono) that was used for technical text, creating a unified typography experience.

---

## 2. Font Used

| Property | Value |
|----------|-------|
| **Font Family** | Inter |
| **Source** | `@expo-google-fonts/inter` |
| **Weights** | 400 Regular, 500 Medium, 600 Semibold, 700 Bold |
| **Platform** | Android, iOS, Web |
| **Consistency** | Every text element across all 37+ screens uses Inter |

---

## 3. Changes Summary

### 3.1 JetBrainsMono Removal
**77 font references replaced across 27 files:**

| File | JetBrainsMono Refs Replaced |
|------|-----------------------------|
| `app/(tabs)/project/[id].tsx` | 15 |
| `app/(tabs)/search.tsx` | 9 |
| `app/(tabs)/profile.tsx` | 8 |
| `app/auth.tsx` | 6 |
| `components/project/ProjectCard.tsx` | 5 |
| `app/(tabs)/completed.tsx` | 5 |
| `app/(tabs)/deleted.tsx` | 3 |
| `app/(tabs)/index.tsx` | 3 |
| `components/project/WidgetPreviewCard.tsx` | 3 |
| `app/settings.tsx` | 2 |
| `app/setup-profile.tsx` | 2 |
| `app/onboarding.tsx` | 2 |
| `components/modals/ProjectActionModal.tsx` | 2 |
| `components/common/EmptyState.tsx` | 2 |
| `components/auth/AuthFooter.tsx` | 2 |
| `app/new-project.tsx` | 1 |
| `components/auth/AuthHeader.tsx` | 1 |
| `components/auth/AuthHeroPreview.tsx` | 1 |
| `components/common/TechPill.tsx` | 1 |
| `components/modals/CalendarPickerModal.tsx` | 1 |
| `components/modals/IncompleteTasksWarningModal.tsx` | 1 |
| `components/modals/JoinProjectModal.tsx` | 1 |
| `components/modals/ProjectCodeModal.tsx` | 1 |
| `components/modals/ReminderConfigModal.tsx` | 1 |
| `components/project/CountdownTimer.tsx` | 1 |
| `components/ProgressCounter.tsx` | 1 |

**Mapping applied:**
| Old Token | New Token |
|-----------|-----------|
| `JetBrainsMono_400Regular` | `Inter_400Regular` |
| `JetBrainsMono_500Medium` | `Inter_500Medium` |
| `JetBrainsMono_700Bold` | `Inter_700Bold` |

### 3.2 Font Loading Cleanup (`app/_layout.tsx`)
- Removed `import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono'`
- Removed duplicate entries from `useFonts()` call
- Now loads only 4 Inter font weights:
  ```typescript
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  ```

### 3.3 Centralized Typography Constants
Created `constants/typography.ts`:
```typescript
export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const WEB_FONT_FAMILY = '"Inter", sans-serif';
```

### 3.4 Web CSS (`global.css`)
Added global font-family for web:
```css
html, body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

input, textarea, button, select {
  font-family: inherit;
}
```

---

## 4. Visual Hierarchy Preserved

All text that previously used JetBrainsMono (monospace) now uses Inter with its original styling preserved:

- **TRK join codes** (e.g., `TRK-7K4P9Q`) — still uppercase with letter-spacing
- **Version badges** (e.g., `v1.0.0`) — still bold with monospace-style letter-spacing
- **Build versions** — still uppercase
- **Project IDs** — still styled for readability
- **Technical metadata** — letter-spacing and case preserved

The hierarchy is maintained through font **size**, **weight**, **letter-spacing**, **uppercase styling**, and **color** — not through separate font families.

---

## 5. Weight Distribution (Current)

| Token | Usage | Approx Count |
|-------|-------|--------------|
| `Inter_400Regular` | Body text, descriptions, inputs, subtitles | ~140 |
| `Inter_500Medium` | Labels, secondary text, codes, inputs | ~45 |
| `Inter_600SemiBold` | Headings, card titles, buttons | ~100 |
| `Inter_700Bold` | Section headers, titles, brand text | ~55 |

---

## 6. Screens Verified

- ✅ Login / Signup / Forgot Password / OTP
- ✅ Dashboard (index, search, filter, history, completed, deleted tabs)
- ✅ Project Detail page
- ✅ Profile page
- ✅ Settings (all sections including widget preview)
- ✅ All modals (JoinProject, ProjectCode, QRScanner, ConfirmDialog, ActionSheet, CalendarPicker, ReminderConfig, IncompleteTasksWarning)
- ✅ Auth components (AuthHeader, AuthFooter, AuthHeroPreview, AuthSecurityNote, AuthTrustRow)
- ✅ Empty states
- ✅ In-app notification banner
- ✅ New project screen
- ✅ Onboarding screen
- ✅ Setup profile screen
- ✅ Widget preview component

---

## 7. Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Exit code 0 (no errors) |
| JetBrainsMono references remaining | ✅ 0 |
| `npx expo export --platform web` | ✅ Build successful |
| Font consistency across all source files | ✅ All use Inter |

---

## 8. Platform Support

| Platform | Font | Status |
|----------|------|--------|
| Android | Inter (via expo-google-fonts) | ✅ Loaded at startup |
| iOS | Inter (via expo-google-fonts) | ✅ Loaded at startup |
| Web | Inter (via CSS + expo-google-fonts) | ✅ Set in global.css |

---

## 9. No Functionality Changes

- Authentication: ✅ Unchanged
- Supabase: ✅ Unchanged
- Realtime: ✅ Unchanged
- Navigation: ✅ Unchanged
- Project logic: ✅ Unchanged
- Widget sync: ✅ Unchanged
- Notifications: ✅ Unchanged

---

## 10. Known Limitations

1. **`@expo-google-fonts/jetbrains-mono` package** remains installed in `node_modules/` but is no longer imported or used. Can be removed with `npm uninstall @expo-google-fonts/jetbrains-mono` when convenient.
2. **Existing hardcoded font strings** throughout the 37 files still use the `'Inter_400Regular'` literal pattern. The `constants/typography.ts` file provides centralized tokens for future refactoring.
3. **Third-party icon fonts** (Feather, Ionicons, Material via `@expo/vector-icons`) remain unchanged — these are icon fonts, not text fonts.
