import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LogoVectorOverlayProps {
  width?: number;
  height?: number;
  onBeamReachTip?: () => void;
  reduceMotion?: boolean;
}

export const LogoVectorOverlay: React.FC<LogoVectorOverlayProps> = React.memo(({
  width = 200,
  height = 200,
  onBeamReachTip,
  reduceMotion = false,
}) => {
  // Shared values for stroke dash offset and tip glow intensity
  const strokeOffset = useSharedValue(300);
  const tipGlowScale = useSharedValue(0);
  const tipGlowOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    // Energy beam loops every 1.5s (1500ms)
    strokeOffset.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished && onBeamReachTip) {
            runOnJS(onBeamReachTip)();
          }
        }),
        withTiming(300, { duration: 0 }),
        withDelay(400, withTiming(300, { duration: 0 }))
      ),
      -1,
      false
    );

    // Tip flash pulse synchronized with beam reaching tip
    tipGlowScale.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(1.6, { duration: 150 })),
        withTiming(0, { duration: 350 }),
        withDelay(0, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    tipGlowOpacity.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(1, { duration: 150 })),
        withTiming(0, { duration: 350 }),
        withDelay(0, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [reduceMotion, onBeamReachTip]);

  // Animated props for SVG Path dashoffset
  const animatedPathProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: strokeOffset.value,
    };
  });

  const animatedTipCircleProps = useAnimatedProps(() => {
    return {
      r: 8 * tipGlowScale.value,
      opacity: tipGlowOpacity.value,
    };
  });

  return (
    <View style={[styles.container, { width, height, pointerEvents: 'none' }]}>
      <Svg width={width} height={height} viewBox="0 0 200 200" fill="none">
        <Defs>
          {/* Energy Beam Gradient (Cyan -> Lime Green -> White core) */}
          <LinearGradient id="beamGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00D9FF" stopOpacity="0.2" />
            <Stop offset="50%" stopColor="#39FF88" stopOpacity="0.9" />
            <Stop offset="85%" stopColor="#00D9FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Base invisible guide path following the swooping arrow curve */}
        {/* Trajectory: curve from bottom-left swooping up to top-right arrowhead tip at (175, 25) */}
        <AnimatedPath
          d="M 52 148 C 65 178, 110 165, 125 125 C 138 90, 110 50, 175 25"
          stroke="url(#beamGradient)"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray="300"
          animatedProps={animatedPathProps}
        />

        {/* Tip Flash Glow Circle at arrowhead tip */}
        <AnimatedCircle
          cx="175"
          cy="25"
          fill="#39FF88"
          animatedProps={animatedTipCircleProps}
        />
        <AnimatedCircle
          cx="175"
          cy="25"
          fill="#FFFFFF"
          animatedProps={animatedTipCircleProps}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LogoVectorOverlay;
