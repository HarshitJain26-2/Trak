import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export type ConfirmIcon =
  | 'trash-2'
  | 'x-circle'
  | 'rotate-ccw'
  | 'check-circle'
  | 'log-out'
  | 'alert-triangle'
  | 'info';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Use true for destructive red button, false for green confirm button */
  destructive?: boolean;
  /** Icon name from Feather — defaults to 'alert-triangle' */
  icon?: ConfirmIcon;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  icon = 'alert-triangle',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!visible) return null;

  const accentColor = destructive ? Colors.error : Colors.primaryFixed;
  const iconBg = destructive ? 'rgba(255,180,171,0.12)' : 'rgba(114,255,112,0.10)';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Icon badge */}
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Feather name={icon as any} size={26} color={accentColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}
              onPress={onCancel}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.btnDestructive : styles.btnConfirm,
                pressed && styles.btnPressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnConfirmText, { color: '#0b0e14' }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Hook to manage a single ConfirmDialog's state.
 * Usage:
 *   const { dialogProps, ask } = useConfirmDialog();
 *   <ConfirmDialog {...dialogProps} />
 *   ask({ title, message, ... }) returns a promise resolving to true/false
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    icon: ConfirmIcon;
    resolve?: (result: boolean) => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    destructive: false,
    icon: 'alert-triangle',
  });

  const ask = React.useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel: string;
      destructive?: boolean;
      icon?: ConfirmIcon;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          visible: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel,
          destructive: opts.destructive ?? false,
          icon: opts.icon ?? 'alert-triangle',
          resolve,
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
    destructive: state.destructive,
    icon: state.icon,
    onCancel: handleCancel,
    onConfirm: handleConfirm,
  };

  return { dialogProps, ask };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#111622',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F293D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
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
    opacity: 0.8,
  },
  btnCancel: {
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#8B949E',
  },
  btnConfirm: {
    backgroundColor: Colors.primaryFixed,
  },
  btnDestructive: {
    backgroundColor: Colors.error,
  },
  btnConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0b0e14',
  },
});
