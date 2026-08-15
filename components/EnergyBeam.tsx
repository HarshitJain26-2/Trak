import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface EnergyBeamProps {
  onTriggerLaunch?: () => void;
  reduceMotion?: boolean;
}

interface Spark {
  id: number;
  angle: number;
  distance: number;
}

const SPARKS: Spark[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 8,
  distance: 18 + (i % 3) * 6,
}));

export const EnergyBeam: React.FC<EnergyBeamProps> = React.memo(({
  onTriggerLaunch,
  reduceMotion = false,
}) => {
  const sparkProgress = useSharedValue(0);

  // Trigger spark explosion at tip
  const triggerTipSparks = () => {
    if (reduceMotion) return;
    sparkProgress.value = 0;
    sparkProgress.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(0, { duration: 100 })
    );

    if (onTriggerLaunch) {
      onTriggerLaunch();
    }
  };

  return (
    <View style={[styles.tipContainer, { pointerEvents: 'none' }]}>
      {SPARKS.map((spark) => {
        const animatedStyle = useAnimatedStyle(() => {
          const rad = (spark.angle * Math.PI) / 180;
          const translateX = Math.cos(rad) * spark.distance * sparkProgress.value;
          const translateY = Math.sin(rad) * spark.distance * sparkProgress.value;
          const opacity = 1 - sparkProgress.value;
          const scale = 1 - sparkProgress.value * 0.5;

          return {
            transform: [{ translateX }, { translateY }, { scale }],
            opacity,
          };
        });

        return (
          <Animated.View
            key={spark.id}
            style={[styles.sparkDot, animatedStyle]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  tipContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A8FF60',
    shadowColor: '#39FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
});

export default EnergyBeam;
