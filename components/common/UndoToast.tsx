import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useUndoStore } from '@/store/useUndoStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UndoToast: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { activeUndo, hideUndoToast, triggerUndo } = useUndoStore();

  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if user is currently on a main tab screen to offset above tab bar (~60px)
  const isTabScreen =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname === '/(tabs)/index' ||
    pathname === '/(tabs)/completed' ||
    pathname === '/(tabs)/deleted' ||
    pathname === '/(tabs)/profile';

  const bottomOffset = Math.max(insets.bottom, 12) + (isTabScreen ? 68 : 20);

  useEffect(() => {
    if (activeUndo) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 6,
          speed: 16,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, activeUndo.durationMs || 5000);
    } else {
      handleDismiss();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeUndo]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      hideUndoToast();
    });
  };

  if (!activeUndo) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.isDark ? '#1E293B' : '#0F172A',
            borderColor: colors.isDark ? `${colors.primaryFixed}33` : 'rgba(255, 255, 255, 0.15)',
          },
        ]}
      >
        <View style={styles.textWrap}>
          <Feather name="info" size={16} color={colors.primaryFixed} style={styles.icon} />
          <Text style={styles.message} numberOfLines={1}>
            {activeUndo.message}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              void triggerUndo();
            }}
            style={({ pressed }) => [
              styles.undoBtn,
              pressed && { opacity: 0.75 },
            ]}
            hitSlop={12}
          >
            <Text style={[styles.undoText, { color: colors.primaryFixed }]}>
              {activeUndo.actionLabel || 'UNDO'}
            </Text>
          </Pressable>

          <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
            <Feather name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#F8FAFC',
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  undoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 2,
  },
});
