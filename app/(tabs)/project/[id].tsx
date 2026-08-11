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
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Milestone, ProjectMember } from '@/store/useProjectStore';
import { TechPill } from '@/components/common/TechPill';
import { StatusDot } from '@/components/common/StatusDot';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { InviteCodeModal } from '@/components/modals/InviteCodeModal';
import { CalendarPickerModal } from '@/components/modals/CalendarPickerModal';
import { AestheticCheckbox } from '@/components/common/AestheticCheckbox';
import { IncompleteTasksWarningModal } from '@/components/modals/IncompleteTasksWarningModal';
import { supabase } from '@/services/supabase';
import { getActiveUserId } from '@/utils/deviceUser';
import { notificationService } from '@/services/notifications';

function formatRemainingTime(deadlineStr: string): string {
  if (!deadlineStr || deadlineStr === 'No Deadline') return 'No Deadline';
  const target = new Date(deadlineStr).getTime();
  if (isNaN(target)) return deadlineStr;

  const diffMs = target - Date.now();
  if (diffMs <= 0) {
    const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    return overdueDays === 0 ? 'Overdue today' : `Overdue by ${overdueDays}d`;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

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
                <Text style={[actionStyles.optionText, { color: colors.onSurface }]}>Edit Feature</Text>
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

// ─── Feature Input Modal ────────────────────────────────────────────────────────
interface FeatureInputModalProps {
  visible: boolean;
  title: string;
  initialTitle?: string;
  initialDescription?: string;
  initialDeadline?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (title: string, description?: string, deadline?: string) => void;
}

function FeatureInputModal({
  visible,
  title,
  initialTitle = '',
  initialDescription = '',
  initialDeadline = '',
  confirmLabel = 'Save',
  onClose,
  onConfirm,
}: FeatureInputModalProps) {
  const colors = useThemeColors();
  const [valTitle, setValTitle] = useState(initialTitle);
  const [valDesc, setValDesc] = useState(initialDescription);
  const [valDeadline, setValDeadline] = useState(initialDeadline);
  const [calendarVisible, setCalendarVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setValTitle(initialTitle);
      setValDesc(initialDescription);
      setValDeadline(initialDeadline);
    }
  }, [visible, initialTitle, initialDescription, initialDeadline]);

  const handleConfirm = () => {
    if (valTitle.trim().length === 0) return;
    onConfirm(valTitle.trim(), valDesc.trim() || undefined, valDeadline.trim() || undefined);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <CalendarPickerModal
        visible={calendarVisible}
        value={valDeadline}
        onClose={() => setCalendarVisible(false)}
        onSelect={(d) => {
          setValDeadline(d);
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={inputStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[inputStyles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
                <Text style={[inputStyles.title, { color: colors.onSurface }]}>{title}</Text>
                
                <Text style={[inputStyles.fieldLabel, { color: colors.onSurfaceVariant }]}>TITLE *</Text>
                <TextInput
                  style={[inputStyles.input, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33`, color: colors.onSurface }]}
                  value={valTitle}
                  onChangeText={setValTitle}
                  placeholder="e.g. Google Authentication"
                  placeholderTextColor={`${colors.onSurfaceVariant}60`}
                  autoFocus
                  selectionColor={colors.primaryFixed}
                />

                <Text style={[inputStyles.fieldLabel, { color: colors.onSurfaceVariant }]}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={[inputStyles.input, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33`, color: colors.onSurface, minHeight: 60 }]}
                  value={valDesc}
                  onChangeText={setValDesc}
                  placeholder="Feature scope or technical details..."
                  placeholderTextColor={`${colors.onSurfaceVariant}60`}
                  multiline
                  selectionColor={colors.primaryFixed}
                />

                <Text style={[inputStyles.fieldLabel, { color: colors.onSurfaceVariant }]}>DEADLINE (OPTIONAL)</Text>
                <Pressable
                  style={[
                    inputStyles.input,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: `${colors.primaryFixed}33`,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                    },
                  ]}
                  onPress={() => setCalendarVisible(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Feather name="calendar" size={16} color={colors.primaryFixed} />
                    <Text style={{ color: valDeadline && valDeadline !== 'No Deadline' ? colors.onSurface : `${colors.onSurfaceVariant}60`, fontFamily: 'Inter_400Regular', fontSize: 14 }}>
                      {valDeadline || 'Select Date or No Deadline'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.onSurfaceVariant} />
                </Pressable>

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
                      valTitle.trim().length === 0 && inputStyles.btnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={valTitle.trim().length === 0}
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
    editMilestone,
    renameMilestone,
    deleteMilestone,
    markCompleted,
    deleteProject,
    updateProject,
    generateInviteCode,
    leaveProject,
    fetchProjectMembers,
    removeMember,
  } = useProjectStore();
  const project = getProject(id);
  const insets = useSafeAreaInsets();
  const { dialogProps, ask } = useConfirmDialog();

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!project) return;
    try {
      await toggleMilestone(project.id, milestoneId);
    } catch (err: any) {
      if (err?.message === 'ONLY_OWNER_CAN_UNDO') {
        Alert.alert('Leader Action Required', 'Only the project leader can undo completed features.');
      }
    }
  };

  const [notesExpanded, setNotesExpanded] = useState(false);
  const notesHeight = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;

  // Milestone management state
  const [actionTarget, setActionTarget] = useState<Milestone | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Repository edit state
  const [showEditRepoModal, setShowEditRepoModal] = useState(false);
  const [repoInput, setRepoInput] = useState('');

  const handleSaveRepo = async () => {
    if (!project) return;
    const clean = repoInput.trim().replace(/^https?:\/\//, '');
    await updateProject(project.id, { repoUrl: clean });
    setShowEditRepoModal(false);
  };

  // Collaboration state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Team Members state
  const [fetchedMembers, setFetchedMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    if (!project) return;
    let isMounted = true;

    // Fetch team members
    fetchProjectMembers(project.id).then((m) => {
      if (isMounted && m) {
        setFetchedMembers(m);
      }
    });

    // If shared project (user is member), verify active membership
    if (project.isShared) {
      getActiveUserId().then(async (activeUserId) => {
        const { data: memberRow } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', activeUserId)
          .maybeSingle();

        if (isMounted && !memberRow) {
          // User was removed by leader! Revoke access immediately
          void notificationService.sendImmediateNotification(
            '🚨 Removed from Project',
            `The project leader removed you from "${project.name}".`
          );
          Alert.alert(
            'Access Revoked',
            `You have been removed from "${project.name}" by the project leader.`,
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          // Purge removed project from local state
          useProjectStore.setState((state) => ({
            projects: state.projects.filter((p) => p.id !== project.id),
          }));
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [project?.id, project?.isShared]);

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!project) return;
    const ok = await ask({
      title: 'Remove Member',
      message: `Remove "${member.name}" from ${project.name}? They will no longer have access to this project.`,
      confirmLabel: 'Remove',
      destructive: true,
      icon: 'trash-2',
    });
    if (ok) {
      await removeMember(project.id, member.userId);
      setFetchedMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    }
  };

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
    setShowInviteModal(true);
    if (!project.inviteCode) {
      setIsGeneratingCode(true);
      await generateInviteCode(project.id);
      setIsGeneratingCode(false);
    }
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

  useEffect(() => {
    if (!project) {
      router.replace('/(tabs)');
    }
  }, [project]);

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
  const allMembers = fetchedMembers.length > 0 ? fetchedMembers : (project.members || []);

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

      <FeatureInputModal
        visible={showAddModal}
        title="Add Feature"
        confirmLabel="Add"
        onClose={() => setShowAddModal(false)}
        onConfirm={(title, desc, dl) => addMilestone(project.id, title, desc, dl)}
      />

      <FeatureInputModal
        visible={showRenameModal}
        title="Edit Feature"
        initialTitle={actionTarget?.title ?? ''}
        initialDescription={actionTarget?.description ?? ''}
        initialDeadline={actionTarget?.deadline ?? ''}
        confirmLabel="Save"
        onClose={() => setShowRenameModal(false)}
        onConfirm={(newTitle, newDesc, newDl) => {
          if (actionTarget) editMilestone(project.id, actionTarget.id, { title: newTitle, description: newDesc, deadline: newDl });
        }}
      />

      <InviteCodeModal
        visible={showInviteModal}
        inviteCode={project.inviteCode || null}
        isGenerating={isGeneratingCode}
        onClose={() => setShowInviteModal(false)}
        onGenerate={handleGenerateInviteCode}
      />

      <IncompleteTasksWarningModal
        visible={showWarningModal}
        projectName={project.name}
        incompleteMilestones={pendingMilestones}
        onClose={() => setShowWarningModal(false)}
        onIgnoreAndComplete={() => {
          setShowWarningModal(false);
          markCompleted(project.id);
          router.back();
        }}
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
              <Text style={[styles.metaPillText, { color: colors.onSurfaceVariant }]}>{formatRemainingTime(project.deadline)}</Text>
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
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.teamHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="users" size={16} color={colors.primaryFixed} />
              <Text style={[styles.teamTitle, { color: colors.onSurface }]}>Team Members</Text>
            </View>
            <View style={[styles.teamCount, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
              <Text style={[styles.teamCountText, { color: colors.primaryFixed }]}>{allMembers.length + 1}</Text>
            </View>
          </View>
          <View style={styles.teamAvatars}>
            {/* Leader avatar (always shown) */}
            {!isSharedProject ? (
              <View style={[styles.memberChip, { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}40` }]}>
                <MemberAvatar name="You" size={28} />
                <Text style={[styles.memberName, { color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' }]}>You (Leader)</Text>
              </View>
            ) : (
              project.ownerName && (
                <View style={[styles.memberChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                  <MemberAvatar name={project.ownerName} size={28} />
                  <Text style={[styles.memberName, { color: colors.onSurface }]}>{project.ownerName} (Leader)</Text>
                </View>
              )
            )}
            {/* Member avatars */}
            {allMembers.map((member) => (
              <View key={member.id || member.userId} style={[styles.memberChip, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                <MemberAvatar name={member.name} size={28} />
                <Text style={[styles.memberName, { color: colors.onSurface }]}>{member.name}</Text>
                {!isSharedProject && (
                  <Pressable
                    onPress={() => handleRemoveMember(member)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.removeMemberBtn,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Feather name="x" size={14} color={colors.error} />
                  </Pressable>
                )}
              </View>
            ))}

            {/* Invite Member Chip for Leader */}
            {!isSharedProject && (
              <Pressable
                onPress={handleGenerateInviteCode}
                style={({ pressed }) => [
                  styles.addMemberChip,
                  { backgroundColor: `${colors.primaryFixed}0A`, borderColor: `${colors.primaryFixed}30` },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="user-plus" size={14} color={colors.primaryFixed} />
                <Text style={[styles.addMemberText, { color: colors.primaryFixed }]}>Invite Member</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Repo link */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.repoRow}>
            <Pressable
              style={[styles.repoLeft, { flex: 1 }]}
              onPress={() => {
                if (project.repoUrl) {
                  const url = project.repoUrl.startsWith('http')
                    ? project.repoUrl
                    : `https://${project.repoUrl}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Link Error', `Could not open ${project.repoUrl}`);
                  });
                } else if (!isSharedProject) {
                  setRepoInput('');
                  setShowEditRepoModal(true);
                }
              }}
            >
              <Feather name="github" size={20} color={project.repoUrl ? colors.primaryFixed : colors.onSurfaceVariant} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.repoLabel, { color: colors.onSurfaceVariant }]}>REPOSITORY</Text>
                <Text
                  style={[
                    styles.repoUrl,
                    { color: project.repoUrl ? colors.secondary : `${colors.onSurfaceVariant}70` },
                    !project.repoUrl && { fontStyle: 'italic' },
                  ]}
                  numberOfLines={1}
                >
                  {project.repoUrl || '+ Add Git repository URL'}
                </Text>
              </View>
            </Pressable>

            {!isSharedProject && (
              <Pressable
                style={({ pressed }) => [
                  styles.editRepoBtn,
                  { backgroundColor: `${colors.primaryFixed}15`, borderColor: `${colors.primaryFixed}30` },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setRepoInput(project.repoUrl || '');
                  setShowEditRepoModal(true);
                }}
                hitSlop={8}
              >
                <Feather name={project.repoUrl ? 'edit-2' : 'plus'} size={14} color={colors.primaryFixed} />
                <Text style={[styles.editRepoBtnText, { color: colors.primaryFixed }]}>
                  {project.repoUrl ? 'Edit' : 'Add'}
                </Text>
              </Pressable>
            )}
            {isSharedProject && project.repoUrl ? (
              <Feather name="external-link" size={16} color={colors.onSurfaceVariant} />
            ) : null}
          </View>
        </View>

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
                onToggle={() => handleToggleMilestone(milestone.id)}
                size={22}
              />
              <Pressable
                style={styles.milestoneContent}
                onPress={() => handleToggleMilestone(milestone.id)}
                onLongPress={() => handleMilestoneLongPress(milestone)}
                delayLongPress={400}
              >
                <Text style={[styles.milestoneText, { color: colors.onSurface }]}>
                  {milestone.title}
                </Text>
                {milestone.description ? (
                  <Text style={[styles.addedByText, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    {milestone.description}
                  </Text>
                ) : null}
                {milestone.deadline ? (
                  <View style={[styles.doneByBadge, { backgroundColor: `${colors.secondaryContainer}20`, borderColor: `${colors.secondaryContainer}40`, marginTop: 4 }]}>
                    <Feather name="clock" size={10} color={colors.secondaryContainer} />
                    <Text style={[styles.doneByText, { color: colors.secondaryContainer }]}>
                      Due: {milestone.deadline}
                    </Text>
                  </View>
                ) : null}
                {milestone.addedBy && !milestone.description && !milestone.deadline ? (
                  <Text style={[styles.addedByText, { color: colors.onSurfaceVariant }]}>Added by {milestone.addedBy}</Text>
                ) : null}
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
                onToggle={() => handleToggleMilestone(milestone.id)}
                size={22}
              />
              <Pressable
                style={styles.milestoneContent}
                onPress={() => handleToggleMilestone(milestone.id)}
                onLongPress={() => handleMilestoneLongPress(milestone)}
                delayLongPress={400}
              >
                <Text style={[styles.milestoneText, { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>
                  {milestone.title}
                </Text>
                {milestone.description ? (
                  <Text style={[styles.addedByText, { color: `${colors.onSurfaceVariant}80`, textDecorationLine: 'line-through', marginTop: 2 }]}>
                    {milestone.description}
                  </Text>
                ) : null}
                {milestone.completedBy && (
                  <View style={[styles.doneByBadge, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}33`, marginTop: 4 }]}>
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
                if (pendingMilestones.length > 0) {
                  setShowWarningModal(true);
                } else {
                  const ok = await ask({
                    title: 'Mark as Completed',
                    message: `Move "${project.name}" to Completed Projects?`,
                    confirmLabel: 'Mark Completed',
                    destructive: false,
                    icon: 'check-circle',
                  });
                  if (ok) { markCompleted(project.id); router.back(); }
                }
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

      {/* Edit Repo Modal */}
      <Modal transparent animationType="fade" visible={showEditRepoModal} onRequestClose={() => setShowEditRepoModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setShowEditRepoModal(false)}>
            <View style={editRepoStyles.overlay}>
              <TouchableWithoutFeedback>
                <View style={[editRepoStyles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
                  <View style={editRepoStyles.header}>
                    <View style={[editRepoStyles.iconCircle, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                      <Feather name="github" size={20} color={colors.primaryFixed} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[editRepoStyles.title, { color: colors.onSurface }]}>
                        {project?.repoUrl ? 'Edit Repository URL' : 'Add Git Repository'}
                      </Text>
                      <Text style={[editRepoStyles.subtitle, { color: colors.onSurfaceVariant }]}>
                        Link your GitHub, GitLab, or Bitbucket repository
                      </Text>
                    </View>
                  </View>

                  <Text style={[editRepoStyles.fieldLabel, { color: colors.onSurfaceVariant }]}>REPOSITORY URL</Text>
                  <View style={[editRepoStyles.inputWrapper, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33` }]}>
                    <Feather name="link" size={16} color={`${colors.onSurfaceVariant}80`} />
                    <TextInput
                      style={[editRepoStyles.input, { color: colors.onSurface }]}
                      placeholder="github.com/username/repository"
                      placeholderTextColor={`${colors.onSurfaceVariant}50`}
                      value={repoInput}
                      onChangeText={setRepoInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      selectionColor={colors.primaryFixed}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveRepo}
                    />
                    {repoInput ? (
                      <Pressable onPress={() => setRepoInput('')} hitSlop={8}>
                        <Feather name="x" size={16} color={colors.onSurfaceVariant} />
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={editRepoStyles.btnRow}>
                    <Pressable
                      style={[editRepoStyles.btn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder, borderWidth: 1 }]}
                      onPress={() => setShowEditRepoModal(false)}
                    >
                      <Text style={[editRepoStyles.btnCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[editRepoStyles.btn, { backgroundColor: colors.primaryFixed }]}
                      onPress={handleSaveRepo}
                    >
                      <Text style={[editRepoStyles.btnSaveText, { color: colors.onPrimaryFixed }]}>Save URL</Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
  removeMemberBtn: {
    marginLeft: 2,
    padding: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  addMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMemberText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
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
  editRepoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editRepoBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
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
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 4,
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

const editRepoStyles = StyleSheet.create({
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  btnSaveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
