import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

interface LoadingDotsProps {
  reduceMotion?: boolean;
}

const DOTS = [0, 1, 2];

export const LoadingDots: React.FC<LoadingDotsProps> = React.memo(({ reduceMotion = false }) => {
  const dotProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    dotProgress.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, [reduceMotion]);

  return (
    <View style={styles.dotsRow}>
      {DOTS.map((index) => {
        const animatedStyle = useAnimatedStyle(() => {
          if (reduceMotion) return { opacity: 0.8, transform: [{ scale: 1 }] };

          const phase = (dotProgress.value * 3 - index + 3) % 3;
          let scale = 1;
          let opacity = 0.35;

          if (phase >= 0 && phase <= 1) {
            scale = 1 + 0.4 * Math.sin(phase * Math.PI);
            opacity = 0.35 + 0.65 * Math.sin(phase * Math.PI);
          }

          return {
            opacity,
            transform: [{ scale }],
          };
        });

        return (
          <Animated.View
            key={index}
            style={[styles.dot, animatedStyle]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#39FF88',
    shadowColor: '#39FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default LoadingDots;
