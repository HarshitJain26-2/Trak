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
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProjectStore } from '../store/useProjectStore';
import { useProfileStore } from '../store/useProfileStore';

import * as Notifications from 'expo-notifications';
import { setupNotificationHandler, registerForPushNotificationsAsync } from '../lib/pushNotifications';

export default function RootLayout() {
  const router = useRouter();
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const clearProjects = useProjectStore((s) => s.clearProjects);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const clearProfile = useProfileStore((s) => s.clearProfile);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Listen to auth state changes and notification events
  useEffect(() => {
    // Setup foreground behavior
    setupNotificationHandler();

    // Listen for incoming foreground notifications
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notification Received Foreground]', notification.request.content);
    });

    // Listen for user taps on notifications
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Notification Tap Data]', data);

      if (data?.projectId) {
        router.push(`/project/${data.projectId}` as any);
      } else if (data?.url) {
        router.push(data.url as any);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Load data for the newly signed-in user
          await fetchProfile();
          await fetchProjects();
          await registerForPushNotificationsAsync();
        } else if (event === 'SIGNED_OUT') {
          // Wipe all in-memory data so next user starts clean
          clearProjects();
          clearProfile();
          router.replace('/auth');
        }
      }
    );

    // Also load on mount if a session already exists (e.g. app restart)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile();
        fetchProjects();
        registerForPushNotificationsAsync();
      }
    });

    return () => {
      subscription.unsubscribe();
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primaryFixed} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.surfaceContainerLowest },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="auth" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="setup-profile" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="new-project" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

