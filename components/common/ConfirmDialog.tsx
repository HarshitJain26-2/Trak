import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import { triggerHaptic } from '@/utils/haptics';

export type ConfirmIcon =
  | 'trash-2'
  | 'x-circle'
  | 'rotate-ccw'
  | 'check-circle'
  | 'log-out'
  | 'alert-triangle'
  | 'info'
  | 'lock'
  | 'shield';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use true for destructive red button, false for green/primary confirm button */
  destructive?: boolean;
  /** Icon name from Feather — defaults to 'alert-triangle' */
  icon?: ConfirmIcon;
  /** Single button alert mode (e.g. "Got It") without Cancel button */
  isAlert?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon = 'alert-triangle',
  isAlert = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const colors = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      triggerHaptic(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 10,
          speed: 18,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 10,
          speed: 18,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          bounciness: 12,
          speed: 14,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      translateY.setValue(20);
      iconScale.setValue(0.6);
    }
  }, [visible]);

  if (!visible) return null;

  const isLock = icon === 'lock' || icon === 'shield';
  const accentColor = destructive
    ? colors.error
    : isLock
    ? colors.statusWarning
    : colors.primaryFixed;
  const iconBg = destructive
    ? `${colors.error}1A`
    : isLock
    ? `${colors.statusWarning}18`
    : `${colors.primaryFixed}1A`;
  const iconBorderColor = destructive
    ? `${colors.error}33`
    : isLock
    ? `${colors.statusWarning}33`
    : `${colors.primaryFixed}33`;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={isAlert ? onConfirm : onCancel} />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.glassBorder,
              transform: [{ scale: scaleAnim }, { translateY }],
            },
          ]}
        >
          {/* Animated Glowing Icon badge */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: iconBg,
                borderColor: iconBorderColor,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Feather name={icon as any} size={28} color={accentColor} />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {!isAlert && (
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.glassBorder,
                    borderWidth: 1,
                  },
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  triggerHaptic(10);
                  onCancel();
                }}
              >
                <Text style={[styles.btnCancelText, { color: colors.onSurfaceVariant }]}>
                  {cancelLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: destructive
                    ? colors.error
                    : isLock
                    ? colors.primaryFixed
                    : colors.primaryFixed,
                },
                pressed && styles.btnPressed,
              ]}
              onPress={() => {
                triggerHaptic(15);
                onConfirm();
              }}
            >
              <Text style={[styles.btnConfirmText, { color: colors.onPrimaryFixed }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * Hook to manage ConfirmDialog / Animated Alert state.
 * Usage:
 *   const { dialogProps, ask, notify } = useConfirmDialog();
 *   <ConfirmDialog {...dialogProps} />
 *   ask({ title, message, ... }) -> resolves true/false (Cancel & Confirm buttons)
 *   notify({ title, message, ... }) -> resolves void (Single "Got It" button with animation)
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    destructive: boolean;
    isAlert: boolean;
    icon: ConfirmIcon;
    resolve?: (result: boolean) => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    destructive: false,
    isAlert: false,
    icon: 'alert-triangle',
  });

  const ask = React.useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
      icon?: ConfirmIcon;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          visible: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Confirm',
          cancelLabel: opts.cancelLabel ?? 'Cancel',
          destructive: opts.destructive ?? false,
          isAlert: false,
          icon: opts.icon ?? 'alert-triangle',
          resolve,
        });
      });
    },
    []
  );

  const notify = React.useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      destructive?: boolean;
      icon?: ConfirmIcon;
    }): Promise<void> => {
      return new Promise((resolve) => {
        setState({
          visible: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Got It',
          cancelLabel: '',
          destructive: opts.destructive ?? false,
          isAlert: true,
          icon: opts.icon ?? 'info',
          resolve: () => resolve(),
        });
      });
    },
    []
  );

  const handleCancel = React.useCallback(() => {
    setState((s) => {
      s.resolve?.(false);
      return { ...s, visible: false };
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setState((s) => {
      s.resolve?.(true);
      return { ...s, visible: false };
    });
  }, []);

  const dialogProps: ConfirmDialogProps = {
    visible: state.visible,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    destructive: state.destructive,
    isAlert: state.isAlert,
    icon: state.icon,
    onCancel: handleCancel,
    onConfirm: handleConfirm,
  };

  return { dialogProps, ask, notify };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.35)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
        elevation: 20,
      },
    }),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  btnConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});


