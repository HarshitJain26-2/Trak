import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useNotificationStore } from '@/store/useNotificationStore';

export const InAppNotificationBanner: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeToast, hideToast } = useNotificationStore();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeToast) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 8,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, 4500);
    } else {
      handleDismiss();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeToast]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      hideToast();
    });
  };

  const handlePress = () => {
    if (activeToast?.projectId) {
      const pId = activeToast.projectId;
      handleDismiss();
      router.push(`/project/${pId}`);
    } else {
      handleDismiss();
    }
  };

  if (!activeToast) return null;

  let iconName: keyof typeof Feather.glyphMap = 'bell';
  let iconColor = colors.primaryFixed;

  if (activeToast.type === 'project_member_joined') {
    iconName = 'user-plus';
    iconColor = colors.primaryFixed;
  } else if (activeToast.type === 'project_member_left' || activeToast.type === 'project_member_removed') {
    iconName = 'user-minus';
    iconColor = colors.error;
  } else if (activeToast.type === 'milestone_completed') {
    iconName = 'check-circle';
    iconColor = colors.secondaryFixed;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, 16) + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.bannerCard,
          {
            backgroundColor: colors.surfaceContainerHighest,
            borderColor: colors.glassBorder,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}20`, borderColor: `${iconColor}40` }]}>
          <Feather name={iconName} size={18} color={iconColor} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
            {activeToast.title}
          </Text>
          <Text style={[styles.desc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
            {activeToast.desc}
          </Text>
        </View>

        <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
          <Feather name="x" size={16} color={colors.onSurfaceVariant} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
