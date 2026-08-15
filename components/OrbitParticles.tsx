import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface OrbitParticlesProps {
  reduceMotion?: boolean;
}

const PARTICLES = [
  { id: 1, radiusX: 95, radiusY: 70, duration: 4000, color: '#39FF88', size: 6, initialAngle: 0, opacity: 0.9 },
  { id: 2, radiusX: 110, radiusY: 85, duration: 5500, color: '#00D9FF', size: 5, initialAngle: 90, opacity: 0.75 },
  { id: 3, radiusX: 80, radiusY: 95, duration: 3500, color: '#A8FF60', size: 4, initialAngle: 180, opacity: 0.85 },
  { id: 4, radiusX: 105, radiusY: 105, duration: 6000, color: '#FFFFFF', size: 5, initialAngle: 270, opacity: 0.6 },
];

export const OrbitParticles: React.FC<OrbitParticlesProps> = React.memo(({ reduceMotion = false }) => {
  const orbitProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    orbitProgress.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {PARTICLES.map((particle) => {
        const animatedStyle = useAnimatedStyle(() => {
          const turns = 12000 / particle.duration;
          const currentAngleRad =
            ((orbitProgress.value * turns * 360 + particle.initialAngle) * Math.PI) / 180;

          const translateX = Math.cos(currentAngleRad) * particle.radiusX;
          const translateY = Math.sin(currentAngleRad) * particle.radiusY;

          // Subtle opacity pulsing during orbit
          const pulseOpacity =
            particle.opacity * (0.7 + 0.3 * Math.sin(currentAngleRad * 2));

          return {
            transform: [{ translateX }, { translateY }],
            opacity: pulseOpacity,
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
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
});

export default OrbitParticles;
