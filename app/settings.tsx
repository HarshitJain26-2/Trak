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
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
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
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

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
  const [testingNotification, setTestingNotification] = useState(false);
  const [showTestAnimation, setShowTestAnimation] = useState(false);
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
  const { projects } = useProjectStore();
  const { profile } = useProfileStore();

  const [identities, setIdentities] = useState<any[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  const fetchIdentities = async () => {
    try {
      setLoadingIdentities(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.identities) {
        setIdentities(user.identities);
      }
    } catch (_) {
    } finally {
      setLoadingIdentities(false);
    }
  };

  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
    fetchIdentities();
  }, []);

  const handleConnectGoogle = async () => {
    if (linkingGoogle) return;
    setLinkingGoogle(true);
    triggerHaptic(15);
    try {
      const redirectUrl = Linking.createURL('auth/callback');

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.linkIdentity({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });
        if (error) {
          throw error;
        }
        return;
      }

      // Mobile (Android / iOS) via in-app browser session
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('Unable to start Google connection. Please try again.');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const callbackUrl = result.url;
        let params = new URLSearchParams();
        const hashIndex = callbackUrl.indexOf('#');
        if (hashIndex !== -1) {
          params = new URLSearchParams(callbackUrl.substring(hashIndex + 1));
        }
        const queryIndex = callbackUrl.indexOf('?');
        if (queryIndex !== -1) {
          const qParams = new URLSearchParams(callbackUrl.substring(queryIndex + 1, hashIndex !== -1 ? hashIndex : undefined));
          qParams.forEach((v, k) => {
            if (!params.has(k)) params.set(k, v);
          });
        }

        const errParam = params.get('error_description') || params.get('error');
        if (errParam) {
          throw new Error(decodeURIComponent(errParam.replace(/\+/g, ' ')));
        }

        const code = params.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        await fetchIdentities();
        Alert.alert('Success', 'Google account connected successfully.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('identity_already_exists') || msg.includes('already linked') || msg.includes('already exists')) {
        Alert.alert('Connection Failed', 'This Google account is already linked to another user.');
      } else if (msg !== 'CANCELLED') {
        Alert.alert('Connection Failed', msg || 'Unable to connect Google account.');
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    const googleIdentity = identities.find((i) => i.provider === 'google');
    if (!googleIdentity) return;

    // Safety check: ensure user has another sign-in identity
    if (identities.length <= 1) {
      Alert.alert(
        'Cannot Disconnect',
        'Google is your only sign-in method. You must set an email password before disconnecting Google to prevent losing access to your account.'
      );
      return;
    }

    const confirmed = await ask({
      title: 'Disconnect Google Account?',
      message: 'Are you sure you want to disconnect your Google account? You will need to sign in using your email and password.',
      confirmLabel: 'Disconnect',
      destructive: true,
      icon: 'alert-triangle',
    });

    if (!confirmed) return;

    setUnlinkingGoogle(true);
    triggerHaptic(20);
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) {
        throw error;
      }
      await fetchIdentities();
      Alert.alert('Disconnected', 'Google account has been disconnected.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to disconnect Google account.');
    } finally {
      setUnlinkingGoogle(false);
    }
  };

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

  const handleSendTestNotification = async () => {
    triggerHaptic(20);
    setTestingNotification(true);
    try {
      const res = await notificationService.sendTestNotification();
      await checkPermissionStatus();
      Alert.alert(res.success ? 'Success' : 'Notification Alert', res.message);
    } finally {
      setTestingNotification(false);
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

      <ChangePasswordModal
        visible={showChangePassword}
        email={profile.email}
        colors={colors}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Full-Screen Test Animation Modal */}
      <Modal
        visible={showTestAnimation}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowTestAnimation(false)}
      >
        <FuturisticLoadingScreen
          durationMs={3000}
          themeMode={colors.isDark ? 'dark' : 'light'}
          onFinish={() => setShowTestAnimation(false)}
        />
      </Modal>

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

        {/* ── 🔔 NOTIFICATIONS & TEST NOTIFICATION ── */}
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

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          {/* 🧪 MANDATORY TEST NOTIFICATION BUTTON */}
          <Pressable
            style={[styles.testBtn, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}35` }]}
            onPress={handleSendTestNotification}
            disabled={testingNotification}
          >
            <Feather name="send" size={16} color={colors.primaryFixed} />
            <Text style={[styles.testBtnText, { color: colors.primaryFixed }]}>
              {testingNotification ? 'Sending...' : '🧪 Send Test Notification'}
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

          {/* 🚀 TEST FUTURISTIC LOADING ANIMATION BUTTON */}
          <Pressable
            style={[styles.testBtn, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}35` }]}
            onPress={() => {
              triggerHaptic(20);
              setShowTestAnimation(true);
            }}
          >
            <Feather name="play-circle" size={16} color={colors.secondary} />
            <Text style={[styles.testBtnText, { color: colors.secondary }]}>
              🚀 Test Loading Screen Animation
            </Text>
          </Pressable>
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

        {/* ── 🔐 ACCOUNT & IDENTITIES ── */}
        <SectionHeader title="ACCOUNT & IDENTITIES" color={`${colors.onSurfaceVariant}90`} />
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

          {/* Google Identity */}
          {(() => {
            const googleIdentity = identities.find((i) => i.provider === 'google');
            const isGoogleLinked = !!googleIdentity;
            const googleEmail = googleIdentity?.identity_data?.email || profile.email;

            return (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: isGoogleLinked ? `${colors.primaryFixed}15` : colors.surfaceContainerHigh }]}>
                    <Feather name="globe" size={16} color={isGoogleLinked ? colors.primaryFixed : colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.rowLabelWrap}>
                    <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Google</Text>
                    <Text style={[styles.rowSubtitle, { color: `${colors.onSurfaceVariant}90` }]}>
                      {isGoogleLinked ? `Linked (${googleEmail})` : 'Not connected'}
                    </Text>
                  </View>
                </View>

                {isGoogleLinked ? (
                  <Pressable
                    onPress={handleDisconnectGoogle}
                    disabled={unlinkingGoogle}
                    style={[
                      styles.actionPillBtn,
                      { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}35` },
                    ]}
                  >
                    {unlinkingGoogle ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Text style={[styles.actionPillText, { color: colors.error }]}>Disconnect</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleConnectGoogle}
                    disabled={linkingGoogle}
                    style={[
                      styles.actionPillBtn,
                      { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` },
                    ]}
                  >
                    {linkingGoogle ? (
                      <ActivityIndicator size="small" color={colors.primaryFixed} />
                    ) : (
                      <>
                        <Feather name="link" size={13} color={colors.primaryFixed} style={{ marginRight: 5 }} />
                        <Text style={[styles.actionPillText, { color: colors.primaryFixed }]}>Connect Google</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })()}

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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  testBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnCancelText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  btnSaveText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
