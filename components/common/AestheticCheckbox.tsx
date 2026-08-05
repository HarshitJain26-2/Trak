import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface AestheticCheckboxProps {
  completed: boolean;
  onToggle: () => Promise<void> | void;
  size?: number;
  disabled?: boolean;
}

export function AestheticCheckbox({
  completed,
  onToggle,
  size = 20,
  disabled = false,
}: AestheticCheckboxProps) {
  const [loading, setLoading] = useState(false);

  // Animation values
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  // Spin animation loop for loading state
  useEffect(() => {
    let spinLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (loading) {
      spinAnim.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoop.start();

      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 350,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 350,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
    }

    return () => {
      spinLoop?.stop();
      pulseLoop?.stop();
    };
  }, [loading]);

  // Spring animation when completed status changes
  useEffect(() => {
    if (!loading) {
      Animated.spring(scaleAnim, {
        toValue: completed ? 1 : 0,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [completed, loading]);

  const handlePress = async () => {
    if (disabled || loading) return;

    setLoading(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 320));

    try {
      await Promise.all([onToggle(), minDelay]);
    } catch (err) {
      console.warn('Checkbox toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconScale = scaleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.25, 1],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      hitSlop={8}
      style={({ pressed }) => [
        styles.touchable,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: size > 22 ? 8 : 6 },
          completed && styles.boxChecked,
          loading && styles.boxLoading,
        ]}
      >
        {loading ? (
          // Fancy aesthetic loader (Orbiting glow arc + pulsing core)
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Animated.View
              style={[
                styles.spinnerOrbit,
                {
                  transform: [{ rotate: spinInterpolate }],
                },
              ]}
            >
              <View style={styles.orbitDot} />
              <View style={styles.orbitDotOpposite} />
            </Animated.View>

            <Animated.View
              style={[
                styles.pulseCore,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>
        ) : (
          // Checked icon with bouncy spring scale
          <Animated.View
            style={{
              transform: [{ scale: iconScale }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {completed && (
              <Feather name="check" size={size * 0.65} color={Colors.onPrimaryFixed} />
            )}
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  box: {
    backgroundColor: 'rgba(23, 29, 43, 0.9)',
    borderWidth: 1.5,
    borderColor: '#2A3447',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  boxChecked: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  boxLoading: {
    borderColor: 'rgba(0, 230, 118, 0.6)',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  spinnerOrbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    position: 'absolute',
    top: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  orbitDotOpposite: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0, 230, 118, 0.4)',
  },
  pulseCore: {
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
});
