import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

// Ignore Expo Go SDK 53+ push warning box and require cycles when running inside Expo Go app
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'was removed from Expo Go',
  'Require cycle:',
  'expo-notifications',
  'SafeAreaView has been deprecated',
]);

if (__DEV__) {
  const filterExpoNotificationsWarning = (origFn: (...args: any[]) => void) => {
    return (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (
        msg.includes('expo-notifications: Android Push notifications') ||
        msg.includes('was removed from Expo Go')
      ) {
        return;
      }
      origFn(...args);
    };
  };

  console.warn = filterExpoNotificationsWarning(console.warn);
  console.error = filterExpoNotificationsWarning(console.error);
}
import { supabase } from '@/services/supabase';
import { useProjectStore } from '@/store/useProjectStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { setActiveUserId } from '@/utils/deviceUser';
import { notificationService } from '@/services/notifications';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

export default function RootLayout() {
  const router = useRouter();
  const colors = useThemeColors();
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const clearProjects = useProjectStore((s) => s.clearProjects);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const clearProfile = useProfileStore((s) => s.clearProfile);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    loadSettings();
    if (Platform.OS !== 'web') {
      notificationService.ensureAndroidChannels();
    }
  }, []);

  // Listen for local notifications received and tapped
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[RootLayout] Local Notification Received:', notification.request.content.title);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[RootLayout] Local Notification Response Tapped:', response.notification.request.content);
      const data = response.notification.request.content.data;
      if (data?.projectId) {
        // Optionally handle deep link or navigation when user taps a notification
      }
    });

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Listen to auth state changes to keep data in sync with the logged-in user
  useEffect(() => {
    let lastUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          if (lastUserId !== session.user.id) {
            lastUserId = session.user.id;
            void setActiveUserId(session.user.id);
            // Wipe memory stores so new user session starts 100% clean
            clearProjects();
            clearProfile();
            // Fetch fresh profile and projects for NEW user
            void fetchProfile(true);
            void fetchProjects({ forceRefresh: true });
          }
        } else if (event === 'SIGNED_OUT') {
          lastUserId = null;
          void setActiveUserId(null);
          clearProjects();
          clearProfile();
          router.replace('/auth');
        }
      }
    );

    // Also load on mount if a session already exists (e.g. app restart)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        lastUserId = session.user.id;
        void setActiveUserId(session.user.id);
        void fetchProfile(true);
        void fetchProjects();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return <FuturisticLoadingScreen durationMs={1500} themeMode={colors.isDark ? 'dark' : 'light'} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="auth" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="setup-profile" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="new-project" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
