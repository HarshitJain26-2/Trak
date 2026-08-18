import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';
import QRCode from 'react-native-qrcode-svg';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectInvite, inviteService, buildInviteUrls, generateSecureToken } from '@/services/inviteService';

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

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: null },
  { label: '1 Hour', value: 1 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
  { label: '30 Days', value: 720 },
];

const MAX_USES_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '1 Use', value: 1 },
  { label: '5 Uses', value: 5 },
  { label: '10 Uses', value: 10 },
  { label: '25 Uses', value: 25 },
];

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
  const { createProjectInvite, revokeProjectInvite, getActiveProjectInvite, generateInviteCode } = useProjectStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('link');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeInvite, setActiveInvite] = useState<ProjectInvite | null>(null);
  const [currentRawToken, setCurrentRawToken] = useState<string | null>(null);
  const [currentInviteUrl, setCurrentInviteUrl] = useState<string>('');

  // Creation configs
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load existing active invite or generate immediately when modal becomes visible
  useEffect(() => {
    let isMounted = true;
    if (visible && projectId) {
      // 1. Immediately create an instant client-side token so [ Copy Link ] is visible with zero delay
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

      // 2. Fetch or sync active invite from backend
      getActiveProjectInvite(projectId)
        .then(async (invite) => {
          if (!isMounted) return;
          if (invite) {
            setActiveInvite(invite);
            if (invite.rawToken) {
              setCurrentRawToken(invite.rawToken);
              const { httpsUrl } = buildInviteUrls(invite.rawToken);
              setCurrentInviteUrl(httpsUrl);
            }
            setLoading(false);
          } else {
            // Register active invite in database
            await handleCreateNewLink(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [visible, projectId]);

  const handleCreateNewLink = async (explicit: boolean = true) => {
    if (!projectId) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await createProjectInvite(projectId, {
        expiresInHours,
        maxUses,
      });

      if (res.error) {
        // If RPC isn't in database yet or returns error, inform user
        if (res.error.includes('Could not find the function') || res.error.includes('PGRST202')) {
          setStatusMessage('Notice: Run migration 00015 in Supabase SQL Editor to enable cloud link validation.');
        } else {
          setStatusMessage(res.error);
        }
      } else if (res.invite && res.rawToken) {
        setActiveInvite(res.invite);
        setCurrentRawToken(res.rawToken);
        const { httpsUrl } = buildInviteUrls(res.rawToken);
        setCurrentInviteUrl(httpsUrl);
        setShowConfig(false);
        if (explicit) {
          setStatusMessage('New invite link generated!');
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Generated offline invite link');
    } finally {
      setLoading(false);
    }
  };

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

  const qrValue = currentInviteUrl || (currentRawToken ? buildInviteUrls(currentRawToken).httpsUrl : (inviteCode ? `trak://join/${inviteCode}` : 'https://trak.app'));

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
                            {showConfig ? 'Hide Link Options' : 'Configure New Link Settings'}
                          </Text>
                        </Pressable>

                        {/* Link Config Selector Form */}
                        {showConfig && (
                          <View style={[styles.configPanel, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                            {/* Expiration Picker */}
                            <Text style={[styles.configSectionTitle, { color: colors.onSurface }]}>Expiration</Text>
                            <View style={styles.chipGrid}>
                              {EXPIRATION_OPTIONS.map((opt) => (
                                <Pressable
                                  key={opt.label}
                                  style={[
                                    styles.chip,
                                    { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                    expiresInHours === opt.value && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                  ]}
                                  onPress={() => setExpiresInHours(opt.value)}
                                >
                                  <Text
                                    style={[
                                      styles.chipText,
                                      { color: colors.onSurfaceVariant },
                                      expiresInHours === opt.value && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>

                            {/* Max Uses Picker */}
                            <Text style={[styles.configSectionTitle, { color: colors.onSurface, marginTop: 12 }]}>Maximum Uses</Text>
                            <View style={styles.chipGrid}>
                              {MAX_USES_OPTIONS.map((opt) => (
                                <Pressable
                                  key={opt.label}
                                  style={[
                                    styles.chip,
                                    { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                                    maxUses === opt.value && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                                  ]}
                                  onPress={() => setMaxUses(opt.value)}
                                >
                                  <Text
                                    style={[
                                      styles.chipText,
                                      { color: colors.onSurfaceVariant },
                                      maxUses === opt.value && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>

                            <Pressable
                              style={({ pressed }) => [
                                styles.regenerateConfirmBtn,
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
                                  <Feather name="refresh-cw" size={14} color={colors.onPrimaryFixed} />
                                  <Text style={[styles.regenerateConfirmText, { color: colors.onPrimaryFixed }]}>
                                    Generate Link with Settings
                                  </Text>
                                </>
                              )}
                            </Pressable>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 22,
    padding: 22,
    maxHeight: '90%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  urlText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    flex: 1,
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
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnTextSecondary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  metaCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
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
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  metaVal: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
  },
  toggleConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 10,
  },
  toggleConfigText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  configPanel: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  configSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  regenerateConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  regenerateConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  revokeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  revokeBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  regenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  regenBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  emptyLinkState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  generateMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  generateMainBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  qrWrapper: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  qrHintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    letterSpacing: 2,
  },
  copySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  closeBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
