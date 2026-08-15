import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, useThemeColors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.65;

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}

export function QRScannerModal({ visible, onClose, onCodeScanned }: QRScannerModalProps) {
  const colors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Animated scan line
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  // Animated corner pulse
  const cornerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && !scanned) {
      // Continuous laser scan line animation
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      scanAnimation.start();

      // Corner pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerPulse, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(cornerPulse, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        scanAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [visible, scanned]);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setScanResult(null);
    }
  }, [visible]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Extract invite code from QR data
    // Supports formats: "trak://join/TRK-XXXX", "TRK-XXXX", or just the raw code
    let code = data.trim();

    if (code.startsWith('trak://join/')) {
      code = code.replace('trak://join/', '');
    } else if (code.startsWith('trak://')) {
      code = code.replace('trak://', '');
    }

    // Clean up the code
    code = code.trim().toUpperCase();

    if (!code || code.length < 3) {
      setScanResult({ success: false, message: 'Invalid QR code. Not a Trak invite.' });
      setTimeout(() => {
        setScanned(false);
        setScanResult(null);
      }, 2000);
      return;
    }

    onCodeScanned(code);
  };

  const handleClose = () => {
    setScanned(false);
    setScanResult(null);
    onClose();
  };

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-VIEWFINDER_SIZE / 2 + 10, VIEWFINDER_SIZE / 2 - 10],
  });

  // Permission not determined yet
  if (!permission) {
    return (
      <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={Colors.primaryFixed} />
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal transparent={false} animationType="slide" visible={visible} onRequestClose={handleClose}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.permissionCard}>
            <View style={[styles.permissionIconCircle, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
              <Feather name="camera-off" size={32} color={colors.primaryFixed} />
            </View>
            <Text style={[styles.permissionTitle, { color: colors.onSurface }]}>
              Camera Access Required
            </Text>
            <Text style={[styles.permissionSubtitle, { color: colors.onSurfaceVariant }]}>
              To scan QR codes and join projects, Trak needs access to your camera.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.permissionBtn,
                { backgroundColor: colors.primaryFixed },
                pressed && { opacity: 0.85 },
              ]}
              onPress={requestPermission}
            >
              <Feather name="camera" size={18} color={colors.onPrimaryFixed} />
              <Text style={[styles.permissionBtnText, { color: colors.onPrimaryFixed }]}>
                Grant Camera Access
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.permissionCancelBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleClose}
            >
              <Text style={[styles.permissionCancelText, { color: colors.onSurfaceVariant }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent={false} animationType="slide" visible={visible} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Camera */}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Dark overlay with cutout */}
        <View style={styles.overlayContainer}>
          {/* Top overlay */}
          <View style={styles.overlayTop} />

          {/* Middle row */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />

            {/* Viewfinder */}
            <Animated.View
              style={[
                styles.viewfinder,
                { transform: [{ scale: cornerPulse }] },
              ]}
            >
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Animated scan line */}
              {!scanned && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLineTranslateY }],
                    },
                  ]}
                />
              )}
            </Animated.View>

            <View style={styles.overlaySide} />
          </View>

          {/* Bottom overlay */}
          <View style={styles.overlayBottom} />
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={handleClose}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topBarTitle}>Scan QR Code</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Bottom info */}
        <View style={styles.bottomInfo}>
          {scanResult ? (
            <View
              style={[
                styles.resultBanner,
                scanResult.success
                  ? { backgroundColor: 'rgba(0,230,118,0.15)', borderColor: 'rgba(0,230,118,0.3)' }
                  : { backgroundColor: 'rgba(255,82,82,0.15)', borderColor: 'rgba(255,82,82,0.3)' },
              ]}
            >
              <Feather
                name={scanResult.success ? 'check-circle' : 'alert-circle'}
                size={18}
                color={scanResult.success ? '#00E676' : '#FF5252'}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: scanResult.success ? '#00E676' : '#FF5252' },
                ]}
              >
                {scanResult.message}
              </Text>
            </View>
          ) : (
            <View style={styles.hintContainer}>
              <View style={styles.hintIconRow}>
                <View style={styles.hintDot} />
                <Text style={styles.hintText}>
                  Point your camera at a Trak project QR code
                </Text>
              </View>
              <Text style={styles.hintSubtext}>
                The code will be detected automatically
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const OVERLAY_COLOR = 'rgba(0,0,0,0.65)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Overlay
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  // Viewfinder
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: 'relative',
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopColor: '#72ff70',
    borderLeftColor: '#72ff70',
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopColor: '#72ff70',
    borderRightColor: '#72ff70',
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomColor: '#72ff70',
    borderLeftColor: '#72ff70',
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomColor: '#72ff70',
    borderRightColor: '#72ff70',
    borderBottomRightRadius: 4,
  },
  // Scan line
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#72ff70',
    borderRadius: 1,
    shadowColor: '#72ff70',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
    top: '50%',
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  // Bottom info
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
    alignItems: 'center',
  },
  hintContainer: {
    alignItems: 'center',
    gap: 6,
  },
  hintIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#72ff70',
    shadowColor: '#72ff70',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  hintText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#FFFFFF',
  },
  hintSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  // Result banner
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  resultText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    flex: 1,
  },
  // Permission screen
  permissionCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  permissionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  permissionCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  permissionCancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});
