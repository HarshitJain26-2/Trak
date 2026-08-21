import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const TRUST_ITEMS = [
  { icon: 'refresh-cw' as const, label: 'Live project sync' },
  { icon: 'users' as const, label: 'Team collaboration' },
  { icon: 'lock' as const, label: 'Secure workspace' },
];

export const AuthTrustRow: React.FC = () => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(350, withTiming(1, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {TRUST_ITEMS.map((item, i) => (
        <View key={i} style={styles.item}>
          <Feather name={item.icon} size={12} color={`${colors.primaryFixed}99`} />
          <Text style={[styles.label, { color: `${colors.onSurfaceVariant}BB` }]}>{item.label}</Text>
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
