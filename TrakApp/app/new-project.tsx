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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useProjectStore, Priority, ProjectStatus } from '../../store/useProjectStore';

const AVAILABLE_TAGS = ['TS', 'Rust', 'AWS', 'Go', 'Python', 'React', 'K8s', 'Node', 'Kafka', 'Redis'];

type PriorityOption = { label: string; value: Priority };
const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function NewProjectScreen() {
  const router = useRouter();
  const { addProject } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [selectedTags, setSelectedTags] = useState<string[]>(['TS']);

  // Sheet drag animation
  const translateY = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(1)).current;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addProject({
      name: name.trim(),
      description: description.trim(),
      version: 'v0.1.0',
      status: 'active' as ProjectStatus,
      techStack: selectedTags,
      deadline: deadline.trim() || 'TBD',
      repoUrl: repoUrl.trim(),
      priority,
    });
    router.back();
  };

  const handleClose = () => router.back();

  const handleSavePressIn = () =>
    Animated.spring(saveScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handleSavePressOut = () =>
    Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <View style={styles.root}>
      {/* Backdrop - solid dark overlay (BlurView unreliable on Android) */}
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={handleClose} />

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          {/* Handle */}
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

            {/* Deadline + Repo row */}
            <View style={styles.twoColRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>DEADLINE</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="calendar" size={16} color={`${Colors.onSurfaceVariant}80`} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. DEC 31"
                    placeholderTextColor={`${Colors.onSurfaceVariant}4D`}
                    value={deadline}
                    onChangeText={setDeadline}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>REPO LINK</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="terminal" size={16} color={`${Colors.onSurfaceVariant}80`} />
                  <TextInput
                    style={[styles.input, { fontFamily: 'JetBrainsMono_400Regular' }]}
                    placeholder="github.com/org/repo"
                    placeholderTextColor={`${Colors.onSurfaceVariant}4D`}
                    value={repoUrl}
                    onChangeText={setRepoUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>

            {/* Priority segmented control */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PRIORITY LEVEL</Text>
              <View style={styles.segmentedControl}>
                {PRIORITY_OPTIONS.map(({ label, value }) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.segmentItem,
                      priority === value && styles.segmentItemActive,
                    ]}
                    onPress={() => setPriority(value)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        priority === value && styles.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Atmospheric visual anchor */}
            <View style={styles.visualAnchor}>
              <View style={styles.visualAnchorGradient} />
              <Text style={styles.visualAnchorCode}>System::READY</Text>
              <View style={styles.visualAnchorDots}>
                <View style={[styles.anchorDot, { backgroundColor: Colors.primaryFixed }]} />
                <View style={[styles.anchorDot, { backgroundColor: `${Colors.onSurfaceVariant}33` }]} />
                <View style={[styles.anchorDot, { backgroundColor: `${Colors.onSurfaceVariant}33` }]} />
              </View>
              <Feather
                name="box"
                size={48}
                color={`${Colors.onSurfaceVariant}1A`}
                style={styles.visualAnchorIcon}
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Sticky footer */}
          <View style={styles.footer}>
            <SafeAreaView edges={['bottom']}>
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Pressable
                  style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
                  onPressIn={handleSavePressIn}
                  onPressOut={handleSavePressOut}
                  onPress={handleSave}
                  disabled={!name.trim()}
                >
                  <Feather name="save" size={20} color={Colors.onPrimaryFixed} />
                  <Text style={styles.saveButtonText}>Save Project</Text>
                </Pressable>
              </Animated.View>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    maxHeight: '90%',
    minHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: `${Colors.onSurfaceVariant}4D`,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    gap: 24,
    paddingBottom: 16,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}B3`,
    letterSpacing: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.onSurface,
  },
  multilineInput: {
    minHeight: 80,
    width: '100%',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}80`,
  },
  tagChipSelected: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryFixed,
  },
  tagChipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurface,
  },
  tagChipTextSelected: {
    color: Colors.onPrimaryFixed,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: Colors.primaryFixed,
  },
  segmentText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Colors.onPrimaryFixed,
  },
  visualAnchor: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualAnchorGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.surfaceContainerHigh,
    opacity: 0.5,
  },
  visualAnchorCode: {
    position: 'absolute',
    top: 16,
    left: 16,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: `${Colors.primaryFixed}66`,
  },
  visualAnchorDots: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  anchorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visualAnchorIcon: {
    position: 'absolute',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}4D`,
    backgroundColor: `${Colors.surfaceContainerLowest}E6`,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onPrimaryFixed,
  },
});
