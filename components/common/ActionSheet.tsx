import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';

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
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.glassBorder,
            },
          ]}
          onPress={() => {}}
        >
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
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.glassBorder,
                  },
                  pressed && { backgroundColor: `${colors.primaryFixed}15` },
                ]}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    option.onPress();
                  }, 120);
                }}
              >
                {option.icon && (
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: option.destructive
                          ? `${colors.error}18`
                          : `${colors.primaryFixed}18`,
                      },
                    ]}
                  >
                    <Feather
                      name={option.icon}
                      size={18}
                      color={option.destructive ? colors.error : colors.primaryFixed}
                    />
                  </View>
                )}
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: option.destructive ? colors.error : colors.onSurface },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Cancel Button */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.glassBorder,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
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
    backgroundColor: 'rgba(5, 7, 12, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
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
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  optionsList: {
    gap: 8,
    marginBottom: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});

