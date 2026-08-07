import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LogoSVG } from './LogoSVG';
import { LogoVectorOverlay } from './LogoVectorOverlay';
import { EnergyBeam } from './EnergyBeam';
import { MotionTrail } from './MotionTrail';
import { ShineSweep } from './ShineSweep';

interface AnimatedLogoProps {
  width?: number;
  height?: number;
  usePngImage?: boolean;
  reduceMotion?: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = React.memo(({
  width = 170,
  height = 170,
  usePngImage = true,
  reduceMotion = false,
}) => {
  // Shared Values for Stage 1 Entrance & Stage 3 Launch
  const entranceScale = useSharedValue(0.7);
  const entranceOpacity = useSharedValue(0);
  const launchProgress = useSharedValue(0);
  const launchTranslateX = useSharedValue(0);
  const launchTranslateY = useSharedValue(0);

  // Stage 1 Entrance animation (800ms spring + opacity fade)
  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: 600 });
    entranceScale.value = withSpring(1, {
      damping: 12,
      stiffness: 110,
      mass: 0.9,
    });
  }, []);

  // Stage 3 Arrow Launch effect triggered when energy reaches tip
  const handleBeamReachTip = useCallback(() => {
    if (reduceMotion) return;

    // Fast launch forward (+10px X, -10px Y in 120ms) then spring back
    launchProgress.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 350, easing: Easing.inOut(Easing.quad) })
    );

    launchTranslateX.value = withSequence(
      withTiming(10, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 14, stiffness: 140 })
    );

    launchTranslateY.value = withSequence(
      withTiming(-10, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 14, stiffness: 140 })
    );
  }, [reduceMotion]);

  // Combined animated transform style
  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      opacity: entranceOpacity.value,
      transform: [
        { scale: entranceScale.value },
        { translateX: launchTranslateX.value },
        { translateY: launchTranslateY.value },
      ],
    };
  });

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Motion Blur Ghost copies behind main logo during launch */}
      <MotionTrail
        launchValue={launchProgress}
        width={width}
        height={height}
        reduceMotion={reduceMotion}
      />

      {/* Main Logo Container */}
      <Animated.View style={[styles.logoWrapper, { width, height }, animatedLogoStyle]}>
        {usePngImage ? (
          <Image
            source={require('../assets/logo.png')}
            style={{ width: width * 0.95, height: height * 0.95 }}
            resizeMode="contain"
          />
        ) : (
          <LogoSVG width={width} height={height} glow />
        )}

        {/* Diagonal Glossy Shine Sweep across logo surface */}
        <ShineSweep width={width} height={height} reduceMotion={reduceMotion} />

        {/* SVG Vector Energy Line overlay synchronized with stroke path */}
        <LogoVectorOverlay
          width={width}
          height={height}
          onBeamReachTip={handleBeamReachTip}
          reduceMotion={reduceMotion}
        />

        {/* Energy Beam Tip Sparks */}
        <EnergyBeam reduceMotion={reduceMotion} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AnimatedLogo;
