import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import { useThemeColors } from '@/constants/colors';

// ─── Shared Pulse Animation Driver ───────────────────────────────────────────
// A global animated value so that all skeleton elements oscillate in sync
// without spawning hundreds of individual animation timers.
let globalPulseAnim: Animated.Value | null = null;
let globalAnimationRunning = false;
let activeSubscriberCount = 0;
let animationLoop: Animated.CompositeAnimation | null = null;

function acquireGlobalPulse(): Animated.Value {
  if (!globalPulseAnim) {
    globalPulseAnim = new Animated.Value(0.45);
  }

  activeSubscriberCount++;

  if (!globalAnimationRunning) {
    globalAnimationRunning = true;
    animationLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(globalPulseAnim, {
          toValue: 0.95,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(globalPulseAnim, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animationLoop.start();
  }

  return globalPulseAnim;
}

function releaseGlobalPulse() {
  activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);
  if (activeSubscriberCount === 0 && animationLoop) {
    animationLoop.stop();
    globalAnimationRunning = false;
  }
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  color?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 6,
  style,
  animated = true,
  color,
  circle = false,
}) => {
  const colors = useThemeColors();
  const pulseAnimRef = useRef<Animated.Value | null>(null);

  useEffect(() => {
    if (animated) {
      pulseAnimRef.current = acquireGlobalPulse();
    }
    return () => {
      if (animated) {
        releaseGlobalPulse();
      }
    };
  }, [animated]);

  const defaultBg = color || (colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)');
  const resolvedBorderRadius = circle
    ? typeof height === 'number'
      ? height / 2
      : typeof width === 'number'
      ? width / 2
      : 999
    : borderRadius;

  const skeletonStyle: ViewStyle = {
    width: width,
    height: height,
    borderRadius: resolvedBorderRadius,
    backgroundColor: defaultBg,
  };

  if (!animated || !pulseAnimRef.current) {
    return (
      <View
        style={[skeletonStyle, style]}
        accessible={false}
        aria-hidden={true}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  return (
    <Animated.View
      style={[
        skeletonStyle,
        {
          opacity: pulseAnimRef.current,
        },
        style,
      ]}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({});
