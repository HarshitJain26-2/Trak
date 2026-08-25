import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  AccessibilityInfo,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { FONT } from '@/constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface FuturisticLoadingScreenProps {
  onFinish?: () => void;
  durationMs?: number;
  usePngLogo?: boolean;
  themeMode?: 'dark' | 'light';
  completed?: boolean;
}

const LETTERS = ['T', 'R', 'A', 'K'];

export const FuturisticLoadingScreen: React.FC<FuturisticLoadingScreenProps> = ({
  onFinish,
  durationMs = 1400,
  themeMode = 'dark',
  completed = true,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const animationFinishedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Shared Animation Values for Screen and Center Stage
  const containerOpacity = useSharedValue(1);
  const wordGlow = useSharedValue(0.2);
  const shineTranslateX = useSharedValue(-SCREEN_WIDTH * 0.6);
  const shineOpacity = useSharedValue(0);
  const underlineScaleX = useSharedValue(0);
  const underlineOpacity = useSharedValue(0);

  // Per-letter Shared Animation Values (T, R, A, K)
  const letter0Opacity = useSharedValue(0);
  const letter0TranslateY = useSharedValue(14);
  const letter0Scale = useSharedValue(0.85);

  const letter1Opacity = useSharedValue(0);
  const letter1TranslateY = useSharedValue(14);
  const letter1Scale = useSharedValue(0.85);

  const letter2Opacity = useSharedValue(0);
  const letter2TranslateY = useSharedValue(14);
  const letter2Scale = useSharedValue(0.85);

  const letter3Opacity = useSharedValue(0);
  const letter3TranslateY = useSharedValue(14);
  const letter3Scale = useSharedValue(0.85);

  const letterValues = [
    { opacity: letter0Opacity, translateY: letter0TranslateY, scale: letter0Scale },
    { opacity: letter1Opacity, translateY: letter1TranslateY, scale: letter1Scale },
    { opacity: letter2Opacity, translateY: letter2TranslateY, scale: letter2Scale },
    { opacity: letter3Opacity, translateY: letter3TranslateY, scale: letter3Scale },
  ];

  // Exit trigger
  const triggerExit = useCallback(() => {
    if (isExiting || !isMountedRef.current) return;
    setIsExiting(true);

    containerOpacity.value = withTiming(
      0,
      { duration: 200, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      }
    );
  }, [isExiting, onFinish]);

  // Detect Reduce Motion
  useEffect(() => {
    isMountedRef.current = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMountedRef.current) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMountedRef.current) setReduceMotion(enabled);
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription?.remove();
    };
  }, []);

  // Main Animation Sequence
  useEffect(() => {
    if (reduceMotion) {
      // Instant static display for reduced motion
      letterValues.forEach(({ opacity, translateY, scale }) => {
        opacity.value = 1;
        translateY.value = 0;
        scale.value = 1;
      });
      underlineScaleX.value = 1;
      underlineOpacity.value = 0.8;
      wordGlow.value = 0.5;

      const timer = setTimeout(() => {
        if (completed) {
          triggerExit();
        } else {
          animationFinishedRef.current = true;
        }
      }, 600);

      return () => clearTimeout(timer);
    }

    // Sequence timing:
    // 0ms:   T appears (~150ms)
    // 150ms: R appears (~300ms)
    // 300ms: A appears (~450ms)
    // 450ms: K appears (~600ms)
    // 600ms-750ms: completed word hold
    // 750ms-1200ms: horizontal light sweep + glow expansion
    // 1250ms-1400ms: transition out

    letterValues.forEach(({ opacity, translateY, scale }, i) => {
      const delayMs = i * 150;

      opacity.value = withDelay(
        delayMs,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );

      translateY.value = withDelay(
        delayMs,
        withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
      );

      scale.value = withDelay(
        delayMs,
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
      );
    });

    // Subtle underline expansion after all letters appear (~600ms)
    underlineOpacity.value = withDelay(
      600,
      withTiming(0.8, { duration: 250, easing: Easing.out(Easing.quad) })
    );
    underlineScaleX.value = withDelay(
      600,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) })
    );

    // Horizontal light sweep across the word (~750ms - 1200ms)
    shineOpacity.value = withDelay(
      700,
      withSequence(
        withTiming(0.9, { duration: 150 }),
        withDelay(300, withTiming(0, { duration: 200 }))
      )
    );

    shineTranslateX.value = withDelay(
      700,
      withTiming(SCREEN_WIDTH * 0.6, {
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Subtle final brand glow reveal
    wordGlow.value = withDelay(
      700,
      withSequence(
        withTiming(0.9, { duration: 250, easing: Easing.out(Easing.quad) }),
        withTiming(0.6, { duration: 300, easing: Easing.inOut(Easing.quad) })
      )
    );

    // Check completion when full sequence ends (~1300ms)
    const animTimer = setTimeout(() => {
      animationFinishedRef.current = true;
      if (completed) {
        triggerExit();
      } else {
        // Idle breathing state if background data is still pending
        wordGlow.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          true
        );
      }
    }, Math.max(durationMs, 1250));

    return () => clearTimeout(animTimer);
  }, [reduceMotion, durationMs]);

  // Respond immediately when app finishes loading while in idle state
  useEffect(() => {
    if (completed && animationFinishedRef.current) {
      triggerExit();
    }
  }, [completed, triggerExit]);

  // Animated Styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const letter0Style = useAnimatedStyle(() => ({
    opacity: letter0Opacity.value,
    transform: [{ translateY: letter0TranslateY.value }, { scale: letter0Scale.value }],
  }));

  const letter1Style = useAnimatedStyle(() => ({
    opacity: letter1Opacity.value,
    transform: [{ translateY: letter1TranslateY.value }, { scale: letter1Scale.value }],
  }));

  const letter2Style = useAnimatedStyle(() => ({
    opacity: letter2Opacity.value,
    transform: [{ translateY: letter2TranslateY.value }, { scale: letter2Scale.value }],
  }));

  const letter3Style = useAnimatedStyle(() => ({
    opacity: letter3Opacity.value,
    transform: [{ translateY: letter3TranslateY.value }, { scale: letter3Scale.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shineOpacity.value,
    transform: [{ translateX: shineTranslateX.value }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    opacity: underlineOpacity.value,
    transform: [{ scaleX: underlineScaleX.value }],
  }));

  const glowPodStyle = useAnimatedStyle(() => ({
    opacity: wordGlow.value,
  }));

  const isDark = themeMode === 'dark';
  const bgGradientColors = isDark
    ? (['#051522', '#071B2B', '#092336'] as const)
    : (['#F8FAFC', '#F1F5F9', '#E2E8F0'] as const);

  const brandColor = isDark ? '#39FF88' : '#0B253A';
  const glowColor = isDark ? 'rgba(57, 255, 136, 0.35)' : 'rgba(0, 230, 57, 0.25)';

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="Trak"
    >
      {/* Ambient Premium Gradient Background */}
      <LinearGradient
        colors={bgGradientColors}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Radial Glow Pod behind the wordmark */}
      <Animated.View
        style={[
          styles.ambientGlow,
          { backgroundColor: glowColor },
          glowPodStyle,
        ]}
        pointerEvents="none"
      />

      {/* Center Wordmark Stage */}
      <View style={styles.centerStage} accessible={false}>
        <View style={styles.wordmarkContainer}>
          {/* Letter T */}
          <Animated.View style={[styles.letterBox, letter0Style]}>
            <Text
              style={[
                styles.letterText,
                { color: brandColor },
                isDark && styles.neonGlowText,
              ]}
              accessible={false}
            >
              T
            </Text>
          </Animated.View>

          {/* Letter R */}
          <Animated.View style={[styles.letterBox, letter1Style]}>
            <Text
              style={[
                styles.letterText,
                { color: brandColor },
                isDark && styles.neonGlowText,
              ]}
              accessible={false}
            >
              R
            </Text>
          </Animated.View>

          {/* Letter A */}
          <Animated.View style={[styles.letterBox, letter2Style]}>
            <Text
              style={[
                styles.letterText,
                { color: brandColor },
                isDark && styles.neonGlowText,
              ]}
              accessible={false}
            >
              A
            </Text>
          </Animated.View>

          {/* Letter K */}
          <Animated.View style={[styles.letterBox, letter3Style]}>
            <Text
              style={[
                styles.letterText,
                { color: brandColor },
                isDark && styles.neonGlowText,
              ]}
              accessible={false}
            >
              K
            </Text>
          </Animated.View>

          {/* Subtle Horizontal Light Sweep Sheen */}
          <Animated.View style={[styles.shineBar, shineStyle]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.75)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        {/* Minimal Futuristic Accent Line */}
        <Animated.View
          style={[
            styles.accentUnderline,
            { backgroundColor: brandColor },
            underlineStyle,
          ]}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071B2B',
  },
  ambientGlow: {
    position: 'absolute',
    width: 220,
    height: 100,
    borderRadius: 50,
    filter: 'blur(35px)' as any,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wordmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  letterBox: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontFamily: FONT.brand,
    fontSize: Math.min(52, SCREEN_WIDTH * 0.13),
    letterSpacing: 8,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  neonGlowText: {
    ...Platform.select({
      web: {
        textShadow: '0px 0px 18px rgba(57, 255, 136, 0.65), 0px 0px 4px rgba(57, 255, 136, 0.9)',
      },
      default: {
        textShadowColor: '#39FF88',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 14,
      },
    }),
  },
  shineBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
  },
  accentUnderline: {
    width: 80,
    height: 2,
    borderRadius: 1,
    marginTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 10px rgba(57, 255, 136, 0.8)',
      },
      default: {
        shadowColor: '#39FF88',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
  },
});

export default FuturisticLoadingScreen;
