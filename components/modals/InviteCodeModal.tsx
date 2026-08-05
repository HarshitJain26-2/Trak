import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';

interface InviteCodeModalProps {
  visible: boolean;
  inviteCode: string | null;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

export function InviteCodeModal({
  visible,
  inviteCode,
  isGenerating,
  onClose,
  onGenerate,
}: InviteCodeModalProps) {
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — user can manually copy
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                  <Feather name="link" size={22} color={colors.primaryFixed} />
                </View>
                <Text style={[styles.title, { color: colors.onSurface }]}>Invite to Project</Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                  Share this code with your teammates so they can join your project.
                </Text>
              </View>

              {/* Code display */}
              {inviteCode ? (
                <View>
                  <View style={[styles.codeContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}30` }]}>
                    <Text style={[styles.codeText, { color: colors.primaryFixed }]}>{inviteCode}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.copyBtn,
                        { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.glassBorder },
                        pressed && styles.copyBtnPressed,
                        copied && { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` },
                      ]}
                      onPress={handleCopy}
                    >
                      <Feather
                        name={copied ? 'check' : 'copy'}
                        size={16}
                        color={copied ? colors.primaryFixed : colors.onSurfaceVariant}
                      />
                      <Text style={[styles.copyBtnText, { color: colors.onSurfaceVariant }, copied && { color: colors.primaryFixed }]}>
                        {copied ? 'Copied!' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.regenerateBtn,
                      { backgroundColor: `${colors.primaryFixed}10`, borderColor: `${colors.primaryFixed}30` },
                      pressed && styles.regenerateBtnPressed,
                      isGenerating && styles.regenerateBtnDisabled,
                    ]}
                    onPress={onGenerate}
                    disabled={isGenerating}
                  >
                    <Feather name="refresh-cw" size={14} color={colors.primaryFixed} />
                    <Text style={[styles.regenerateBtnText, { color: colors.primaryFixed }]}>
                      {isGenerating ? 'Regenerating...' : 'Change Code'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.generateBtn,
                    { backgroundColor: colors.primaryFixed },
                    pressed && styles.generateBtnPressed,
                    isGenerating && styles.generateBtnDisabled,
                  ]}
                  onPress={onGenerate}
                  disabled={isGenerating}
                >
                  <Feather name="zap" size={18} color={colors.onPrimaryFixed} />
                  <Text style={[styles.generateBtnText, { color: colors.onPrimaryFixed }]}>
                    {isGenerating ? 'Generating...' : 'Generate Invite Code'}
                  </Text>
                </Pressable>
              )}

              {/* Info */}
              <View style={styles.infoRow}>
                <Feather name="info" size={14} color={`${colors.onSurfaceVariant}60`} />
                <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                  Anyone with this code can join your project and collaborate on features.
                </Text>
              </View>

              {/* Close */}
              <Pressable
                style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }, pressed && styles.closeBtnPressed]}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1F2B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onSurface,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}30`,
    marginBottom: 16,
  },
  codeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 22,
    color: Colors.primaryFixed,
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: `${Colors.surfaceContainerHighest}`,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  copyBtnPressed: {
    opacity: 0.7,
  },
  copyBtnCopied: {
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderColor: `${Colors.primaryFixed}30`,
  },
  copyBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  copyBtnTextCopied: {
    color: Colors.primaryFixed,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primaryFixed,
    marginBottom: 16,
  },
  generateBtnPressed: {
    opacity: 0.85,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.onPrimaryFixed,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}60`,
    lineHeight: 17,
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  closeBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    marginBottom: 16,
  },
  regenerateBtnPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  regenerateBtnDisabled: {
    opacity: 0.5,
  },
  regenerateBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.primaryFixed,
  },
});
