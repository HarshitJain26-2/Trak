import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface JoinProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<{ success: boolean; projectName?: string; error?: string }>;
}

export function JoinProjectModal({ visible, onClose, onJoin }: JoinProjectModalProps) {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [result, setResult] = useState<{ success: boolean; projectName?: string; error?: string } | null>(null);

  const handleClose = () => {
    setCode('');
    setResult(null);
    setIsJoining(false);
    onClose();
  };

  const handleJoin = async () => {
    if (code.trim().length === 0 || isJoining) return;
    setIsJoining(true);
    setResult(null);

    const res = await onJoin(code.trim());
    setResult(res);
    setIsJoining(false);

    if (res.success) {
      // Auto-close after success
      setTimeout(handleClose, 1500);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconCircle}>
                    <Feather name="user-plus" size={22} color={Colors.secondaryContainer} />
                  </View>
                  <Text style={styles.title}>Join a Project</Text>
                  <Text style={styles.subtitle}>
                    Enter the invite code shared by a project owner to start collaborating.
                  </Text>
                </View>

                {/* Code input */}
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.toUpperCase());
                    setResult(null);
                  }}
                  placeholder="e.g. TRK-A4F9"
                  placeholderTextColor={`${Colors.onSurfaceVariant}40`}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={handleJoin}
                  selectionColor={Colors.primaryFixed}
                  editable={!isJoining}
                />

                {/* Result feedback */}
                {result && (
                  <View
                    style={[
                      styles.resultRow,
                      result.success ? styles.resultSuccess : styles.resultError,
                    ]}
                  >
                    <Feather
                      name={result.success ? 'check-circle' : 'alert-circle'}
                      size={16}
                      color={result.success ? Colors.primaryFixed : Colors.error}
                    />
                    <Text
                      style={[
                        styles.resultText,
                        { color: result.success ? Colors.primaryFixed : Colors.error },
                      ]}
                    >
                      {result.success
                        ? `Joined "${result.projectName}" successfully!`
                        : result.error || 'Failed to join project'}
                    </Text>
                  </View>
                )}

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnCancel,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={handleClose}
                  >
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnConfirm,
                      pressed && styles.btnPressed,
                      (code.trim().length === 0 || isJoining) && styles.btnDisabled,
                    ]}
                    onPress={handleJoin}
                    disabled={code.trim().length === 0 || isJoining}
                  >
                    {isJoining ? (
                      <ActivityIndicator size="small" color={Colors.onPrimaryFixed} />
                    ) : (
                      <Text style={styles.btnConfirmText}>Join</Text>
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
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.secondaryContainer}1A`,
    borderWidth: 1,
    borderColor: `${Colors.secondaryContainer}30`,
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
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: Colors.onSurface,
    textAlign: 'center',
    letterSpacing: 3,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultSuccess: {
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}30`,
  },
  resultError: {
    backgroundColor: `${Colors.error}1A`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  resultText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btnConfirm: {
    backgroundColor: Colors.primaryFixed,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnCancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
  },
  btnConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.onPrimaryFixed,
  },
});
