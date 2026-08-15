import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, AccessibilityInfo, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AnimatedLogo } from './AnimatedLogo';
import { FloatingParticles } from './FloatingParticles';
import { GlowRings } from './GlowRings';
import { OrbitParticles } from './OrbitParticles';
import { LoadingDots } from './LoadingDots';
import { ProgressCounter } from './ProgressCounter';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FuturisticLoadingScreenProps {
  onFinish?: () => void;
  durationMs?: number;
  usePngLogo?: boolean;
  themeMode?: 'dark' | 'light';
  completed?: boolean;
}

export const FuturisticLoadingScreen: React.FC<FuturisticLoadingScreenProps> = ({
  onFinish,
  durationMs = 3000,
  usePngLogo = true,
  themeMode = 'dark',
  completed,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Shared Animation Values
  const containerOpacity = useSharedValue(1);
  const bgFlashOpacity = useSharedValue(0);
  const shockwaveScale = useSharedValue(0.5);
  const shockwaveOpacity = useSharedValue(0);
  const progress = useSharedValue(0);

  // Detect Device Accessibility Reduce Motion Setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled)
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Completion sequence trigger
  const triggerCompletion = useCallback(() => {
    if (isFinished) return;
    setIsFinished(true);

    if (reduceMotion) {
      containerOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      });
      return;
    }

    // Stage 8 Completion FX (rapid transition)
    // 1. Background flash
    bgFlashOpacity.value = withSequence(
      withTiming(0.4, { duration: 100 }),
      withTiming(0, { duration: 200 })
    );

    // 2. Shockwave pulse expansion (scale 0.5 -> 3.5)
    shockwaveOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );

    shockwaveScale.value = withTiming(
      3.5,
      { duration: 350, easing: Easing.out(Easing.quad) }
    );

    // 3. Final screen fade out into home
    containerOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      })
    );
  }, [reduceMotion, onFinish, isFinished]);

  // Smooth linear progress counter 0% -> 100%
  useEffect(() => {
    if (completed) {
      progress.value = withTiming(
        100,
        { duration: 150, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(triggerCompletion)();
          }
        }
      );
    } else {
      progress.value = withTiming(
        100,
        { duration: durationMs, easing: Easing.linear },
        (finished) => {
          if (finished) {
            runOnJS(triggerCompletion)();
          }
        }
      );
    }
  }, [durationMs, triggerCompletion, completed]);

  // Animated styles
  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const bgFlashStyle = useAnimatedStyle(() => ({
    opacity: bgFlashOpacity.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
  }));

  const isDark = themeMode === 'dark';
  const bgGradientColors = isDark
    ? (['#071B2B', '#0E283C', '#102F45'] as const)
    : (['#F0F4F8', '#E2E8F0', '#CBD5E1'] as const);

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      {/* Dark Ambient Gradient Background */}
      <LinearGradient
        colors={bgGradientColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Ambient Glow Particles */}
      <FloatingParticles reduceMotion={reduceMotion} />

      {/* Stage 8 Completion Background Flash */}
      <Animated.View style={[styles.bgFlash, bgFlashStyle, { pointerEvents: 'none' }]} />

      {/* Center Stage: Radial Pulse Rings, Orbit Particles, and Logo */}
      <View style={styles.centerStage}>
        {/* Stage 4 Pulse Glow Rings */}
        <GlowRings reduceMotion={reduceMotion} />

        {/* Stage 5 Orbit Particles */}
        <OrbitParticles reduceMotion={reduceMotion} />

        {/* Stage 8 Completion Shockwave Ring */}
        <Animated.View style={[styles.shockwaveRing, shockwaveStyle, { pointerEvents: 'none' }]} />

        {/* Centerpiece Animated Logo */}
        <AnimatedLogo
          width={180}
          height={180}
          usePngImage={usePngLogo}
          reduceMotion={reduceMotion}
        />
      </View>

      {/* Bottom Stage: Status Label, Pulsing Dots, and Progress Counter */}
      <View style={styles.bottomStage}>
        <LoadingDots reduceMotion={reduceMotion} />
        <ProgressCounter progress={progress} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    backgroundColor: '#071B2B',
  },
  bgFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#39FF88',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  bottomStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#39FF88',
    backgroundColor: 'rgba(57, 255, 136, 0.25)',
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 20px rgba(57, 255, 136, 1)',
      },
      default: {
        shadowColor: '#39FF88',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
    }),
  },
});

export default FuturisticLoadingScreen;
