import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '@/constants/colors';

interface StatusDotProps {
  status: 'active' | 'blocked' | 'idle' | 'warning';
  size?: number;
  animated?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 8, animated = false }) => {
  const colors = useThemeColors();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const STATUS_COLORS: Record<string, string> = {
    active: colors.statusActive,
    blocked: colors.statusBlocked,
    idle: colors.statusIdle,
    warning: colors.statusWarning,
  };

  React.useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();
    }
  }, [animated]);

  const color = STATUS_COLORS[status] ?? colors.onSurfaceVariant;

  if (animated) {
    return (
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulseAnim },
        ]}
      />
    );
  }

  return (
    <View
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
