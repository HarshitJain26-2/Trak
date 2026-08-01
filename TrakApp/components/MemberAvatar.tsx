import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface MemberAvatarProps {
  name: string;
  size?: number;
  style?: any;
}

/** Deterministic color from a string (name) */
const getAvatarColor = (name: string): string => {
  const colors = [
    '#72ff70', // primary green
    '#4b8eff', // secondary blue
    '#ffd400', // warning yellow
    '#ffb4ab', // error pink
    '#adc6ff', // soft blue
    '#dad9ff', // tertiary lavender
    '#00e639', // primary dim green
    '#d8e2ff', // secondary fixed light
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Small circular avatar showing the first letter of a member's name,
 * with a unique color derived from the name.
 */
export function MemberAvatar({ name, size = 32, style }: MemberAvatarProps) {
  const bgColor = getAvatarColor(name);
  const initial = (name || '?')[0].toUpperCase();
  const fontSize = size * 0.42;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${bgColor}30`,
          borderColor: `${bgColor}60`,
        },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize, color: bgColor }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initial: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0,
  },
});
