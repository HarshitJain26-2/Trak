import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface GlowRingsProps {
  reduceMotion?: boolean;
}

const RINGS = [
  { id: 0, delay: 0 },
  { id: 1, delay: 600 },
  { id: 2, delay: 1200 },
];

export const GlowRings: React.FC<GlowRingsProps> = React.memo(({ reduceMotion = false }) => {
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    glowProgress.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {RINGS.map((ring) => {
        const animatedStyle = useAnimatedStyle(() => {
          // Stagger each ring's phase offset
          const offsetProgress = (glowProgress.value + ring.delay / 2500) % 1;
          const scale = 0.8 + offsetProgress * 1.2; // 0.8 -> 2.0
          const opacity = Math.max(0, 0.5 * (1 - offsetProgress)); // 0.5 -> 0.0

          return {
            transform: [{ scale }],
            opacity,
          };
        });

        return (
          <Animated.View
            key={ring.id}
            style={[styles.ring, animatedStyle]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(57, 255, 136, 0.45)',
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    shadowColor: '#39FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
});

export default GlowRings;
