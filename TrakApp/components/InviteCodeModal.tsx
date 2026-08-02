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
import { Colors } from '../constants/colors';

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
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Feather name="link" size={22} color={Colors.primaryFixed} />
                </View>
                <Text style={styles.title}>Invite to Project</Text>
                <Text style={styles.subtitle}>
                  Share this code with your teammates so they can join your project.
                </Text>
              </View>

              {/* Code display */}
              {inviteCode ? (
                <View>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{inviteCode}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.copyBtn,
                        pressed && styles.copyBtnPressed,
                        copied && styles.copyBtnCopied,
                      ]}
                      onPress={handleCopy}
                    >
                      <Feather
                        name={copied ? 'check' : 'copy'}
                        size={16}
                        color={copied ? Colors.primaryFixed : Colors.onSurfaceVariant}
                      />
                      <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
                        {copied ? 'Copied!' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.regenerateBtn,
                      pressed && styles.regenerateBtnPressed,
                      isGenerating && styles.regenerateBtnDisabled,
                    ]}
                    onPress={onGenerate}
                    disabled={isGenerating}
                  >
                    <Feather name="refresh-cw" size={14} color={Colors.primaryFixed} />
                    <Text style={styles.regenerateBtnText}>
                      {isGenerating ? 'Regenerating...' : 'Change Code'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.generateBtn,
                    pressed && styles.generateBtnPressed,
                    isGenerating && styles.generateBtnDisabled,
                  ]}
                  onPress={onGenerate}
                  disabled={isGenerating}
                >
                  <Feather name="zap" size={18} color={Colors.onPrimaryFixed} />
                  <Text style={styles.generateBtnText}>
                    {isGenerating ? 'Generating...' : 'Generate Invite Code'}
                  </Text>
                </Pressable>
              )}

              {/* Info */}
              <View style={styles.infoRow}>
                <Feather name="info" size={14} color={`${Colors.onSurfaceVariant}60`} />
                <Text style={styles.infoText}>
                  Anyone with this code can join your project and collaborate on features.
                </Text>
              </View>

              {/* Close */}
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                onPress={handleClose}
              >
                <Text style={styles.closeBtnText}>Done</Text>
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
