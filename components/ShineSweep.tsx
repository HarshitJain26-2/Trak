import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface ShineSweepProps {
  width?: number;
  height?: number;
  reduceMotion?: boolean;
}

export const ShineSweep: React.FC<ShineSweepProps> = React.memo(({
  width = 180,
  height = 180,
  reduceMotion = false,
}) => {
  const sweepProgress = useSharedValue(-width * 1.2);

  useEffect(() => {
    if (reduceMotion) return;

    // Repeats every 3 seconds, duration 700ms
    sweepProgress.value = withRepeat(
      withSequence(
        withTiming(width * 1.5, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(-width * 1.2, { duration: 0 }),
        withDelay(2300, withTiming(-width * 1.2, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [width, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: sweepProgress.value },
        { rotate: '45deg' },
      ],
    };
  });

  if (reduceMotion) return null;

  return (
    <View style={[styles.maskContainer, { width, height, pointerEvents: 'none' }]}>
      <Animated.View style={[styles.shineBar, animatedStyle]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.45)',
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  maskContainer: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineBar: {
    width: 45,
    height: 300,
  },
  gradient: {
    flex: 1,
  },
});

export default ShineSweep;
