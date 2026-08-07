import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface MotionTrailProps {
  launchValue: SharedValue<number>;
  width?: number;
  height?: number;
  reduceMotion?: boolean;
}

const TRAIL_COPIES = [
  { id: 1, scale: 1.04, opacityBase: 0.35, offsetX: -4, offsetY: 4 },
  { id: 2, scale: 1.08, opacityBase: 0.20, offsetX: -8, offsetY: 8 },
  { id: 3, scale: 1.12, opacityBase: 0.10, offsetX: -12, offsetY: 12 },
];

export const MotionTrail: React.FC<MotionTrailProps> = React.memo(({
  launchValue,
  width = 160,
  height = 160,
  reduceMotion = false,
}) => {
  if (reduceMotion) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {TRAIL_COPIES.map((copy) => {
        const animatedStyle = useAnimatedStyle(() => {
          const activeProgress = interpolate(
            launchValue.value,
            [0, 1],
            [0, 1],
            Extrapolation.CLAMP
          );

          const opacity = activeProgress * copy.opacityBase;
          const translateX = copy.offsetX * activeProgress;
          const translateY = copy.offsetY * activeProgress;
          const scale = 1 + (copy.scale - 1) * activeProgress;

          return {
            opacity,
            transform: [{ translateX }, { translateY }, { scale }],
          };
        });

        return (
          <Animated.View
            key={copy.id}
            style={[styles.copyContainer, animatedStyle]}
          >
            <Image
              source={require('../assets/logo.png')}
              style={{ width: width * 0.95, height: height * 0.95 }}
              resizeMode="contain"
            />
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  copyContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

export default MotionTrail;
