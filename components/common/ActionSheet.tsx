import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, useThemeColors } from '@/constants/colors';

export interface ActionOption {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionOption[];
  onClose: () => void;
}

export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: ActionSheetProps) {
  const colors = useThemeColors();
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]} onPress={() => {}}>
          {/* Drag indicator / Handle */}
          <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />

          {/* Header */}
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>}
              {message && <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>{message}</Text>}
            </View>
          )}

          {/* Options */}
          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
              >
                {option.icon && (
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: option.destructive
                          ? 'rgba(255,180,171,0.1)'
                          : 'rgba(255,255,255,0.05)',
                      },
                    ]}
                  >
                    <Feather
                      name={option.icon}
                      size={18}
                      color={option.destructive ? Colors.error : Colors.onSurface}
                    />
                  </View>
                )}
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      option.destructive && { color: Colors.error },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Cancel Button */}
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useActionSheet() {
  const [state, setState] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    options: ActionOption[];
  }>({
    visible: false,
    options: [],
  });

  const showActionSheet = useCallback(
    (opts: { title?: string; message?: string; options: ActionOption[] }) => {
      setState({
        visible: true,
        title: opts.title,
        message: opts.message,
        options: opts.options,
      });
    },
    []
  );

  const hideActionSheet = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const actionSheetProps: ActionSheetProps = {
    visible: state.visible,
    title: state.title,
    message: state.message,
    options: state.options,
    onClose: hideActionSheet,
  };

  return { actionSheetProps, showActionSheet, hideActionSheet };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111622',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#1F293D',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A364F',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
  },
  optionsList: {
    gap: 8,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
  },
  optionPressed: {
    backgroundColor: '#1F293D',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: '#171D2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#263044',
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#8B949E',
  },
});
