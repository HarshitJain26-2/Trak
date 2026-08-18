import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';
import { TRAK_ANDROID_APK_URL } from '@/constants/config';
import { supabase } from '@/services/supabase';
import { useProjectStore } from '@/store/useProjectStore';
import { useProfileStore } from '@/store/useProfileStore';
import {
  inviteService,
  InviteValidationResult,
  JoinInviteResult,
  setPendingInviteToken,
  clearPendingInviteToken,
} from '@/services/inviteService';
import GlowRings from '@/components/GlowRings';
import FloatingParticles from '@/components/FloatingParticles';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';
import { getActiveUserId, emailToUUID } from '@/utils/deviceUser';

export default function InviteScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { token: rawParamToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const { validateInviteToken, joinProjectByInviteToken } = useProjectStore();

  const token = Array.isArray(rawParamToken) ? rawParamToken[0] : rawParamToken || '';

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [validation, setValidation] = useState<InviteValidationResult | null>(null);
  const [joinResult, setJoinResult] = useState<JoinInviteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Validation & Auth Check
  useEffect(() => {
    let isMounted = true;

    async function checkInviteAndAuth() {
      if (!token || !token.trim()) {
        if (isMounted) {
          setLoading(false);
          setErrorMessage('Invalid invite link.');
        }
        return;
      }

      try {
        // Save pending invite token in case user needs to authenticate
        await setPendingInviteToken(token);

        // Check if user is currently authenticated
        const { data: { session } } = await supabase.auth.getSession();
        const authed = !!session?.user?.id;
        if (isMounted) setIsAuthenticated(authed);

        // Validate invite
        const val = await validateInviteToken(token);
        if (isMounted) {
          setValidation(val);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setLoading(false);
          setErrorMessage(err?.message || 'Failed to validate invite link.');
        }
      }
    }

    checkInviteAndAuth();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Handle Join Action
  const handleJoin = async () => {
    if (!token || joining) return;
    setJoining(true);
    setErrorMessage(null);

    try {
      const result = await joinProjectByInviteToken(token);
      setJoinResult(result);

      if (result.success && result.projectId) {
        // Clear pending invite token on successful join
        await clearPendingInviteToken();
        // Route to the project details screen
        router.replace(`/project/${result.projectId}`);
      } else {
        setErrorMessage(result.error || 'Unable to join project. Please try again.');
        setJoining(false);
      }
    } catch (err: any) {
      setJoining(false);
      setErrorMessage(err?.message || 'An error occurred while joining.');
    }
  };

  // 3. Handle Auth Navigation
  const handleNavigateToAuth = async (mode: 'signin' | 'signup' = 'signin') => {
    if (token) {
      await setPendingInviteToken(token);
    }
    router.push({
      pathname: '/auth',
      params: { mode, next: `/invite/${token}` },
    });
  };

  const handleOpenProject = async (projectId: string | null) => {
    await clearPendingInviteToken();
    if (projectId) {
      router.replace(`/project/${projectId}`);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoHome = async () => {
    await clearPendingInviteToken();
    router.replace('/(tabs)');
  };

  if (loading) {
    return <FuturisticLoadingScreen durationMs={1000} themeMode={colors.isDark ? 'dark' : 'light'} />;
  }

  // ─── ERROR / INVALID STATE ───
  if (!validation || validation.status === 'INVALID' || validation.status === 'PROJECT_NOT_FOUND' || errorMessage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}33` }]}>
            <Feather name="alert-triangle" size={28} color={colors.error} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Invalid Invite Link</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {errorMessage || 'This invite link is invalid, expired, or the project no longer exists.'}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoHome}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── EXPIRED STATE ───
  if (validation.status === 'EXPIRED') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.statusWarning}15`, borderColor: `${colors.statusWarning}33` }]}>
            <Feather name="clock" size={28} color={colors.statusWarning} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Invite Link Expired</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            The invitation for "{validation.projectName || 'this project'}" has expired. Please request a new invite link from the project leader.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoHome}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── REVOKED STATE ───
  if (validation.status === 'REVOKED') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}33` }]}>
            <Feather name="slash" size={28} color={colors.error} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Invite Link Deactivated</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            This invite link is no longer active. The project leader may have generated a new link or revoked access.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoHome}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAX USES REACHED STATE ───
  if (validation.status === 'MAX_USES_REACHED') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.statusWarning}15`, borderColor: `${colors.statusWarning}33` }]}>
            <Feather name="users" size={28} color={colors.statusWarning} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Usage Limit Reached</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            This invite link has reached its maximum allowed number of joins. Contact the project leader for a new link.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoHome}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── ALREADY OWNER STATE ───
  if (validation.status === 'ALREADY_OWNER') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}33` }]}>
            <Feather name="shield" size={28} color={colors.primaryFixed} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Project Leader</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            You are the leader and owner of "{validation.projectName}".
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => handleOpenProject(validation.projectId)}
          >
            <Feather name="folder" size={16} color={colors.onPrimaryFixed} />
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Open Project</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── ALREADY MEMBER STATE ───
  if (validation.status === 'ALREADY_MEMBER') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GlowRings />
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}33` }]}>
            <Feather name="check-circle" size={28} color={colors.primaryFixed} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Already a Member</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            You are already collaborating on "{validation.projectName}".
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => handleOpenProject(validation.projectId)}
          >
            <Feather name="folder" size={16} color={colors.onPrimaryFixed} />
            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Open Project</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── LOGGED-OUT RECIPIENT FLOW ───
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <FloatingParticles />
        <GlowRings />

        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}33` }]}>
            <Feather name="mail" size={28} color={colors.primaryFixed} />
          </View>

          <Text style={[styles.badge, { color: colors.primaryFixed, backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}33` }]}>
            PROJECT INVITATION
          </Text>

          <Text style={[styles.title, { color: colors.onSurface }]}>You're Invited!</Text>

          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            You've been invited to join and collaborate on:
          </Text>

          {/* Project Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
            <Text style={[styles.previewProjectName, { color: colors.onSurface }]} numberOfLines={1}>
              {validation.projectName || 'Project'}
            </Text>
            {validation.projectDescription ? (
              <Text style={[styles.previewProjectDesc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                {validation.projectDescription}
              </Text>
            ) : null}
            <View style={styles.leaderRow}>
              <Feather name="user" size={12} color={colors.primaryFixed} />
              <Text style={[styles.leaderText, { color: colors.primaryFixed }]}>
                Leader: {validation.ownerName || 'Developer'}
              </Text>
            </View>
          </View>

          <Text style={[styles.authPromptText, { color: colors.onSurfaceVariant }]}>
            Sign in or create an account to accept this invitation.
          </Text>

          {/* Auth Action Buttons */}
          <View style={styles.authButtonsGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primaryFixed },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleNavigateToAuth('signin')}
            >
              <Feather name="log-in" size={16} color={colors.onPrimaryFixed} />
              <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Sign In to Join</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleNavigateToAuth('signup')}
            >
              <Feather name="user-plus" size={16} color={colors.onSurface} />
              <Text style={[styles.secondaryBtnText, { color: colors.onSurface }]}>Create Account</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.apkBtn,
                { borderColor: `${colors.primaryFixed}40`, backgroundColor: `${colors.primaryFixed}0D` },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => Linking.openURL(TRAK_ANDROID_APK_URL)}
            >
              <Feather name="download" size={15} color={colors.primaryFixed} />
              <Text style={[styles.apkBtnText, { color: colors.primaryFixed }]}>Download Android App (.apk)</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── LOGGED-IN RECIPIENT READY TO JOIN ───
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FloatingParticles />
      <GlowRings />

      <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}33` }]}>
          <Feather name="layers" size={28} color={colors.primaryFixed} />
        </View>

        <Text style={[styles.badge, { color: colors.primaryFixed, backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}33` }]}>
          COLLABORATION INVITE
        </Text>

        <Text style={[styles.title, { color: colors.onSurface }]}>Join Project</Text>

        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          You're invited to collaborate on:
        </Text>

        {/* Project Preview Card */}
        <View style={[styles.previewCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
          <Text style={[styles.previewProjectName, { color: colors.onSurface }]} numberOfLines={1}>
            {validation.projectName || 'Project'}
          </Text>
          {validation.projectDescription ? (
            <Text style={[styles.previewProjectDesc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
              {validation.projectDescription}
            </Text>
          ) : null}
          <View style={styles.leaderRow}>
            <Feather name="user-check" size={13} color={colors.primaryFixed} />
            <Text style={[styles.leaderText, { color: colors.primaryFixed }]}>
              Project Leader: {validation.ownerName || 'Developer'}
            </Text>
          </View>
        </View>

        {/* Join Actions */}
        <View style={styles.authButtonsGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primaryFixed },
              pressed && { opacity: 0.85 },
              joining && { opacity: 0.5 },
            ]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
            ) : (
              <>
                <Feather name="check" size={18} color={colors.onPrimaryFixed} />
                <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>Join Project</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoHome}
            disabled={joining}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 24,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  previewCard: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 6,
  },
  previewProjectName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  previewProjectDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  leaderText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  authPromptText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  authButtonsGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  apkBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  apkBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
