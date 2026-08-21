import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';

interface AuthSecurityNoteProps {
  text?: string;
}

export const AuthSecurityNote: React.FC<AuthSecurityNoteProps> = ({
  text = 'Recovery codes expire automatically and can only be used once.',
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: `${colors.surfaceContainerHigh}80` }]}>
      <Feather name="shield" size={13} color={`${colors.primaryFixed}99`} />
      <Text style={[styles.text, { color: `${colors.onSurfaceVariant}BB` }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    flex: 1,
  },
});
