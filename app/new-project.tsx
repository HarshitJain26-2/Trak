import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
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
import { supabase } from '@/services/supabase';

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

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session || !session.user) {
        router.replace('/auth');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Validation and Submission state
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
    if (!name.trim()) return;
    if (isCreating) return;

    // Validate deadline format if provided
    if (deadline.trim() && deadline.trim() !== 'No Deadline') {
      const validation = validateDeadlineDate(deadline.trim());
      if (!validation.isValid) {
        Alert.alert('Invalid Deadline', validation.error || 'Please enter a valid deadline date (e.g. 2026-12-31).');
        return;
      }
    }

    setIsCreating(true);
    triggerHaptic(20);

    try {
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
    } catch (err) {
      console.error('Error creating project:', err);
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    router.back();
  };

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
            <Modal
              transparent
              animationType="fade"
              visible={showOtherTagModal}
              onRequestClose={() => setShowOtherTagModal(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
              >
                <Pressable
                  style={styles.modalBackdrop}
                  onPress={() => setShowOtherTagModal(false)}
                >
                  <Pressable
                    style={[
                      styles.customTagCard,
                      { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.customTagHeader}>
                      <View style={[styles.tagIconWrap, { backgroundColor: `${colors.primaryFixed}18`, borderColor: `${colors.primaryFixed}33` }]}>
                        <Feather name="tag" size={16} color={colors.primaryFixed} />
                      </View>
                      <Text style={[styles.customTagTitle, { color: colors.onSurface }]}>Add Custom Tech Tag</Text>
                    </View>

                    <Text style={[styles.customTagSubtitle, { color: colors.onSurfaceVariant }]}>
                      Enter a framework, language, or tool to include in your project tech stack.
                    </Text>

                    <TextInput
                      style={[
                        styles.customTagInput,
                        {
                          backgroundColor: colors.surfaceContainerHigh,
                          borderColor: colors.glassBorder,
                          color: colors.onSurface,
                        },
                      ]}
                      placeholder="e.g. Docker, GraphQL, Tailwind"
                      placeholderTextColor={`${colors.onSurfaceVariant}70`}
                      value={otherTagInput}
                      onChangeText={setOtherTagInput}
                      autoFocus
                      onSubmitEditing={addCustomTag}
                      returnKeyType="done"
                    />

                    <View style={styles.customTagActions}>
                      <Pressable
                        onPress={() => {
                          setOtherTagInput('');
                          setShowOtherTagModal(false);
                        }}
                        style={({ pressed }) => [
                          styles.customTagCancelBtn,
                          { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.customTagCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                      </Pressable>

                      <Pressable
                        onPress={addCustomTag}
                        style={({ pressed }) => [
                          styles.customTagAddBtn,
                          { backgroundColor: colors.primaryFixed },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather name="plus" size={15} color={colors.onPrimaryFixed} />
                        <Text style={[styles.customTagAddText, { color: colors.onPrimaryFixed }]}>Add Tag</Text>
                      </Pressable>
                    </View>
                  </Pressable>
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
                disabled={!name.trim() || isCreating}
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primaryFixed },
                  (!name.trim() || isCreating) && styles.saveBtnDisabled,
                ]}
              >
                {isCreating ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
                    <Text style={[styles.saveBtnText, { color: colors.onPrimaryFixed }]}>Creating Project...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="plus" size={18} color={colors.onPrimaryFixed} />
                    <Text style={[styles.saveBtnText, { color: colors.onPrimaryFixed }]}>Create Project</Text>
                  </View>
                )}
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
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  customTagCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  customTagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  customTagSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  customTagInput: {
    width: '100%',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customTagActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  customTagCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  customTagCancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  customTagAddBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  customTagAddText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
