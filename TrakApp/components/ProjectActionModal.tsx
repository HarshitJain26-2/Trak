import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useProjectStore, Project, ProjectStatus } from '../store/useProjectStore';

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
    fetchProjects,
  } = useProjectStore();

  if (!project) return null;

  const isDeleted = !!project.isDeleted;
  const isCompleted = !!project.isCompleted;

  const handleViewDetails = () => {
    onClose();
    router.push(`/project/${project.id}`);
  };

  const handleToggleComplete = () => {
    onClose();
    if (isCompleted) {
      unmarkCompleted(project.id);
      Alert.alert('Reactivated', `"${project.name}" has been moved back to Active Deployments.`);
    } else {
      markCompleted(project.id);
      Alert.alert('Completed', `"${project.name}" has been marked as Completed!`);
    }
  };

  const handleDeleteOrRestore = () => {
    onClose();
    if (isDeleted) {
      restoreProject(project.id);
      Alert.alert('Restored', `"${project.name}" has been restored from Trash.`);
    } else {
      Alert.alert(
        'Move to Trash',
        `Are you sure you want to delete "${project.name}"? It will be moved to the Trash.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteProject(project.id),
          },
        ]
      );
    }
  };

  const handlePermanentDelete = () => {
    onClose();
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently erase "${project.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => permanentlyDeleteProject(project.id),
        },
      ]
    );
  };

  const handleCopyRepo = () => {
    onClose();
    if (project.repoUrl) {
      Alert.alert('Copied to Clipboard', `Repository URL:\n${project.repoUrl}`);
    } else {
      Alert.alert('No Repository', 'This project does not have a repository URL.');
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Drag indicator / Handle */}
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

                {/* 2. Toggle Complete / Reactivate (if not in trash) */}
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

                {/* 5. Permanent Delete (only if already deleted) */}
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
