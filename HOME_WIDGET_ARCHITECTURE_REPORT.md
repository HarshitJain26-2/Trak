# HOME WIDGET ARCHITECTURE REPORT — TRAK

## 1. EXISTING PROJECT ANALYSIS

### Expo SDK & Build Configuration
- **Expo SDK**: 54.0.37 (React Native 0.81.5, React 19.1.0)
- **Build workflow**: Development build (EAS) — NOT Expo Go
- **EAS profiles**: `development` (internal), `preview` (APK), `production` (AAB)
- **Android package**: `com.trak.app`
- **Deep link scheme**: `trak` (configured in `app.json`)
- **Native modules already in use**: `expo-notifications`, `expo-camera`, `expo-blur`, `expo-linear-gradient`, `expo-image-picker`, `expo-clipboard`, etc.

### State Management
- **Zustand** stores: `useProjectStore`, `useSettingsStore`, `useProfileStore`, `useNotificationStore`
- **Storage**: `AsyncStorage` via `safeStorage` wrapper (with web fallback)
- **Pinning**: Already implemented — `isPinned` field on `Project`, `togglePinProject()` action, persisted locally via `getPinnedStorageKey(userId)`

### Realtime
- Supabase Realtime channel `trak-collab` handles projects, milestones, project_members, notifications, and profiles changes
- Updates are applied optimistically to Zustand state, then reconciled via background fetch

### Deep Linking
- Expo Router with scheme `trak://`
- Routes: `trak://project/{id}` → `/(tabs)/project/[id]`
- Notification taps already navigate to `trak://project/{projectId}` via `router.push()`

## 2. WIDGET FRAMEWORK SELECTION

### Decision: `react-native-android-widget` (v0.22.1)

**Rationale:**
- `expo-widgets` (official) is **iOS-only** — not suitable for Android-first approach
- `react-native-android-widget` supports React Native 0.76+ (project uses 0.81.5)
- Provides Expo config plugin for seamless integration
- Renders widgets using React Native components (no native XML/Java required)
- Supports click actions with deep links (`OPEN_URI` → `trak://project/{id}`)
- Supports dark/light theme via `WidgetRepresentation` (`{ light, dark }`)
- Includes `WidgetPreview` component for in-app previews
- Actively maintained (v0.22.1 published recently)

### Widget Component API
- `FlexWidget` — container (vertical/horizontal layout)
- `TextWidget` — text with font family, weight, color, size
- `ListWidget` — scrollable list container
- `IconWidget` — vector icons
- `SvgWidget` — SVG rendering

### Key Functions
- `registerWidgetTaskHandler(handler)` — handles WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED, WIDGET_DELETED, WIDGET_CLICK
- `requestWidgetUpdate({ widgetName, renderWidget, widgetNotFound })` — manually trigger widget refresh
- `requestPinWidget({ widgetName })` — open launcher's native "add widget" prompt
- `WidgetPreview` — in-app preview component

## 3. DATA ARCHITECTURE

### Pinned Project Storage
The project already has local pinned project persistence:
- Key: `trak_pinned_projects_{userId}`
- Stored as: `string[]` of project IDs
- Managed by `togglePinProject()` in `useProjectStore`

### Widget Data Payload
A lightweight widget-specific cache stored separately:
- Key: `trak_widget_data_{userId}`
- Contains: `WidgetProjectData[]` (id, name, status, progress, lastUpdated, updatedAt)
- Written by `services/widget.ts` whenever pinned projects or their data change
- Read by the widget task handler when rendering

```typescript
interface WidgetProjectData {
  id: string;
  name: string;
  status: string;
  progress: number;
  lastUpdated: string;
  updatedAt: number; // epoch ms for staleness checks
}
```

**Security**: Only project ID, name, status, progress, and lastUpdated are stored. No auth tokens, Supabase keys, passwords, or sensitive data.

## 4. WIDGET COMMUNICATION STRATEGY

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN APP (JS)                         │
│                                                         │
│  useProjectStore                                        │
│    ├─ togglePinProject()  → saves pinned IDs locally   │
│    ├─ updateProject()      → updates Zustand state      │
│    ├─ deleteProject()     → removes from state          │
│    └─ Realtime handlers    → sync state on DB changes   │
│                                                         │
│  services/widget.ts                                     │
│    ├─ updateWidgetData()   → writes WidgetProjectData   │
│    │                         to AsyncStorage            │
│    └─ refreshWidget()      → calls requestWidgetUpdate()│
│                                                         │
│  widgets/widgetTaskHandler.ts                           │
│    └─ registerWidgetTaskHandler()                       │
│        ├─ Reads WidgetProjectData from AsyncStorage     │
│        └─ Calls renderWidget() with FlexWidget/Text UI  │
└─────────────────────────────────────────────────────────┘
                          │
                    requestWidgetUpdate()
                          │
┌─────────────────────────────────────────────────────────┐
│              ANDROID WIDGET (Headless JS)                │
│                                                         │
│  TrakWidget (FlexWidget + TextWidget)                   │
│    ├─ Small: 2 projects compact                         │
│    ├─ Medium: 3 projects with progress bars             │
│    └─ Large: 5 projects with details                     │
│                                                         │
│  Click actions:                                         │
│    ├─ Project tap → OPEN_URI → trak://project/{id}     │
│    └─ Widget tap  → OPEN_APP                            │
└─────────────────────────────────────────────────────────┘
```

## 5. REALTIME SYNCHRONIZATION STRATEGY

The widget does NOT create a second realtime architecture. It piggybacks on the existing `trak-collab` Supabase Realtime channel.

When realtime receives a project update:
1. Existing Zustand state update happens (unchanged)
2. `services/widget.ts` → `refreshWidget()` is called as a side-effect
3. Widget task handler re-renders with updated data
4. No app reload, no skeleton, no navigation reset

Trigger points for widget refresh:
- `togglePinProject()` — pin/unpin changes widget content
- `updateProject()` — name/status/progress changes
- `deleteProject()` / `permanentlyDeleteProject()` — removed from widget
- `markCompleted()` / `unmarkCompleted()` — status changes
- `leaveProject()` — project removed from user's set
- Realtime UPDATE handler — external changes by collaborators
- Realtime DELETE handler — project deleted by owner
- Realtime project_members DELETE — user removed from project

## 6. DEEP LINK STRATEGY

- Widget project tap: `clickAction: 'OPEN_URI'`, `clickActionData: { uri: 'trak://project/{projectId}' }`
- Widget background tap: `clickAction: 'OPEN_APP'`
- Expo Router handles `trak://` scheme already configured in `app.json`
- Route `trak://project/{id}` → `/(tabs)/project/[id]` (already exists)
- No localhost URLs, no hardcoded IPs

## 7. OFFLINE / CACHE SUPPORT

- Widget data is stored in AsyncStorage (persists offline)
- Widget displays last known data when offline
- "Last updated" timestamp shown on large widget
- If no pinned projects: shows empty state ("No pinned projects. Open Trak to pin a project.")
- If no data at all: shows "Open Trak to pin a project" with OPEN_APP click action

## 8. SECURITY CONSIDERATIONS

- Widget only stores: project ID, name, status, progress, lastUpdated
- No Supabase credentials, auth tokens, or user PII in widget data
- Widget data is user-scoped (keyed by userId)
- On sign-out: widget data is cleared
- Project access is verified by the app (Supabase RLS) — widget only displays cached IDs
- If a project becomes inaccessible (deleted, membership revoked), the realtime handler removes it from state and triggers widget refresh

## 9. PLATFORM COMPATIBILITY

### Android (Primary)
- Fully supported via `react-native-android-widget`
- Requires development build or EAS build (already configured)
- Widget sizes: configurable via minWidth/minHeight/maxResizeWidth/maxResizeHeight
- Config plugin in `app.json` handles native registration

### iOS (Future)
- `expo-widgets` can be added for iOS when needed
- Would require separate Swift-based widget components
- Current implementation is Android-first per spec requirements

## 10. FILES TO BE CREATED

| File | Purpose |
|------|---------|
| `widgets/TrakWidget.tsx` | Native widget UI component (FlexWidget/TextWidget) |
| `widgets/widgetTaskHandler.ts` | Widget task handler registration |
| `services/widget.ts` | Widget data service (update, refresh, clear) |
| `components/settings/WidgetManagementSection.tsx` | Settings → Home Screen Widget section |
| `components/settings/WidgetPreviewCard.tsx` | In-app widget preview (small/medium/large) |

## 11. FILES TO BE MODIFIED

| File | Change |
|------|--------|
| `app.json` | Add `react-native-android-widget` config plugin |
| `app/_layout.tsx` | Register widget task handler on app launch |
| `store/useProjectStore.ts` | Call `refreshWidget()` after pin/unpin/update/delete/realtime changes |
| `components/modals/ProjectActionModal.tsx` | Update pin/unpin label to mention "Home Widget" |
| `app/settings.tsx` | Add Widget management section |
