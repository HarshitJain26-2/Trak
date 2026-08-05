import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useProjectStore, Priority, ProjectStatus } from '@/store/useProjectStore';
import { validateDeadlineDate } from '@/utils/deadlineValidator';
import { ReminderConfigModal, ReminderConfig } from '@/components/modals/ReminderConfigModal';
import { notificationService } from '@/services/notifications';
import { triggerHaptic } from '@/utils/haptics';

const AVAILABLE_TAGS = ['TS', 'Rust', 'AWS', 'Go', 'Python', 'React', 'K8s', 'Node', 'Kafka', 'Redis'];

type PriorityOption = { label: string; value: Priority };
const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function NewProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addProject, projects } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [selectedTags, setSelectedTags] = useState<string[]>(['TS']);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>({
    preset: '1d',
    offsetMinutes: 1440,
    label: '1 day before',
  });

  // Validation state
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const saveScale = useRef(new Animated.Value(1)).current;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleDeadlineChange = (text: string) => {
    setDeadline(text);
    if (text.trim()) {
      const res = validateDeadlineDate(text);
      if (!res.isValid) {
        setDeadlineError(res.error || 'Invalid deadline');
      } else {
        setDeadlineError(null);
      }
    } else {
      setDeadlineError(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    // Check duplicate project name
    const isDuplicateName = projects.some(
      (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicateName) {
      Alert.alert('Duplicate Project', 'A project with this name already exists.');
      return;
    }

    if (deadline.trim()) {
      const validation = validateDeadlineDate(deadline);
      if (!validation.isValid) {
        Alert.alert('Invalid Deadline', validation.error || 'Please enter a valid deadline date (e.g. 2026-12-31).');
        return;
      }
    }

    triggerHaptic(20);
    const newProjectId = Date.now().toString();

    await addProject({
      name: name.trim(),
      description: description.trim(),
      version: 'v0.1.0',
      status: 'active' as ProjectStatus,
      techStack: selectedTags,
      deadline: deadline.trim() || 'TBD',
      repoUrl: repoUrl.trim(),
      priority,
    });

    // Schedule reminder if deadline is valid and specified
    if (deadline.trim() && reminderConfig) {
      const deadlineDate = new Date(deadline.trim());
      if (!isNaN(deadlineDate.getTime())) {
        const triggerTimestamp = deadlineDate.getTime() - reminderConfig.offsetMinutes * 60 * 1000;
        await notificationService.scheduleReminder({
          id: `rem_${newProjectId}`,
          projectId: newProjectId,
          projectName: name.trim(),
          triggerTime: triggerTimestamp,
          offsetLabel: reminderConfig.label,
        });
      }
    }

    router.back();
  };

  const handleClose = () => router.back();

  const handleSavePressIn = () =>
    Animated.spring(saveScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handleSavePressOut = () =>
    Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <View style={styles.root}>
      <ReminderConfigModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        onSelect={(cfg) => setReminderConfig(cfg)}
        initialPreset={reminderConfig.preset}
      />

      {/* Backdrop */}
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={handleClose} />

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Project</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={22} color={Colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.form}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Project Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PROJECT NAME</Text>
              <View style={styles.inputWrapper}>
                <Feather name="tag" size={16} color={`${Colors.onSurfaceVariant}80`} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Apollo Infrastructure"
                  placeholderTextColor={`${Colors.onSurfaceVariant}4D`}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Brief technical summary of the project scope..."
                  placeholderTextColor={`${Colors.onSurfaceVariant}4D`}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Tech Stack */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TECH STACK</Text>
              <View style={styles.tagsContainer}>
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    >
                      <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                        {tag}
                      </Text>
                      {isSelected && <Feather name="x" size={12} color={Colors.onPrimaryFixed} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Deadline Date & Time */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DEADLINE (YYYY-MM-DD)</Text>
              <View style={[styles.inputWrapper, deadlineError ? { borderColor: Colors.error } : null]}>
                <Feather name="calendar" size={16} color={`${Colors.onSurfaceVariant}80`} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-12-31"
                  placeholderTextColor={`${Colors.onSurfaceVariant}4D`}
                  value={deadline}
                  onChangeText={handleDeadlineChange}
                />
              </View>
              {deadlineError && <Text style={styles.errorText}>{deadlineError}</Text>}
            </View>

            {/* Smart Reminder Trigger Selector */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>REMINDER SCHEDULE</Text>
              <Pressable
                style={styles.reminderPickerBtn}
                onPress={() => setReminderModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="bell" size={16} color={Colors.primaryFixed} />
                  <Text style={styles.reminderPickerText}>{reminderConfig.label}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={Colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PRIORITY LEVEL</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const isSelected = priority === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setPriority(opt.value)}
                      style={[styles.priorityChip, isSelected && styles.priorityChipSelected]}
                    >
                      <Text style={[styles.priorityText, isSelected && styles.priorityTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 20, 48) }]}>
            <Animated.View style={{ transform: [{ scale: saveScale }], flex: 1 }}>
              <Pressable
                onPressIn={handleSavePressIn}
                onPressOut={handleSavePressOut}
                onPress={handleSave}
                disabled={!name.trim()}
                style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
              >
                <Feather name="plus" size={18} color="#002203" />
                <Text style={styles.saveBtnText}>Create Project</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.7)' },
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.onSurface },
  closeBtn: { padding: 4 },
  form: { flex: 1 },
  formContent: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.5,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  multilineInput: { minHeight: 70 },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.error,
    marginTop: 2,
  },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagChipSelected: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryFixed,
  },
  tagChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.onSurfaceVariant },
  tagChipTextSelected: { color: Colors.onPrimaryFixed, fontFamily: 'Inter_600SemiBold' },
  reminderPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reminderPickerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  priorityChipSelected: {
    backgroundColor: `${Colors.primaryFixed}20`,
    borderColor: Colors.primaryFixed,
  },
  priorityText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.onSurfaceVariant },
  priorityTextSelected: { color: Colors.primaryFixed, fontFamily: 'Inter_600SemiBold' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#002203' },
});
