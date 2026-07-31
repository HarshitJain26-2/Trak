import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useProjectStore, Project } from '../store/useProjectStore';

// ─── Custom Confirm Dialog ────────────────────────────────────────────────────
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmDestructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  confirmDestructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={confirmStyles.overlay} onPress={onCancel}>
        <Pressable style={confirmStyles.card} onPress={() => {}}>
          {/* Icon */}
          <View
            style={[
              confirmStyles.iconWrap,
              { backgroundColor: confirmDestructive ? 'rgba(255,180,171,0.12)' : 'rgba(114,255,112,0.1)' },
            ]}
          >
            <Feather
              name={confirmDestructive ? 'trash-2' : 'check-circle'}
              size={26}
              color={confirmDestructive ? Colors.error : Colors.primaryFixed}
            />
          </View>

          {/* Title */}
          <Text style={confirmStyles.title}>{title}</Text>

          {/* Message */}
          <Text style={confirmStyles.message}>{message}</Text>

          {/* Buttons */}
          <View style={confirmStyles.btnRow}>
            <Pressable
              style={({ pressed }) => [confirmStyles.btn, confirmStyles.btnCancel, pressed && confirmStyles.btnPressed]}
              onPress={onCancel}
            >
              <Text style={confirmStyles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                confirmStyles.btn,
                confirmDestructive ? confirmStyles.btnDestructive : confirmStyles.btnConfirm,
                pressed && confirmStyles.btnPressed,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  confirmStyles.btnConfirmText,
                  confirmDestructive && { color: '#0b0e14' },
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#111622',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F293D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnCancel: {
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
  },
  btnCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#8B949E',
  },
  btnConfirm: {
    backgroundColor: Colors.primaryFixed,
  },
  btnDestructive: {
    backgroundColor: Colors.error,
  },
  btnConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0b0e14',
  },
});

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
  const router = useRouter();
  const {
    deleteProject,
    restoreProject,
    permanentlyDeleteProject,
    markCompleted,
    unmarkCompleted,
  } = useProjectStore();

  // ── confirm dialog state ──
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    action: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: '',
    destructive: false,
    action: () => {},
  });

  const showConfirm = (
    title: string,
    message: string,
    confirmLabel: string,
    destructive: boolean,
    action: () => void
  ) => {
    setConfirmState({ visible: true, title, message, confirmLabel, destructive, action });
  };

  const dismissConfirm = () => {
    setConfirmState((s) => ({ ...s, visible: false }));
  };

  const executeConfirm = () => {
    confirmState.action();
    dismissConfirm();
    onClose();
  };

  if (!project) return null;

  const isDeleted = !!project.isDeleted;
  const isCompleted = !!project.isCompleted;

  const handleViewDetails = () => {
    onClose();
    router.push(`/project/${project.id}`);
  };

  const handleToggleComplete = () => {
    if (isCompleted) {
      onClose();
      unmarkCompleted(project.id);
    } else {
      onClose();
      markCompleted(project.id);
    }
  };

  const handleDeleteOrRestore = () => {
    if (isDeleted) {
      onClose();
      restoreProject(project.id);
    } else {
      showConfirm(
        'Move to Trash',
        `Are you sure you want to delete "${project.name}"?\nIt will be moved to the Trash.`,
        'Move to Trash',
        true,
        () => deleteProject(project.id)
      );
    }
  };

  const handlePermanentDelete = () => {
    showConfirm(
      'Delete Forever',
      `This will permanently erase "${project.name}" from your workspace. This action cannot be undone.`,
      'Delete Forever',
      true,
      () => permanentlyDeleteProject(project.id)
    );
  };

  const handleCopyRepo = () => {
    onClose();
    // Clipboard API - works on both native and web
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
      {/* Custom confirm dialog — sits above the action sheet */}
      <ConfirmDialog
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        confirmDestructive={confirmState.destructive}
        onCancel={dismissConfirm}
        onConfirm={executeConfirm}
      />

      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        {/* Overlay — tap outside sheet to close */}
        <Pressable style={styles.overlay} onPress={onClose}>
          {/* Sheet — stop press from bubbling to overlay */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {project.name}
                </Text>
                <Text style={styles.versionTag}>{project.version}</Text>
              </View>
              <Text style={styles.projectDesc} numberOfLines={1}>
                {project.description || 'No description provided'}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Options */}
            <View style={styles.optionsList}>
              {/* 1. View Details */}
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={handleViewDetails}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${Colors.primaryFixed}1A` }]}>
                  <Feather name="eye" size={18} color={Colors.primaryFixed} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>View Project Details</Text>
                  <Text style={styles.optionSub}>Open telemetry & feature milestones</Text>
                </View>
                <Feather name="chevron-right" size={16} color={`${Colors.onSurfaceVariant}4D`} />
              </Pressable>

              {/* 2. Toggle Complete / Reactivate */}
              {!isDeleted && (
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={handleToggleComplete}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isCompleted
                          ? `${Colors.secondaryContainer}33`
                          : `${Colors.primaryFixed}1A`,
                      },
                    ]}
                  >
                    <Feather
                      name={isCompleted ? 'rotate-ccw' : 'check-circle'}
                      size={18}
                      color={isCompleted ? Colors.secondaryFixed : Colors.primaryFixed}
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>
                      {isCompleted ? 'Reactivate Project' : 'Mark as Completed'}
                    </Text>
                    <Text style={styles.optionSub}>
                      {isCompleted
                        ? 'Move back to Active Deployments'
                        : 'Move project to shipped tab'}
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* 3. Copy Repo URL */}
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={handleCopyRepo}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${Colors.secondaryContainer}26` }]}>
                  <Feather name="copy" size={18} color={Colors.secondary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Copy Repository URL</Text>
                  <Text style={styles.optionSub}>{project.repoUrl || 'No repo set'}</Text>
                </View>
              </Pressable>

              {/* 4. Delete / Restore */}
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={handleDeleteOrRestore}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isDeleted
                        ? `${Colors.primaryFixed}1A`
                        : `${Colors.error}1A`,
                    },
                  ]}
                >
                  <Feather
                    name={isDeleted ? 'rotate-ccw' : 'trash-2'}
                    size={18}
                    color={isDeleted ? Colors.primaryFixed : Colors.error}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      !isDeleted && { color: Colors.error },
                    ]}
                  >
                    {isDeleted ? 'Restore Project' : 'Move to Trash'}
                  </Text>
                  <Text style={styles.optionSub}>
                    {isDeleted
                      ? 'Restore back to active deployments'
                      : 'Soft delete and send to Trash tab'}
                  </Text>
                </View>
              </Pressable>

              {/* 5. Permanent Delete */}
              {isDeleted && (
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={handlePermanentDelete}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${Colors.error}26` }]}>
                    <Feather name="x-circle" size={18} color={Colors.error} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: Colors.error }]}>
                      Delete Permanently
                    </Text>
                    <Text style={styles.optionSub}>Erase forever from database</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Cancel Button */}
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  projectName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    flex: 1,
  },
  versionTag: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.primaryFixed,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  projectDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8B949E',
  },
  divider: {
    height: 1,
    backgroundColor: '#1F293D',
    marginVertical: 12,
  },
  optionsList: {
    gap: 8,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#171D2B',
    borderWidth: 1,
    borderColor: '#263044',
  },
  optionPressed: {
    backgroundColor: '#1F293D',
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
    color: '#FFFFFF',
  },
  optionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2,
  },
  cancelBtn: {
    backgroundColor: '#171D2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#263044',
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#8B949E',
  },
});
