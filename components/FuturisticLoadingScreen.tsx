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
  maxTimeoutMs?: number;
}

export const FuturisticLoadingScreen: React.FC<FuturisticLoadingScreenProps> = ({
  onFinish,
  durationMs = 900,
  themeMode = 'dark',
  completed = true,
  maxTimeoutMs,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const hasFinishedRef = useRef(false);
  const isMountedRef = useRef(true);

  const effectiveDuration = Math.min(Math.max(durationMs, 600), 2000);
  const hardTimeout = maxTimeoutMs || effectiveDuration + 150;

  // Shared Animation Values for Screen and Center Stage
  const containerOpacity = useSharedValue(1);
  const wordGlow = useSharedValue(0.3);
  const shineTranslateX = useSharedValue(-SCREEN_WIDTH * 0.5);
  const shineOpacity = useSharedValue(0);
  const underlineScaleX = useSharedValue(0);
  const underlineOpacity = useSharedValue(0);

  // Per-letter Shared Animation Values (T, R, A, K)
  const letter0Opacity = useSharedValue(0);
  const letter0TranslateY = useSharedValue(10);
  const letter0Scale = useSharedValue(0.9);

  const letter1Opacity = useSharedValue(0);
  const letter1TranslateY = useSharedValue(10);
  const letter1Scale = useSharedValue(0.9);

  const letter2Opacity = useSharedValue(0);
  const letter2TranslateY = useSharedValue(10);
  const letter2Scale = useSharedValue(0.9);

  const letter3Opacity = useSharedValue(0);
  const letter3TranslateY = useSharedValue(10);
  const letter3Scale = useSharedValue(0.9);

  const letterValues = [
    { opacity: letter0Opacity, translateY: letter0TranslateY, scale: letter0Scale },
    { opacity: letter1Opacity, translateY: letter1TranslateY, scale: letter1Scale },
    { opacity: letter2Opacity, translateY: letter2TranslateY, scale: letter2Scale },
    { opacity: letter3Opacity, translateY: letter3TranslateY, scale: letter3Scale },
  ];

  // Guaranteed exit callback
  const completeAnimation = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (onFinish && isMountedRef.current) {
      onFinish();
    }
  }, [onFinish]);

  // Smooth exit trigger
  const triggerExit = useCallback(() => {
    if (isExiting || !isMountedRef.current) return;
    setIsExiting(true);

    containerOpacity.value = withTiming(
      0,
      { duration: 160, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(completeAnimation)();
        }
      }
    );

    // Fallback timer if animation callback is interrupted
    setTimeout(completeAnimation, 180);
  }, [isExiting, completeAnimation]);

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

  // Main Animation Sequence (Super-smooth, hardware accelerated)
  useEffect(() => {
    if (reduceMotion) {
      letterValues.forEach(({ opacity, translateY, scale }) => {
        opacity.value = 1;
        translateY.value = 0;
        scale.value = 1;
      });
      underlineScaleX.value = 1;
      underlineOpacity.value = 0.8;
      wordGlow.value = 0.5;

      const timer = setTimeout(() => {
        triggerExit();
      }, 400);

      return () => clearTimeout(timer);
    }

    // Snappy letter reveals (total ~350ms)
    letterValues.forEach(({ opacity, translateY, scale }, i) => {
      const delayMs = i * 80;

      opacity.value = withDelay(
        delayMs,
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })
      );

      translateY.value = withDelay(
        delayMs,
        withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) })
      );

      scale.value = withDelay(
        delayMs,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );
    });

    // Underline expansion (~360ms)
    underlineOpacity.value = withDelay(
      360,
      withTiming(0.8, { duration: 180, easing: Easing.out(Easing.quad) })
    );
    underlineScaleX.value = withDelay(
      360,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
    );

    // Light sheen sweep (~450ms - 750ms)
    shineOpacity.value = withDelay(
      420,
      withSequence(
        withTiming(0.9, { duration: 120 }),
        withDelay(180, withTiming(0, { duration: 160 }))
      )
    );

    shineTranslateX.value = withDelay(
      420,
      withTiming(SCREEN_WIDTH * 0.5, {
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // Subtle brand glow reveal
    wordGlow.value = withDelay(
      420,
      withSequence(
        withTiming(0.8, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0.5, { duration: 200, easing: Easing.inOut(Easing.quad) })
      )
    );

    // Guaranteed completion timer: once set duration is reached, jump to exit
    const animTimer = setTimeout(() => {
      triggerExit();
    }, Math.max(effectiveDuration - 160, 450));

    // Hard fallback safety timer
    const safetyTimer = setTimeout(() => {
      completeAnimation();
    }, hardTimeout);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(safetyTimer);
    };
  }, [reduceMotion, effectiveDuration, hardTimeout, triggerExit, completeAnimation]);

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
  const glowBg = isDark ? 'rgba(57, 255, 136, 0.18)' : 'rgba(0, 230, 57, 0.12)';

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="Trak"
    >
      {/* Ambient Gradient Background */}
      <LinearGradient
        colors={bgGradientColors}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Glow Pod behind the wordmark (optimized without heavy CSS filter blur) */}
      <Animated.View
        style={[
          styles.ambientGlow,
          { backgroundColor: glowBg },
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
              colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
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
    height: 90,
    borderRadius: 45,
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
        textShadow: '0px 0px 12px rgba(57, 255, 136, 0.5)',
      },
      default: {
        textShadowColor: '#39FF88',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
    }),
  },
  shineBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
  },
  accentUnderline: {
    width: 72,
    height: 2,
    borderRadius: 1,
    marginTop: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 8px rgba(57, 255, 136, 0.7)',
      },
      default: {
        shadowColor: '#39FF88',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      },
    }),
  },
});

export default FuturisticLoadingScreen;

