# FONT AUDIT REPORT — Trak

**Date:** August 2026  
**Status:** ⏸️ BLOCKED — Awaiting Catiliya font file from user  
**Task:** Standardize entire application to Catiliya font

---

## 1. Current Font Architecture

### 1.1 Font Loading (app/_layout.tsx)
The app loads fonts via `@expo-google-fonts` packages in the root layout:

```typescript
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

const [fontsLoaded] = useFonts({
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
});
```

A `FuturisticLoadingScreen` is shown while fonts are loading (line 205–207), preventing FOUT.

### 1.2 Current Font Families Used
| Token | Weight | Usage |
|-------|--------|-------|
| `Inter_400Regular` | Regular | Body text, subtitles, descriptions |
| `Inter_500Medium` | Medium | Labels, secondary text, inputs |
| `Inter_600SemiBold` | Semibold | Headings, card titles, buttons |
| `Inter_700Bold` | Bold | Section headers, titles, brand text |
| `JetBrainsMono_400Regular` | Mono Regular | *(not actively referenced in source — loaded but unused)* |
| `JetBrainsMono_500Medium` | Mono Medium | Codes, version badges, technical labels, join codes |
| `JetBrainsMono_700Bold` | Mono Bold | Version badges, technical metadata |

### 1.3 app.json Font Config
```json
["expo-font", { "fonts": [] }]
```
Currently an empty fonts array — fonts are loaded programmatically in `_layout.tsx` instead.

### 1.4 Web CSS (global.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
No `@font-face`, no `font-family`, no CSS custom properties for fonts. The web version falls back to the system font.

---

## 2. Font Reference Statistics

**Total fontFamily references:** 332 across 37 files

### Per-file breakdown:
| File | Count | Primary Fonts |
|------|-------|---------------|
| `app/(tabs)/project/[id].tsx` | 56 | Inter_*, JetBrainsMono_* |
| `app/auth.tsx` | 26 | Inter_*, JetBrainsMono_* |
| `app/(tabs)/profile.tsx` | 26 | Inter_*, JetBrainsMono_* |
| `app/(tabs)/deleted.tsx` | 20 | Inter_*, JetBrainsMono_* |
| `app/settings.tsx` | 17 | Inter_*, JetBrainsMono_* |
| `app/new-project.tsx` | 16 | Inter_*, JetBrainsMono_* |
| `components/project/WidgetPreviewCard.tsx` | 16 | Inter_*, JetBrainsMono_* |
| `app/(tabs)/index.tsx` | 15 | Inter_*, JetBrainsMono_* |
| `components/modals/CalendarPickerModal.tsx` | 14 | Inter_* |
| `app/(tabs)/search.tsx` | 13 | Inter_*, JetBrainsMono_* |
| `app/(tabs)/completed.tsx` | 12 | Inter_*, JetBrainsMono_* |
| `app/setup-profile.tsx` | 11 | Inter_*, JetBrainsMono_* |
| `components/modals/JoinProjectModal.tsx` | 11 | Inter_*, JetBrainsMono_* |
| `components/modals/IncompleteTasksWarningModal.tsx` | 7 | Inter_*, JetBrainsMono_* |
| `components/project/ProjectCard.tsx` | 7 | Inter_*, JetBrainsMono_* |
| `components/modals/ProjectActionModal.tsx` | 7 | Inter_*, JetBrainsMono_* |
| `components/modals/ProjectCodeModal.tsx` | 7 | Inter_*, JetBrainsMono_* |
| `app/onboarding.tsx` | 6 | Inter_*, JetBrainsMono_* |
| `components/modals/ReminderConfigModal.tsx` | 6 | Inter_*, JetBrainsMono_* |
| `components/common/EmptyState.tsx` | 5 | Inter_* |
| `components/modals/QRScannerModal.tsx` | 5 | Inter_*, JetBrainsMono_* |
| `app/auth/callback.tsx` | 4 | Inter_* |
| `components/common/ConfirmDialog.tsx` | 4 | Inter_* |
| `components/common/ActionSheet.tsx` | 4 | Inter_* |
| `components/auth/AuthHeader.tsx` | 3 | Inter_*, JetBrainsMono_* |
| `components/common/InAppNotificationBanner.tsx` | 2 | Inter_* |
| `components/ProgressCounter.tsx` | 2 | Inter_* |
| `components/auth/AuthFooter.tsx` | 2 | Inter_* |
| `components/auth/AuthSecurityNote.tsx` | 1 | Inter_* |
| `components/project/CountdownTimer.tsx` | 1 | Inter_* |
| `app/(tabs)/filter.tsx` | 1 | Inter_* |
| `app/(tabs)/history.tsx` | 1 | Inter_* |
| `components/common/MemberAvatar.tsx` | 1 | Inter_* |
| `components/common/TechPill.tsx` | 1 | Inter_* |
| `components/auth/AuthHeroPreview.tsx` | 1 | Inter_* |
| `components/auth/AuthTrustRow.tsx` | 1 | Inter_* |

### Weight Distribution
| Font Token | Estimated Usage |
|------------|----------------|
| `Inter_400Regular` | ~130 |
| `Inter_500Medium` | ~40 |
| `Inter_600SemiBold` | ~100 |
| `Inter_700Bold` | ~55 |
| `JetBrainsMono_500Medium` | ~3 |
| `JetBrainsMono_700Bold` | ~4 |

---

## 3. Catiliya Font — Status

### ❌ NOT FOUND

- No `.ttf`, `.otf`, `.woff`, or `.woff2` files matching "Catiliya" exist in the project
- No `assets/fonts/` directory exists
- No reference to "Catiliya" in any source file, package.json, or config
- Searched the entire project tree (excluding `node_modules/`)
- Web search for "Catiliya font" returned no exact matches
- Closest matches found: "Cattleya" (cursive), "Cataleya" (calligraphy), "Cathalia" (decorative) — all unsuitable for a UI app

### Action Required
**The user must provide the Catiliya font file(s) and place them in `assets/fonts/`.**

Once provided, I will:
1. Inspect the actual font metadata (internal family name, PostScript name, available weights/styles)
2. Map the available weights to the current Inter/JetBrainsMono weight hierarchy
3. Implement the font standardization

---

## 4. Implementation Plan (Pending Font File)

### 4.1 Centralized Typography Constants
Create `constants/typography.ts` with:
- Font family name constant (from actual font metadata)
- Weight tokens mapped to actual font names
- Centralized text style presets (heading, body, label, mono)

### 4.2 Weight Mapping
| Current Token | Planned Mapping |
|---------------|----------------|
| `Inter_400Regular` | → Catiliya (actual regular weight) |
| `Inter_500Medium` | → Catiliya (actual medium weight, or regular with style) |
| `Inter_600SemiBold` | → Catiliya (actual semibold weight) |
| `Inter_700Bold` | → Catiliya (actual bold weight) |
| `JetBrainsMono_500Medium` | → Catiliya (actual medium weight, preserve letter-spacing) |
| `JetBrainsMono_700Bold` | → Catiliya (actual bold weight, preserve letter-spacing) |

### 4.3 Files Requiring Changes
- `app/_layout.tsx` — font loading (replace Inter/JetBrainsMono imports)
- `app.json` — font plugin config (if using expo-font plugin)
- `global.css` — add `font-family: "Catiliya", sans-serif` for web
- **37 .tsx files** — replace all `fontFamily: 'Inter_*'` and `fontFamily: 'JetBrainsMono_*'`
- `package.json` — remove `@expo-google-fonts/inter` and `@expo-google-fonts/jetbrains-mono` dependencies (if no longer used)

### 4.4 Web Font Strategy
- Add `@font-face` declaration in `global.css`
- Set `body` `font-family` to `"Catiliya", sans-serif`
- Ensure Tailwind inherits the font

### 4.5 Typography Architecture
- Centralized constants in `constants/typography.ts`
- Weight mapping based on actual Catiliya weights
- If only one weight exists, use size/letter-spacing/opacity for hierarchy

---

## 5. Screens Requiring Verification

After font replacement, verify:
- [ ] Login / Signup / Forgot Password / OTP
- [ ] Dashboard (index, search, filter, history, completed, deleted tabs)
- [ ] Project Detail page
- [ ] Profile page
- [ ] Settings (all sections including widget preview)
- [ ] All modals (JoinProject, ProjectCode, QRScanner, ConfirmDialog, ActionSheet, CalendarPicker, ReminderConfig, IncompleteTasksWarning)
- [ ] Auth components (AuthHeader, AuthFooter, AuthCard, AuthHeroPreview, AuthSecurityNote, AuthTrustRow)
- [ ] Empty states
- [ ] Skeleton loading screens
- [ ] In-app notification banner
- [ ] New project screen
- [ ] Onboarding screen
- [ ] Setup profile screen
- [ ] Widget preview component
- [ ] Dark mode + Light mode
