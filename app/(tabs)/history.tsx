import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function HistoryScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>History</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
});
