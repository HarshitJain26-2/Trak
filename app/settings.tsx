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
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { getThemeColors } from '@/constants/colors';
import { TRAK_ANDROID_APK_URL } from '@/constants/config';
import { useSettingsStore, ThemeMode } from '@/store/useSettingsStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useProjectStore } from '@/store/useProjectStore';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { setActiveUserId } from '@/utils/deviceUser';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { ActionSheet, useActionSheet, ActionOption } from '@/components/common/ActionSheet';
import { triggerHaptic } from '@/utils/haptics';
import { t, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/utils/i18n';
import { notificationService, PermissionStatus } from '@/services/notifications';

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <Text style={[styles.sectionHeader, { color }]}>
      {title}
    </Text>
  );
}

// ─── Change Password Modal ───────────────────────────────────────────────────
function ChangePasswordModal({
  visible,
  email,
  colors,
  onClose,
}: {
  visible: boolean;
  email: string;
  colors: ReturnType<typeof getThemeColors>;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setLoading(false);
    }
  }, [visible]);

  const handleChangePassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify current password
      const targetEmail = email || (await supabase.auth.getUser()).data.user?.email;
      if (!targetEmail) {
        setErrorMsg('Unable to determine user email.');
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: currentPassword,
      });

      if (verifyErr) {
        setErrorMsg('Current password is incorrect.');
        return;
      }

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setErrorMsg(updateErr.message || 'Failed to update password.');
      } else {
        setSuccessMsg('Password updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={modalStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[modalStyles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.primaryFixed}1A`, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="key" size={18} color={colors.primaryFixed} />
                  </View>
                  <Text style={[modalStyles.title, { color: colors.onSurface }]}>Change Password</Text>
                </View>

                {errorMsg ? (
                  <View style={{ backgroundColor: `${colors.error}1A`, borderWidth: 1, borderColor: `${colors.error}30`, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.error }}>{errorMsg}</Text>
                  </View>
                ) : null}

                {successMsg ? (
                  <View style={{ backgroundColor: `${colors.primaryFixed}1A`, borderWidth: 1, borderColor: `${colors.primaryFixed}30`, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.primaryFixed }}>{successMsg}</Text>
                  </View>
                ) : null}

                {/* CURRENT PASSWORD */}
                <Text style={[modalStyles.label, { color: colors.onSurfaceVariant }]}>CURRENT PASSWORD</Text>
                <View style={[modalStyles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33` }]}>
                  <TextInput
                    style={[modalStyles.input, { color: colors.onSurface }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showPass}
                    placeholder="Enter current password"
                    placeholderTextColor={`${colors.onSurfaceVariant}50`}
                    selectionColor={colors.primaryFixed}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                    <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                {/* NEW PASSWORD */}
                <Text style={[modalStyles.label, { color: colors.onSurfaceVariant }]}>NEW PASSWORD</Text>
                <View style={[modalStyles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33` }]}>
                  <TextInput
                    style={[modalStyles.input, { color: colors.onSurface }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPass}
                    placeholder="Min 8 characters"
                    placeholderTextColor={`${colors.onSurfaceVariant}50`}
                    selectionColor={colors.primaryFixed}
                    autoCapitalize="none"
                  />
                </View>

                {/* CONFIRM NEW PASSWORD */}
                <Text style={[modalStyles.label, { color: colors.onSurfaceVariant }]}>CONFIRM NEW PASSWORD</Text>
                <View style={[modalStyles.inputWrap, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33`, marginBottom: 16 }]}>
                  <TextInput
                    style={[modalStyles.input, { color: colors.onSurface }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPass}
                    placeholder="Repeat new password"
                    placeholderTextColor={`${colors.onSurfaceVariant}50`}
                    selectionColor={colors.primaryFixed}
                    autoCapitalize="none"
                  />
                </View>

                <View style={modalStyles.btnRow}>
                  <Pressable style={[modalStyles.btn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, borderWidth: 1 }]} onPress={onClose} disabled={loading}>
                    <Text style={[modalStyles.btnCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[modalStyles.btn, { backgroundColor: colors.primaryFixed }, (!currentPassword || !newPassword || loading) && modalStyles.btnDisabled]}
                    disabled={!currentPassword || !newPassword || loading}
                    onPress={handleChangePassword}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                    ) : (
                      <Text style={[modalStyles.btnSaveText, { color: colors.onPrimaryFixed }]}>Update</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { dialogProps, ask } = useConfirmDialog();
  const { actionSheetProps, showActionSheet } = useActionSheet();

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('pending');
  const [showChangePassword, setShowChangePassword] = useState(false);

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
  const { profile } = useProfileStore();

  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const status = await notificationService.getPermissionStatus();
    setPermissionStatus(status);
  };

  const handleRequestPermission = async () => {
    triggerHaptic(15);
    const newStatus = await notificationService.requestPermission();
    setPermissionStatus(newStatus);
    if (newStatus === 'granted') {
      Alert.alert('Permission Granted', 'Notifications are now enabled for Trak.');
    } else {
      Alert.alert('Permission Denied', 'Notifications are currently blocked by browser/device settings.');
    }
  };

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

      <ChangePasswordModal
        visible={showChangePassword}
        email={profile.email}
        colors={colors}
        onClose={() => setShowChangePassword(false)}
      />

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
        {/* <SectionHeader title={t('language', language)} color={`${colors.onSurfaceVariant}90`} />
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
        </View> */}

        {/* ── 🔔 NOTIFICATIONS & REMINDERS ── */}
        <SectionHeader title="NOTIFICATIONS & REMINDERS" color={`${colors.onSurfaceVariant}90`} />
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

          {/* Permission Status */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="shield" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Permission Status</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  System push notification access
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleRequestPermission}
              style={[
                styles.statusBadge,
                permissionStatus === 'granted' && { backgroundColor: `${colors.primaryFixed}20`, borderColor: `${colors.primaryFixed}40` },
                permissionStatus === 'denied' && { backgroundColor: `${colors.error}20`, borderColor: `${colors.error}40` },
                permissionStatus === 'pending' && { backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}40` },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  permissionStatus === 'granted' && { color: colors.primaryFixed },
                  permissionStatus === 'denied' && { color: colors.error },
                  permissionStatus === 'pending' && { color: colors.secondary },
                ]}
              >
                {permissionStatus.toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── PREFERENCES ── */}
        <SectionHeader title={t('preferences', language)} color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
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

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          <Pressable
            style={styles.row}
            onPress={() => Linking.openURL(TRAK_ANDROID_APK_URL)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15` }]}>
                <Feather name="download" size={16} color={colors.primaryFixed} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Download Android App</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>Latest standalone production APK</Text>
              </View>
            </View>
            <Feather name="external-link" size={14} color={colors.primaryFixed} />
          </Pressable>
        </View>

        {/* ── 🔐 ACCOUNT & SECURITY ── */}
        <SectionHeader title="ACCOUNT & SECURITY" color={`${colors.onSurfaceVariant}90`} />
        <View style={[styles.glassCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          {/* Email & Password Identity */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}15` }]}>
                <Feather name="mail" size={16} color={colors.primaryFixed} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Email & Password</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  {profile.email || 'No email set'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}35` }]}>
              <Text style={[styles.statusBadgeText, { color: colors.primaryFixed }]}>CONNECTED</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          {/* Change Password */}
          <Pressable style={styles.row} onPress={() => setShowChangePassword(true)}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Feather name="key" size={16} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Change Password</Text>
                <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                  ••••••••••••
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={`${colors.onSurfaceVariant}60`} />
          </Pressable>
        </View>

        {/* Log Out */}
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

// ─── Styles ────────────────────────────────────────────────────────────────────
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  rowSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentedSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentedActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  segmentedTextActive: {
    fontFamily: 'Inter_600SemiBold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowLabelWrap: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
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
    fontSize: 14,
  },
  versionBadge: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  logoutCard: {
    backgroundColor: '#FF525215',
    borderColor: '#FF525230',
    marginTop: 24,
    padding: 0,
    overflow: 'hidden',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FF5252',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  btnSaveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
