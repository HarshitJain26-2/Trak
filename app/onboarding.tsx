import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  // Ambient pulse animation (replaces CSS animate-pulse-soft)
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Button scale
  const btnScale = useRef(new Animated.Value(1)).current;
  // Logo glow pulse
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Soft pulse for ambient blobs
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Progress bar fills to 100% over 2s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      delay: 300,
      useNativeDriver: false,
    }).start();

    // Logo glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();

  const handlePressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const handleGetStarted = () => {
    router.replace('/auth');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Grid dot pattern background */}
      <View style={styles.gridPattern} pointerEvents="none" />

      {/* Ambient top-left blob */}
      <Animated.View style={[styles.ambientBlobTL, { backgroundColor: `${colors.primaryFixed}0D`, opacity: pulseAnim }]} pointerEvents="none" />

      {/* Ambient bottom-right blob */}
      <Animated.View
        style={[styles.ambientBlobBR, { backgroundColor: `${colors.secondaryContainer}0D`, opacity: pulseAnim }]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top: version tag */}
        <View style={styles.topBar}>
          <View style={styles.versionBadge}>
            <View style={[styles.versionDot, { backgroundColor: colors.primaryFixed }]} />
            <Text style={[styles.versionText, { color: colors.primaryFixed }]}>v1.0.4-stable</Text>
          </View>
        </View>

        {/* Center: Logo + tagline */}
        <View style={styles.centerContent}>
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Animated.View style={[styles.logoGlow, { backgroundColor: `${colors.primaryFixed}33`, opacity: glowAnim }]} />
            <View style={[styles.logoBox, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <Feather name="terminal" size={40} color={colors.primaryFixed} />
            </View>
          </View>

          {/* Identity */}
          <View style={styles.identityBlock}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Trak</Text>
            <Text style={[styles.tagline, { color: colors.onSurfaceVariant }]}>Trak — track what matters</Text>
          </View>
        </View>

        {/* Bottom: Feature pills + CTA */}
        <View style={styles.ctaSection}>
          {/* Feature pills grid (2-col) */}
          <View style={styles.pillsGrid}>
            <View style={[styles.featurePill, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <Feather name="zap" size={14} color={colors.primaryFixed} />
              <Text style={[styles.featurePillText, { color: colors.onSurfaceVariant }]}>Real-time</Text>
            </View>
            <View style={[styles.featurePill, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <Feather name="lock" size={14} color={colors.secondary} />
              <Text style={[styles.featurePillText, { color: colors.onSurfaceVariant }]}>Encrypted</Text>
            </View>
          </View>

          {/* Primary CTA */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              style={[styles.ctaButton, { backgroundColor: colors.primaryFixed }]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleGetStarted}
            >
              <Text style={[styles.ctaButtonText, { color: colors.onPrimaryFixed }]}>Get Started</Text>
              <Feather name="chevron-right" size={20} color={colors.onPrimaryFixed} />
            </Pressable>
          </Animated.View>

          {/* Legal text */}
          <Text style={[styles.legalText, { color: colors.onSurfaceVariant }]}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>

      {/* Footer progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: `${colors.surfaceContainerHighest}33` }]}>
        <Animated.View style={[styles.progressBar, { backgroundColor: colors.primaryFixed, width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
    // Grid pattern rendered via repeating background (web only workaround)
    // On native, we rely on the dark background + ambient blobs
  },
  ambientBlobTL: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.25,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: `${Colors.primaryFixed}0D`,
    borderRadius: SCREEN_WIDTH,
  },
  ambientBlobBR: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: `${Colors.secondaryContainer}0D`,
    borderRadius: SCREEN_WIDTH,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  topBar: {
    alignItems: 'flex-end',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  versionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryFixed,
    opacity: 0.6,
  },
  versionText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: `${Colors.primaryFixed}99`,
  },
  centerContent: {
    alignItems: 'center',
    gap: 24,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.primaryFixed}33`,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS glow
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  identityBlock: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: `${Colors.onSurfaceVariant}CC`,
    maxWidth: 280,
    textAlign: 'center',
  },
  ctaSection: {
    gap: 16,
    alignItems: 'center',
  },
  pillsGrid: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 380,
  },
  featurePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Colors.surfaceContainer}80`,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
    padding: 16,
    borderRadius: 8,
  },
  featurePillText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    minWidth: 340,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 8,
    // iOS shadow
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onPrimaryFixed,
  },
  legalText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.onSurfaceVariant}66`,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: `${Colors.surfaceContainerHighest}33`,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primaryFixed,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
