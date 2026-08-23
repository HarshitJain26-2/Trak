import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';

interface TechPillProps {
  label: string;
  variant?: 'default' | 'highlighted';
}

export const TechPill: React.FC<TechPillProps> = ({ label, variant = 'default' }) => {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: `${colors.surfaceContainerHighest}80` },
        variant === 'highlighted' && {
          backgroundColor: `${colors.primaryFixed}1A`,
          borderWidth: 1,
          borderColor: `${colors.primaryFixed}4D`,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.secondaryFixed },
          variant === 'highlighted' && { color: colors.primaryFixed },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.24,
  },
});
