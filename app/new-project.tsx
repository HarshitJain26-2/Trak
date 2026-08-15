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
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Priority, ProjectStatus } from '@/store/useProjectStore';
import { validateDeadlineDate, parseDeadlineTimestamp } from '@/utils/deadlineValidator';
import { ReminderConfigModal, ReminderConfig } from '@/components/modals/ReminderConfigModal';
import { CalendarPickerModal } from '@/components/modals/CalendarPickerModal';
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
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { addProject, projects } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [selectedTags, setSelectedTags] = useState<string[]>(['TS']);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showOtherTagModal, setShowOtherTagModal] = useState(false);
  const [otherTagInput, setOtherTagInput] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>({
    preset: '1d',
    offsetMinutes: 1440,
    label: '1 day before',
  });

  const addCustomTag = () => {
    const trimmed = otherTagInput.trim();
    if (trimmed && !AVAILABLE_TAGS.includes(trimmed) && !customTags.includes(trimmed)) {
      setCustomTags((prev) => [...prev, trimmed]);
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setOtherTagInput('');
    setShowOtherTagModal(false);
  };

  // Validation state
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const saveScale = useRef(new Animated.Value(1)).current;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addFeatureItem = () => {
    if (!featureInput.trim()) return;
    if (!features.includes(featureInput.trim())) {
      setFeatures((prev) => [...prev, featureInput.trim()]);
    }
    setFeatureInput('');
  };

  const removeFeatureItem = (feat: string) => {
    setFeatures((prev) => prev.filter((f) => f !== feat));
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

    if (deadline.trim() && deadline.trim() !== 'No Deadline') {
      const validation = validateDeadlineDate(deadline);
      if (!validation.isValid) {
        Alert.alert('Invalid Deadline', validation.error || 'Please enter a valid deadline date (e.g. 2026-12-31).');
        return;
      }
    }

    triggerHaptic(20);
    const newProjectId = Date.now().toString();

    const createdProject = await addProject({
      id: newProjectId,
      name: name.trim(),
      description: description.trim(),
      version: 'v0.1.0',
      status: 'active' as ProjectStatus,
      techStack: selectedTags,
      deadline: deadline.trim() || 'No Deadline',
      repoUrl: repoUrl.trim(),
      priority,
      milestones: features.map((title, i) => ({
        id: `m_${Date.now()}_${i}`,
        title,
        completed: false,
      })),
    });

    // Schedule reminder if deadline is valid date (not No Deadline) and specified
    if (deadline.trim() && deadline.trim() !== 'No Deadline' && reminderConfig) {
      const deadlineTimestamp = parseDeadlineTimestamp(deadline.trim());
      if (deadlineTimestamp) {
        const triggerTimestamp = deadlineTimestamp - reminderConfig.offsetMinutes * 60 * 1000;
        await notificationService.scheduleReminder({
          id: `rem_${createdProject.id}`,
          projectId: createdProject.id,
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
    Animated.spring(saveScale, { toValue: 0.95, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  const handleSavePressOut = () =>
    Animated.spring(saveScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();

  return (
    <View style={styles.root}>
      <ReminderConfigModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        onSelect={(cfg) => setReminderConfig(cfg)}
        initialPreset={reminderConfig.preset}
      />

      <CalendarPickerModal
        visible={calendarModalVisible}
        value={deadline}
        onClose={() => setCalendarModalVisible(false)}
        onSelect={(d) => {
          setDeadline(d);
          setDeadlineError(null);
        }}
      />

      {/* Backdrop */}
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={handleClose} />

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.handle, { backgroundColor: `${colors.onSurfaceVariant}40` }]} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.glassBorder }]}>
            <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>New Project</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.form}
            contentContainerStyle={[styles.formContent, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Project Name */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>PROJECT NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <Feather name="tag" size={16} color={`${colors.onSurfaceVariant}80`} />
                <TextInput
                  style={[styles.input, { color: colors.onSurface }]}
                  placeholder="e.g. Apollo Infrastructure"
                  placeholderTextColor={`${colors.onSurfaceVariant}4D`}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>DESCRIPTION</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  style={[styles.input, styles.multilineInput, { color: colors.onSurface }]}
                  placeholder="Brief technical summary of the project scope..."
                  placeholderTextColor={`${colors.onSurfaceVariant}4D`}
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
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>TECH STACK</Text>
              <View style={styles.tagsContainer}>
                {[...AVAILABLE_TAGS, ...customTags].map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.tagChip,
                        { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                        isSelected && { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
                      ]}
                    >
                      <Text style={[styles.tagChipText, { color: colors.onSurfaceVariant }, isSelected && { color: colors.onPrimaryFixed }]}>
                        {tag}
                      </Text>
                      {isSelected && <Feather name="x" size={12} color={colors.onPrimaryFixed} />}
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setShowOtherTagModal(true)}
                  style={[styles.tagChip, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }]}
                >
                  <Feather name="plus" size={12} color={colors.primaryFixed} />
                  <Text style={[styles.tagChipText, { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' }]}>Other</Text>
                </Pressable>
              </View>
            </View>

            {/* Custom Tag Modal */}
            <Modal transparent animationType="fade" visible={showOtherTagModal} onRequestClose={() => setShowOtherTagModal(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <Pressable style={styles.backdrop} onPress={() => setShowOtherTagModal(false)}>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainer, borderColor: colors.primaryFixed, width: '85%', padding: 16, borderRadius: 14 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.onSurface, marginBottom: 8, fontSize: 13 }]}>ADD CUSTOM TECH TAG</Text>
                    <TextInput
                      style={[styles.input, { color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh, borderRadius: 8, padding: 10, marginBottom: 12 }]}
                      placeholder="e.g. Docker, GraphQL"
                      placeholderTextColor={`${colors.onSurfaceVariant}60`}
                      value={otherTagInput}
                      onChangeText={setOtherTagInput}
                      autoFocus
                      onSubmitEditing={addCustomTag}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable onPress={() => setShowOtherTagModal(false)} style={[styles.priorityChip, { flex: 1 }]}>
                        <Text style={{ color: colors.onSurfaceVariant }}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={addCustomTag} style={[styles.saveBtn, { flex: 1, paddingVertical: 8 }]}>
                        <Text style={{ color: colors.onPrimaryFixed, fontFamily: 'Inter_600SemiBold' }}>Add Tag</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              </KeyboardAvoidingView>
            </Modal>

            {/* Deadline Date & Time */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>DEADLINE</Text>
              <Pressable
                style={[styles.reminderPickerBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }, deadlineError ? { borderColor: colors.error } : null]}
                onPress={() => setCalendarModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="calendar" size={18} color={colors.primaryFixed} />
                  <Text style={[styles.reminderPickerText, { color: deadline ? colors.onSurface : `${colors.onSurfaceVariant}80` }]}>
                    {deadline || 'Select Date or No Deadline'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
              {deadlineError && <Text style={[styles.errorText, { color: colors.error }]}>{deadlineError}</Text>}
            </View>

            {/* Features / Milestones */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>INITIAL FEATURES (OPTIONAL)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <Feather name="flag" size={16} color={`${colors.onSurfaceVariant}80`} />
                <TextInput
                  style={[styles.input, { color: colors.onSurface }]}
                  placeholder="e.g. Authentication flow"
                  placeholderTextColor={`${colors.onSurfaceVariant}4D`}
                  value={featureInput}
                  onChangeText={setFeatureInput}
                  onSubmitEditing={addFeatureItem}
                  returnKeyType="done"
                />
                <Pressable onPress={addFeatureItem} style={{ padding: 4 }} hitSlop={8}>
                  <Feather name="plus" size={18} color={colors.primaryFixed} />
                </Pressable>
              </View>
              {features.length > 0 && (
                <View style={styles.tagsContainer}>
                  {features.map((feat) => (
                    <View
                      key={feat}
                      style={[styles.tagChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                    >
                      <Text style={[styles.tagChipText, { color: colors.onSurface }]}>{feat}</Text>
                      <Pressable onPress={() => removeFeatureItem(feat)} hitSlop={8}>
                        <Feather name="x" size={12} color={colors.onSurfaceVariant} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Smart Reminder Trigger Selector */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>REMINDER SCHEDULE</Text>
              <Pressable
                style={[styles.reminderPickerBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}
                onPress={() => setReminderModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="bell" size={16} color={colors.primaryFixed} />
                  <Text style={[styles.reminderPickerText, { color: colors.onSurface }]}>{reminderConfig.label}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>PRIORITY LEVEL</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const isSelected = priority === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setPriority(opt.value)}
                      style={[
                        styles.priorityChip,
                        { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                        isSelected && { backgroundColor: `${colors.primaryFixed}20`, borderColor: colors.primaryFixed },
                      ]}
                    >
                      <Text style={[styles.priorityText, { color: colors.onSurfaceVariant }, isSelected && { color: colors.primaryFixed }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: colors.glassBorder, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <Animated.View style={{ transform: [{ scale: saveScale }], width: '100%' }}>
              <Pressable
                onPressIn={handleSavePressIn}
                onPressOut={handleSavePressOut}
                onPress={handleSave}
                disabled={!name.trim()}
                style={[styles.saveBtn, { backgroundColor: colors.primaryFixed }, !name.trim() && styles.saveBtnDisabled]}
              >
                <Feather name="plus" size={18} color={colors.onPrimaryFixed} />
                <Text style={[styles.saveBtnText, { color: colors.onPrimaryFixed }]}>Create Project</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    maxHeight: '90%',
    borderWidth: 1,
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
