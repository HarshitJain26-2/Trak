import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getThemeColors } from '@/constants/colors';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useColorScheme } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

export const LEGAL_VERSION = '2026-08-23';
export const LEGAL_EFFECTIVE_DATE = '2026-08-23';

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  effectiveDate?: string;
  children: React.ReactNode;
}

export function LegalDocument({ title, lastUpdated, effectiveDate, children }: LegalDocumentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemColorScheme = useColorScheme();
  const colors = getThemeColors(themeMode, systemColorScheme);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <BlurView
        intensity={60}
        tint={colors.isDark ? 'dark' : 'light'}
        style={[
          styles.appBar,
          { borderBottomColor: `${colors.outlineVariant}33` },
          Platform.OS === 'android' && { backgroundColor: `${colors.surface}E6` },
        ]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <Pressable
            onPress={() => { triggerHaptic(10); router.back(); }}
            style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            hitSlop={10}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={[styles.appBarTitle, { color: colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) + 72, paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Text style={[styles.brand, { color: colors.primaryFixed }]}>TRAK</Text>
          <Text style={[styles.heading, { color: colors.onSurface }]}>{title}</Text>
          <Text style={[styles.lastUpdated, { color: colors.onSurfaceVariant }]}>
            {effectiveDate ? `Effective Date: ${effectiveDate}  ·  ` : ''}Last Updated: {lastUpdated}
          </Text>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}33` }]} />

          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
  },
  appBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  brand: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
});
