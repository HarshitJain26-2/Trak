import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useProjectStore } from '@/store/useProjectStore';
import { triggerHaptic } from '@/utils/haptics';
import { QRScannerModal } from './QRScannerModal';

interface JoinProjectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const router = useRouter();
  const { joinProjectByCode } = useProjectStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  const [joinResult, setJoinResult] = useState<{
    status: 'joined' | 'already_member' | 'already_owner';
    projectId: string;
    message: string;
  } | null>(null);

  const handleTextChange = (text: string) => {
    let clean = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!clean.startsWith('TRK-') && clean.length > 0 && !'TRK-'.startsWith(clean)) {
      clean = 'TRK-' + clean.replace(/^TRK-?/, '');
    }
    setCode(clean);
    setErrorMsg('');
  };

  const handleJoin = async (targetCode?: string) => {
    const finalCode = (targetCode || code).trim().toUpperCase();
    setErrorMsg('');

    if (!finalCode) {
      setErrorMsg('Please enter a project code.');
      return;
    }

    if (!/^TRK-[A-Z0-9]{6}$/.test(finalCode)) {
      setErrorMsg('Enter a valid Trak project code (e.g. TRK-7K4P9Q).');
      return;
    }

    setLoading(true);
    try {
      const res = await joinProjectByCode(finalCode);
      if (res.success && res.projectId) {
        triggerHaptic(30);
        let msg = 'You have successfully joined the project!';
        if (res.status === 'already_owner') {
          msg = 'You are already the owner of this project.';
        } else if (res.status === 'already_member') {
          msg = 'You are already a member of this project.';
        }

        setJoinResult({
          status: res.status || 'joined',
          projectId: res.projectId,
          message: msg,
        });
      } else {
        setErrorMsg(res.error || 'Failed to join project.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to join project.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = () => {
    if (joinResult?.projectId) {
      const pId = joinResult.projectId;
      handleClose();
      router.push(`/project/${pId}`);
    }
  };

  const handleClose = () => {
    setCode('');
    setErrorMsg('');
    setJoinResult(null);
    onClose();
  };

  const handleQRScan = (scannedCode: string) => {
    setCode(scannedCode);
    void handleJoin(scannedCode);
  };

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardWrap}
            >
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
                        Join Project
                      </Text>
                      <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                        Enter the unique project code or scan the QR code shared by your project leader.
                      </Text>
                    </View>
                    <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
                      <Feather name="x" size={20} color={colors.onSurfaceVariant} />
                    </Pressable>
                  </View>

                  {joinResult ? (
                    /* Success / Already Member state */
                    <View style={styles.successBox}>
                      <View
                        style={[
                          styles.successIconWrap,
                          { backgroundColor: `${colors.primaryFixed}20` },
                        ]}
                      >
                        <Feather name="check-circle" size={40} color={colors.primaryFixed} />
                      </View>
                      <Text style={[styles.successTitle, { color: colors.onSurface }]}>
                        {joinResult.status === 'already_owner'
                          ? 'Project Owner'
                          : joinResult.status === 'already_member'
                          ? 'Already a Member'
                          : 'Joined Successfully'}
                      </Text>
                      <Text style={[styles.successMsg, { color: colors.onSurfaceVariant }]}>
                        {joinResult.message}
                      </Text>
                      <Pressable
                        onPress={handleOpenProject}
                        style={[styles.primaryBtn, { backgroundColor: colors.primaryFixed }]}
                      >
                        <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>
                          Open Project
                        </Text>
                        <Feather name="arrow-right" size={16} color={colors.onPrimaryFixed} />
                      </Pressable>
                    </View>
                  ) : (
                    /* Code entry form */
                    <View style={styles.form}>
                      <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>
                          PROJECT CODE
                        </Text>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: colors.surfaceContainerHigh,
                              borderColor: errorMsg ? colors.error : colors.glassBorder,
                            },
                          ]}
                        >
                          <Feather name="hash" size={18} color={colors.primaryFixed} style={{ marginRight: 10 }} />
                          <TextInput
                            style={[styles.input, { color: colors.onSurface }]}
                            placeholder="TRK-7K4P9Q"
                            placeholderTextColor={`${colors.onSurfaceVariant}60`}
                            value={code}
                            onChangeText={handleTextChange}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            maxLength={10}
                            selectionColor={colors.primaryFixed}
                          />
                          {code.length > 0 && (
                            <Pressable onPress={() => setCode('')} hitSlop={8}>
                              <Feather name="x-circle" size={16} color={colors.onSurfaceVariant} />
                            </Pressable>
                          )}
                        </View>
                        {errorMsg ? (
                          <Text style={[styles.errorText, { color: colors.error }]}>
                            {errorMsg}
                          </Text>
                        ) : null}
                      </View>

                      {/* Submit Action */}
                      <Pressable
                        onPress={() => handleJoin()}
                        disabled={loading}
                        style={({ pressed }) => [
                          styles.primaryBtn,
                          { backgroundColor: colors.primaryFixed },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        {loading ? (
                          <ActivityIndicator color={colors.onPrimaryFixed} size="small" />
                        ) : (
                          <>
                            <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>
                              Join Project
                            </Text>
                            <Feather name="arrow-right" size={16} color={colors.onPrimaryFixed} />
                          </>
                        )}
                      </Pressable>

                      {/* Divider */}
                      <View style={styles.dividerRow}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
                        <Text style={[styles.dividerText, { color: `${colors.onSurfaceVariant}70` }]}>
                          OR
                        </Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
                      </View>

                      {/* Scan QR Button */}
                      <Pressable
                        onPress={() => setScannerVisible(true)}
                        style={({ pressed }) => [
                          styles.qrScanBtn,
                          {
                            backgroundColor: colors.surfaceContainerHigh,
                            borderColor: colors.glassBorder,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Feather name="camera" size={18} color={colors.primaryFixed} style={{ marginRight: 8 }} />
                        <Text style={[styles.qrScanBtnText, { color: colors.onSurface }]}>
                          Scan QR Code
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* QR Scanner Viewfinder Modal */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleQRScan}
      />
    </>
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
  keyboardWrap: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    width: '100%',
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
    marginBottom: 20,
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
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  qrScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  qrScanBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  successIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  successMsg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
