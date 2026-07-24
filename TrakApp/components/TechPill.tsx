import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface TechPillProps {
  label: string;
  variant?: 'default' | 'highlighted';
}

export const TechPill: React.FC<TechPillProps> = ({ label, variant = 'default' }) => {
  return (
    <View style={[styles.pill, variant === 'highlighted' && styles.pillHighlighted]}>
      <Text style={[styles.label, variant === 'highlighted' && styles.labelHighlighted]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: `${Colors.surfaceContainerHighest}80`,
    borderRadius: 4,
  },
  pillHighlighted: {
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}4D`,
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.secondaryFixed,
    letterSpacing: 0.02 * 12,
  },
  labelHighlighted: {
    color: Colors.primaryFixed,
  },
});
