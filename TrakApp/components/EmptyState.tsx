import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface EmptyStateProps {
  onCreatePress: () => void;
}

export default function EmptyState({ onCreatePress }: EmptyStateProps) {
  // Terminal cursor blink
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  // Loading bar scan
  const loadingX = useRef(new Animated.Value(-1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cursor blink (step, not eased)
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Loading bar scan left→right
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingX, { toValue: 3, duration: 2000, useNativeDriver: true }),
        Animated.timing(loadingX, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <View style={styles.container}>
      {/* Icon box with glassmorphism effect */}
      <View style={styles.iconBox}>
        <View style={styles.iconGlow} />
        <Feather name="folder-minus" size={48} color={Colors.primaryFixed} />

        {/* Loading progress bar */}
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                transform: [
                  {
                    translateX: loadingX.interpolate({
                      inputRange: [-1, 3],
                      outputRange: ['-100%', '300%'],
                    }) as any,
                  },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Message */}
      <View style={styles.messageBlock}>
        <Text style={styles.headline}>No projects yet</Text>
        <Text style={styles.subtext}>
          Start tracking your dev workflow today.
        </Text>
        <View style={styles.terminalLine}>
          <Text style={styles.terminalText}>~/trak --init_workspace</Text>
          <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
        </View>
      </View>

      {/* CTA */}
      <Animated.View style={{ transform: [{ scale: btnScale }] }}>
        <Pressable
          style={styles.ctaButton}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onCreatePress}
        >
          <Feather name="plus-circle" size={20} color={Colors.onPrimaryFixed} />
          <Text style={styles.ctaButtonText}>+ Create your first project</Text>
        </Pressable>
      </Animated.View>

      {/* Secondary actions */}
      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryBtn}>
          <Feather name="help-circle" size={14} color={`${Colors.onSurfaceVariant}66`} />
          <Text style={styles.secondaryBtnText}>Documentation</Text>
        </Pressable>
        <View style={styles.secondarySeparator} />
        <Pressable style={styles.secondaryBtn}>
          <Feather name="terminal" size={14} color={`${Colors.onSurfaceVariant}66`} />
          <Text style={styles.secondaryBtnText}>CLI Tools</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 24,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(22,27,34,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 8,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  iconGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: `${Colors.primaryFixed}0D`,
    borderRadius: 12,
  },
  loadingTrack: {
    width: 32,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '33%',
    height: '100%',
    backgroundColor: Colors.primaryFixed,
    borderRadius: 2,
  },
  messageBlock: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 300,
  },
  headline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.onSurface,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: `${Colors.onSurfaceVariant}B3`,
    textAlign: 'center',
    lineHeight: 24,
  },
  terminalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  terminalText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: `${Colors.primaryFixed}CC`,
    opacity: 0.6,
  },
  cursor: {
    width: 8,
    height: 18,
    backgroundColor: Colors.primaryFixed,
    marginLeft: 4,
    borderRadius: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 8,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.onPrimaryFixed,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryBtnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}66`,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  secondarySeparator: {
    width: 1,
    height: 12,
    backgroundColor: `${Colors.outlineVariant}4D`,
  },
});
