import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { IncompleteTasksWarningModal } from '@/components/modals/IncompleteTasksWarningModal';

// ─── Project Action Modal ─────────────────────────────────────────────────────
interface ProjectActionModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
}

export const ProjectActionModal: React.FC<ProjectActionModalProps> = ({
  visible,
  project,
  onClose,
}) => {
  const colors = useThemeColors();
  const router = useRouter();
  const { deleteProject, restoreProject, permanentlyDeleteProject, markCompleted, unmarkCompleted, togglePinProject, leaveProject } =
    useProjectStore();
  const { dialogProps, ask, notify } = useConfirmDialog();
  const [warningModalVisible, setWarningModalVisible] = React.useState(false);

  if (!project && !warningModalVisible) return null;

  const isDeleted = !!project?.isDeleted;
  const isCompleted = !!project?.isCompleted;
  const isPinned = !!project?.isPinned;
  const isShared = !!project?.isShared;

  const handleViewDetails = () => {
    onClose();
    if (project) router.push(`/project/${project.id}`);
  };

  const handleTogglePin = () => {
    if (!project) return;
    onClose();
    togglePinProject(project.id);
  };

  const handleLeaveProject = async () => {
    if (!project) return;
    const ok = await ask({
      title: 'Leave Project',
      message: `Are you sure you want to leave "${project.name}"?`,
      confirmLabel: 'Leave',
      destructive: true,
      icon: 'log-out',
    });
    if (ok) {
      onClose();
      leaveProject(project.id);
    }
  };

  const handleToggleComplete = async () => {
    if (!project) return;
    if (isShared) {
      notify({
        title: 'Leader Only',
        message: isCompleted
          ? 'Only the project leader can reactivate this project.'
          : 'Only the project leader can mark this project as complete.',
        icon: 'lock',
        confirmLabel: 'Got It',
      });
      return;
    }

    if (isCompleted) {
      const ok = await ask({
        title: 'Reactivate Project',
        message: `Move "${project.name}" back to Active Deployments?`,
        confirmLabel: 'Reactivate',
        destructive: false,
        icon: 'rotate-ccw',
      });
      if (ok) { onClose(); unmarkCompleted(project.id); }
    } else {
      const incomplete = project.milestones?.filter((m) => !m.completed) || [];
      if (incomplete.length > 0) {
        onClose();
        setWarningModalVisible(true);
      } else {
        const ok = await ask({
          title: 'Mark as Completed',
          message: `Move "${project.name}" to your Completed (Shipped) tab?`,
          confirmLabel: 'Mark Completed',
          destructive: false,
          icon: 'check-circle',
        });
        if (ok) { onClose(); markCompleted(project.id); }
      }
    }
  };

  const handleDeleteOrRestore = async () => {
    if (!project) return;
    if (isDeleted) {
      const ok = await ask({
        title: 'Restore Project',
        message: `Restore "${project.name}" back to Active Deployments?`,
        confirmLabel: 'Restore',
        destructive: false,
        icon: 'rotate-ccw',
      });
      if (ok) { onClose(); restoreProject(project.id); }
    } else {
      const ok = await ask({
        title: 'Move to Trash',
        message: `Are you sure you want to delete "${project.name}"?\nIt will be moved to the Trash.`,
        confirmLabel: 'Move to Trash',
        destructive: true,
        icon: 'trash-2',
      });
      if (ok) { onClose(); deleteProject(project.id); }
    }
  };

  const handlePermanentDelete = async () => {
    if (!project) return;
    const ok = await ask({
      title: 'Delete Forever',
      message: `This will permanently erase "${project.name}" from your workspace.\nThis action cannot be undone.`,
      confirmLabel: 'Delete Forever',
      destructive: true,
      icon: 'x-circle',
    });
    if (ok) { onClose(); permanentlyDeleteProject(project.id); }
  };

  const handleCopyRepo = () => {
    if (!project) return;
    onClose();
    if (project.repoUrl) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(project.repoUrl);
        }
      } catch (_) {}
    }
  };

  return (
    <>
      <ConfirmDialog {...dialogProps} />

      {project && (
        <IncompleteTasksWarningModal
          visible={warningModalVisible}
          projectName={project.name}
          incompleteMilestones={project.milestones?.filter((m) => !m.completed) || []}
          onClose={() => setWarningModalVisible(false)}
          onIgnoreAndComplete={async () => {
            setWarningModalVisible(false);
            if (isShared) {
              notify({
                title: 'Leader Only',
                message: 'Only the project leader can mark this project as complete.',
                icon: 'lock',
                confirmLabel: 'Got It',
              });
              return;
            }
            const res = await markCompleted(project.id);
            if (res?.error) {
              notify({
                title: 'Permission Denied',
                message: res.error,
                icon: 'alert-triangle',
                confirmLabel: 'Got It',
              });
            }
          }}
        />
      )}

      {project && (
        <Modal transparent animationType="fade" visible={visible && !!project} onRequestClose={onClose}>
          <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder },
              ]}
              onPress={() => {}}
            >
              <View style={[styles.handle, { backgroundColor: `${colors.onSurfaceVariant}40` }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={[styles.projectName, { color: colors.onSurface }]} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={[styles.versionTag, { color: colors.primaryFixed, borderColor: `${colors.primaryFixed}33`, backgroundColor: `${colors.primaryFixed}1A` }]}>
                    {project.version}
                  </Text>
                </View>
                <Text style={[styles.projectDesc, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  {project.description || 'No description provided'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: `${colors.outlineVariant}20` }]} />

              <View style={styles.optionsList}>
                {/* View Details */}
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                    pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                  ]}
                  onPress={handleViewDetails}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}1A` }]}>
                    <Feather name="eye" size={18} color={colors.primaryFixed} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: colors.onSurface }]}>View Project Details</Text>
                    <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>Open telemetry & feature milestones</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={`${colors.onSurfaceVariant}60`} />
                </Pressable>

                {/* Pin / Unpin Project */}
                {!isDeleted && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                      pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                    ]}
                    onPress={handleTogglePin}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primaryFixed}1A` }]}>
                      <Feather
                        name="bookmark"
                        size={18}
                        color={colors.primaryFixed}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.onSurface }]}>
                        {isPinned ? 'Unpin Project' : 'Pin Project'}
                      </Text>
                      <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                        {isPinned ? 'Remove from top of active deployments' : 'Keep at top of active deployments'}
                      </Text>
                    </View>
                  </Pressable>
                )}

                {/* Mark Complete / Reactivate */}
                {!isDeleted && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                      pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                    ]}
                    onPress={handleToggleComplete}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isShared
                            ? `${colors.onSurfaceVariant}15`
                            : isCompleted
                            ? `${colors.secondary}1A`
                            : `${colors.primaryFixed}1A`,
                        },
                      ]}
                    >
                      <Feather
                        name={isShared ? 'lock' : isCompleted ? 'rotate-ccw' : 'check-circle'}
                        size={18}
                        color={isShared ? colors.onSurfaceVariant : isCompleted ? colors.secondary : colors.primaryFixed}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.optionTitle, { color: colors.onSurface }]}>
                          {isCompleted ? 'Reactivate Project' : 'Mark as Completed'}
                        </Text>
                        {isShared && (
                          <View style={{ backgroundColor: `${colors.onSurfaceVariant}1A`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: colors.onSurfaceVariant }}>LEADER ONLY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                        {isShared
                          ? 'Only the project leader can change project completion status'
                          : isCompleted
                          ? 'Move back to Active Deployments'
                          : 'Move project to shipped tab'}
                      </Text>
                    </View>
                  </Pressable>
                )}

                {/* Copy Repo URL */}
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                    pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                  ]}
                  onPress={handleCopyRepo}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.secondary}1A` }]}>
                    <Feather name="copy" size={18} color={colors.secondary} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: colors.onSurface }]}>Copy Repository URL</Text>
                    <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>{project.repoUrl || 'No repo set'}</Text>
                  </View>
                </Pressable>

                {/* Delete (Owner only) or Leave Project (Member) */}
                {isShared ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                      pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                    ]}
                    onPress={handleLeaveProject}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.statusWarning}1A` }]}>
                      <Feather name="log-out" size={18} color={colors.statusWarning} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.statusWarning }]}>Leave Project</Text>
                      <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>Remove project from your workspace</Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                      pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                    ]}
                    onPress={handleDeleteOrRestore}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: isDeleted ? `${colors.primaryFixed}1A` : `${colors.error}1A` },
                      ]}
                    >
                      <Feather
                        name={isDeleted ? 'rotate-ccw' : 'trash-2'}
                        size={18}
                        color={isDeleted ? colors.primaryFixed : colors.error}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: isDeleted ? colors.onSurface : colors.error }]}>
                        {isDeleted ? 'Restore Project' : 'Move to Trash'}
                      </Text>
                      <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>
                        {isDeleted ? 'Restore back to active deployments' : 'Soft delete and send to Trash tab'}
                      </Text>
                    </View>
                  </Pressable>
                )}

                {/* Permanently Delete (trash tab only) */}
                {isDeleted && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                      pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                    ]}
                    onPress={handlePermanentDelete}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.error}1A` }]}>
                      <Feather name="x-circle" size={18} color={colors.error} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.error }]}>Delete Permanently</Text>
                      <Text style={[styles.optionSub, { color: colors.onSurfaceVariant }]}>Erase forever from database</Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* Cancel */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                  pressed && { backgroundColor: `${colors.onSurfaceVariant}1A` },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

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
  header: { marginBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  projectName: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#FFFFFF', flex: 1 },
  versionTag: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.primaryFixed,
    backgroundColor: 'rgba(0,230,118,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  projectDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8B949E' },
  divider: { height: 1, backgroundColor: '#1F293D', marginVertical: 12 },
  optionsList: { gap: 8, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
  },
  optionPressed: { backgroundColor: '#1F293D' },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: { flex: 1 },
  optionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  optionSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#8B949E', marginTop: 2 },
  cancelBtn: {
    backgroundColor: '#171D2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#263044',
  },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#8B949E' },
});
