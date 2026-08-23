import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '@/constants/colors';
import { Project } from '@/store/useProjectStore';
import { triggerHaptic } from '@/utils/haptics';

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
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    try {
      triggerHaptic(20);
      await Share.share({
        title: `Join ${project.name} on Trak`,
        message: `Join my project "${project.name}" on Trak using project code: ${joinCode}`,
      });
    } catch (_) {}
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
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

                  {/* Actions: Copy & Share */}
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={handleCopy}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          backgroundColor: copied
                            ? `${colors.primaryFixed}25`
                            : colors.surfaceContainerHighest,
                        },
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
                          styles.actionBtnText,
                          { color: copied ? colors.primaryFixed : colors.onSurface },
                        ]}
                      >
                        {copied ? 'Copied!' : 'Copy Code'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleShare}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { backgroundColor: colors.surfaceContainerHighest },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Feather name="share-2" size={16} color={colors.primaryFixed} />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: colors.primaryFixed },
                        ]}
                      >
                        Share
                      </Text>
                    </Pressable>
                  </View>
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
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  actionBtnText: {
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
});
