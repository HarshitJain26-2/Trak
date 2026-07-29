import { Stack } from 'expo-router';
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

export default function RootLayout() {
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const clearProjects = useProjectStore((s) => s.clearProjects);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Fetch projects and profile on app load
  useEffect(() => {
    fetchProjects();
    fetchProfile();
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

