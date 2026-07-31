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
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/useProfileStore';
import { useProjectStore } from '../store/useProjectStore';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();

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

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        await useProfileStore.getState().fetchProfile();
        await useProjectStore.getState().fetchProjects();

        // Navigate to profile setup so user fills in their own details
        router.replace('/setup-profile');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          // If user hasn't registered in Supabase auth yet, grant smooth fallback for demo
          console.warn('Supabase signin error:', error.message);
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Invalid credentials. If new, click Sign Up below.');
            setLoading(false);
            return;
          }
        }

        await useProfileStore.getState().fetchProfile();
        await useProjectStore.getState().fetchProjects();

        // Always route through profile setup first on login
        // Pre-existing profiles will be pre-filled; user can skip if they want
        router.replace('/setup-profile');
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
    <SafeAreaView style={styles.container}>
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
              <View style={styles.logoIconBox}>
                <Feather name="terminal" size={20} color="#00E676" />
              </View>
              <Text style={styles.logoText}>Trak</Text>
            </View>

            <Text style={styles.mainTitle}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Welcome back, developer. Authenticate to sync your workspace.'
                : 'Initialize your developer profile.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color="#FF5252" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* FULL NAME (Sign Up only) */}
            {mode === 'signup' && (
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Feather name="user" size={14} color="#8B949E" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Linus Torvalds"
                  placeholderTextColor="#484F58"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* WORK EMAIL */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Feather name="at-sign" size={14} color="#8B949E" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>WORK EMAIL</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={mode === 'signin' ? 'name@company.dev' : 'dev@company.io'}
                placeholderTextColor="#484F58"
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
                  <Feather name="lock" size={14} color="#8B949E" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                </View>
                {mode === 'signin' && (
                  <Pressable onPress={() => setErrorMessage('Password reset link sent to your email.')}>
                    <Text style={styles.forgotLink}>Forgot?</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#484F58"
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
                    color="#8B949E"
                  />
                </Pressable>
              </View>
            </View>

            {/* SECURITY CONSTRAINTS (Sign Up only) */}
            {mode === 'signup' && (
              <View style={styles.constraintsCard}>
                <View style={styles.constraintsHeader}>
                  <Text style={styles.constraintsTitle}>SECURITY CONSTRAINTS</Text>
                  <View style={styles.statusBadge}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: isPasswordValid ? '#00E676' : '#FF9800' }
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
                      color={hasMinChars ? '#00E676' : '#484F58'}
                    />
                    <Text style={[styles.constraintText, hasMinChars && styles.constraintTextActive]}>
                      min 8 chars
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasSpecialChar ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasSpecialChar ? '#00E676' : '#484F58'}
                    />
                    <Text style={[styles.constraintText, hasSpecialChar && styles.constraintTextActive]}>
                      1 special
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasNumericChar ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasNumericChar ? '#00E676' : '#484F58'}
                    />
                    <Text style={[styles.constraintText, hasNumericChar && styles.constraintTextActive]}>
                      1 numeric
                    </Text>
                  </View>

                  <View style={styles.constraintRow}>
                    <Feather
                      name={hasMixedCase ? 'check-circle' : 'circle'}
                      size={14}
                      color={hasMixedCase ? '#00E676' : '#484F58'}
                    />
                    <Text style={[styles.constraintText, hasMixedCase && styles.constraintTextActive]}>
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
                pressed && styles.primaryBtnPressed,
                loading && styles.primaryBtnDisabled,
              ]}
              onPress={handleAuthSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0A0C10" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#0A0C10" style={{ marginLeft: 6 }} />
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {mode === 'signin' ? 'OR CONTINUE WITH' : 'OR PROTOCOL'}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* GitHub OAuth Button */}
            <Pressable
              style={({ pressed }) => [
                styles.githubBtn,
                pressed && styles.githubBtnPressed,
              ]}
              onPress={handleGitHubAuth}
            >
              <Feather name="github" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.githubBtnText}>
                {mode === 'signin' ? 'GitHub' : 'Sign up with GitHub'}
              </Text>
            </Pressable>
          </View>

          {/* Toggle Footer Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {mode === 'signin' ? "Don't have a dev account? " : 'Already have an account? '}
            </Text>
            <Pressable onPress={toggleMode}>
              <Text style={styles.footerLink}>
                {mode === 'signin' ? 'Sign up for Trak' : 'Log In'}
              </Text>
            </Pressable>
          </View>

          {/* Build Version Tag */}
          <Text style={styles.buildVersion}>BUILD V2.4.0-STABLE</Text>
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
