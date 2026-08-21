import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

type HeroVariant = 'security' | 'success';

interface AuthHeroPreviewProps {
  variant: HeroVariant;
}

// ─── Security Visual ───
const SecurityHero: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View style={[styles.securityCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
      <View style={[styles.lockIconBox, { backgroundColor: `${colors.primaryFixed}12`, borderColor: `${colors.primaryFixed}30` }]}>
        <Feather name="shield" size={28} color={colors.primaryFixed} />
      </View>
      <Text style={[styles.securityLabel, { color: colors.onSurfaceVariant }]}>SECURE RECOVERY</Text>
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.securityDot,
              { backgroundColor: `${colors.primaryFixed}${i < 3 ? '60' : '25'}` },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Success Visual ───
const SuccessHero: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View style={styles.successVisual}>
      <View
        style={[
          styles.successIconCircle,
          {
            backgroundColor: `${colors.primaryFixed}15`,
            borderColor: `${colors.primaryFixed}40`,
          },
        ]}
      >
        <Feather name="check-circle" size={44} color={colors.primaryFixed} />
      </View>
    </View>
  );
};

// ─── Main Export ───
export const AuthHeroPreview: React.FC<AuthHeroPreviewProps> = ({ variant }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    scale.value = withDelay(100, withTiming(1, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {variant === 'security' && <SecurityHero />}
      {variant === 'success' && <SuccessHero />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },

  // ─── Security Card ───
  securityCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  lockIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  securityLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 2,
    marginBottom: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ─── Success Visual ───
  successVisual: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
