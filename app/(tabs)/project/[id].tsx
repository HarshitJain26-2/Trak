import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Milestone } from '@/store/useProjectStore';
import { TechPill } from '@/components/common/TechPill';
import { StatusDot } from '@/components/common/StatusDot';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { InviteCodeModal } from '@/components/modals/InviteCodeModal';
import { AestheticCheckbox } from '@/components/common/AestheticCheckbox';

// ─── Milestone Action Modal ────────────────────────────────────────────────────
interface MilestoneActionModalProps {
  visible: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onRename: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
}

function MilestoneActionModal({
  visible,
  milestone,
  onClose,
  onRename,
  onDelete,
}: MilestoneActionModalProps) {
  const colors = useThemeColors();
  if (!milestone) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={actionStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[actionStyles.sheet, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <View style={[actionStyles.handle, { backgroundColor: `${colors.onSurfaceVariant}40` }]} />
              <Text style={[actionStyles.sheetTitle, { color: colors.onSurfaceVariant, borderBottomColor: colors.glassBorder }]} numberOfLines={1}>
                {milestone.title}
              </Text>

              <Pressable
                style={({ pressed }) => [actionStyles.option, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={() => { onClose(); onRename(milestone); }}
              >
                <Feather name="edit-2" size={18} color={colors.primaryFixed} />
                <Text style={[actionStyles.optionText, { color: colors.onSurface }]}>Rename Feature</Text>
              </Pressable>

              <View style={[actionStyles.divider, { backgroundColor: colors.glassBorder }]} />

              <Pressable
                style={({ pressed }) => [actionStyles.option, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={() => { onClose(); onDelete(milestone); }}
              >
                <Feather name="trash-2" size={18} color={colors.error} />
                <Text style={[actionStyles.optionText, { color: colors.error }]}>Delete Feature</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Text Input Modal ──────────────────────────────────────────────────────────
interface TextInputModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

function TextInputModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'Save',
  onClose,
  onConfirm,
}: TextInputModalProps) {
  const colors = useThemeColors();
  const [value, setValue] = useState(initialValue);

  // Reset when modal opens with a new initialValue
  React.useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleConfirm = () => {
    if (value.trim().length === 0) return;
    onConfirm(value.trim());
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={inputStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[inputStyles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
                <Text style={[inputStyles.title, { color: colors.onSurface }]}>{title}</Text>
                <TextInput
                  style={[inputStyles.input, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33`, color: colors.onSurface }]}
                  value={value}
                  onChangeText={setValue}
                  placeholder={placeholder}
                  placeholderTextColor={`${colors.onSurfaceVariant}60`}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  selectionColor={colors.primaryFixed}
                />
                <View style={inputStyles.btnRow}>
                  <Pressable
                    style={({ pressed }) => [
                      inputStyles.btn,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, borderWidth: 1 },
                      pressed && inputStyles.btnPressed,
                    ]}
                    onPress={onClose}
                  >
                    <Text style={[inputStyles.btnCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      inputStyles.btn,
                      { backgroundColor: colors.primaryFixed },
                      pressed && inputStyles.btnPressed,
                      value.trim().length === 0 && inputStyles.btnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={value.trim().length === 0}
                  >
                    <Text style={[inputStyles.btnConfirmText, { color: colors.onPrimaryFixed }]}>{confirmLabel}</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const {
    getProject,
    toggleMilestone,
    addMilestone,
    renameMilestone,
    deleteMilestone,
    markCompleted,
    deleteProject,
    generateInviteCode,
    leaveProject,
  } = useProjectStore();
  const project = getProject(id);
  const insets = useSafeAreaInsets();
  const { dialogProps, ask } = useConfirmDialog();

  const [notesExpanded, setNotesExpanded] = useState(false);
  const notesHeight = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;

  // Milestone management state
  const [actionTarget, setActionTarget] = useState<Milestone | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Collaboration state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const toggleNotes = () => {
    const toExpand = !notesExpanded;
    setNotesExpanded(toExpand);
    Animated.parallel([
      Animated.timing(notesHeight, {
        toValue: toExpand ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(chevronRotation, {
        toValue: toExpand ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMilestoneLongPress = (milestone: Milestone) => {
    setActionTarget(milestone);
    setShowActionSheet(true);
  };

  const handleRequestRename = (milestone: Milestone) => {
    setActionTarget(milestone);
    setShowRenameModal(true);
  };

  const handleRequestDelete = async (milestone: Milestone) => {
    const ok = await ask({
      title: 'Delete Feature',
      message: `Remove "${milestone.title}" from this project?`,
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-2',
    });
    if (ok && project) deleteMilestone(project.id, milestone.id);
  };

  const handleGenerateInviteCode = async () => {
    if (!project) return;
    setIsGeneratingCode(true);
    await generateInviteCode(project.id);
    setIsGeneratingCode(false);
  };

  const handleLeaveProject = async () => {
    if (!project) return;
    const ok = await ask({
      title: 'Leave Project',
      message: `You will no longer have access to "${project.name}". You can rejoin later with an invite code.`,
      confirmLabel: 'Leave',
      destructive: true,
      icon: 'log-out',
    });
    if (ok) {
      leaveProject(project.id);
      router.back();
    }
  };

  if (!project) {
    return (
      <View style={[styles.root, { backgroundColor: colors.surface }]}>
        <SafeAreaView>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.primaryFixed} />
          </Pressable>
        </SafeAreaView>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.onSurface }]}>Project not found</Text>
        </View>
      </View>
    );
  }

  const completedMilestones = project.milestones.filter((m) => m.completed);
  const pendingMilestones = project.milestones.filter((m) => !m.completed);
  const completedCount = completedMilestones.length;
  const totalCount = project.milestones.length;

  const STATUS_COLORS: Record<string, string> = {
    active: colors.primaryFixed,
    blocked: colors.error,
    warning: colors.statusWarning,
    idle: colors.secondaryContainer,
  };

  const chevronDeg = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const notesMaxHeight = notesHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  // Determine if this is a shared project (user is member, not owner)
  const isSharedProject = project.isShared === true;
  const allMembers = project.members || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ConfirmDialog {...dialogProps} />

      {/* Modals */}
      <MilestoneActionModal
        visible={showActionSheet}
        milestone={actionTarget}
        onClose={() => setShowActionSheet(false)}
        onRename={handleRequestRename}
        onDelete={handleRequestDelete}
      />

      <TextInputModal
        visible={showAddModal}
        title="Add Feature"
        placeholder="e.g. API Integration"
        initialValue=""
        confirmLabel="Add"
        onClose={() => setShowAddModal(false)}
        onConfirm={(title) => addMilestone(project.id, title)}
      />

      <TextInputModal
        visible={showRenameModal}
        title="Rename Feature"
        placeholder="Feature name"
        initialValue={actionTarget?.title ?? ''}
        confirmLabel="Save"
        onClose={() => setShowRenameModal(false)}
        onConfirm={(newTitle) => {
          if (actionTarget) renameMilestone(project.id, actionTarget.id, newTitle);
        }}
      />

      <InviteCodeModal
        visible={showInviteModal}
        inviteCode={project.inviteCode || null}
        isGenerating={isGeneratingCode}
        onClose={() => setShowInviteModal(false)}
        onGenerate={handleGenerateInviteCode}
      />

      {/* App Bar */}
      <BlurView
        intensity={60}
        tint={colors.isDark ? 'dark' : 'light'}
        style={[
          styles.appBar,
          { borderBottomColor: colors.glassBorder },
          Platform.OS === 'android' && { backgroundColor: colors.surface },
        ]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <View style={styles.appBarLeft}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={colors.primaryFixed} />
            </Pressable>
            <Text style={[styles.appBarTitle, { color: colors.primaryFixed }]}>Trak</Text>
          </View>
          <View style={styles.appBarRight}>
            {/* Invite button (owner only) */}
            {!isSharedProject && (
              <Pressable
                hitSlop={8}
                style={[styles.inviteBtn, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}
                onPress={() => setShowInviteModal(true)}
              >
                <Feather name="user-plus" size={16} color={colors.primaryFixed} />
              </Pressable>
            )}
            {/* Leave button (member only) */}
            {isSharedProject && (
              <Pressable
                hitSlop={8}
                style={[styles.leaveBtn, { backgroundColor: `${colors.statusWarning}1A`, borderColor: `${colors.statusWarning}30` }]}
                onPress={handleLeaveProject}
              >
                <Feather name="log-out" size={16} color={colors.statusWarning} />
              </Pressable>
            )}
            {/* Delete button (owner only) */}
            {!isSharedProject && (
              <Pressable
                hitSlop={8}
                style={[styles.deleteBtn, { backgroundColor: `${colors.error}1A` }]}
                onPress={async () => {
                  const ok = await ask({
                    title: 'Move to Trash',
                    message: `Move "${project.name}" to the Trash?`,
                    confirmLabel: 'Move to Trash',
                    destructive: true,
                    icon: 'trash-2',
                  });
                  if (ok) { deleteProject(project.id); router.back(); }
                }}
              >
                <Feather name="trash-2" size={18} color={colors.error} />
              </Pressable>
            )}
            {/* Status chip */}
            <View style={[styles.statusChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <StatusDot status={project.status} size={6} />
              <Text style={[styles.statusChipText, { color: colors.onSurfaceVariant }]}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.onSurfaceVariant} />
            </View>
            {/* Priority badge */}
            {project.priority === 'high' && (
              <View style={[styles.priorityBadge, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}4D` }]}>
                <Feather name="alert-circle" size={10} color={colors.error} />
                <Text style={[styles.priorityText, { color: colors.error }]}>HIGH</Text>
              </View>
            )}
          </View>
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Section */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.projectTitle, { color: colors.onSurface }]}>{project.name}</Text>
              <Text style={[styles.projectDesc, { color: colors.onSurfaceVariant }]}>{project.description}</Text>
              {/* Shared project badge */}
              {isSharedProject && project.ownerName && (
                <View style={styles.sharedBadge}>
                  <Feather name="users" size={12} color={colors.secondaryContainer} />
                  <Text style={[styles.sharedBadgeText, { color: colors.secondaryContainer }]}>
                    Shared by {project.ownerName}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.progressPct, { color: colors.primaryFixed }]}>{project.progress}%</Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${project.progress}%`,
                  backgroundColor: STATUS_COLORS[project.status] ?? colors.primaryFixed,
                },
              ]}
            />
          </View>

          {/* Meta pills */}
          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="clock" size={12} color={colors.onSurfaceVariant} />
              <Text style={[styles.metaPillText, { color: colors.onSurfaceVariant }]}>04d 12h 41m</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
              <Feather name="terminal" size={12} color={colors.secondaryFixed} />
              <Text style={[styles.metaPillText, { color: colors.secondaryFixed }]}>
                {project.version}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Team Section ── */}
        {allMembers.length > 0 && (
          <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
            <View style={styles.teamHeader}>
              <Text style={[styles.teamTitle, { color: colors.onSurface }]}>Team</Text>
              <View style={[styles.teamCount, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                <Text style={[styles.teamCountText, { color: colors.primaryFixed }]}>{allMembers.length + 1}</Text>
              </View>
            </View>
            <View style={styles.teamAvatars}>
              {/* Owner avatar (always shown) */}
              {!isSharedProject && (
                <View style={[styles.memberChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                  <MemberAvatar name="You" size={28} />
                  <Text style={[styles.memberName, { color: colors.onSurface }]}>You (Owner)</Text>
                </View>
              )}
              {isSharedProject && project.ownerName && (
                <View style={[styles.memberChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                  <MemberAvatar name={project.ownerName} size={28} />
                  <Text style={[styles.memberName, { color: colors.onSurface }]}>{project.ownerName} (Owner)</Text>
                </View>
              )}
              {/* Member avatars */}
              {allMembers.map((member) => (
                <View key={member.id} style={[styles.memberChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                  <MemberAvatar name={member.name} size={28} />
                  <Text style={[styles.memberName, { color: colors.onSurface }]}>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Repo link */}
        <Pressable style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]} onPress={() => {}}>
          <View style={styles.repoRow}>
            <View style={styles.repoLeft}>
              <Feather name="github" size={20} color={colors.onSurfaceVariant} />
              <View>
                <Text style={[styles.repoLabel, { color: colors.onSurfaceVariant }]}>Repository</Text>
                <Text style={[styles.repoUrl, { color: colors.secondary }]}>{project.repoUrl}</Text>
              </View>
            </View>
            <Feather name="external-link" size={16} color={colors.onSurfaceVariant} />
          </View>
        </Pressable>

        {/* Tech Stack */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>ENVIRONMENT</Text>
          <View style={styles.techRow}>
            {project.techStack.map((tech) => (
              <TechPill key={tech} label={tech} />
            ))}
          </View>
        </View>

        {/* ── Features / Milestones ── */}
        <View style={[styles.glassCardNoPad, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={[styles.milestonesHeader, { borderBottomColor: colors.glassBorder }]}>
            <Text style={[styles.milestonesTitle, { color: colors.onSurface }]}>Features</Text>
            <View style={styles.milestonesHeaderRight}>
              <View style={[styles.milestonesCount, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.milestonesCountText, { color: colors.onSurfaceVariant }]}>
                  {completedCount}/{totalCount}
                </Text>
              </View>
              {/* Add milestone button */}
              <Pressable
                style={({ pressed }) => [styles.addBtn, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }, pressed && styles.addBtnPressed]}
                onPress={() => setShowAddModal(true)}
                hitSlop={6}
              >
                <Feather name="plus" size={16} color={colors.primaryFixed} />
              </Pressable>
            </View>
          </View>

          {totalCount === 0 && (
            <Pressable style={styles.emptyMilestone} onPress={() => setShowAddModal(true)}>
              <Feather name="flag" size={20} color={`${colors.primaryFixed}60`} />
              <Text style={[styles.emptyMilestoneText, { color: colors.onSurfaceVariant }]}>No features yet — tap + to add one</Text>
            </Pressable>
          )}

          {pendingMilestones.length > 0 && (
            <View style={[styles.subSectionHeader, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.subSectionTitle, { color: colors.onSurfaceVariant }]}>To be done</Text>
            </View>
          )}
          {pendingMilestones.map((milestone, index) => (
            <View
              key={milestone.id}
              style={[
                styles.milestoneRow,
                index < pendingMilestones.length - 1 && { borderBottomColor: colors.glassBorder, borderBottomWidth: 1 },
              ]}
            >
              {/* Aesthetic Checkbox with fancy loading spinner */}
              <AestheticCheckbox
                completed={false}
                onToggle={() => toggleMilestone(project.id, milestone.id)}
                size={22}
              />
              <Pressable
                style={styles.milestoneContent}
                onPress={() => toggleMilestone(project.id, milestone.id)}
                onLongPress={() => handleMilestoneLongPress(milestone)}
                delayLongPress={400}
              >
                <Text style={[styles.milestoneText, { color: colors.onSurface }]}>
                  {milestone.title}
                </Text>
                {milestone.addedBy && (
                  <Text style={[styles.addedByText, { color: colors.onSurfaceVariant }]}>Added by {milestone.addedBy}</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.editHint}
                onPress={() => handleMilestoneLongPress(milestone)}
                hitSlop={8}
              >
                <Feather name="more-horizontal" size={16} color={`${colors.onSurfaceVariant}50`} />
              </Pressable>
            </View>
          ))}

          {completedMilestones.length > 0 && (
            <View style={[styles.subSectionHeader, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.subSectionTitle, { color: colors.onSurfaceVariant }]}>Completed</Text>
            </View>
          )}
          {completedMilestones.map((milestone, index) => (
            <View
              key={milestone.id}
              style={[
                styles.milestoneRow,
                index < completedMilestones.length - 1 && { borderBottomColor: colors.glassBorder, borderBottomWidth: 1 },
              ]}
            >
              {/* Aesthetic Checkbox with fancy loading spinner */}
              <AestheticCheckbox
                completed={true}
                onToggle={() => toggleMilestone(project.id, milestone.id)}
                size={22}
              />
              <Pressable
                style={styles.milestoneContent}
                onPress={() => toggleMilestone(project.id, milestone.id)}
                onLongPress={() => handleMilestoneLongPress(milestone)}
                delayLongPress={400}
              >
                <Text style={[styles.milestoneText, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                  {milestone.title}
                </Text>
                {milestone.completedBy && (
                  <View style={[styles.doneByBadge, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}33` }]}>
                    <Feather name="check-circle" size={10} color={colors.primaryFixed} />
                    <Text style={[styles.doneByText, { color: colors.primaryFixed }]}>Done by {milestone.completedBy}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                style={styles.editHint}
                onPress={() => handleMilestoneLongPress(milestone)}
                hitSlop={8}
              >
                <Feather name="more-horizontal" size={16} color={`${colors.onSurfaceVariant}50`} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Developer Notes (collapsible) */}
        <View style={[styles.glassCardNoPad, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Pressable style={styles.notesToggle} onPress={toggleNotes}>
            <View style={styles.notesToggleLeft}>
              <Feather name="file-text" size={18} color={colors.onSurfaceVariant} />
              <Text style={[styles.notesTitle, { color: colors.onSurface }]}>Developer Notes</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
              <Feather name="chevron-down" size={20} color={colors.onSurfaceVariant} />
            </Animated.View>
          </Pressable>
          <Animated.View style={{ maxHeight: notesMaxHeight, overflow: 'hidden' }}>
            <View style={[styles.notesBorder, { backgroundColor: colors.glassBorder }]} />
            <View style={styles.notesContent}>
              {project.notes.split('\n').map((line, i) => (
                <Text
                  key={i}
                  style={[
                    styles.notesText,
                    { color: colors.onSurfaceVariant },
                    line.startsWith('###') && { color: colors.onSurface, fontFamily: 'Inter_600SemiBold' },
                  ]}
                >
                  {line.startsWith('-') ? (
                    <Text>
                      <Text style={{ color: colors.primaryFixed }}>- </Text>
                      {line.slice(2)}
                    </Text>
                  ) : (
                    line.replace('### ', '')
                  )}
                </Text>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Mark as Complete / Leave Project */}
        {!isSharedProject ? (
          !project.isCompleted ? (
            <Pressable
              style={({ pressed }) => [styles.completeBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, borderWidth: 1 }, pressed && styles.completeBtnPressed]}
              onPress={async () => {
                const ok = await ask({
                  title: 'Mark as Completed',
                  message: `Move "${project.name}" to Completed Projects?`,
                  confirmLabel: 'Mark Completed',
                  destructive: false,
                  icon: 'check-circle',
                });
                if (ok) { markCompleted(project.id); router.back(); }
              }}
            >
              <Feather name="check-circle" size={18} color={colors.primaryFixed} />
              <Text style={[styles.completeBtnText, { color: colors.primaryFixed }]}>Mark as Completed</Text>
            </Pressable>
          ) : (
            <View style={[styles.alreadyCompleted, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}33` }]}>
              <Feather name="check-circle" size={16} color={colors.primaryFixed} />
              <Text style={[styles.alreadyCompletedText, { color: colors.primaryFixed }]}>Project Completed</Text>
            </View>
          )
        ) : (
          <Pressable
            style={({ pressed }) => [styles.leaveProjectBtn, { backgroundColor: `${colors.statusWarning}1A`, borderColor: `${colors.statusWarning}33` }, pressed && styles.leaveProjectBtnPressed]}
            onPress={handleLeaveProject}
          >
            <Feather name="log-out" size={18} color={colors.statusWarning} />
            <Text style={[styles.leaveProjectBtnText, { color: colors.statusWarning }]}>Leave Project</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}4D`,
    overflow: 'hidden',
  },
  appBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: 999,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}30`,
  },
  leaveBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: `${Colors.statusWarning}1A`,
    borderWidth: 1,
    borderColor: `${Colors.statusWarning}30`,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: `${Colors.error}1A`,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  statusChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${Colors.errorContainer}33`,
    borderWidth: 1,
    borderColor: `${Colors.error}4D`,
    borderRadius: 4,
  },
  priorityText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: Colors.error,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 96,
  },
  glassCard: {
    backgroundColor: 'rgba(17,20,27,0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  glassCardNoPad: {
    backgroundColor: 'rgba(17,20,27,0.8)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  projectTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  projectDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `${Colors.secondaryContainer}1A`,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${Colors.secondaryContainer}30`,
    alignSelf: 'flex-start',
  },
  sharedBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: Colors.secondaryContainer,
  },
  progressPct: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.primaryFixed,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
    borderRadius: 4,
  },
  metaPillText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurface,
  },
  // ── Team Section ──
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  teamTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  teamCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  teamCountText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  teamAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
  },
  memberName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repoLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  repoUrl: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 2,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 2,
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // ── Milestones / Features ──
  milestonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: `${Colors.surfaceContainerHighest}4D`,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}1A`,
  },
  milestonesTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onSurface,
  },
  milestonesHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestonesCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  milestonesCountText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  subSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}1A`,
  },
  subSectionTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: {
    backgroundColor: `${Colors.primaryFixed}30`,
  },
  emptyMilestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  emptyMilestoneText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.onSurfaceVariant}60`,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  milestoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}1A`,
  },
  milestoneContent: {
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryFixed,
  },
  milestoneText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.onSurface,
  },
  milestoneTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  addedByText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}60`,
    marginTop: 3,
  },
  doneByBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${Colors.primaryFixed}10`,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  doneByText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: `${Colors.primaryFixed}B0`,
  },
  editHint: {
    marginLeft: 'auto',
    padding: 2,
  },
  // ── Notes ──
  notesToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  notesToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notesTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onSurface,
  },
  notesBorder: {
    height: 1,
    backgroundColor: `${Colors.outlineVariant}1A`,
  },
  notesContent: {
    padding: 16,
    paddingTop: 12,
    gap: 6,
  },
  notesText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  notesHeading: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.onSurface,
    fontSize: 13,
    marginTop: 8,
  },
  notesBullet: {
    paddingLeft: 4,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}40`,
  },
  completeBtnPressed: {
    backgroundColor: `${Colors.primaryFixed}30`,
  },
  completeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.primaryFixed,
  },
  alreadyCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${Colors.primaryFixed}0D`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}20`,
  },
  alreadyCompletedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.primaryFixed}80`,
  },
  leaveProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: `${Colors.statusWarning}15`,
    borderWidth: 1,
    borderColor: `${Colors.statusWarning}40`,
  },
  leaveProjectBtnPressed: {
    backgroundColor: `${Colors.statusWarning}25`,
  },
  leaveProjectBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.statusWarning,
  },
});

// ─── Action Sheet Styles ───────────────────────────────────────────────────────
const actionStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1F2B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  optionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
  },
});

// ─── Input Modal Styles ────────────────────────────────────────────────────────
const inputStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1F2B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btnConfirm: {
    backgroundColor: Colors.primaryFixed,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnCancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurfaceVariant,
  },
  btnConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.onPrimaryFixed,
  },
});
