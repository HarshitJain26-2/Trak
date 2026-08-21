import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface AuthCardProps {
  children: React.ReactNode;
  /** Delay before entrance animation, in ms */
  animationDelay?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const AuthCard: React.FC<AuthCardProps> = ({ children, animationDelay = 200 }) => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(animationDelay, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(animationDelay, withTiming(0, { duration: 280 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.glassBorder,
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    marginBottom: 16,
  },
});
