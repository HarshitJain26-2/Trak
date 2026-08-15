import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingParticlesProps {
  reduceMotion?: boolean;
}

interface ParticleData {
  id: number;
  initialX: number;
  initialY: number;
  size: number;
  speedY: number;
  amplitudeX: number;
  color: string;
  maxOpacity: number;
}

// Generate 20 glowing background particles
const AMBIENT_PARTICLES: ParticleData[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  initialX: (Math.random() - 0.5) * (SCREEN_WIDTH * 0.9),
  initialY: (Math.random() - 0.5) * (SCREEN_HEIGHT * 0.9),
  size: Math.random() * 3.5 + 1.5, // 1.5px to 5px
  speedY: Math.random() * 40 + 30, // 30px to 70px float range
  amplitudeX: Math.random() * 20 + 5,
  color: i % 3 === 0 ? '#39FF88' : i % 3 === 1 ? '#00D9FF' : '#A8FF60',
  maxOpacity: Math.random() * 0.45 + 0.15,
}));

export const FloatingParticles: React.FC<FloatingParticlesProps> = React.memo(({ reduceMotion = false }) => {
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    floatProgress.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}>
      {AMBIENT_PARTICLES.map((particle) => {
        const animatedStyle = useAnimatedStyle(() => {
          const translateY = particle.initialY - floatProgress.value * particle.speedY;
          const translateX =
            particle.initialX +
            Math.sin(floatProgress.value * Math.PI * 2 + particle.id) * particle.amplitudeX;

          const opacity =
            particle.maxOpacity *
            (0.5 + 0.5 * Math.cos(floatProgress.value * Math.PI * 2 + particle.id));

          return {
            transform: [{ translateX }, { translateY }],
            opacity,
          };
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                shadowColor: particle.color,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
});

export default FloatingParticles;
