import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Alert,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getThemeColors } from '../constants/colors';
import { useSettingsStore, ThemeMode } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProjectStore } from '../store/useProjectStore';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../lib/storage';
import { setActiveUserId } from '../lib/deviceUser';
import { ConfirmDialog, useConfirmDialog } from '../components/ConfirmDialog';
import { ActionSheet, useActionSheet, ActionOption } from '../components/ActionSheet';
import { triggerHaptic } from '../lib/haptics';
import { t, SUPPORTED_LANGUAGES, SupportedLanguage } from '../lib/i18n';

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <Text style={[styles.sectionHeader, { color }]}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { dialogProps, ask } = useConfirmDialog();
  const { actionSheetProps, showActionSheet } = useActionSheet();

  const {
    themeMode,
    language,
    notificationsEnabled,
    autoSync,
    compactCards,
    hapticsEnabled,
    setThemeMode,
    setLanguage,
    toggleNotification,
    toggleAutoSync,
    toggleCompactCards,
    toggleHaptics,
    loadSettings,
  } = useSettingsStore();

  const colors = getThemeColors(themeMode, systemColorScheme);
  const { projects } = useProjectStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleOpenLanguagePicker = () => {
    triggerHaptic(15);
    const options: ActionOption[] = SUPPORTED_LANGUAGES.map((lang) => ({
      label: `${lang.flag}  ${lang.nativeName} (${lang.name})`,
      onPress: () => setLanguage(lang.code),
    }));

    showActionSheet({
      title: t('selectLanguage', language),
      message: t('languageSubtitle', language),
      options,
    });
  };

  const handleExportData = async () => {
    triggerHaptic(15);
    const exportData = {
      profile: useProfileStore.getState().profile,
      projects: projects,
      exportedAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(exportData, null, 2);

    try {
      await Clipboard.setStringAsync(jsonString);
      Alert.alert(
        t('exportData', language),
        `Data for ${projects.length} project(s) copied to clipboard as JSON!`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        t('exportData', language),
        `Data summary:\n• ${projects.length} project(s)`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearCache = async () => {
    triggerHaptic(25);
    const confirmed = await ask({
      title: t('clearCache', language),
      message: t('clearCacheSub', language),
      confirmLabel: t('clear', language),
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;
    await safeStorage.removeItem('trak_user_settings');
    await loadSettings();
    Alert.alert(t('clearCache', language), 'Settings cache reset.');
  };

  const handleLogOut = async () => {
    triggerHaptic(30);
    const confirmed = await ask({
      title: t('logOut', language),
      message: t('confirmLogout', language),
      confirmLabel: t('logOut', language),
      destructive: true,
      icon: 'log-out',
    });
    if (!confirmed) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    await safeStorage.removeItem('trak_local_profile');
    await safeStorage.removeItem('trak_local_projects');
    await setActiveUserId(null);
    useProfileStore.getState().clearProfile();
    useProjectStore.getState().clearProjects();
    router.replace('/auth');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ConfirmDialog {...dialogProps} />
      <ActionSheet {...actionSheetProps} />

      {/* App Bar Header */}
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
          >
            <Feather name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={[styles.appBarTitle, { color: colors.onSurface }]}>
            {t('settings', language)}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 🎨 THEME SELECTION ── */}
        <SectionHeader title={t('theme', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}20` }]}>
              <Feather name="sun" size={16} color={colors.primaryFixed} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('theme', language)}</Text>
              <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                {t('themeSubtitle', language)}
              </Text>
            </View>
          </View>

          {/* Segmented Control */}
          <View style={[styles.segmentedContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
              const isActive = themeMode === mode;
              const modeIcon = mode === 'light' ? 'sun' : mode === 'dark' ? 'moon' : 'monitor';
              const modeLabel = mode === 'light' ? t('lightMode', language) : mode === 'dark' ? t('darkMode', language) : t('systemDefault', language);

              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.segmentedSegment,
                    isActive && [styles.segmentedActive, { backgroundColor: colors.primaryFixed }],
                  ]}
                >
                  <Feather
                    name={modeIcon}
                    size={14}
                    color={isActive ? colors.onPrimaryFixed : colors.onSurfaceVariant}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentedText,
                      { color: isActive ? colors.onPrimaryFixed : colors.onSurfaceVariant },
                      isActive && styles.segmentedTextActive,
                    ]}
                  >
                    {modeLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 🌐 LANGUAGE SELECTION ── */}
        <SectionHeader title={t('language', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <Pressable style={styles.row} onPress={handleOpenLanguagePicker}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.secondary}20` }]}>
                <Feather name="globe" size={16} color={colors.secondary} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('language', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('languageSubtitle', language)}
                </Text>
              </View>
            </View>

            <View style={styles.langPill}>
              <Text style={styles.langFlag}>{currentLangObj.flag}</Text>
              <Text style={[styles.langText, { color: colors.onSurface }]}>{currentLangObj.nativeName}</Text>
              <Feather name="chevron-right" size={16} color={`${colors.onSurfaceVariant}80`} />
            </View>
          </Pressable>
        </View>

        {/* ── PREFERENCES ── */}
        <SectionHeader title={t('preferences', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15` }]}>
                <Feather name="bell" size={16} color={colors.primaryFixed} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('pushNotifications', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('pushNotificationsSub', language)}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotification}
              trackColor={{ false: colors.surfaceContainerHigh, true: `${colors.primaryFixed}60` }}
              thumbColor={notificationsEnabled ? colors.primaryFixed : `${colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.secondary}15` }]}>
                <Feather name="refresh-cw" size={16} color={colors.secondary} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('cloudAutoSync', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('cloudAutoSyncSub', language)}
                </Text>
              </View>
            </View>
            <Switch
              value={autoSync}
              onValueChange={toggleAutoSync}
              trackColor={{ false: colors.surfaceContainerHigh, true: `${colors.primaryFixed}60` }}
              thumbColor={autoSync ? colors.primaryFixed : `${colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="layout" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('compactCards', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('compactCardsSub', language)}
                </Text>
              </View>
            </View>
            <Switch
              value={compactCards}
              onValueChange={toggleCompactCards}
              trackColor={{ false: colors.surfaceContainerHigh, true: `${colors.primaryFixed}60` }}
              thumbColor={compactCards ? colors.primaryFixed : `${colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="smartphone" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('hapticFeedback', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('hapticFeedbackSub', language)}
                </Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: colors.surfaceContainerHigh, true: `${colors.primaryFixed}60` }}
              thumbColor={hapticsEnabled ? colors.primaryFixed : `${colors.onSurfaceVariant}80`}
            />
          </View>
        </View>

        {/* ── DATA & STORAGE ── */}
        <SectionHeader title={t('dataStorage', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <Pressable style={styles.row} onPress={handleExportData}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="download" size={16} color={colors.onSurface} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('exportData', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('exportDataSub', language)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={`${colors.onSurfaceVariant}60`} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <Pressable style={styles.row} onPress={handleClearCache}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="hard-drive" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('clearCache', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {t('clearCacheSub', language)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={`${colors.onSurfaceVariant}60`} />
          </Pressable>
        </View>

        {/* ── ABOUT ── */}
        <SectionHeader title={t('about', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="info" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('appVersion', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>Trak Developer Tracker</Text>
              </View>
            </View>
            <Text style={[styles.versionBadge, { color: colors.primaryFixed, backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}30` }]}>v1.0.0</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="shield" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>{t('securityPrivacy', language)}</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>Encrypted Local-First Storage</Text>
              </View>
            </View>
            <Feather name="lock" size={14} color={`${colors.primaryFixed}90`} />
          </View>
        </View>

        {/* ── ACCOUNT ── */}
        <SectionHeader title={t('account', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, styles.logoutCard]}>
          <Pressable style={styles.logoutBtn} onPress={handleLogOut}>
            <Feather name="log-out" size={16} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>{t('logOut', language)}</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
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
    overflow: 'hidden',
  },
  appBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 2,
  },
  glassCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 12,
  },
  segmentedSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentedActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  segmentedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  segmentedTextActive: {
    fontFamily: 'Inter_600SemiBold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelWrap: { flex: 1 },
  rowTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  rowSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langFlag: {
    fontSize: 16,
  },
  langText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  versionBadge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  divider: {
    height: 1,
  },
  logoutCard: {
    borderColor: 'rgba(255, 82, 82, 0.25)',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FF5252',
  },
});
