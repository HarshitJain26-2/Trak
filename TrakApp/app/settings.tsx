import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/colors';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProjectStore } from '../store/useProjectStore';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../lib/storage';
import { setActiveUserId } from '../lib/deviceUser';
import { ConfirmDialog, useConfirmDialog } from '../components/ConfirmDialog';
import { triggerHaptic } from '../lib/haptics';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dialogProps, ask } = useConfirmDialog();

  const {
    notificationsEnabled,
    autoSync,
    compactCards,
    hapticsEnabled,
    toggleNotification,
    toggleAutoSync,
    toggleCompactCards,
    toggleHaptics,
    loadSettings,
  } = useSettingsStore();

  const { projects } = useProjectStore();

  useEffect(() => {
    loadSettings();
  }, []);

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
        'Export Successful',
        `Data for ${projects.length} project(s) and profile settings copied to clipboard as JSON!`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        'Export Summary',
        `Data summary:\n• ${projects.length} project(s)\n• Profile info included.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearCache = async () => {
    triggerHaptic(25);
    const confirmed = await ask({
      title: 'Clear Local Cache',
      message: 'This will reset your cached settings and local preferences on this device.',
      confirmLabel: 'Clear Cache',
      destructive: true,
      icon: 'trash-2',
    });
    if (!confirmed) return;
    await safeStorage.removeItem('trak_user_settings');
    await loadSettings();
    Alert.alert('Cache Cleared', 'Local settings cache has been reset.');
  };

  const handleLogOut = async () => {
    triggerHaptic(30);
    const confirmed = await ask({
      title: 'Log Out',
      message: 'Are you sure you want to log out of Trak?',
      confirmLabel: 'Log Out',
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
    <View style={styles.root}>
      <ConfirmDialog {...dialogProps} />

      {/* App Bar Header */}
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.appBar, Platform.OS === 'android' && { backgroundColor: `${Colors.surface}E6` }]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <Pressable onPress={() => { triggerHaptic(10); router.back(); }} style={styles.backBtn} hitSlop={10}>
            <Feather name="arrow-left" size={20} color={Colors.onSurface} />
          </Pressable>
          <Text style={styles.appBarTitle}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Preferences ── */}
        <SectionHeader title="PREFERENCES" />
        <View style={styles.glassCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${Colors.primaryFixed}15` }]}>
                <Feather name="bell" size={16} color={Colors.primaryFixed} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Push Notifications</Text>
                <Text style={styles.rowSubtitle}>Receive reminders & status updates</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotification}
              trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.primaryFixed}60` }}
              thumbColor={notificationsEnabled ? Colors.primaryFixed : `${Colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${Colors.secondary}15` }]}>
                <Feather name="refresh-cw" size={16} color={Colors.secondary} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Cloud Auto Sync</Text>
                <Text style={styles.rowSubtitle}>Sync project changes with Supabase</Text>
              </View>
            </View>
            <Switch
              value={autoSync}
              onValueChange={toggleAutoSync}
              trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.primaryFixed}60` }}
              thumbColor={autoSync ? Colors.primaryFixed : `${Colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="layout" size={16} color={Colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Compact Project Cards</Text>
                <Text style={styles.rowSubtitle}>Use condensed card layout on dashboard</Text>
              </View>
            </View>
            <Switch
              value={compactCards}
              onValueChange={toggleCompactCards}
              trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.primaryFixed}60` }}
              thumbColor={compactCards ? Colors.primaryFixed : `${Colors.onSurfaceVariant}80`}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="smartphone" size={16} color={Colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Haptic Feedback</Text>
                <Text style={styles.rowSubtitle}>Vibrate on button presses & actions</Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.primaryFixed}60` }}
              thumbColor={hapticsEnabled ? Colors.primaryFixed : `${Colors.onSurfaceVariant}80`}
            />
          </View>
        </View>

        {/* ── Data & Storage ── */}
        <SectionHeader title="DATA & STORAGE" />
        <View style={styles.glassCard}>
          <Pressable style={styles.row} onPress={handleExportData}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="download" size={16} color={Colors.onSurface} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Export Project Data</Text>
                <Text style={styles.rowSubtitle}>Copy JSON data backup to clipboard</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={`${Colors.onSurfaceVariant}60`} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleClearCache}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="hard-drive" size={16} color={Colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Clear Cache</Text>
                <Text style={styles.rowSubtitle}>Reset local preferences cache</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={`${Colors.onSurfaceVariant}60`} />
          </Pressable>
        </View>

        {/* ── About ── */}
        <SectionHeader title="ABOUT & APP INFO" />
        <View style={styles.glassCard}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="info" size={16} color={Colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>App Version</Text>
                <Text style={styles.rowSubtitle}>Trak Developer Tracker</Text>
              </View>
            </View>
            <Text style={styles.versionBadge}>v1.0.0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Feather name="shield" size={16} color={Colors.onSurfaceVariant} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowTitle}>Security & Privacy</Text>
                <Text style={styles.rowSubtitle}>Local-first encrypted storage</Text>
              </View>
            </View>
            <Feather name="lock" size={14} color={`${Colors.primaryFixed}90`} />
          </View>
        </View>

        {/* ── Account Actions ── */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.glassCard, styles.logoutCard]}>
          <Pressable style={styles.logoutBtn} onPress={handleLogOut}>
            <Feather name="log-out" size={16} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out of Trak</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  appBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}4D`,
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
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
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
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
  },
  glassCard: {
    backgroundColor: 'rgba(17,20,27,0.8)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelWrap: { flex: 1 },
  rowTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  rowSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}70`,
    marginTop: 2,
  },
  versionBadge: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.primaryFixed,
    backgroundColor: `${Colors.primaryFixed}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}30`,
  },
  divider: {
    height: 1,
    backgroundColor: `${Colors.outlineVariant}20`,
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
