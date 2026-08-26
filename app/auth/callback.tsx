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
  const [isExistingAccountConflict, setIsExistingAccountConflict] = useState(false);

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
          }
          // Check query string (?error=... or ?code=...)
          const queryIndex = rawUrl.indexOf('?');
          if (queryIndex !== -1) {
            const qParams = new URLSearchParams(rawUrl.substring(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined));
            qParams.forEach((v, k) => {
              if (!params.has(k)) params.set(k, v);
            });
          }
        }

        // 1. Detect OAuth errors
        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');

        if (error || errorCode || errorDescription) {
          const rawDesc = errorDescription || error || 'Authentication failed';
          const cleanDesc = decodeURIComponent(rawDesc.replace(/\+/g, ' '));
          const lowerDesc = cleanDesc.toLowerCase();
          const lowerCode = (errorCode || '').toLowerCase();

          // Check if error corresponds to an existing account conflict
          if (
            lowerCode.includes('identity_already_exists') ||
            lowerCode.includes('multiple_accounts') ||
            lowerDesc.includes('already exists') ||
            lowerDesc.includes('already registered') ||
            lowerDesc.includes('already been registered') ||
            lowerDesc.includes('multiple accounts')
          ) {
            if (isMounted) {
              setIsExistingAccountConflict(true);
            }
            return;
          }

          if (isMounted) {
            setErrorMessage(`Google sign-in failed: ${cleanDesc}`);
          }
          return;
        }

        // 2. Check for PKCE Code or Session Tokens
        const code = params.get('code');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const lowerExchangeMsg = (exchangeError.message || '').toLowerCase();
            if (
              lowerExchangeMsg.includes('identity_already_exists') ||
              lowerExchangeMsg.includes('already exists') ||
              lowerExchangeMsg.includes('already registered')
            ) {
              if (isMounted) {
                setIsExistingAccountConflict(true);
              }
              return;
            }
            if (isMounted) {
              setErrorMessage(`Unable to establish session: ${exchangeError.message}`);
            }
            return;
          }
        } else if (accessToken && refreshToken) {
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

        // 3. Check if user is returning from a link flow in Settings
        const { data: { user } } = await supabase.auth.getUser();
        const isGoogleLinked = user?.identities?.some((i) => i.provider === 'google');

        // 4. Hydrate user stores and navigate to destination
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

  if (isExistingAccountConflict) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${colors.primaryFixed}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Feather name="user-check" size={26} color={colors.primaryFixed} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Existing Account Found</Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
            An account with this email already exists using email and password. Sign in with your password first, then connect Google from Settings → Account & Identities.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primaryFixed, marginBottom: 10 },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.replace('/auth')}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimaryFixed }]}>Sign In with Password</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: colors.glassBorder },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.replace('/auth')}
          >
            <Text style={[styles.cancelButtonText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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

  return <FuturisticLoadingScreen durationMs={800} themeMode={colors.isDark ? 'dark' : 'light'} />;
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
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  cancelButton: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
