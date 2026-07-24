import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';

interface StatusDotProps {
  status: 'active' | 'blocked' | 'idle' | 'warning';
  size?: number;
  animated?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: Colors.statusActive,
  blocked: Colors.statusBlocked,
  idle: Colors.statusIdle,
  warning: Colors.statusWarning,
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 8, animated = false }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [animated]);

  const color = STATUS_COLORS[status] ?? Colors.onSurfaceVariant;

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
