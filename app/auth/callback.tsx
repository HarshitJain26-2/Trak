import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useProfileStore } from '@/store/useProfileStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useThemeColors } from '@/constants/colors';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleOAuthCallback() {
      try {
        let rawUrl = '';
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
          rawUrl = window.location.href;
        }

        let params = new URLSearchParams();

        if (rawUrl) {
          // Check fragment (#access_token=... or #error=...)
          const hashIndex = rawUrl.indexOf('#');
          if (hashIndex !== -1) {
            params = new URLSearchParams(rawUrl.substring(hashIndex + 1));
          } else {
            // Check query string (?error=... or ?code=...)
            const queryIndex = rawUrl.indexOf('?');
            if (queryIndex !== -1) {
              params = new URLSearchParams(rawUrl.substring(queryIndex + 1));
            }
          }
        }

        // 1. Detect OAuth errors
        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');

        if (error || errorCode || errorDescription) {
          const rawDesc = errorDescription || error || 'Authentication failed';
          const cleanDesc = decodeURIComponent(rawDesc.replace(/\+/g, ' '));
          if (isMounted) {
            setErrorMessage(`Google sign-in failed: ${cleanDesc}`);
          }
          return;
        }

        // 2. Extract session tokens
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            if (isMounted) {
              setErrorMessage(`Unable to establish session: ${sessionError.message}`);
            }
            return;
          }
        } else {
          // If no tokens in callback URL, check if a session already exists
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (isMounted) {
              setErrorMessage('No authentication tokens found in redirect callback.');
            }
            return;
          }
        }

        // 3. Hydrate user stores and navigate to destination
        useProjectStore.getState().clearProjects();
        useProfileStore.getState().clearProfile();
        await useProfileStore.getState().fetchProfile(true);
        void useProjectStore.getState().fetchProjects({ forceRefresh: true });

        const currentProfile = useProfileStore.getState().profile;
        const hasUsername =
          currentProfile.username &&
          currentProfile.username.trim() !== '' &&
          currentProfile.username !== 'developer';

        if (isMounted) {
          if (hasUsername) {
            router.replace('/(tabs)');
          } else {
            router.replace('/setup-profile');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Authentication callback failed.');
        }
      }
    }

    handleOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Feather name="alert-circle" size={36} color={colors.error} style={{ marginBottom: 12 }} />
          <Text style={[styles.title, { color: colors.onSurface }]}>Sign In Error</Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>{errorMessage}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.replace('/auth')}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimaryFixed }]}>Return to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <FuturisticLoadingScreen durationMs={1200} themeMode={colors.isDark ? 'dark' : 'light'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
