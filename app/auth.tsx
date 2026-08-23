import React, { useState, useEffect, useRef } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import { supabase } from '@/services/supabase';
import { useProfileStore } from '@/store/useProfileStore';
import { useProjectStore } from '@/store/useProjectStore';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';
import { setActiveUserId, emailToUUID } from '@/utils/deviceUser';

// ─── Auth UI components ───
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthHeroPreview } from '@/components/auth/AuthHeroPreview';
import { AuthSecurityNote } from '@/components/auth/AuthSecurityNote';
import { AuthFooter } from '@/components/auth/AuthFooter';

export type AuthMode =
  | 'signin'
  | 'signup'
  | 'forgot_email'
  | 'forgot_otp'
  | 'forgot_new_password'
  | 'forgot_success';

export default function AuthScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth > 768;

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [existingAccountConflict, setExistingAccountConflict] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpInputRef = useRef<TextInput>(null);

  // Countdown timer for Resend Code cooldown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Focus OTP input when switching to OTP screen
  useEffect(() => {
    if (mode === 'forgot_otp') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
    }
  }, [mode]);

  // Password validation constraints for Sign Up & Reset Password
  const activePasswordToCheck = mode === 'forgot_new_password' ? newPassword : password;
  const hasMinChars = activePasswordToCheck.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(activePasswordToCheck);
  const hasNumericChar = /\d/.test(activePasswordToCheck);
  const hasMixedCase = /[a-z]/.test(activePasswordToCheck) && /[A-Z]/.test(activePasswordToCheck);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid = hasMinChars && hasSpecialChar && hasNumericChar && hasMixedCase;

  // Helper: extract a clean, human-readable error message from any error shape
  const extractErrorMessage = (err: any, fallback: string): string => {
    if (!err) return fallback;

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

    if (err.message && typeof err.message === 'string' && !err.message.startsWith('{')) {
      return err.message;
    }

    if (err.message && typeof err.message === 'string') {
      try {
        const parsed = JSON.parse(err.message);
        return parsed.message || parsed.error_description || parsed.msg || fallback;
      } catch {
        return err.message;
      }
    }

    if (err.status && err.status >= 500) {
      return 'Server error. Please check your Supabase configuration and try again.';
    }

    return fallback;
  };

  const navigateAfterAuth = async () => {
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

  // Helper: Mask email for privacy (e.g. h*****@vit.edu)
  const getMaskedEmail = (rawEmail: string): string => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const visiblePrefix = name.slice(0, 1);
    const maskedLength = Math.min(Math.max(name.length - 1, 3), 6);
    return `${visiblePrefix}${'*'.repeat(maskedLength)}@${domain}`;
  };

  // ─── 1. SIGN IN & SIGN UP SUBMISSION ─────────────────────────────────────────
  const handleAuthSubmit = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

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

          try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });

            if (!signInError && signInData?.user) {
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
              setErrorMessage('An account with this email already exists. Please tap "Sign In" below.');
              return;
            }
          } catch {}

          setLoading(false);
          if (error.status === 429 || errMsg.includes('rate limit')) {
            setErrorMessage('Rate limit reached. Please wait a minute or tap "Sign In" below.');
          } else {
            setErrorMessage(extractErrorMessage(error, 'Sign up failed. Please try again.'));
          }
          return;
        }

        if (data?.user && data.user.identities?.length === 0) {
          setLoading(false);
          setErrorMessage('An account with this email already exists. Please tap "Sign In" below.');
          return;
        }

        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);
        useProjectStore.getState().clearProjects();
        useProfileStore.getState().clearProfile();

        useProfileStore.setState((s) => ({
          profile: {
            ...s.profile,
            ...(fullName.trim() ? { name: fullName.trim() } : {}),
            email: cleanEmail,
          },
        }));

        setLoginCompleted(true);
        await navigateAfterAuth();

        void useProfileStore.getState().fetchProfile(true);
        void useProjectStore.getState().fetchProjects({ forceRefresh: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

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

        const userId = data?.user?.id || emailToUUID(cleanEmail);
        await setActiveUserId(userId);
        useProjectStore.getState().clearProjects();
        useProfileStore.getState().clearProfile();

        await useProfileStore.getState().fetchProfile(true);
        void useProjectStore.getState().fetchProjects({ forceRefresh: true });

        setLoginCompleted(true);
        await navigateAfterAuth();
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(extractErrorMessage(err, 'Authentication failed. Please try again.'));
    }
  };

  // ─── 2. SEND RECOVERY CODE (FORGOT PASSWORD) ─────────────────────────────────
  const handleSendResetCode = async () => {
    setErrorMessage('');
    setInfoMessage('');

    const cleanEmail = (forgotEmail || email).trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      setLoading(false);

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        if (error.status === 429 || errMsg.includes('rate limit') || errMsg.includes('over_email_send_rate_limit')) {
          setErrorMessage('Too many attempts. Please wait a moment and try again.');
          return;
        }
      }

      // Email Enumeration Protection: Always show confirmation and proceed to OTP step
      setForgotEmail(cleanEmail);
      setOtpCode('');
      setResendCooldown(60);
      setInfoMessage("If an account exists for this email, we've sent a recovery code.");
      setMode('forgot_otp');
    } catch (err: any) {
      setLoading(false);
      setForgotEmail(cleanEmail);
      setOtpCode('');
      setResendCooldown(60);
      setInfoMessage("If an account exists for this email, we've sent a recovery code.");
      setMode('forgot_otp');
    }
  };

  // ─── 3. RESEND RECOVERY CODE ─────────────────────────────────────────────────
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;

    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      setLoading(false);

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        if (error.status === 429 || errMsg.includes('rate limit') || errMsg.includes('over_email_send_rate_limit')) {
          setErrorMessage('Too many attempts. Please wait a moment and try again.');
          return;
        }
      }

      setResendCooldown(60);
      setInfoMessage('New verification code sent. Please check your inbox.');
    } catch {
      setLoading(false);
      setResendCooldown(60);
      setInfoMessage('New verification code sent. Please check your inbox.');
    }
  };

  // ─── 4. VERIFY RECOVERY OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setInfoMessage('');

    const cleanCode = otpCode.replace(/\D/g, '').trim();
    if (cleanCode.length !== 8) {
      setErrorMessage('Please enter the complete 8-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      setLoading(false);

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        if (errMsg.includes('expired') || errMsg.includes('otp_expired')) {
          setErrorMessage('That code has expired. Please request a new code.');
        } else if (error.status === 429 || errMsg.includes('rate limit')) {
          setErrorMessage('Too many attempts. Please wait a moment and try again.');
        } else {
          setErrorMessage('Invalid verification code. Please check the code and try again.');
        }
        return;
      }

      // Check if this account is Google-only (no password identity)
      if (data?.user) {
        const identities = data.user.identities || [];
        const isGoogleOnly =
          identities.length === 1 && identities[0].provider === 'google';

        if (isGoogleOnly) {
          await supabase.auth.signOut();
          setErrorMessage('This account uses Google sign-in. Please continue with Google.');
          setMode('signin');
          return;
        }
      }

      // Recovery session successfully established -> Proceed to New Password screen
      setMode('forgot_new_password');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(extractErrorMessage(err, 'Verification failed. Please check the code and try again.'));
    }
  };

  // ─── 5. RESET PASSWORD & UPDATE USER ─────────────────────────────────────────
  const handleResetPasswordSubmit = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('Please enter and confirm your new password.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password does not meet the security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setLoading(false);
        const errMsg = (error.message || '').toLowerCase();
        if (error.status === 429 || errMsg.includes('rate limit')) {
          setErrorMessage('Too many attempts. Please wait a moment and try again.');
        } else {
          setErrorMessage(extractErrorMessage(error, 'Unable to update password. Please try again.'));
        }
        return;
      }

      // Sign out recovery session to enforce fresh login with the new password
      await supabase.auth.signOut();

      setLoading(false);
      setMode('forgot_success');
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(extractErrorMessage(err, 'Failed to update password. Please try again.'));
    }
  };

  // ─── 6. RESET FORGOT PASSWORD FLOW STATE ─────────────────────────────────────
  const resetForgotState = () => {
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setInfoMessage('');
    setResendCooldown(0);
  };

  // ─── Derive heading & subtitle per mode ──────────────────────────────────────
  const getHeading = (): string => {
    switch (mode) {
      case 'signin': return 'Welcome Back';
      case 'signup': return 'Create Workspace';
      case 'forgot_email': return 'Reset Password';
      case 'forgot_otp': return 'Check Your Inbox';
      case 'forgot_new_password': return 'Create New Password';
      case 'forgot_success': return 'Password Updated';
    }
  };

  const getSubtitle = (): string => {
    switch (mode) {
      case 'signin': return 'Sign in to continue';
      case 'signup': return 'Bring your projects, milestones, and team into one place.';
      case 'forgot_email': return 'Enter your account email and we\'ll send you a recovery code.';
      case 'forgot_otp': return `Enter the recovery code we sent to ${getMaskedEmail(forgotEmail)}.`;
      case 'forgot_new_password': return 'Secure your Trak workspace with a new password.';
      case 'forgot_success': return 'Your Trak account is secure again.';
    }
  };

  const getHeaderTagline = (): string => {
    switch (mode) {
      case 'signin': return 'Developer workspace platform';
      case 'signup': return 'Join our developer community';
      default: return 'Secure Account Recovery';
    }
  };

  // ─── Password strength label ─────────────────────────────────────────────────
  const getPasswordStrength = (): { label: string; color: string } => {
    const checks = [hasMinChars, hasSpecialChar, hasNumericChar, hasMixedCase].filter(Boolean).length;
    if (checks === 0) return { label: 'WEAK', color: colors.error };
    if (checks <= 2) return { label: 'FAIR', color: colors.statusWarning };
    if (checks === 3) return { label: 'GOOD', color: colors.secondary };
    return { label: 'STRONG', color: colors.primaryFixed };
  };

  const isSignInOrSignUp = mode === 'signin' || mode === 'signup';

  // ─── Shared banners ─────────────────────────────────────────────────────────
  const renderBanners = () => (
    <>
      {/* Conflict Banner */}
      {existingAccountConflict ? (
        <View style={[styles.conflictBanner, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Feather name="shield" size={16} color={colors.primaryFixed} />
            <Text style={[styles.conflictTitle, { color: colors.primaryFixed }]}>Existing Account Found</Text>
          </View>
          <Text style={[styles.conflictText, { color: colors.onSurfaceVariant }]}>
            An account with this email already exists using email and password. Sign in with your password first, then connect Google from Settings.
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
      ) : null}

      {/* Error Banner */}
      {errorMessage ? (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}4D` }]}>
          <Feather name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Info / Success Banner */}
      {infoMessage ? (
        <View style={[styles.infoBanner, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }]}>
          <Feather name="info" size={16} color={colors.primaryFixed} />
          <Text style={[styles.infoBannerText, { color: colors.primaryFixed }]}>{infoMessage}</Text>
        </View>
      ) : null}
    </>
  );

  // ─── Main Form Sheet Content ───────────────────────────────────────────────
  const renderSheetContent = () => (
    <View style={styles.sheetInner}>
      {/* Heading & Subtitle */}
      <View style={styles.headingSection}>
        <Text style={[styles.mainTitle, { color: colors.onSurface }]}>
          {getHeading()}
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {getSubtitle()}
        </Text>
      </View>

      {renderBanners()}

      {/* ─── Forgot password security visual (in-sheet) ─── */}
      {!isSignInOrSignUp && (
        <View style={styles.sheetHeroWrapper}>
          <AuthHeroPreview variant={mode === 'forgot_success' ? 'success' : 'security'} />
        </View>
      )}

      {/* ─── MODE: SIGNIN & SIGNUP ──────────────────────────────────── */}
      {(mode === 'signin' || mode === 'signup') && (
        <>
          {/* FULL NAME (Sign Up only) */}
          {mode === 'signup' && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <Feather name="user" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
                <TextInput
                  style={[styles.inputWithIcon, { color: colors.onSurface }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={`${colors.onSurfaceVariant}80`}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  accessibilityLabel="Full name"
                />
              </View>
            </View>
          )}

          {/* WORK EMAIL */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="mail" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
              <TextInput
                style={[styles.inputWithIcon, { color: colors.onSurface }]}
                placeholder="Enter your email"
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="lock" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
              <TextInput
                style={[styles.inputWithIcon, { color: colors.onSurface }]}
                placeholder="Enter your password"
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            {/* Forgot Password? Right-aligned Link */}
            {mode === 'signin' && (
              <Pressable
                style={styles.forgotLinkWrapper}
                onPress={() => {
                  setErrorMessage('');
                  setInfoMessage('');
                  setForgotEmail(email);
                  setMode('forgot_email');
                }}
                accessibilityLabel="Forgot password"
                accessibilityRole="link"
              >
                <Text style={[styles.forgotLink, { color: colors.primaryFixed }]}>Forgot Password?</Text>
              </Pressable>
            )}
          </View>

          {/* SECURITY CONSTRAINTS (Sign Up only) */}
          {mode === 'signup' && (
            <View style={[styles.constraintsCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <View style={styles.constraintsHeader}>
                <Text style={[styles.constraintsTitle, { color: colors.onSurfaceVariant }]}>PASSWORD STRENGTH</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getPasswordStrength().color}1A` }]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: getPasswordStrength().color }
                  ]}>
                    {getPasswordStrength().label}
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
                    8+ characters
                  </Text>
                </View>

                <View style={styles.constraintRow}>
                  <Feather
                    name={hasSpecialChar ? 'check-circle' : 'circle'}
                    size={14}
                    color={hasSpecialChar ? colors.primaryFixed : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasSpecialChar && { color: colors.onSurface }]}>
                    1 special char
                  </Text>
                </View>

                <View style={styles.constraintRow}>
                  <Feather
                    name={hasNumericChar ? 'check-circle' : 'circle'}
                    size={14}
                    color={hasNumericChar ? colors.primaryFixed : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasNumericChar && { color: colors.onSurface }]}>
                    1 number
                  </Text>
                </View>

                <View style={styles.constraintRow}>
                  <Feather
                    name={hasMixedCase ? 'check-circle' : 'circle'}
                    size={14}
                    color={hasMixedCase ? colors.primaryFixed : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasMixedCase && { color: colors.onSurface }]}>
                    Mixed case
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Primary Action Button (Sign In / Create Account) */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && styles.primaryBtnPressed,
              loading && styles.primaryBtnDisabled,
            ]}
            onPress={handleAuthSubmit}
            disabled={loading}
            accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryFixed} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          {/* ─── OR DIVIDER ─── */}
          <View style={styles.orDividerRow}>
            <View style={[styles.orLine, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <Text style={[styles.orText, { color: colors.onSurfaceVariant }]}>OR</Text>
            <View style={[styles.orLine, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          {/* Secondary Outline Action Button (Register / Sign In) */}
          <Pressable
            style={({ pressed }) => [
              styles.secondaryOutlineBtn,
              { borderColor: colors.primaryFixed },
              pressed && styles.secondaryOutlineBtnPressed,
            ]}
            onPress={() => {
              setErrorMessage('');
              setInfoMessage('');
              setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
            }}
            accessibilityLabel={mode === 'signin' ? 'Register' : 'Sign in'}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryOutlineBtnText, { color: colors.primaryFixed }]}>
              {mode === 'signin' ? 'Register' : 'Sign In'}
            </Text>
          </Pressable>
        </>
      )}

      {/* ─── MODE: FORGOT_EMAIL ──────────────────────────────────────── */}
      {mode === 'forgot_email' && (
        <>
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="mail" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
              <TextInput
                style={[styles.inputWithIcon, { color: colors.onSurface }]}
                placeholder="Enter your email"
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                accessibilityLabel="Account email"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && styles.primaryBtnPressed,
              loading && styles.primaryBtnDisabled,
            ]}
            onPress={handleSendResetCode}
            disabled={loading}
            accessibilityLabel="Send recovery code"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryFixed} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Send Code</Text>
            )}
          </Pressable>

          <AuthSecurityNote />

          <Pressable
            style={styles.secondaryLinkBtn}
            onPress={() => {
              resetForgotState();
              setMode('signin');
            }}
            accessibilityLabel="Return to login"
          >
            <Text style={[styles.secondaryLinkText, { color: colors.onSurfaceVariant }]}>
              Remember your password? <Text style={{ color: colors.primaryFixed, fontWeight: '600' }}>Log In</Text>
            </Text>
          </Pressable>
        </>
      )}

      {/* ─── MODE: FORGOT_OTP ────────────────────────────────────────── */}
      {mode === 'forgot_otp' && (
        <>
          <View style={styles.otpSection}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface, marginBottom: 8 }]}>8-Digit Verification Code</Text>

            {/* Visual 8-Digit Display Boxes */}
            <Pressable
              style={styles.otpBoxesRow}
              onPress={() => otpInputRef.current?.focus()}
              accessibilityLabel="Enter 8-digit code"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                const digit = otpCode[index] || '';
                const isFocused = otpCode.length === index || (otpCode.length === 8 && index === 7);
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: colors.surfaceContainerHigh,
                        borderColor: isFocused ? colors.primaryFixed : colors.glassBorder,
                        borderWidth: isFocused ? 2 : 1.5,
                      },
                    ]}
                  >
                    <Text style={[styles.otpDigit, { color: colors.onSurface }]}>
                      {digit}
                    </Text>
                  </View>
                );
              })}
            </Pressable>

            {/* Hidden Real Input for Keyboard Interaction & Paste Support */}
            <TextInput
              ref={otpInputRef}
              style={styles.hiddenOtpInput}
              value={otpCode}
              onChangeText={(text) => {
                const numeric = text.replace(/\D/g, '').slice(0, 8);
                setOtpCode(numeric);
              }}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              accessibilityLabel="OTP input"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              (pressed || otpCode.length !== 8) && styles.primaryBtnPressed,
              (loading || otpCode.length !== 8) && styles.primaryBtnDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading || otpCode.length !== 8}
            accessibilityLabel="Verify code"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryFixed} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Verify Code</Text>
            )}
          </Pressable>

          {/* Resend Cooldown Section */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendPromptText, { color: colors.onSurfaceVariant }]}>
              Didn't receive it?{' '}
            </Text>
            {resendCooldown > 0 ? (
              <Text style={[styles.resendCountdownText, { color: colors.onSurfaceVariant }]}>
                Resend in {resendCooldown}s
              </Text>
            ) : (
              <Pressable onPress={handleResendCode} disabled={loading}>
                <Text style={[styles.resendActiveText, { color: colors.primaryFixed }]}>
                  Resend Code
                </Text>
              </Pressable>
            )}
          </View>

          <AuthSecurityNote text="Code expires shortly. Check your spam folder if you don't see it." />

          <Pressable
            style={styles.secondaryLinkBtn}
            onPress={() => {
              setOtpCode('');
              setMode('forgot_email');
            }}
            accessibilityLabel="Change email"
          >
            <Text style={[styles.secondaryLinkText, { color: colors.onSurfaceVariant }]}>
              Wrong email? <Text style={{ color: colors.primaryFixed, fontWeight: '600' }}>Change Email</Text>
            </Text>
          </Pressable>
        </>
      )}

      {/* ─── MODE: FORGOT_NEW_PASSWORD ───────────────────────────────── */}
      {mode === 'forgot_new_password' && (
        <>
          {/* NEW PASSWORD */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>New Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="lock" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
              <TextInput
                style={[styles.inputWithIcon, { color: colors.onSurface }]}
                placeholder="Enter new password"
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoFocus
                accessibilityLabel="New password"
              />
              <Pressable
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeBtn}
                accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                <Feather
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>Confirm New Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="check-circle" size={18} color={colors.onSurfaceVariant} style={styles.inputLeftIcon} />
              <TextInput
                style={[styles.inputWithIcon, { color: colors.onSurface }]}
                placeholder="Confirm new password"
                placeholderTextColor={`${colors.onSurfaceVariant}80`}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                accessibilityLabel="Confirm new password"
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeBtn}
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Feather
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          </View>

          {/* SECURITY CONSTRAINTS CARD */}
          <View style={[styles.constraintsCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
            <View style={styles.constraintsHeader}>
              <Text style={[styles.constraintsTitle, { color: colors.onSurfaceVariant }]}>PASSWORD REQUIREMENTS</Text>
              <View style={[styles.statusBadge, { backgroundColor: isPasswordValid && passwordsMatch ? `${colors.primaryFixed}1A` : `${colors.secondary}1A` }]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: isPasswordValid && passwordsMatch ? colors.primaryFixed : colors.secondary }
                ]}>
                  STATUS: {isPasswordValid && passwordsMatch ? 'READY' : 'INCOMPLETE'}
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
                  8+ characters
                </Text>
              </View>

              <View style={styles.constraintRow}>
                <Feather
                  name={hasSpecialChar ? 'check-circle' : 'circle'}
                  size={14}
                  color={hasSpecialChar ? colors.primaryFixed : colors.onSurfaceVariant}
                />
                <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasSpecialChar && { color: colors.onSurface }]}>
                  1 special char
                </Text>
              </View>

              <View style={styles.constraintRow}>
                <Feather
                  name={hasNumericChar ? 'check-circle' : 'circle'}
                  size={14}
                  color={hasNumericChar ? colors.primaryFixed : colors.onSurfaceVariant}
                />
                <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasNumericChar && { color: colors.onSurface }]}>
                  1 number
                </Text>
              </View>

              <View style={styles.constraintRow}>
                <Feather
                  name={hasMixedCase ? 'check-circle' : 'circle'}
                  size={14}
                  color={hasMixedCase ? colors.primaryFixed : colors.onSurfaceVariant}
                />
                <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, hasMixedCase && { color: colors.onSurface }]}>
                  Mixed case
                </Text>
              </View>

              <View style={styles.constraintRow}>
                <Feather
                  name={passwordsMatch ? 'check-circle' : 'circle'}
                  size={14}
                  color={passwordsMatch ? colors.primaryFixed : colors.onSurfaceVariant}
                />
                <Text style={[styles.constraintText, { color: `${colors.onSurfaceVariant}70` }, passwordsMatch && { color: colors.onSurface }]}>
                  Passwords match
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && styles.primaryBtnPressed,
              (loading || !isPasswordValid || !passwordsMatch) && styles.primaryBtnDisabled,
            ]}
            onPress={handleResetPasswordSubmit}
            disabled={loading || !isPasswordValid || !passwordsMatch}
            accessibilityLabel="Reset password"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryFixed} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Reset Password</Text>
            )}
          </Pressable>
        </>
      )}

      {/* ─── MODE: FORGOT_SUCCESS ────────────────────────────────────── */}
      {mode === 'forgot_success' && (
        <View style={styles.successContainer}>
          <Text style={[styles.successTitle, { color: colors.onSurface }]}>Password Updated</Text>
          <Text style={[styles.successDesc, { color: colors.onSurfaceVariant }]}>
            Your password has been changed successfully. You can now sign in with your new credentials.
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primaryFixed, width: '100%' }]}
            onPress={() => {
              resetForgotState();
              setMode('signin');
            }}
            accessibilityLabel="Continue to login"
            accessibilityRole="button"
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Continue to Login</Text>
          </Pressable>

          <Text style={[styles.successMotivation, { color: `${colors.onSurfaceVariant}90` }]}>
            You're ready to get back to work.
          </Text>
        </View>
      )}

      {/* Footer Version Metadata */}
      <AuthFooter />
    </View>
  );

  // ─── Web Split Layout Left Panel ───
  const renderWebLeftPanel = () => (
    <View style={styles.leftPanel}>
      <AuthHeader tagline={getHeaderTagline()} />
      <View style={styles.leftPanelContent}>
        <Text style={[styles.leftPanelDesc, { color: colors.onSurfaceVariant }]}>
          Developer-first project tracking{'\n'}with real-time collaboration.
        </Text>
        <View style={styles.leftPanelFeatures}>
          {[
            { icon: 'refresh-cw' as const, text: 'Live project sync' },
            { icon: 'users' as const, text: 'Team collaboration' },
            { icon: 'lock' as const, text: 'Secure workspace' },
          ].map((item, i) => (
            <View key={i} style={styles.leftPanelFeatureItem}>
              <Feather name={item.icon} size={13} color={`${colors.primaryFixed}90`} />
              <Text style={[styles.leftPanelFeatureText, { color: `${colors.onSurfaceVariant}CC` }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surfaceContainerLowest }]}>
      {/* Full-Screen Futuristic Loading Modal */}
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
        {isWideScreen ? (
          /* ─── WEB SPLIT LAYOUT ──────────────────────────────────────── */
          <ScrollView
            contentContainerStyle={styles.splitContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderWebLeftPanel()}
            <View style={styles.rightPanel}>
              <View
                style={[
                  styles.sheetContainer,
                  styles.sheetContainerWeb,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                {renderSheetContent()}
              </View>
            </View>
          </ScrollView>
        ) : (
          /* ─── MOBILE CURVED SHEET LAYOUT ───────────────────────────── */
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Top Brand & Squircle Logo Header */}
            <View style={styles.mobileTopHeader}>
              <AuthHeader tagline={getHeaderTagline()} />
            </View>

            {/* Bottom Curved Sheet Card */}
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              {renderSheetContent()}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── Mobile Layout ───
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  mobileTopHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },

  // ─── Bottom Curved Sheet ───
  sheetContainer: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetContainerWeb: {
    borderRadius: 24,
    maxWidth: 500,
    width: '100%',
    margin: 'auto',
    borderWidth: 1,
  },
  sheetInner: {
    width: '100%',
  },
  sheetHeroWrapper: {
    marginBottom: 16,
  },

  // ─── Web Split Layout ───
  splitContainer: {
    flexDirection: 'row',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  leftPanel: {
    flex: 1,
    maxWidth: 440,
    paddingRight: 40,
    justifyContent: 'center',
  },
  leftPanelContent: {
    marginTop: 12,
  },
  leftPanelDesc: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  leftPanelFeatures: {
    gap: 12,
    alignItems: 'center',
  },
  leftPanelFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leftPanelFeatureText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  rightPanel: {
    flex: 1,
    maxWidth: 520,
    justifyContent: 'center',
  },

  // ─── Heading ───
  headingSection: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },

  // ─── Inputs ───
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotLinkWrapper: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotLink: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },

  // ─── Buttons ───
  primaryBtn: {
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  // ─── OR Divider ───
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1,
    marginHorizontal: 14,
  },

  // ─── Secondary Outline Button ───
  secondaryOutlineBtn: {
    borderRadius: 16,
    height: 54,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutlineBtnPressed: {
    opacity: 0.7,
  },
  secondaryOutlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  // ─── Banners ───
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
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },

  // ─── Password Constraints ───
  constraintsCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
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
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
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
    marginLeft: 6,
    fontFamily: 'Inter_400Regular',
  },

  // ─── Secondary Links ───
  secondaryLinkBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },

  // ─── OTP ───
  otpSection: {
    marginBottom: 16,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 20,
    fontFamily: 'Inter_500Medium',
    fontWeight: '700',
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resendPromptText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  resendCountdownText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  resendActiveText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },

  // ─── Success ───
  successContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    fontWeight: '800',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  successMotivation: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 16,
  },
});
