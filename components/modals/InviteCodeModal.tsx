import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';
import QRCode from 'react-native-qrcode-svg';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectInvite, inviteService, buildInviteUrls, generateSecureToken } from '@/services/inviteService';
import { supabase } from '@/services/supabase';
import { triggerHaptic } from '@/utils/haptics';

type ViewTab = 'link' | 'qr' | 'code';

interface InviteCodeModalProps {
  visible: boolean;
  projectId?: string;
  projectName?: string;
  inviteCode?: string | null;
  isGenerating?: boolean;
  onClose: () => void;
  onGenerate?: () => void;
}

const EXPIRATION_PRESETS = [
  { label: 'Never', hours: null },
  { label: '1 Hour', hours: 1 },
  { label: '24 Hours', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
];

const MAX_USES_PRESETS = [
  { label: 'Unlimited', uses: null },
  { label: '1 Use', uses: 1 },
  { label: '5 Uses', uses: 5 },
  { label: '10 Uses', uses: 10 },
  { label: '25 Uses', uses: 25 },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function InviteCodeModal({
  visible,
  projectId,
  projectName = 'Project',
  inviteCode,
  isGenerating = false,
  onClose,
  onGenerate,
}: InviteCodeModalProps) {
  const colors = useThemeColors();
  const {
    createProjectInvite,
    updateProjectInviteSettings,
    revokeProjectInvite,
    getActiveProjectInvite,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('link');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeInvite, setActiveInvite] = useState<ProjectInvite | null>(null);
  const [currentRawToken, setCurrentRawToken] = useState<string | null>(null);
  const [currentInviteUrl, setCurrentInviteUrl] = useState<string>('');

  // Expiration settings: preset hours, or custom ISO string
  const [selectedPresetHours, setSelectedPresetHours] = useState<number | null>(null);
  const [customExpiresAt, setCustomExpiresAt] = useState<string | null>(null);
  const [isCustomExpiration, setIsCustomExpiration] = useState(false);

  // Max uses settings: preset uses, or custom number
  const [selectedPresetUses, setSelectedPresetUses] = useState<number | null>(null);
  const [customMaxUses, setCustomMaxUses] = useState<number | null>(null);
  const [isCustomMaxUses, setIsCustomMaxUses] = useState(false);

  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sub-modal pickers
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [showMaxUsesPicker, setShowMaxUsesPicker] = useState(false);

  // Custom Expiration Picker Temporary State
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [pickerHour, setPickerHour] = useState(23);
  const [pickerMinute, setPickerMinute] = useState(59);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Custom Max Uses Temporary State
  const [customUsesInput, setCustomUsesInput] = useState('');
  const [customUsesError, setCustomUsesError] = useState<string | null>(null);

  // Track initial state to detect edits on existing invites
  const [initialSettingsSnapshot, setInitialSettingsSnapshot] = useState<{
    expiresAt: string | null;
    maxUses: number | null;
  } | null>(null);

  // Synchronize settings from an existing active invite
  const hydrateFromInvite = (invite: ProjectInvite) => {
    setActiveInvite(invite);
    if (invite.rawToken) {
      setCurrentRawToken(invite.rawToken);
      const { httpsUrl } = buildInviteUrls(invite.rawToken);
      setCurrentInviteUrl(httpsUrl);
    }

    // Hydrate Expiration
    if (!invite.expiresAt) {
      setSelectedPresetHours(null);
      setCustomExpiresAt(null);
      setIsCustomExpiration(false);
    } else {
      const expDate = new Date(invite.expiresAt);
      const diffHours = Math.round((expDate.getTime() - new Date(invite.createdAt || Date.now()).getTime()) / (1000 * 60 * 60));
      const matchingPreset = EXPIRATION_PRESETS.find((p) => p.hours === diffHours);
      if (matchingPreset && matchingPreset.hours !== null) {
        setSelectedPresetHours(matchingPreset.hours);
        setCustomExpiresAt(null);
        setIsCustomExpiration(false);
      } else {
        setSelectedPresetHours(null);
        setCustomExpiresAt(invite.expiresAt);
        setIsCustomExpiration(true);
      }
    }

    // Hydrate Max Uses
    if (!invite.maxUses) {
      setSelectedPresetUses(null);
      setCustomMaxUses(null);
      setIsCustomMaxUses(false);
    } else {
      const matchingPreset = MAX_USES_PRESETS.find((p) => p.uses === invite.maxUses);
      if (matchingPreset && matchingPreset.uses !== null) {
        setSelectedPresetUses(matchingPreset.uses);
        setCustomMaxUses(null);
        setIsCustomMaxUses(false);
      } else {
        setSelectedPresetUses(null);
        setCustomMaxUses(invite.maxUses);
        setIsCustomMaxUses(true);
      }
    }

    setInitialSettingsSnapshot({
      expiresAt: invite.expiresAt || null,
      maxUses: invite.maxUses ?? null,
    });
  };

  // 1. Initial Load & Sync
  useEffect(() => {
    let isMounted = true;
    if (visible && projectId) {
      if (!currentInviteUrl) {
        generateSecureToken().then((token: string) => {
          if (isMounted && !currentInviteUrl) {
            setCurrentRawToken(token);
            const { httpsUrl } = buildInviteUrls(token);
            setCurrentInviteUrl(httpsUrl);
          }
        });
      }

      setLoading(true);
      setStatusMessage(null);

      getActiveProjectInvite(projectId)
        .then(async (invite) => {
          if (!isMounted) return;
          if (invite) {
            hydrateFromInvite(invite);
            setLoading(false);
          } else {
            await handleCreateNewLink(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });

      // 2. Realtime listener for project_invites on this project
      const channel = supabase
        .channel(`invite-modal-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_invites',
            filter: `project_id=eq.${projectId}`,
          },
          (payload: any) => {
            if (!isMounted) return;
            if (payload.eventType === 'UPDATE') {
              const updatedRow = payload.new;
              if (updatedRow) {
                setActiveInvite((prev) => {
                  if (!prev || prev.id !== updatedRow.id) return prev;
                  return {
                    ...prev,
                    uses: updatedRow.uses,
                    maxUses: updatedRow.max_uses,
                    expiresAt: updatedRow.expires_at,
                    isActive: updatedRow.is_active,
                  };
                });
                if (updatedRow.is_active === false) {
                  setStatusMessage('Invite link was revoked.');
                }
              }
            } else if (payload.eventType === 'INSERT') {
              const newRow = payload.new;
              if (newRow && newRow.is_active) {
                setActiveInvite({
                  id: newRow.id,
                  projectId: newRow.project_id,
                  createdBy: newRow.created_by,
                  expiresAt: newRow.expires_at,
                  maxUses: newRow.max_uses,
                  uses: newRow.uses,
                  isActive: newRow.is_active,
                  createdAt: newRow.created_at,
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      };
    }
  }, [visible, projectId]);

  // Compute resolved target settings
  const computedExpiresAt = useMemo(() => {
    if (isCustomExpiration) return customExpiresAt;
    if (selectedPresetHours && selectedPresetHours > 0) {
      const d = new Date();
      d.setTime(d.getTime() + selectedPresetHours * 60 * 60 * 1000);
      return d.toISOString();
    }
    return null;
  }, [isCustomExpiration, customExpiresAt, selectedPresetHours]);

  const computedMaxUses = useMemo(() => {
    if (isCustomMaxUses) return customMaxUses;
    return selectedPresetUses;
  }, [isCustomMaxUses, customMaxUses, selectedPresetUses]);

  // Determine whether current settings differ from the active invite
  const hasUnsavedChanges = useMemo(() => {
    if (!activeInvite) return false;
    const currentExp = computedExpiresAt;
    const initialExp = initialSettingsSnapshot?.expiresAt;
    const currentUses = computedMaxUses;
    const initialUses = initialSettingsSnapshot?.maxUses;

    const expChanged = (currentExp || null) !== (initialExp || null);
    const usesChanged = (currentUses || null) !== (initialUses || null);
    return expChanged || usesChanged;
  }, [activeInvite, computedExpiresAt, computedMaxUses, initialSettingsSnapshot]);

  // Create brand new invite link with fresh token
  const handleCreateNewLink = async (explicit: boolean = true) => {
    if (!projectId) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await createProjectInvite(projectId, {
        expiresInHours: isCustomExpiration ? null : selectedPresetHours,
        expiresAt: isCustomExpiration ? customExpiresAt : null,
        maxUses: computedMaxUses,
      });

      if (res.error) {
        setStatusMessage(res.error);
      } else if (res.invite && res.rawToken) {
        hydrateFromInvite(res.invite);
        setShowConfig(false);
        if (explicit) {
          setStatusMessage('New invite link generated!');
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Error generating link');
    } finally {
      setLoading(false);
    }
  };

  // Save changes to existing active invite
  const handleSaveChanges = async () => {
    if (!projectId || !activeInvite) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await updateProjectInviteSettings(projectId, activeInvite.id, {
        expiresAt: computedExpiresAt,
        maxUses: computedMaxUses,
      });

      if (res.error) {
        setStatusMessage(res.error);
      } else if (res.invite) {
        setActiveInvite((prev) => (prev ? { ...prev, ...res.invite } : res.invite));
        setInitialSettingsSnapshot({
          expiresAt: res.invite.expiresAt || null,
          maxUses: res.invite.maxUses ?? null,
        });
        setStatusMessage('Invite settings updated!');
        setTimeout(() => setStatusMessage(null), 3000);
        setShowConfig(false);
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  // Revoke link
  const handleRevokeLink = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await revokeProjectInvite(projectId, activeInvite?.id);
      if (res.success) {
        setActiveInvite(null);
        setCurrentRawToken(null);
        setCurrentInviteUrl('');
        setStatusMessage('Invite link revoked.');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage(res.error || 'Failed to revoke invite');
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to revoke invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const textToCopy = currentInviteUrl || (currentRawToken ? buildInviteUrls(currentRawToken).httpsUrl : (inviteCode ? `trak://join/${inviteCode}` : ''));
    if (!textToCopy) return;
    try {
      await Clipboard.setStringAsync(textToCopy);
      setCopied(true);
      setStatusMessage('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage(null);
      }, 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    const url = currentInviteUrl || (currentRawToken ? buildInviteUrls(currentRawToken).httpsUrl : '');
    if (!url) return;
    try {
      await inviteService.shareInviteLink({
        url,
        projectName,
      });
    } catch {}
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      setStatusMessage('Code copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage(null);
      }, 2000);
    } catch {}
  };

  const handleClose = () => {
    setCopied(false);
    setStatusMessage(null);
    setShowConfig(false);
    onClose();
  };

  // ─── CUSTOM EXPIRATION PICKER HANDLERS ───
  const openCustomExpirationPicker = () => {
    triggerHaptic(10);
    const initialDate = customExpiresAt ? new Date(customExpiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    setPickerYear(initialDate.getFullYear());
    setPickerMonth(initialDate.getMonth());
    setPickerDay(initialDate.getDate());
    setPickerHour(initialDate.getHours());
    setPickerMinute(initialDate.getMinutes());
    setPickerError(null);
    setShowExpirationPicker(true);
  };

  const handleSetCustomExpiration = () => {
    const selected = new Date(pickerYear, pickerMonth, pickerDay, pickerHour, pickerMinute, 0);
    if (selected.getTime() <= Date.now()) {
      setPickerError('Expiration time must be in the future.');
      triggerHaptic(20);
      return;
    }
    triggerHaptic(15);
    setCustomExpiresAt(selected.toISOString());
    setIsCustomExpiration(true);
    setSelectedPresetHours(null);
    setShowExpirationPicker(false);
    setPickerError(null);
  };

  // ─── CUSTOM MAX USES PICKER HANDLERS ───
  const openCustomMaxUsesPicker = () => {
    triggerHaptic(10);
    setCustomUsesInput(customMaxUses ? String(customMaxUses) : '50');
    setCustomUsesError(null);
    setShowMaxUsesPicker(true);
  };

  const handleSetCustomMaxUses = () => {
    const trimmed = customUsesInput.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setCustomUsesError('Please enter a valid whole number (1 - 10,000).');
      triggerHaptic(20);
      return;
    }
    const val = parseInt(trimmed, 10);
    if (isNaN(val) || val < 1) {
      setCustomUsesError('Minimum uses must be at least 1.');
      triggerHaptic(20);
      return;
    }
    if (val > 10000) {
      setCustomUsesError('Maximum allowable limit is 10,000 uses.');
      triggerHaptic(20);
      return;
    }
    triggerHaptic(15);
    setCustomMaxUses(val);
    setIsCustomMaxUses(true);
    setSelectedPresetUses(null);
    setShowMaxUsesPicker(false);
    setCustomUsesError(null);
  };

  // Format custom expiration label for chip
  const formatCustomExpLabel = (isoStr: string | null) => {
    if (!isoStr) return 'Custom';
    try {
      const d = new Date(isoStr);
      const day = d.getDate();
      const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
      const year = d.getFullYear();
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return 'Custom';
    }
  };

  const qrValue = currentInviteUrl || (currentRawToken ? buildInviteUrls(currentRawToken).httpsUrl : (inviteCode ? `trak://join/${inviteCode}` : 'https://trak.app'));

  // Days in month calculation for custom date picker
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(pickerYear, pickerMonth, 1).getDay();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                  <Feather name="share-2" size={22} color={colors.primaryFixed} />
                </View>
                <Text style={[styles.title, { color: colors.onSurface }]}>Share Project</Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                  Invite teammates to collaborate in real-time on "{projectName}".
                </Text>
              </View>

              {/* Tab Selector */}
              <View style={[styles.tabContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <Pressable
                  style={[styles.tab, activeTab === 'link' && { backgroundColor: colors.primaryFixed }]}
                  onPress={() => setActiveTab('link')}
                >
                  <Feather name="link" size={13} color={activeTab === 'link' ? colors.onPrimaryFixed : colors.onSurfaceVariant} />
                  <Text style={[styles.tabText, { color: activeTab === 'link' ? colors.onPrimaryFixed : colors.onSurfaceVariant }]}>
                    Invite Link
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.tab, activeTab === 'qr' && { backgroundColor: colors.primaryFixed }]}
                  onPress={() => setActiveTab('qr')}
                >
                  <Feather name="maximize" size={13} color={activeTab === 'qr' ? colors.onPrimaryFixed : colors.onSurfaceVariant} />
                  <Text style={[styles.tabText, { color: activeTab === 'qr' ? colors.onPrimaryFixed : colors.onSurfaceVariant }]}>
                    QR Code
                  </Text>
                </Pressable>

                {inviteCode && (
                  <Pressable
                    style={[styles.tab, activeTab === 'code' && { backgroundColor: colors.primaryFixed }]}
                    onPress={() => setActiveTab('code')}
                  >
                    <Feather name="hash" size={13} color={activeTab === 'code' ? colors.onPrimaryFixed : colors.onSurfaceVariant} />
                    <Text style={[styles.tabText, { color: activeTab === 'code' ? colors.onPrimaryFixed : colors.onSurfaceVariant }]}>
                      Code
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Status Notice */}
              {statusMessage && (
                <View style={[styles.noticeBanner, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}33` }]}>
                  <Feather name="info" size={13} color={colors.primaryFixed} />
                  <Text style={[styles.noticeText, { color: colors.primaryFixed }]}>{statusMessage}</Text>
                </View>
              )}

              {/* Content Scroll View */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
                {/* ── 1. LINK TAB ── */}
                {activeTab === 'link' && (
                  <View style={styles.tabBody}>
                    {currentInviteUrl || activeInvite ? (
                      <>
                        {/* Link Box */}
                        <View style={[styles.urlContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}30` }]}>
                          <Feather name="globe" size={16} color={colors.primaryFixed} />
                          <Text style={[styles.urlText, { color: colors.onSurface }]} numberOfLines={1} ellipsizeMode="middle">
                            {currentInviteUrl || (activeInvite ? 'Active invite link generated' : 'Generating...')}
                          </Text>
                        </View>

                        {/* Action Buttons Row: Copy Link & Share */}
                        <View style={styles.buttonRow}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.actionBtn,
                              { backgroundColor: colors.primaryFixed },
                              pressed && { opacity: 0.85 },
                            ]}
                            onPress={handleCopyLink}
                          >
                            <Feather name={copied ? 'check' : 'copy'} size={15} color={colors.onPrimaryFixed} />
                            <Text style={[styles.actionBtnText, { color: colors.onPrimaryFixed }]}>
                              {copied ? 'Link Copied!' : 'Copy Link'}
                            </Text>
                          </Pressable>

                          <Pressable
                            style={({ pressed }) => [
                              styles.actionBtnSecondary,
                              { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                              pressed && { opacity: 0.85 },
                            ]}
                            onPress={handleNativeShare}
                          >
                            <Feather name="share" size={15} color={colors.onSurface} />
                            <Text style={[styles.actionBtnTextSecondary, { color: colors.onSurface }]}>
                              Share
                            </Text>
                          </Pressable>
                        </View>

                        {/* Link Metadata Chips */}
                        <View style={[styles.metaCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                          <View style={styles.metaRow}>
                            <View style={styles.metaLabelGroup}>
                              <Feather name="clock" size={13} color={colors.onSurfaceVariant} />
                              <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Link Expiration:</Text>
                            </View>
                            <Text style={[styles.metaVal, { color: colors.onSurface }]}>
                              {activeInvite?.expiresAt
                                ? new Date(activeInvite.expiresAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Never'}
                            </Text>
                          </View>

                          <View style={styles.metaRow}>
                            <View style={styles.metaLabelGroup}>
                              <Feather name="users" size={13} color={colors.onSurfaceVariant} />
                              <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Usage Limit:</Text>
                            </View>
                            <Text style={[styles.metaVal, { color: colors.onSurface }]}>
                              {activeInvite?.maxUses
                                ? `${activeInvite.uses || 0} / ${activeInvite.maxUses} uses`
                                : `${activeInvite?.uses || 0} (Unlimited)`}
                            </Text>
                          </View>
                        </View>

                        {/* Toggle Link Options */}
                        <Pressable
                          style={styles.toggleConfigBtn}
                          onPress={() => setShowConfig(!showConfig)}
                        >
                          <Feather name={showConfig ? 'chevron-up' : 'settings'} size={14} color={colors.primaryFixed} />
                          <Text style={[styles.toggleConfigText, { color: colors.primaryFixed }]}>
                            {showConfig ? 'Hide Link Options' : 'Configure Link Settings'}
                          </Text>
                        </Pressable>

                        {/* Link Config Selector Form */}
                        {showConfig && (
                          <View style={[styles.configPanel, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                            {/* Expiration Picker */}
                            <Text style={[styles.configSectionTitle, { color: colors.onSurface }]}>Expiration</Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.horizontalChipsList}
                            >
                              {EXPIRATION_PRESETS.map((opt) => {
                                const isSelected = !isCustomExpiration && selectedPresetHours === opt.hours;
                                return (
                                  <Pressable
                                    key={opt.label}
                                    style={[
                                      styles.horizontalChip,
                                      { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                      isSelected && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                    ]}
                                    onPress={() => {
                                      triggerHaptic(10);
                                      setSelectedPresetHours(opt.hours);
                                      setIsCustomExpiration(false);
                                      setCustomExpiresAt(null);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.chipText,
                                        { color: colors.onSurfaceVariant },
                                        isSelected && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                      ]}
                                    >
                                      {opt.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}

                              {/* Custom Expiration Button */}
                              <Pressable
                                style={[
                                  styles.horizontalChip,
                                  styles.customChip,
                                  { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                  isCustomExpiration && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                ]}
                                onPress={openCustomExpirationPicker}
                              >
                                <Feather name="calendar" size={12} color={isCustomExpiration ? colors.primaryFixed : colors.onSurfaceVariant} />
                                <View>
                                  <Text
                                    style={[
                                      styles.chipText,
                                      { color: colors.onSurfaceVariant },
                                      isCustomExpiration && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                    ]}
                                  >
                                    {isCustomExpiration ? 'Custom' : 'Custom →'}
                                  </Text>
                                  {isCustomExpiration && customExpiresAt && (
                                    <Text style={[styles.customChipSubtitle, { color: colors.primaryFixed }]} numberOfLines={1}>
                                      {formatCustomExpLabel(customExpiresAt)}
                                    </Text>
                                  )}
                                </View>
                              </Pressable>
                            </ScrollView>

                            {/* Max Uses Picker */}
                            <Text style={[styles.configSectionTitle, { color: colors.onSurface, marginTop: 14 }]}>Maximum Uses</Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.horizontalChipsList}
                            >
                              {MAX_USES_PRESETS.map((opt) => {
                                const isSelected = !isCustomMaxUses && selectedPresetUses === opt.uses;
                                return (
                                  <Pressable
                                    key={opt.label}
                                    style={[
                                      styles.horizontalChip,
                                      { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                      isSelected && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                    ]}
                                    onPress={() => {
                                      triggerHaptic(10);
                                      setSelectedPresetUses(opt.uses);
                                      setIsCustomMaxUses(false);
                                      setCustomMaxUses(null);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.chipText,
                                        { color: colors.onSurfaceVariant },
                                        isSelected && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                      ]}
                                    >
                                      {opt.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}

                              {/* Custom Max Uses Button */}
                              <Pressable
                                style={[
                                  styles.horizontalChip,
                                  styles.customChip,
                                  { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                  isCustomMaxUses && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                ]}
                                onPress={openCustomMaxUsesPicker}
                              >
                                <Feather name="hash" size={12} color={isCustomMaxUses ? colors.primaryFixed : colors.onSurfaceVariant} />
                                <View>
                                  <Text
                                    style={[
                                      styles.chipText,
                                      { color: colors.onSurfaceVariant },
                                      isCustomMaxUses && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                    ]}
                                  >
                                    {isCustomMaxUses ? 'Custom' : 'Custom →'}
                                  </Text>
                                  {isCustomMaxUses && customMaxUses !== null && (
                                    <Text style={[styles.customChipSubtitle, { color: colors.primaryFixed }]}>
                                      {customMaxUses} Uses
                                    </Text>
                                  )}
                                </View>
                              </Pressable>
                            </ScrollView>

                            {/* Action Buttons: Save Changes vs Generate New Link */}
                            <View style={styles.configActionGroup}>
                              {activeInvite && hasUnsavedChanges && (
                                <Pressable
                                  style={({ pressed }) => [
                                    styles.saveChangesBtn,
                                    { backgroundColor: colors.primaryFixed },
                                    pressed && { opacity: 0.85 },
                                    loading && { opacity: 0.5 },
                                  ]}
                                  onPress={handleSaveChanges}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                                  ) : (
                                    <>
                                      <Feather name="check" size={14} color={colors.onPrimaryFixed} />
                                      <Text style={[styles.saveChangesText, { color: colors.onPrimaryFixed }]}>
                                        Save Changes to Active Link
                                      </Text>
                                    </>
                                  )}
                                </Pressable>
                              )}

                              <Pressable
                                style={({ pressed }) => [
                                  styles.regenerateConfirmBtn,
                                  {
                                    backgroundColor: hasUnsavedChanges ? colors.surfaceContainerHighest : colors.primaryFixed,
                                    borderColor: colors.glassBorder,
                                    borderWidth: hasUnsavedChanges ? 1 : 0,
                                  },
                                  pressed && { opacity: 0.85 },
                                  loading && { opacity: 0.5 },
                                ]}
                                onPress={() => handleCreateNewLink(true)}
                                disabled={loading}
                              >
                                {loading && !hasUnsavedChanges ? (
                                  <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                                ) : (
                                  <>
                                    <Feather
                                      name="refresh-cw"
                                      size={13}
                                      color={hasUnsavedChanges ? colors.onSurface : colors.onPrimaryFixed}
                                    />
                                    <Text
                                      style={[
                                        styles.regenerateConfirmText,
                                        { color: hasUnsavedChanges ? colors.onSurface : colors.onPrimaryFixed },
                                      ]}
                                    >
                                      Generate New Link
                                    </Text>
                                  </>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {/* Revoke & Regenerate Row */}
                        <View style={styles.manageRow}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.revokeBtn,
                              { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` },
                              pressed && { opacity: 0.8 },
                              loading && { opacity: 0.5 },
                            ]}
                            onPress={handleRevokeLink}
                            disabled={loading}
                          >
                            <Feather name="slash" size={13} color={colors.error} />
                            <Text style={[styles.revokeBtnText, { color: colors.error }]}>Revoke Link</Text>
                          </Pressable>

                          {!showConfig && (
                            <Pressable
                              style={({ pressed }) => [
                                styles.regenBtn,
                                { backgroundColor: `${colors.primaryFixed}10`, borderColor: `${colors.primaryFixed}30` },
                                pressed && { opacity: 0.8 },
                                loading && { opacity: 0.5 },
                              ]}
                              onPress={() => handleCreateNewLink(true)}
                              disabled={loading}
                            >
                              <Feather name="refresh-cw" size={13} color={colors.primaryFixed} />
                              <Text style={[styles.regenBtnText, { color: colors.primaryFixed }]}>Generate New Link</Text>
                            </Pressable>
                          )}
                        </View>
                      </>
                    ) : (
                      /* No Active Link State */
                      <View style={styles.emptyLinkState}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.generateMainBtn,
                            { backgroundColor: colors.primaryFixed },
                            pressed && { opacity: 0.85 },
                            loading && { opacity: 0.5 },
                          ]}
                          onPress={() => handleCreateNewLink(true)}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                          ) : (
                            <>
                              <Feather name="link-2" size={18} color={colors.onPrimaryFixed} />
                              <Text style={[styles.generateMainBtnText, { color: colors.onPrimaryFixed }]}>
                                Create Invite Link
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}

                {/* ── 2. QR CODE TAB ── */}
                {activeTab === 'qr' && (
                  <View style={styles.tabBody}>
                    <View style={styles.qrContainer}>
                      <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF', borderColor: `${colors.primaryFixed}30` }]}>
                        <QRCode
                          value={qrValue}
                          size={175}
                          color="#0B0F17"
                          backgroundColor="#FFFFFF"
                          ecl="M"
                        />
                      </View>
                      <Text style={[styles.qrHintText, { color: colors.onSurfaceVariant }]}>
                        Scan with device camera to join "{projectName}"
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: colors.primaryFixed, marginTop: 10, width: '100%' },
                          pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleCopyLink}
                      >
                        <Feather name={copied ? 'check' : 'copy'} size={15} color={colors.onPrimaryFixed} />
                        <Text style={[styles.actionBtnText, { color: colors.onPrimaryFixed }]}>
                          {copied ? 'Link Copied!' : 'Copy Link'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── 3. CODE TAB ── */}
                {activeTab === 'code' && (
                  <View style={styles.tabBody}>
                    {inviteCode ? (
                      <View>
                        <View style={[styles.codeContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}30` }]}>
                          <Text style={[styles.codeText, { color: colors.primaryFixed }]}>{inviteCode}</Text>
                          <Pressable
                            style={({ pressed }) => [
                              styles.copySmallBtn,
                              { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                              pressed && { opacity: 0.7 },
                              copied && { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` },
                            ]}
                            onPress={handleCopyCode}
                          >
                            <Feather name={copied ? 'check' : 'copy'} size={15} color={copied ? colors.primaryFixed : colors.onSurfaceVariant} />
                            <Text style={[styles.copySmallText, { color: copied ? colors.primaryFixed : colors.onSurfaceVariant }]}>
                              {copied ? 'Copied' : 'Copy'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.generateMainBtn,
                          { backgroundColor: colors.primaryFixed },
                          pressed && { opacity: 0.85 },
                          isGenerating && { opacity: 0.5 },
                        ]}
                        onPress={onGenerate}
                        disabled={isGenerating}
                      >
                        <Feather name="zap" size={16} color={colors.onPrimaryFixed} />
                        <Text style={[styles.generateMainBtnText, { color: colors.onPrimaryFixed }]}>
                          {isGenerating ? 'Generating...' : 'Generate Invite Code'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <Pressable
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.closeBtnText, { color: colors.onSurfaceVariant }]}>Done</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* ── 📅 SUB-MODAL: CUSTOM EXPIRATION PICKER ── */}
      <Modal
        transparent
        animationType="fade"
        visible={showExpirationPicker}
        onRequestClose={() => setShowExpirationPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.subModalOverlay}
        >
          <Pressable
            style={styles.subModalBackdrop}
            onPress={() => setShowExpirationPicker(false)}
          >
            <Pressable
              style={[styles.pickerCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.pickerHeader}>
                <View style={[styles.pickerIconWrap, { backgroundColor: `${colors.primaryFixed}15` }]}>
                  <Feather name="calendar" size={16} color={colors.primaryFixed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: colors.onSurface }]}>Custom Expiration</Text>
                  <Text style={[styles.pickerSubtitle, { color: colors.onSurfaceVariant }]}>
                    Choose an exact date & time for link expiration
                  </Text>
                </View>
              </View>

              {pickerError && (
                <View style={[styles.pickerErrorBanner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.pickerErrorText, { color: colors.error }]}>{pickerError}</Text>
                </View>
              )}

              {/* Month Selector */}
              <View style={styles.monthNavRow}>
                <Pressable
                  style={styles.monthNavBtn}
                  onPress={() => {
                    triggerHaptic(10);
                    if (pickerMonth === 0) {
                      setPickerMonth(11);
                      setPickerYear((y) => y - 1);
                    } else {
                      setPickerMonth((m) => m - 1);
                    }
                  }}
                >
                  <Feather name="chevron-left" size={18} color={colors.onSurface} />
                </Pressable>
                <Text style={[styles.monthNavText, { color: colors.onSurface }]}>
                  {MONTH_NAMES[pickerMonth]} {pickerYear}
                </Text>
                <Pressable
                  style={styles.monthNavBtn}
                  onPress={() => {
                    triggerHaptic(10);
                    if (pickerMonth === 11) {
                      setPickerMonth(0);
                      setPickerYear((y) => y + 1);
                    } else {
                      setPickerMonth((m) => m + 1);
                    }
                  }}
                >
                  <Feather name="chevron-right" size={18} color={colors.onSurface} />
                </Pressable>
              </View>

              {/* Days Header */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={[styles.weekdayText, { color: colors.onSurfaceVariant }]}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.calendarGrid}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.calendarCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = pickerDay === dayNum;
                  return (
                    <Pressable
                      key={`day-${dayNum}`}
                      style={[
                        styles.calendarCell,
                        isSelected && [styles.calendarCellSelected, { backgroundColor: colors.primaryFixed }],
                      ]}
                      onPress={() => {
                        triggerHaptic(10);
                        setPickerDay(dayNum);
                      }}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { color: colors.onSurface },
                          isSelected && { color: colors.onPrimaryFixed, fontFamily: 'Inter_700Bold' },
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time Selector */}
              <View style={[styles.timeSelectorCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <Feather name="clock" size={15} color={colors.primaryFixed} />
                <Text style={[styles.timeLabel, { color: colors.onSurface }]}>Time:</Text>
                <View style={styles.timeInputsRow}>
                  <TextInput
                    style={[styles.timeInput, { color: colors.onSurface, borderColor: colors.glassBorder }]}
                    value={String(pickerHour).padStart(2, '0')}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 0 && num <= 23) setPickerHour(num);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={[styles.timeColon, { color: colors.onSurface }]}>:</Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.onSurface, borderColor: colors.glassBorder }]}
                    value={String(pickerMinute).padStart(2, '0')}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 0 && num <= 59) setPickerMinute(num);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={[styles.timeFormatHint, { color: colors.onSurfaceVariant }]}>
                    ({pickerHour >= 12 ? `${pickerHour % 12 || 12}:${String(pickerMinute).padStart(2, '0')} PM` : `${pickerHour || 12}:${String(pickerMinute).padStart(2, '0')} AM`})
                  </Text>
                </View>
              </View>

              {/* Picker Actions */}
              <View style={styles.pickerActionsRow}>
                <Pressable
                  style={[styles.pickerCancelBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                  onPress={() => setShowExpirationPicker(false)}
                >
                  <Text style={[styles.pickerCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.pickerConfirmBtn, { backgroundColor: colors.primaryFixed }]}
                  onPress={handleSetCustomExpiration}
                >
                  <Feather name="check" size={15} color={colors.onPrimaryFixed} />
                  <Text style={[styles.pickerConfirmText, { color: colors.onPrimaryFixed }]}>Set Expiration</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 🔢 SUB-MODAL: CUSTOM MAXIMUM USES ── */}
      <Modal
        transparent
        animationType="fade"
        visible={showMaxUsesPicker}
        onRequestClose={() => setShowMaxUsesPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.subModalOverlay}
        >
          <Pressable
            style={styles.subModalBackdrop}
            onPress={() => setShowMaxUsesPicker(false)}
          >
            <Pressable
              style={[styles.pickerCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.pickerHeader}>
                <View style={[styles.pickerIconWrap, { backgroundColor: `${colors.primaryFixed}15` }]}>
                  <Feather name="users" size={16} color={colors.primaryFixed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: colors.onSurface }]}>Custom Maximum Uses</Text>
                  <Text style={[styles.pickerSubtitle, { color: colors.onSurfaceVariant }]}>
                    Set how many times this invite link can be accepted
                  </Text>
                </View>
              </View>

              {customUsesError && (
                <View style={[styles.pickerErrorBanner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.pickerErrorText, { color: colors.error }]}>{customUsesError}</Text>
                </View>
              )}

              <View style={styles.customUsesInputWrapper}>
                <TextInput
                  style={[
                    styles.customUsesInput,
                    {
                      color: colors.onSurface,
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                  placeholder="e.g. 50"
                  placeholderTextColor={`${colors.onSurfaceVariant}60`}
                  keyboardType="number-pad"
                  value={customUsesInput}
                  onChangeText={(val) => {
                    setCustomUsesInput(val);
                    if (customUsesError) setCustomUsesError(null);
                  }}
                  autoFocus
                  maxLength={5}
                />
                <Text style={[styles.customUsesHint, { color: colors.onSurfaceVariant }]}>
                  Enter an integer between 1 and 10,000 uses.
                </Text>
              </View>

              {/* Picker Actions */}
              <View style={styles.pickerActionsRow}>
                <Pressable
                  style={[styles.pickerCancelBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                  onPress={() => setShowMaxUsesPicker(false)}
                >
                  <Text style={[styles.pickerCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.pickerConfirmBtn, { backgroundColor: colors.primaryFixed }]}
                  onPress={handleSetCustomMaxUses}
                >
                  <Feather name="check" size={15} color={colors.onPrimaryFixed} />
                  <Text style={[styles.pickerConfirmText, { color: colors.onPrimaryFixed }]}>Set Limit</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  scrollArea: {
    maxHeight: 380,
  },
  tabBody: {
    paddingVertical: 4,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  urlText: {
    flex: 1,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  actionBtnSecondary: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnTextSecondary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  metaCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  metaVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  toggleConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  toggleConfigText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  configPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  configSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalChipsList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  horizontalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customChip: {
    flexDirection: 'row',
    gap: 6,
    minWidth: 90,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  customChipSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    marginTop: 2,
  },
  configActionGroup: {
    gap: 8,
    marginTop: 14,
  },
  saveChangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveChangesText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  regenerateConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  regenerateConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  manageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  revokeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  revokeBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  regenBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  regenBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  emptyLinkState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateMainBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateMainBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  qrHintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 20,
    letterSpacing: 3,
  },
  copySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copySmallText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  closeBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  closeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  // ─── SUB-MODAL STYLES ───
  subModalOverlay: {
    flex: 1,
  },
  subModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  pickerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  pickerErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerErrorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    flex: 1,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  monthNavBtn: {
    padding: 6,
  },
  monthNavText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  weekdayText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  calendarCellSelected: {
    borderRadius: 8,
  },
  calendarDayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  timeSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  timeInput: {
    width: 36,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 13,
    padding: 0,
  },
  timeColon: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 14,
  },
  timeFormatHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginLeft: 4,
  },
  customUsesInputWrapper: {
    paddingVertical: 6,
    gap: 6,
  },
  customUsesInput: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 16,
  },
  customUsesHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pickerCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerCancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pickerConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickerConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
