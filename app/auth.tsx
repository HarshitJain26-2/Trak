import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Colors, useThemeColors } from '@/constants/colors';
import { supabase } from '@/services/supabase';
import { useProfileStore } from '@/store/useProfileStore';
import { useProjectStore } from '@/store/useProjectStore';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

import { setActiveUserId, emailToUUID } from '@/utils/deviceUser';
import { getPendingInviteToken } from '@/services/inviteService';

// Ensure in-app WebBrowser sessions complete properly on Android/iOS
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [existingAccountConflict, setExistingAccountConflict] = useState(false);

  // Password validation constraints for Sign Up
  const hasMinChars = password.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumericChar = /\d/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const isPasswordValid = hasMinChars && hasSpecialChar && hasNumericChar && hasMixedCase;

  // Helper: extract a clean, human-readable error message from any error shape
  const extractErrorMessage = (err: any, fallback: string): string => {
    if (!err) return fallback;

    // If it's a string, use it directly (unless it looks like serialized JSON)
    if (typeof err === 'string') {
      if (err.startsWith('{') || err.startsWith('[')) {
        try {
          const parsed = JSON.parse(err);
          return parsed.message || parsed.error_description || parsed.msg || fallback;
        } catch {
          return err;
        }
      }
      return err;
    }

    // Standard Error object or Supabase AuthError
    if (err.message && typeof err.message === 'string' && !err.message.startsWith('{')) {
      return err.message;
    }

    // Sometimes error.message is a JSON string (e.g. from fetch Response)
    if (err.message && typeof err.message === 'string') {
      try {
        const parsed = JSON.parse(err.message);
        return parsed.message || parsed.error_description || parsed.msg || fallback;
      } catch {
        return err.message;
      }
    }

    // Supabase error with status code
    if (err.status && err.status >= 500) {
      return 'Server error. Please check your Supabase database triggers and try again.';
    }

    // Raw Response object (shouldn't happen but safety net)
    if (err.statusText || err.url) {
      return `Server returned ${err.status || 'an error'}. Please try again later.`;
    }

    return fallback;
  };

  const navigateAfterAuth = async () => {
    const pendingInvite = await getPendingInviteToken();
    if (pendingInvite) {
      router.replace(`/invite/${pendingInvite}` as any);
      return;
    }
    const currentProfile = useProfileStore.getState().profile;
    const hasUsername =
      currentProfile.username &&
      currentProfile.username.trim() !== '' &&
      currentProfile.username !== 'developer';

    if (hasUsername) {
      router.replace('/(tabs)');
    } else {
      router.replace('/setup-profile');
    }
  };

  const handleAuthSubmit = async () => {
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setLoading(true);
    setLoginCompleted(false);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        // Check for Supabase auth errors (including duplicate email)
        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          const errCode = (error as any).code || '';
          const isUserExists =
            error.code === 'user_already_exists' ||
            errCode === '23505' ||
            errMsg.includes('already registered') ||
            errMsg.includes('already been registered') ||
            errMsg.includes('user already exists') ||
            errMsg.includes('duplicate key') ||
            errMsg.includes('unique constraint') ||
            errMsg.includes('users_email_partial_key');

          // Check if user already exists by probing signInWithPassword
          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });

            if (!signInError && signInData?.user) {
              // Sign-in succeeded! Auto-login user
              const userId = signInData.user.id || emailToUUID(cleanEmail);
              await setActiveUserId(userId);
              useProjectStore.getState().clearProjects();
              useProfileStore.getState().clearProfile();

              await useProfileStore.getState().fetchProfile(true);
              void useProjectStore.getState().fetchProjects({ forceRefresh: true });

              setLoginCompleted(true);

              await navigateAfterAuth();
              return;
            }

            if (signInError?.code === 'invalid_credentials' || isUserExists) {
              setLoading(false);
              setErrorMessage('An account with this email already exists. Please tap "Log In" below to sign in.');
              return;
            }
          } catch {}

          setLoading(false);
          if (error.status === 429 || errMsg.includes('rate limit')) {
            setErrorMessage('Rate limit reached. Please wait a minute or tap "Log In" below to sign in.');
          } else {
            setErrorMessage(extractErrorMessage(error, 'Sign up failed. Please try again.'));
          }
          return;
        }

        // Supabase may return a user with identities=[] when email is already registered
        // but email confirmation is disabled — detect this case
        if (data?.user && (data.user.identities?.length === 0)) {
          setLoading(false);
          setErrorMessage('An account with this email already exists. Please tap "Log In" below to sign in.');
          return;
        }

        // Set active user ID from Supabase auth user
        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);
        useProjectStore.getState().clearProjects();
        useProfileStore.getState().clearProfile();

        // Store name and email in profile state immediately
        useProfileStore.setState((s) => ({
          profile: {
            ...s.profile,
            ...(fullName.trim() ? { name: fullName.trim() } : {}),
            email: cleanEmail,
          },
        }));

        // Event-driven finish: mark completed & navigate instantly
        setLoginCompleted(true);
        await navigateAfterAuth();

        // Background data hydration for new user
        void useProfileStore.getState().fetchProfile(true);
        void useProjectStore.getState().fetchProjects({ forceRefresh: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        // Check for sign-in errors
        if (error) {
          setLoading(false);
          const msg = (error.message || '').toLowerCase();
          const code = (error as any).code || '';

          if (
            code === 'invalid_credentials' ||
            msg.includes('invalid login') ||
            msg.includes('invalid credentials') ||
            msg.includes('user not found')
          ) {
            setErrorMessage('Invalid email or password. Please check your credentials and try again.');
          } else if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
            setErrorMessage('Email not confirmed. Please check your inbox and confirm your email address before signing in.');
          } else if (error.status === 429 || code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
            setErrorMessage('Rate limit reached. Please wait a minute before trying again.');
          } else {
            setErrorMessage(extractErrorMessage(error, 'Sign in failed. Please try again.'));
          }
          return;
        }

        // Use Supabase auth user ID if available, otherwise email hash
        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);
        useProjectStore.getState().clearProjects();
        useProfileStore.getState().clearProfile();

        // Hydrate profile for this specific account
        await useProfileStore.getState().fetchProfile(true);
        void useProjectStore.getState().fetchProjects({ forceRefresh: true });

        // Event-driven finish: trigger completion animation & navigate
        setLoginCompleted(true);
        await navigateAfterAuth();
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(extractErrorMessage(err, 'Authentication failed. Please try again.'));
    }
  };

  /**
   * Shared helper: complete the native OAuth flow for Google provider.
   * 1. Gets the OAuth URL with skipBrowserRedirect.
   * 2. Opens it via expo-web-browser.
   * 3. Extracts tokens from the redirect callback.
   * 4. Calls supabase.auth.setSession() to complete login.
   * The existing onAuthStateChange listener in _layout.tsx handles navigation.
   */
  const performOAuthFlow = async (provider: 'google' = 'google') => {
    const redirectUrl = Linking.createURL('auth/callback');

    if (Platform.OS === 'web') {
      // On Web, standard browser redirect is used.
      // signInWithOAuth will navigate window.location to Google -> Supabase -> /auth/callback.
      // app/auth/callback.tsx will process the tokens on return.
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
          throw new Error(
            'Google login is disabled in your Supabase Dashboard. ' +
            'Please enable Google under Supabase -> Auth -> Providers.'
          );
        }
        throw error;
      }
      return;
    }

    // Native (Android / iOS) Flow via in-app browser session
    const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
    console.log('[OAuth] Platform:', Platform.OS);
    console.log('[OAuth] Environment:', isExpoGo ? 'Expo Go' : 'Standalone / Dev Build');
    console.log('[OAuth] Generated redirect URI:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
        throw new Error(
          'Google login is disabled in your Supabase Dashboard. ' +
          'Please enable Google under Supabase -> Auth -> Providers.'
        );
      }
      throw error;
    }

    if (!data?.url) {
      throw new Error('Unable to start sign-in. Please try again.');
    }

    try {
      const parsedUrl = new URL(data.url);
      const returnedRedirectTo = parsedUrl.searchParams.get('redirect_to');
      console.log('[OAuth] OAuth URL host:', parsedUrl.hostname);
      console.log('[OAuth] Supabase returned redirect_to:', returnedRedirectTo);

      if (returnedRedirectTo && (returnedRedirectTo.includes('localhost:3000') || returnedRedirectTo.includes('localhost')) && !redirectUrl.includes('localhost')) {
        console.warn(
          `[OAuth Warning] Supabase Auth rejected requested redirect URI "${redirectUrl}" and fell back to "${returnedRedirectTo}". ` +
          `Please ensure "${redirectUrl}" is added to Supabase Dashboard -> Auth -> URL Configuration -> Redirect URLs.`
        );
      }
    } catch (_) {}

    // Open the OAuth URL in an in-app browser session
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    console.log('[OAuth] WebBrowser result type:', result.type);

    if (result.type !== 'success' || !result.url) {
      throw new Error('CANCELLED');
    }

    console.log('[OAuth] Callback received: true');

    // Extract query and hash parameters from callback URL
    const callbackUrl = result.url;
    let params = new URLSearchParams();

    const hashIndex = callbackUrl.indexOf('#');
    if (hashIndex !== -1) {
      params = new URLSearchParams(callbackUrl.substring(hashIndex + 1));
    }
    const queryIndex = callbackUrl.indexOf('?');
    if (queryIndex !== -1) {
      const qParams = new URLSearchParams(callbackUrl.substring(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined));
      qParams.forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    }

    // Check for OAuth error in callback
    const errParam = params.get('error_description') || params.get('error');
    if (errParam) {
      throw new Error(decodeURIComponent(errParam.replace(/\+/g, ' ')));
    }

    // 1. Handle PKCE Code exchange flow
    const code = params.get('code');
    if (code) {
      console.log('[OAuth Mobile] Callback contains code: true');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('[OAuth Mobile] Code exchange error:', exchangeError.message);
        throw new Error('Unable to complete sign-in. Please try again.');
      }
      console.log('[OAuth Mobile] Session established via PKCE: true');
      return;
    }

    // 2. Handle Implicit Token flow
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[OAuth Mobile] Callback contains tokens: true');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('[OAuth Mobile] setSession error:', sessionError.message);
        throw new Error('Unable to complete sign-in. Please try again.');
      }

      console.log('[OAuth Mobile] Session established via setSession: true');
      return;
    }

    // 3. Fallback check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication failed. No tokens or session found.');
    }
    console.log('[OAuth Mobile] Session verified: true');
  };

  const handleGoogleAuth = async () => {
    if (loading) return; // prevent duplicate taps
    setLoading(true);
    setErrorMessage('');
    try {
      useProjectStore.getState().clearProjects();
      useProfileStore.getState().clearProfile();
      await performOAuthFlow('google');

      // Mark login completed for the loading animation
      setLoginCompleted(true);

      // Fetch profile to decide navigation target
      await useProfileStore.getState().fetchProfile(true);
      void useProjectStore.getState().fetchProjects({ forceRefresh: true });

      await navigateAfterAuth();
    } catch (err: any) {
      if (err?.message === 'CANCELLED') {
        // User cancelled — no error shown
      } else {
        const msg = (err?.message || '').toLowerCase();
        if (
          msg.includes('identity_already_exists') ||
          msg.includes('already exists') ||
          msg.includes('already registered') ||
          msg.includes('already been registered') ||
          msg.includes('multiple accounts') ||
          msg.includes('multiple_accounts')
        ) {
          setExistingAccountConflict(true);
        } else {
          setErrorMessage(err?.message || 'Google sign-in failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setErrorMessage('');
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Full-Screen Futuristic Loading Screen while signing in or signing up */}
      {loading && (
        <Modal visible={loading} animationType="fade" transparent={false}>
          <FuturisticLoadingScreen
            completed={loginCompleted}
            onFinish={() => {
              setLoading(false);
              setLoginCompleted(false);
            }}
            durationMs={2500}
            themeMode="dark"
          />
        </Modal>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIconBox, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}4D` }]}>
                <Feather name="terminal" size={20} color={colors.primaryFixed} />
              </View>
              <Text style={[styles.logoText, { color: colors.onSurface }]}>Trak</Text>
            </View>

            <Text style={[styles.mainTitle, { color: colors.onSurface }]}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              {mode === 'signin'
                ? 'Welcome back, developer. Authenticate to sync your workspace.'
                : 'Initialize your developer profile.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
            {existingAccountConflict ? (
              <View style={[styles.conflictBanner, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Feather name="shield" size={16} color={colors.primaryFixed} />
                  <Text style={[styles.conflictTitle, { color: colors.primaryFixed }]}>Existing Account Found</Text>
                </View>
                <Text style={[styles.conflictText, { color: colors.onSurfaceVariant }]}>
                  An account with this email already exists using email and password. Sign in with your password first, then connect Google from Settings → Account & Identities.
                </Text>
                <Pressable
                  style={[styles.conflictBtn, { backgroundColor: colors.primaryFixed }]}
                  onPress={() => {
                    setMode('signin');
                    setExistingAccountConflict(false);
                    setErrorMessage('');
                  }}
                >
                  <Text style={[styles.conflictBtnText, { color: colors.onPrimaryFixed }]}>Sign In with Password</Text>
                </Pressable>
              </View>
            ) : errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}4D` }]}>
                <Feather name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* FULL NAME (Sign Up only) */}
            {mode === 'signup' && (
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Feather name="user" size={14} color={colors.onSurfaceVariant} style={styles.fieldIcon} />
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>FULL NAME</Text>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, color: colors.onSurface }]}
                  placeholder="e.g. Linus Torvalds"
                  placeholderTextColor={`${colors.onSurfaceVariant}70`}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* WORK EMAIL */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Feather name="at-sign" size={14} color={colors.onSurfaceVariant} style={styles.fieldIcon} />
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>WORK EMAIL</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, color: colors.onSurface }]}
                placeholder={mode === 'signin' ? 'name@company.dev' : 'dev@company.io'}
                placeholderTextColor={`${colors.onSurfaceVariant}70`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* PASSWORD */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRowBetween}>
                <View style={styles.labelRow}>
                  <Feather name="lock" size={14} color={colors.onSurfaceVariant} style={styles.fieldIcon} />
                  <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>PASSWORD</Text>
                </View>
                {mode === 'signin' && (
                  <Pressable onPress={() => setErrorMessage('Password reset link sent to your email.')}>
                    <Text style={[styles.forgotLink, { color: colors.primaryFixed }]}>Forgot?</Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.passwordInputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.onSurface }]}
                  placeholder="••••••••"
                  placeholderTextColor={`${colors.onSurfaceVariant}70`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            </View>

            {/* SECURITY CONSTRAINTS (Sign Up only) */}
            {mode === 'signup' && (
              <View style={[styles.constraintsCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <View style={styles.constraintsHeader}>
                  <Text style={[styles.constraintsTitle, { color: colors.onSurfaceVariant }]}>SECURITY CONSTRAINTS</Text>
                  <View style={[styles.statusBadge, { backgroundColor: isPasswordValid ? `${colors.primaryFixed}1A` : `${colors.secondary}1A` }]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: isPasswordValid ? colors.primaryFixed : colors.secondary }
                    ]}>
                      STATUS: {isPasswordValid ? 'READY' : 'WEAK'}
                    </Text>
                  </View>
                </View>

                <View style={styles.constraintsGrid}>
                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasMinChars ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasMinChars ? colors.primaryFixed : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasMinChars && { color: colors.onSurface }]}>
                      min 8 chars
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasSpecialChar ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasSpecialChar ? colors.primaryFixed : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasSpecialChar && { color: colors.onSurface }]}>
                      1 special
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasNumericChar ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasNumericChar ? colors.primaryFixed : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasNumericChar && { color: colors.onSurface }]}>
                      1 numeric
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasMixedCase ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasMixedCase ? colors.primaryFixed : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasMixedCase && { color: colors.onSurface }]}>
                      case mixed
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primaryFixed },
                pressed && styles.primaryBtnPressed,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={handleAuthSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimaryFixed} />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Feather name="arrow-right" size={18} color={colors.onPrimaryFixed} style={{ marginLeft: 6 }} />
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
              <Text style={[styles.dividerText, { color: `${colors.onSurfaceVariant}70` }]}>
                {mode === 'signin' ? 'OR CONTINUE WITH' : 'OR PROTOCOL'}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
            </View>

            {/* OAuth Buttons */}
            <Pressable
              style={({ pressed }) => [
                styles.githubBtn,
                { width: '100%', backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                pressed && styles.githubBtnPressed,
              ]}
              onPress={handleGoogleAuth}
            >
              <Feather name="chrome" size={18} color={colors.primaryFixed} style={{ marginRight: 10 }} />
              <Text style={[styles.githubBtnText, { color: colors.onSurface }]}>
                {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
              </Text>
            </Pressable>
          </View>

          {/* Toggle Footer Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
              {mode === 'signin' ? "Don't have a dev account? " : 'Already have an account? '}
            </Text>
            <Pressable onPress={toggleMode}>
              <Text style={[styles.footerLink, { color: colors.primaryFixed }]}>
                {mode === 'signin' ? 'Sign up for Trak' : 'Log In'}
              </Text>
            </Pressable>
          </View>

          {/* Build Version Tag */}
          <Text style={[styles.buildVersion, { color: `${colors.onSurfaceVariant}70` }]}>BUILD V2.4.0-STABLE</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090B10',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  card: {
    width: '100%',
    backgroundColor: '#111622',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F293D',
    marginBottom: 24,
  },
  conflictBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  conflictTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  conflictText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  conflictBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FF5252',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldIcon: {
    marginRight: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#8B949E',
    letterSpacing: 0.8,
  },
  forgotLink: {
    fontSize: 12,
    color: '#00E676',
    fontFamily: 'Inter_500Medium',
  },
  input: {
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  constraintsCard: {
    backgroundColor: '#161C2A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#212B3E',
    marginBottom: 18,
  },
  constraintsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  constraintsTitle: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#8B949E',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  constraintsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  constraintRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  constraintText: {
    fontSize: 11,
    color: '#484F58',
    marginLeft: 6,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  constraintTextActive: {
    color: '#8B949E',
  },
  primaryBtn: {
    backgroundColor: '#00E676',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0C10',
    fontFamily: 'Inter_700Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#212B3E',
  },
  dividerText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
    color: '#484F58',
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },
  githubBtn: {
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubBtnPressed: {
    backgroundColor: '#1F293D',
  },
  githubBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#8B949E',
    fontFamily: 'Inter_400Regular',
  },
  footerLink: {
    fontSize: 13,
    color: '#00E676',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  buildVersion: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#30363D',
    letterSpacing: 1.2,
    marginTop: 8,
  },
});
