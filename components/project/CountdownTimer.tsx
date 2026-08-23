import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calculateTimeRemaining } from '@/utils/deadlineValidator';
import { getThemeColors } from '@/constants/colors';
import { useSettingsStore } from '@/store/useSettingsStore';

interface CountdownTimerProps {
  targetTimestamp: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTimestamp }) => {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colors = getThemeColors(themeMode, systemColorScheme);

  const [remaining, setRemaining] = useState(() => calculateTimeRemaining(targetTimestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calculateTimeRemaining(targetTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (remaining.expired) {
    return (
      <View style={[styles.badge, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
        <Feather name="alert-circle" size={12} color={colors.error} />
        <Text style={[styles.badgeText, { color: colors.error }]}>Deadline Expired</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}30` }]}>
      <Feather name="clock" size={12} color={colors.primaryFixed} />
      <Text style={[styles.badgeText, { color: colors.primaryFixed }]}>
        {remaining.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});
