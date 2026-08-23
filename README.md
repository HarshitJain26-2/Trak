<div align="center">

# 🚀 Trak

**Developer-first project tracking with real-time collaboration.**

Manage projects, milestones, and teams — all in one beautifully crafted workspace.

[![Expo](https://img.shields.io/badge/Expo-~54.0-black?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase)](https://supabase.com)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-success)](#)

</div>

---

## ✨ Overview

**Trak** is a modern, cross-platform project management application built with Expo and React Native. It provides a sleek, developer-focused interface for tracking projects, managing milestones, collaborating with team members, and staying on top of deadlines — with real-time synchronization powered by Supabase.

---

## 🎯 Features

### Core Functionality
- 📁 **Project Management** — Create, organize, and track projects with custom statuses
- 🏁 **Milestones & Tasks** — Break projects into milestones with individual task tracking
- ⏰ **Deadline Tracking** — Set deadlines with visual countdown timers and reminders
- 🔍 **Search & Filter** — Quickly find projects with advanced search and filtering
- 📊 **Dashboard** — At-a-glance overview of all active projects and progress

### Collaboration
- 👥 **Team Collaboration** — Invite members via join codes or QR scanning
- 🔔 **Real-time Notifications** — Instant push notifications for project updates
- 🔄 **Live Sync** — Supabase Realtime keeps all team members in sync
- 📱 **Home Screen Widget** — Android widget for quick project access

### Authentication & Security
- 🔐 **Email/Password Auth** — Secure sign-up and sign-in via Supabase Auth
- 🌐 **Google OAuth** — One-tap sign-in with Google
- 🔑 **Password Recovery** — OTP-based password reset flow
- 🛡️ **Row Level Security** — Database-level access control via Supabase RLS

### Design & UX
- 🌙 **Dark & Light Mode** — Full theme support with system detection
- ✨ **Futuristic UI** — Glassmorphism, animations, and modern design patterns
- 📱 **Responsive Layout** — Optimized for mobile and web (split-screen on desktop)
- 🦴 **Skeleton Loading** — Smooth loading states throughout the app
- 📳 **Haptic Feedback** — Tactile responses on supported devices

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo ~54.0 / React Native 0.81 |
| **Language** | TypeScript 5.9 |
| **Navigation** | Expo Router 6.0 |
| **State Management** | Zustand 5.0 |
| **Backend** | Supabase (Auth, Database, Realtime, Storage) |
| **Styling** | NativeWind (Tailwind CSS for RN) + StyleSheet |
| **Animations** | React Native Reanimated 4.1 |
| **Notifications** | Expo Notifications |
| **Home Widget** | react-native-android-widget |
| **Camera/QR** | Expo Camera + react-native-qrcode-svg |
| **Fonts** | Inter (via @expo-google-fonts/inter) |

---

## 📱 Screenshots

> Add screenshots here once available.

| Dashboard | Project Details | Sign In |
|-----------|----------------|---------|
| *Coming soon* | *Coming soon* | *Coming soon* |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) (for Android builds)
- [Xcode](https://developer.apple.com/xcode/) (for iOS builds, macOS only)

### Installation

```bash
# Clone the repository
git clone https://github.com/HarshitJain26-2/Trak.git
cd Trak

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **Never commit `.env` to version control.** It is already included in `.gitignore`.

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Run on Web
npx expo start --web
```

---

## 📂 Project Structure

```
Trak/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Tab navigation
│   │   ├── index.tsx           # Dashboard / Home
│   │   ├── project/            # Project details
│   │   ├── completed.tsx       # Completed projects
│   │   ├── deleted.tsx         # Deleted projects
│   │   ├── filter.tsx          # Filter screen
│   │   ├── history.tsx         # Activity history
│   │   ├── profile.tsx         # User profile
│   │   └── search.tsx          # Search screen
│   ├── auth.tsx                # Auth (Sign In/Up/Forgot Password)
│   ├── auth/callback.tsx       # OAuth callback handler
│   ├── new-project.tsx         # Create new project
│   ├── onboarding.tsx          # Onboarding flow
│   ├── settings.tsx            # App settings
│   ├── setup-profile.tsx       # Profile setup
│   ├── terms.tsx               # Terms of Service
│   └── privacy.tsx             # Privacy Policy
├── components/                 # Reusable UI components
│   ├── auth/                   # Auth screen components
│   ├── common/                 # Shared components
│   ├── legal/                  # Legal document wrapper
│   ├── modals/                 # Modal components
│   ├── project/                # Project-specific components
│   └── skeletons/              # Loading skeleton components
├── constants/                  # App constants
│   ├── colors.ts               # Theme colors (dark/light)
│   ├── config.ts               # App configuration
│   └── typography.ts           # Font tokens
├── services/                   # API & service layer
│   ├── notifications.ts        # Push notification service
│   ├── storage.ts              # Local storage service
│   ├── supabase.ts             # Supabase client
│   └── widget.ts               # Home widget service
├── store/                      # Zustand state stores
│   ├── useNotificationStore.ts
│   ├── useProfileStore.ts
│   ├── useProjectStore.ts
│   └── useSettingsStore.ts
├── supabase/
│   └── migrations/             # Database migrations
├── utils/                      # Utility functions
│   ├── deadlineValidator.ts
│   ├── deviceUser.ts
│   ├── haptics.ts
│   └── i18n.ts
├── widgets/                    # Android home widget
│   ├── TrakWidget.tsx
│   └── widgetTaskHandler.ts
├── public/                     # Firebase Hosting static files
│   └── privacy-policy/
│       └── index.html
├── firebase.json               # Firebase Hosting config
└── .firebaserc                 # Firebase project config
```

---

## 🗄 Supabase Setup

Trak uses Supabase as its backend. To set up your own instance:

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` in order
3. Configure authentication providers (Email, Google OAuth)
4. Enable Row Level Security (RLS) policies
5. Set up Realtime subscriptions for live updates
6. Add your Supabase URL and anon key to `.env`

---

## 🔔 Push Notifications

Trak supports push notifications via Expo Notifications:

- Android: Uses FCM (Firebase Cloud Messaging)
- iOS: Uses APNs (Apple Push Notification service)
- Tokens are stored in Supabase `user_push_tokens` table
- Notifications triggered on project updates, member joins, and deadline reminders

---

## 🏗 Building for Production

### Android APK / AAB

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Web Export

```bash
npx expo export --platform web
```

---

## 🌐 Firebase Hosting (Privacy Policy)

The Privacy Policy page is hosted via Firebase Hosting:

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Live URL:** [https://trakbyharshit.web.app/privacy-policy/](https://trakbyharshit.web.app/privacy-policy/)

---

## 📜 Legal

- [Terms of Service](app/terms.tsx) — In-app legal document
- [Privacy Policy](app/privacy.tsx) — In-app legal document
- [Privacy Policy (Web)](public/privacy-policy/index.html) — Hosted version

> ⚠️ Legal documents contain placeholder content. Final legally reviewed text must be supplied by the project owner before production release.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Harshit Jain**

- GitHub: [@HarshitJain26-2](https://github.com/HarshitJain26-2)

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev) — Cross-platform development framework
- [Supabase](https://supabase.com) — Open-source Firebase alternative
- [NativeWind](https://www.nativewind.dev) — Tailwind CSS for React Native
- [React Native](https://reactnative.dev) — Build native apps with React

---

<div align="center">

Built with ❤️ using Expo + Supabase

</div>
