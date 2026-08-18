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
import { View, ActivityIndicator, Platform, LogBox, AppState, AppStateStatus } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

// Ignore known web deprecation notices and push warnings
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'was removed from Expo Go',
  'Require cycle:',
  'expo-notifications',
  'SafeAreaView has been deprecated',
  'Animated: useNativeDriver is not supported',
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
]);

if (__DEV__) {
  const filterWebDeprecationWarnings = (origFn: (...args: any[]) => void) => {
    return (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (
        msg.includes('expo-notifications: Android Push notifications') ||
        msg.includes('was removed from Expo Go') ||
        msg.includes('useNativeDriver is not supported') ||
        msg.includes('props.pointerEvents is deprecated') ||
        msg.includes('shadow*" style props are deprecated') ||
        msg.includes('textShadow*" style props are deprecated') ||
        msg.includes('Listening to push token changes is not yet fully supported on web')
      ) {
        return;
      }
      origFn(...args);
    };
  };

  console.warn = filterWebDeprecationWarnings(console.warn);
  console.error = filterWebDeprecationWarnings(console.error);
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
  const subscribeToRealtime = useProjectStore((s) => s.subscribeToRealtime);
  const unsubscribeFromRealtime = useProjectStore((s) => s.unsubscribeFromRealtime);
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

  // Global Realtime Subscription & AppState Lifecycle Reconnection
  useEffect(() => {
    subscribeToRealtime();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        subscribeToRealtime();
        void fetchProjects({ forceRefresh: true });
      }
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeFromRealtime();
    };
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
    let isSessionInitialized = false;

    const handleUserSession = (userId: string, isSignInEvent: boolean) => {
      if (lastUserId === userId && isSessionInitialized) return;
      lastUserId = userId;
      isSessionInitialized = true;
      void setActiveUserId(userId);
      if (isSignInEvent) {
        clearProjects();
        clearProfile();
      }
      void fetchProfile();
      void fetchProjects({ forceRefresh: isSignInEvent });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.id) {
          handleUserSession(session.user.id, event === 'SIGNED_IN');
        } else if (event === 'SIGNED_OUT') {
          lastUserId = null;
          isSessionInitialized = false;
          void setActiveUserId(null);
          clearProjects();
          clearProfile();
          router.replace('/auth');
        }
      }
    );

    // Initial check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && !isSessionInitialized) {
        handleUserSession(session.user.id, false);
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
          <Stack.Screen name="invite/[token]" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="setup-profile" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="new-project" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
