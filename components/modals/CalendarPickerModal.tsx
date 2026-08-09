import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import { triggerHaptic } from '@/utils/haptics';

interface CalendarPickerModalProps {
  visible: boolean;
  value: string; // YYYY-MM-DD or empty / "No Deadline"
  onClose: () => void;
  onSelect: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  value,
  onClose,
  onSelect,
}) => {
  const colors = useThemeColors();
  const today = new Date();

  // Initialize selected year and month
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (value && value !== 'No Deadline' && value !== 'TBD') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(value || 'No Deadline');
  const [selectedTime, setSelectedTime] = useState<string>('18:00');

  useEffect(() => {
    setSelectedDateStr(value || 'No Deadline');
    if (value && value !== 'No Deadline' && value !== 'TBD') {
      if (value.includes(' ')) {
        const [d, t] = value.split(' ');
        setSelectedTime(t || '18:00');
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) setCurrentDate(parsed);
      } else {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) setCurrentDate(parsed);
      }
    }
  }, [value, visible]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    triggerHaptic(10);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic(10);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateStr = (y: number, m: number, d: number, timeStr: string = selectedTime) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd} ${timeStr}`;
  };

  const handleSelectDay = (dayNum: number) => {
    triggerHaptic(15);
    const dateStr = formatDateStr(year, month, dayNum);
    setSelectedDateStr(dateStr);
  };

  const handleNoDeadline = () => {
    triggerHaptic(15);
    setSelectedDateStr('No Deadline');
  };

  const handleQuickPreset = (offsetDays: number) => {
    triggerHaptic(15);
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setCurrentDate(target);
    const dateStr = formatDateStr(target.getFullYear(), target.getMonth(), target.getDate());
    setSelectedDateStr(dateStr);
  };

  const handleTimeChange = (t: string) => {
    triggerHaptic(10);
    setSelectedTime(t);
    if (selectedDateStr && selectedDateStr !== 'No Deadline') {
      const datePart = selectedDateStr.split(' ')[0];
      setSelectedDateStr(`${datePart} ${t}`);
    }
  };

  const handleConfirm = () => {
    triggerHaptic(20);
    onSelect(selectedDateStr);
    onClose();
  };

  // Render calendar grid days
  const renderCalendarDays = () => {
    const days = [];

    // Empty slots for days before the 1st of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateStr = formatDateStr(year, month, day);
      const isSelected = selectedDateStr === dayDateStr;
      const isToday = dayDateStr === todayStr;

      days.push(
        <Pressable
          key={`day-${day}`}
          style={[
            styles.dayCell,
            isToday && { borderColor: `${colors.primaryFixed}80`, borderWidth: 1 },
            isSelected && { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
          ]}
          onPress={() => handleSelectDay(day)}
        >
          <Text
            style={[
              styles.dayText,
              { color: colors.onSurface },
              isToday && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
              isSelected && { color: colors.onPrimaryFixed, fontFamily: 'Inter_700Bold' },
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="calendar" size={20} color={colors.primaryFixed} />
                  <Text style={[styles.title, { color: colors.onSurface }]}>Select Deadline</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              {/* No Deadline Option Toggle */}
              <Pressable
                style={[
                  styles.noDeadlineBtn,
                  { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                  selectedDateStr === 'No Deadline' && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                ]}
                onPress={handleNoDeadline}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather
                    name="clock"
                    size={18}
                    color={selectedDateStr === 'No Deadline' ? colors.primaryFixed : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.noDeadlineText,
                      { color: colors.onSurfaceVariant },
                      selectedDateStr === 'No Deadline' && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
                    ]}
                  >
                    No Deadline (Open Ended)
                  </Text>
                </View>
                {selectedDateStr === 'No Deadline' && (
                  <Feather name="check" size={18} color={colors.primaryFixed} />
                )}
              </Pressable>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                <Pressable
                  style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                  onPress={() => handleQuickPreset(0)}
                >
                  <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>Today</Text>
                </Pressable>
                <Pressable
                  style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                  onPress={() => handleQuickPreset(7)}
                >
                  <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>In 1 Week</Text>
                </Pressable>
                <Pressable
                  style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                  onPress={() => handleQuickPreset(30)}
                >
                  <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>In 1 Month</Text>
                </Pressable>
              </View>

              {/* Month Navigation */}
              <View style={styles.monthHeader}>
                <Pressable style={styles.navBtn} onPress={handlePrevMonth} hitSlop={8}>
                  <Feather name="chevron-left" size={20} color={colors.onSurface} />
                </Pressable>
                <Text style={[styles.monthText, { color: colors.onSurface }]}>
                  {MONTH_NAMES[month]} {year}
                </Text>
                <Pressable style={styles.navBtn} onPress={handleNextMonth} hitSlop={8}>
                  <Feather name="chevron-right" size={20} color={colors.onSurface} />
                </Pressable>
              </View>

              {/* Weekday Labels */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={[styles.weekdayText, { color: colors.onSurfaceVariant }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.grid}>{renderCalendarDays()}</View>

              {/* Time Selector */}
              {selectedDateStr !== 'No Deadline' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.selectedLabel, { color: colors.onSurfaceVariant, marginBottom: 6, fontSize: 11 }]}>TARGET TIME</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['09:00', '12:00', '18:00', '23:59'].map((t) => {
                      const isSel = selectedTime === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => handleTimeChange(t)}
                          style={[
                            styles.presetChip,
                            { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                            isSel && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                          ]}
                        >
                          <Text style={[styles.presetText, { color: colors.onSurfaceVariant }, isSel && { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' }]}>
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Selected Footer */}
              <View style={[styles.footer, { borderTopColor: colors.glassBorder }]}>
                <Text style={[styles.selectedLabel, { color: colors.onSurfaceVariant }]}>
                  Selected: <Text style={{ color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' }}>{selectedDateStr}</Text>
                </Text>

                <View style={styles.footerBtnRow}>
                  <Pressable
                    style={[styles.cancelBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmBtn, { backgroundColor: colors.primaryFixed }]}
                    onPress={handleConfirm}
                  >
                    <Text style={[styles.confirmBtnText, { color: colors.onPrimaryFixed }]}>Confirm Date</Text>
                  </Pressable>
                </View>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  noDeadlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
  },
  noDeadlineText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  selectedLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 12,
  },
  footerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
