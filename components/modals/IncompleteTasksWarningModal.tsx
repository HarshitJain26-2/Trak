import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import { Milestone } from '@/store/useProjectStore';
import { triggerHaptic } from '@/utils/haptics';

interface IncompleteTasksWarningModalProps {
  visible: boolean;
  projectName: string;
  progress?: number;
  incompleteMilestones: Milestone[];
  onClose: () => void;
  onIgnoreAndComplete: () => void;
}

export const IncompleteTasksWarningModal: React.FC<IncompleteTasksWarningModalProps> = ({
  visible,
  projectName,
  progress = 0,
  incompleteMilestones,
  onClose,
  onIgnoreAndComplete,
}) => {
  const colors = useThemeColors();

  const count = incompleteMilestones.length;

  const handleConfirmIgnore = () => {
    triggerHaptic(20);
    onIgnoreAndComplete();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              {/* Warning Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: `${colors.statusWarning}20`, borderColor: `${colors.statusWarning}40` }]}>
                <Feather name="alert-triangle" size={28} color={colors.statusWarning} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.onSurface }]}>
                {count > 0 ? `Unfinished Tasks (${count})` : `Project Incomplete (${progress}%)`}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.onSurface }}>"{projectName}"</Text>{' '}
                {count > 0
                  ? `still has ${count} feature${count > 1 ? 's' : ''} in progress.`
                  : `is currently at ${progress}% progress.`}
              </Text>

              {/* List of Remaining Tasks if any */}
              {count > 0 && (
                <View style={[styles.listContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                  <Text style={[styles.listLabel, { color: colors.onSurfaceVariant }]}>REMAINING TASKS:</Text>
                  <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={true}>
                    {incompleteMilestones.map((milestone) => (
                      <View key={milestone.id} style={styles.taskItem}>
                        <Feather name="circle" size={14} color={colors.statusWarning} style={{ marginTop: 2 }} />
                        <Text style={[styles.taskText, { color: colors.onSurface }]} numberOfLines={2}>
                          {milestone.title}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsColumn}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primaryFixed },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleConfirmIgnore}
                >
                  <Feather name="check-circle" size={18} color={colors.onPrimaryFixed} />
                  <Text style={[styles.primaryBtnText, { color: colors.onPrimaryFixed }]}>
                    Complete All & Finish Project
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={onClose}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.onSurfaceVariant }]}>
                    Go Back & Finish Tasks
                  </Text>
                </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  listContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  listLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  taskText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    flex: 1,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
