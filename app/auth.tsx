import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';
import { supabase } from '@/services/supabase';
import { useProfileStore } from '@/store/useProfileStore';
import { useProjectStore } from '@/store/useProjectStore';

import { setActiveUserId, emailToUUID } from '@/utils/deviceUser';

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
  const [errorMessage, setErrorMessage] = useState('');

  // Password validation constraints for Sign Up
  const hasMinChars = password.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumericChar = /\d/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const isPasswordValid = hasMinChars && hasSpecialChar && hasNumericChar && hasMixedCase;

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

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        // Check for Supabase auth errors (including duplicate email)
        if (error) {
          if (
            error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('already been registered') ||
            error.message?.toLowerCase().includes('user already exists') ||
            error.code === 'user_already_exists'
          ) {
            setErrorMessage('An account with this email already exists. Please sign in instead.');
          } else {
            setErrorMessage(error.message || 'Sign up failed.');
          }
          return;
        }

        // Supabase may return a user with identities=[] when email is already registered
        // but email confirmation is disabled — detect this case
        if (data?.user && (data.user.identities?.length === 0)) {
          setErrorMessage('An account with this email already exists. Please sign in instead.');
          return;
        }

        // Set active user ID from Supabase auth user
        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);

        // Store name and email in profile state immediately
        useProfileStore.setState((s) => ({
          profile: {
            ...s.profile,
            ...(fullName.trim() ? { name: fullName.trim() } : {}),
            email: cleanEmail,
          },
        }));

        await useProfileStore.getState().fetchProfile();
        await useProjectStore.getState().fetchProjects();

        // Navigate to profile setup so user fills in their own details
        router.replace('/setup-profile');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password.trim(),
        });

        // Check for sign-in errors
        if (error) {
          if (
            error.message?.toLowerCase().includes('invalid login') ||
            error.message?.toLowerCase().includes('invalid credentials') ||
            error.message?.toLowerCase().includes('email not confirmed')
          ) {
            setErrorMessage('Invalid email or password. Please try again.');
          } else {
            setErrorMessage(error.message || 'Sign in failed.');
          }
          return;
        }

        // Use Supabase auth user ID if available, otherwise email hash
        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);

        await useProfileStore.getState().fetchProfile();
        await useProjectStore.getState().fetchProjects();

        const currentProfile = useProfileStore.getState().profile;
        const hasUsername =
          currentProfile.username &&
          currentProfile.username.trim() !== '' &&
          currentProfile.username !== 'developer';

        if (hasUsername) {
          // Returning user with existing profile -> go directly to dashboard
          router.replace('/(tabs)');
        } else {
          // New/incomplete profile -> prompt for setup
          router.replace('/setup-profile');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      if (error) {
        if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
          setErrorMessage('GitHub login is disabled in your Supabase Dashboard. Please use Email & Password, or enable GitHub under Supabase -> Auth -> Providers.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg = err.message || 'GitHub login failed.';
      if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
        setErrorMessage('GitHub login is disabled in your Supabase Dashboard. Please use Email & Password, or enable GitHub under Supabase -> Auth -> Providers.');
      } else {
        setErrorMessage(msg);
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
            {errorMessage ? (
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

            {/* GitHub OAuth Button */}
            <Pressable
              style={({ pressed }) => [
                styles.githubBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                pressed && styles.githubBtnPressed,
              ]}
              onPress={handleGitHubAuth}
            >
              <Feather name="github" size={18} color={colors.onSurface} style={{ marginRight: 10 }} />
              <Text style={[styles.githubBtnText, { color: colors.onSurface }]}>
                {mode === 'signin' ? 'GitHub' : 'Sign up with GitHub'}
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
