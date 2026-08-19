import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useThemeColors } from '@/constants/colors';
import { triggerHaptic } from '@/utils/haptics';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScan,
}) => {
  const colors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) return;

    const trimmed = (data || '').trim().toUpperCase();
    if (/^TRK-[A-Z0-9]{6}$/.test(trimmed)) {
      setScanned(true);
      triggerHaptic(30);
      onScan(trimmed);
      onClose();
    }
  };

  const renderContent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.centerBox}>
          <Feather name="camera-off" size={48} color={colors.onSurfaceVariant} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: colors.onSurface }]}>Camera Scanning Unavailable</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            QR camera scanning is available on mobile devices. Please enter the project code manually on Web.
          </Text>
          <Pressable
            onPress={onClose}
            style={[styles.actionBtn, { backgroundColor: colors.primaryFixed }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.onPrimaryFixed }]}>Enter Code Manually</Text>
          </Pressable>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primaryFixed} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centerBox}>
          <Feather name="camera" size={48} color={colors.primaryFixed} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: colors.onSurface }]}>Camera Permission Needed</Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            Camera access is required to scan project QR codes.
          </Text>
          <Pressable
            onPress={() => {
              if (permission.canAskAgain) {
                requestPermission();
              } else {
                Linking.openSettings();
              }
            }}
            style={[styles.actionBtn, { backgroundColor: colors.primaryFixed }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.onPrimaryFixed }]}>
              {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          {/* Overlay viewfinder frame */}
          <View style={styles.overlayContainer}>
            <View style={styles.maskTop} />
            <View style={styles.maskMiddle}>
              <View style={styles.maskSide} />
              <View style={[styles.finderBox, { borderColor: colors.primaryFixed }]}>
                <View style={[styles.cornerTL, { borderColor: colors.primaryFixed }]} />
                <View style={[styles.cornerTR, { borderColor: colors.primaryFixed }]} />
                <View style={[styles.cornerBL, { borderColor: colors.primaryFixed }]} />
                <View style={[styles.cornerBR, { borderColor: colors.primaryFixed }]} />
              </View>
              <View style={styles.maskSide} />
            </View>
            <View style={styles.maskBottom}>
              <Text style={styles.scanPrompt}>Align Trak QR code within the frame</Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header Bar */}
        <View style={[styles.topBar, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.topCloseBtn}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Scan Project QR</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  topCloseBtn: {
    padding: 4,
  },
  topTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  overlayContainer: {
    flex: 1,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  maskMiddle: {
    flexDirection: 'row',
    height: 260,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  finderBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  maskBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 24,
  },
  scanPrompt: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
