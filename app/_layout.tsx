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
import { useThemeColors } from '@/constants/colors';
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useProjectStore } from '@/store/useProjectStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSettingsStore } from '@/store/useSettingsStore';

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
  }, []);

  // Listen to auth state changes to keep data in sync with the logged-in user
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Load data for the newly signed-in user
          await fetchProfile();
          await fetchProjects();
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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryFixed} size="large" />
      </View>
    );
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
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="setup-profile" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="new-project" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
