import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getThemeColors } from '../constants/colors';
import { useSettingsStore } from '../store/useSettingsStore';
import { triggerHaptic } from '../lib/haptics';

export interface ReminderConfig {
  preset: string; // e.g. '15m', '1h', '1d', '3d', 'custom'
  offsetMinutes: number; // calculated minutes before deadline
  customTime?: string; // e.g. '09:00'
  customUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  customValue?: number;
  label: string;
}

export const REMINDER_PRESETS: { id: string; label: string; offsetMinutes: number }[] = [
  { id: 'at_deadline', label: 'At deadline time', offsetMinutes: 0 },
  { id: '5m', label: '5 minutes before', offsetMinutes: 5 },
  { id: '15m', label: '15 minutes before', offsetMinutes: 15 },
  { id: '30m', label: '30 minutes before', offsetMinutes: 30 },
  { id: '1h', label: '1 hour before', offsetMinutes: 60 },
  { id: '3h', label: '3 hours before', offsetMinutes: 180 },
  { id: '6h', label: '6 hours before', offsetMinutes: 360 },
  { id: '12h', label: '12 hours before', offsetMinutes: 720 },
  { id: '1d', label: '1 day before', offsetMinutes: 1440 },
  { id: '2d', label: '2 days before', offsetMinutes: 2880 },
  { id: '3d', label: '3 days before', offsetMinutes: 4320 },
  { id: '1w', label: '1 week before', offsetMinutes: 10080 },
  { id: 'custom', label: 'Custom Reminder', offsetMinutes: -1 },
];

interface ReminderConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (config: ReminderConfig) => void;
  initialPreset?: string;
}

export const ReminderConfigModal: React.FC<ReminderConfigModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialPreset = '1d',
}) => {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colors = getThemeColors(themeMode, systemColorScheme);

  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [customValue, setCustomValue] = useState('3');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks'>('days');
  const [customTime, setCustomTime] = useState('09:00');

  const handleApply = () => {
    triggerHaptic(15);
    if (selectedPreset !== 'custom') {
      const found = REMINDER_PRESETS.find((p) => p.id === selectedPreset) || REMINDER_PRESETS[8];
      onSelect({
        preset: found.id,
        offsetMinutes: found.offsetMinutes,
        label: found.label,
      });
    } else {
      const val = parseInt(customValue, 10) || 1;
      let multiplier = 1;
      if (customUnit === 'hours') multiplier = 60;
      if (customUnit === 'days') multiplier = 1440;
      if (customUnit === 'weeks') multiplier = 10080;

      onSelect({
        preset: 'custom',
        offsetMinutes: val * multiplier,
        customValue: val,
        customUnit,
        customTime,
        label: `Custom (${val} ${customUnit} before at ${customTime})`,
      });
    }
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.onSurface }]}>Configure Reminder</Text>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {REMINDER_PRESETS.map((item) => {
                  const isSelected = selectedPreset === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.optionRow,
                        isSelected && [styles.optionActive, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }],
                      ]}
                      onPress={() => {
                        triggerHaptic(10);
                        setSelectedPreset(item.id);
                      }}
                    >
                      <Text style={[styles.optionText, { color: isSelected ? colors.primaryFixed : colors.onSurface }]}>
                        {item.label}
                      </Text>
                      {isSelected && <Feather name="check" size={16} color={colors.primaryFixed} />}
                    </Pressable>
                  );
                })}

                {/* Custom Options Panel */}
                {selectedPreset === 'custom' && (
                  <View style={[styles.customBox, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={[styles.customTitle, { color: colors.onSurface }]}>Custom Offset</Text>
                    <View style={styles.customRow}>
                      <TextInput
                        style={[styles.input, { color: colors.onSurface, borderColor: `${colors.primaryFixed}40` }]}
                        value={customValue}
                        onChangeText={setCustomValue}
                        keyboardType="numeric"
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {(['minutes', 'hours', 'days', 'weeks'] as const).map((unit) => (
                          <Pressable
                            key={unit}
                            onPress={() => setCustomUnit(unit)}
                            style={[
                              styles.unitPill,
                              customUnit === unit && { backgroundColor: colors.primaryFixed },
                            ]}
                          >
                            <Text style={[styles.unitText, { color: customUnit === unit ? colors.onPrimaryFixed : colors.onSurfaceVariant }]}>
                              {unit}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    <Text style={[styles.customTitle, { color: colors.onSurface, marginTop: 10 }]}>Exact Reminder Time</Text>
                    <TextInput
                      style={[styles.input, { color: colors.onSurface, borderColor: `${colors.primaryFixed}40` }]}
                      value={customTime}
                      onChangeText={setCustomTime}
                      placeholder="HH:MM (e.g. 09:00)"
                      placeholderTextColor={`${colors.onSurfaceVariant}60`}
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.btnRow}>
                <Pressable style={[styles.btn, styles.btnSave, { backgroundColor: colors.primaryFixed }]} onPress={handleApply}>
                  <Text style={[styles.btnSaveText, { color: colors.onPrimaryFixed }]}>Save Reminder</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  closeBtn: {
    padding: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  optionActive: {},
  optionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  customBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  customTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginBottom: 6,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 65,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  unitText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  btnRow: {
    marginTop: 14,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSave: {},
  btnSaveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
