import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

interface ProgressCounterProps {
  progress: SharedValue<number>; // Shared value 0 to 100
}

export const ProgressCounter: React.FC<ProgressCounterProps> = React.memo(({ progress }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        runOnJS(setDisplayValue)(currentValue);
      }
    },
    [progress]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>Initializing...</Text>
      <Text style={styles.percentText}>{displayValue}%</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 1.5,
    color: '#8A99AD',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  percentText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    letterSpacing: 1,
    color: '#39FF88',
    ...Platform.select({
      web: {
        textShadow: '0px 0px 8px rgba(57, 255, 136, 0.5)',
      },
      default: {
        textShadowColor: 'rgba(57, 255, 136, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
    }),
  },
});

export default ProgressCounter;
