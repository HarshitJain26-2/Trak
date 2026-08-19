import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '@/constants/colors';
import { Project, useProjectStore } from '@/store/useProjectStore';
import { triggerHaptic } from '@/utils/haptics';
import { useConfirmDialog, ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ProjectCodeModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
}

export const ProjectCodeModal: React.FC<ProjectCodeModalProps> = ({
  visible,
  project,
  onClose,
}) => {
  const colors = useThemeColors();
  const { regenerateJoinCode } = useProjectStore();
  const { dialogProps, ask, notify } = useConfirmDialog();

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!project) return null;

  const joinCode = project.joinCode || 'TRK-PENDING';

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(joinCode);
      triggerHaptic(20);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const handleRegenerate = async () => {
    const confirmed = await ask({
      title: 'Regenerate project code?',
      message: 'Anyone using the old code will no longer be able to join this project.',
      confirmLabel: 'Regenerate',
      destructive: true,
      icon: 'rotate-ccw',
    });

    if (!confirmed) return;

    setRegenerating(true);
    try {
      const res = await regenerateJoinCode(project.id);
      if (res.success) {
        triggerHaptic(25);
        notify({
          title: 'Code Regenerated',
          message: 'A new project code has been generated. The old code is now invalid.',
          icon: 'check-circle',
          confirmLabel: 'Done',
        });
      } else {
        notify({
          title: 'Regeneration Failed',
          message: res.error || 'Unable to regenerate code.',
          icon: 'alert-triangle',
          destructive: true,
          confirmLabel: 'OK',
        });
      }
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <ConfirmDialog {...dialogProps} />
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.onSurface }]}>
                    Add Members
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                    Invite teammates to collaborate on {project.name}.
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Join Code Card */}
                <View
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.codeLabel, { color: colors.onSurfaceVariant }]}>
                    PROJECT CODE
                  </Text>
                  <Text
                    style={[
                      styles.codeText,
                      { color: colors.primaryFixed },
                    ]}
                    selectable
                  >
                    {joinCode}
                  </Text>

                  <Pressable
                    onPress={handleCopy}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      { backgroundColor: copied ? `${colors.primaryFixed}25` : colors.surfaceContainerHighest },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Feather
                      name={copied ? 'check' : 'copy'}
                      size={16}
                      color={copied ? colors.primaryFixed : colors.onSurface}
                    />
                    <Text
                      style={[
                        styles.copyBtnText,
                        { color: copied ? colors.primaryFixed : colors.onSurface },
                      ]}
                    >
                      {copied ? 'Project code copied!' : 'Copy Code'}
                    </Text>
                  </Pressable>
                </View>

                {/* QR Code Card */}
                <View
                  style={[
                    styles.qrContainer,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.qrLabel, { color: colors.onSurfaceVariant }]}>
                    QR CODE
                  </Text>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={joinCode}
                      size={170}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      quietZone={10}
                    />
                  </View>
                  <Text style={[styles.qrHint, { color: colors.onSurfaceVariant }]}>
                    Scan this QR code to join.
                  </Text>
                </View>

                {/* Owner Action: Regenerate Code */}
                {!project.isShared && (
                  <Pressable
                    onPress={handleRegenerate}
                    disabled={regenerating}
                    style={({ pressed }) => [
                      styles.regenerateBtn,
                      { borderColor: `${colors.error}40` },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {regenerating ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Feather name="refresh-cw" size={14} color={colors.error} />
                        <Text style={[styles.regenerateText, { color: colors.error }]}>
                          Regenerate Code
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  codeBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  qrContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  qrLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  qrHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  regenerateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
