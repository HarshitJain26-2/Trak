import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface AuthHeaderProps {
  /** Optional subtitle/tagline under the brand */
  tagline?: string;
  /** Size mode */
  compact?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  tagline = 'Developer workspace',
  compact = false,
}) => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const logoCardSize = compact ? 64 : 96;
  const logoImageSize = compact ? 44 : 68;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Premium Squircle Logo Card */}
      <View
        style={[
          styles.logoCard,
          {
            width: logoCardSize,
            height: logoCardSize,
            borderRadius: compact ? 18 : 26,
            backgroundColor: colors.isDark ? '#191E28' : '#ffffff',
            borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            shadowColor: colors.primaryFixed,
          },
        ]}
      >
        <Image
          source={require('@/assets/logo.png')}
          style={{ width: logoImageSize, height: logoImageSize }}
          resizeMode="contain"
        />
      </View>

      {/* Brand Title */}
      <View style={styles.brandRow}>
        <Text style={[styles.brandTitle, { color: colors.onSurface }]}>Trak </Text>
        <Text style={[styles.brandAccent, { color: colors.primaryFixed }]}>WORKSPACE</Text>
      </View>

      {/* Tagline */}
      {tagline ? (
        <Text style={[styles.tagline, { color: `${colors.onSurfaceVariant}CC` }]}>
          {tagline}
        </Text>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoCard: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandAccent: {
    fontSize: 20,
    fontFamily: 'JetBrainsMono_500Medium',
    fontWeight: '700',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
});
