import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, useColorScheme, PanResponder, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getThemeColors } from '@/constants/colors';
import { StatusDot } from '@/components/common/StatusDot';
import { TechPill } from '@/components/common/TechPill';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { ProjectActionModal } from '@/components/modals/ProjectActionModal';
import { IncompleteTasksWarningModal } from '@/components/modals/IncompleteTasksWarningModal';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSettingsStore } from '@/store/useSettingsStore';
import { triggerHaptic } from '@/utils/haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProjectCardProps {
  project: Project;
  onLongPress?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLongPress }) => {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { compactCards, themeMode } = useSettingsStore();
  const colors = getThemeColors(themeMode, systemColorScheme);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const leaveProject = useProjectStore((s) => s.leaveProject);
  const markCompleted = useProjectStore((s) => s.markCompleted);
  const togglePinProject = useProjectStore((s) => s.togglePinProject);
  const [modalVisible, setModalVisible] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const { dialogProps: alertDialogProps, notify } = useConfirmDialog();
  const lastTapRef = useRef<number>(0);
  const swipeHapticPlayedRef = useRef(false);

  // Swipe-to-Action PanResponder
  const panX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);

  const PRIORITY_ACCENT_COLORS: Record<string, string> = {
    high: colors.error,
    medium: colors.statusWarning,
    low: colors.primaryFixed,
  };

  const STATUS_ACCENT_COLORS: Record<string, string> = {
    active: colors.primaryFixed,
    warning: colors.statusWarning,
    blocked: colors.error,
    idle: colors.secondaryContainer,
  };

  const accentColor = PRIORITY_ACCENT_COLORS[project.priority] ?? STATUS_ACCENT_COLORS[project.status] ?? colors.primaryFixed;

  const computedProgress = project.milestones && project.milestones.length > 0
    ? Math.round((project.milestones.filter((m) => m.completed).length / project.milestones.length) * 100)
    : project.progress;

  const progressWidth = `${computedProgress}%` as any;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal gestures that exceed 12px threshold
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderGrant: () => {
        swipeHapticPlayedRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx);
        if (Math.abs(gestureState.dx) > 80 && !swipeHapticPlayedRef.current) {
          triggerHaptic(15);
          swipeHapticPlayedRef.current = true;
        } else if (Math.abs(gestureState.dx) <= 80) {
          swipeHapticPlayedRef.current = false;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80;
        if (gestureState.dx > threshold) {
          // Slide Right -> Mark as Completed (Leader Only)
          if (project.isShared) {
            triggerHaptic(25);
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: Platform.OS !== 'web',
              speed: 30,
              bounciness: 8,
            }).start();
            notify({
              title: 'Leader Only',
              message: 'Only the project leader can mark this project as complete.',
              icon: 'lock',
              confirmLabel: 'Got It',
            });
            return;
          }

          const incomplete = project.milestones?.filter((m) => !m.completed) || [];
          const isNotFullyDone = incomplete.length > 0 || computedProgress < 100;
          if (isNotFullyDone) {
            triggerHaptic(25);
            setWarningModalVisible(true);
            Animated.spring(panX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
          } else {
            triggerHaptic(25);
            Animated.timing(panX, {
              toValue: SCREEN_WIDTH,
              duration: 250,
              useNativeDriver: Platform.OS !== 'web',
            }).start(() => {
              markCompleted(project.id);
            });
          }
        } else if (gestureState.dx < -threshold) {
          // Slide Left -> Delete Project (Leader/Owner) or Leave Project (Member)
          triggerHaptic(25);
          Animated.timing(panX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: Platform.OS !== 'web',
          }).start(() => {
            if (project.isShared) {
              leaveProject(project.id);
            } else {
              deleteProject(project.id);
            }
          });
        } else {
          // Snap back
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
            speed: 30,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  // Dynamic animations for swipe gesture
  const rightScale = panX.interpolate({
    inputRange: [0, 80],
    outputRange: [0.6, 1.15],
    extrapolate: 'clamp',
  });

  const rightOpacity = panX.interpolate({
    inputRange: [0, 20, 80],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  const leftScale = panX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1.15, 0.6],
    extrapolate: 'clamp',
  });

  const leftOpacity = panX.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const leftSwipeColor = project.isShared ? '#F97316' : '#EF4444';
  const cardBorderColor = panX.interpolate({
    inputRange: [-80, 0, 80],
    outputRange: [leftSwipeColor, colors.glassBorder, '#22C55E'],
    extrapolate: 'clamp',
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (timerRef.current) clearTimeout(timerRef.current);
      lastTapRef.current = 0;
      triggerHaptic(35);
      togglePinProject(project.id);
    } else {
      lastTapRef.current = now;
      timerRef.current = setTimeout(() => {
        triggerHaptic(10);
        router.push(`/project/${project.id}`);
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleLongPress = () => {
    triggerHaptic(25);
    if (onLongPress) {
      onLongPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.containerWrapper}>
      <ProjectActionModal
        visible={modalVisible}
        project={project}
        onClose={() => setModalVisible(false)}
      />

      <ConfirmDialog {...alertDialogProps} />

      <IncompleteTasksWarningModal
        visible={warningModalVisible}
        projectName={project.name}
        progress={computedProgress}
        incompleteMilestones={project.milestones?.filter((m) => !m.completed) || []}
        onClose={() => setWarningModalVisible(false)}
        onIgnoreAndComplete={async () => {
          setWarningModalVisible(false);
          if (project.isShared) {
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

      {/* Slide Right Action Background (Mark Complete for Leader, Leader Only for Member) */}
      <View style={[styles.swipeActionBg, styles.swipeRightBg, { backgroundColor: project.isShared ? '#64748B' : '#22C55E' }]}>
        <Animated.View style={[styles.swipeContentLeft, { opacity: rightOpacity, transform: [{ scale: rightScale }] }]}>
          <Feather name={project.isShared ? 'lock' : 'check-circle'} size={24} color="#FFFFFF" />
          <Text style={[styles.swipeText, { color: '#FFFFFF' }]}>
            {project.isShared ? 'Leader Only' : 'Mark Complete'}
          </Text>
        </Animated.View>
      </View>

      {/* Slide Left Action Background (Delete for Leader, Leave for Member) */}
      <View style={[styles.swipeActionBg, styles.swipeLeftBg, { backgroundColor: leftSwipeColor }]}>
        <Animated.View style={[styles.swipeContentRight, { opacity: leftOpacity, transform: [{ scale: leftScale }] }]}>
          <Text style={[styles.swipeText, { color: '#FFFFFF' }]}>
            {project.isShared ? 'Leave Project' : 'Delete'}
          </Text>
          <Feather name={project.isShared ? 'log-out' : 'trash-2'} size={24} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Swipable Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX: panX }] }}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={350}
        >
          <Animated.View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: cardBorderColor, transform: [{ scale: scaleAnim }] }]}>
            {/* Progress accent bar */}
            <View style={[styles.accentBar, { width: progressWidth, backgroundColor: accentColor }]} />

            <View style={[styles.content, compactCards && styles.compactContent]}>
              {/* Header row */}
              <View style={[styles.headerRow, compactCards && styles.compactHeaderRow]}>
                <View style={styles.titleRow}>
                  <StatusDot status={project.status} size={compactCards ? 6 : 8} animated={project.status === 'active'} />
                  <Text style={[styles.projectName, { color: colors.onSurface }, compactCards && styles.compactProjectName]} numberOfLines={1}>
                    {project.name}
                  </Text>
                  {project.isPinned && (
                    <View style={[styles.pinnedTag, { backgroundColor: `${colors.primaryFixed}20`, borderColor: `${colors.primaryFixed}40` }]}>
                      <Feather name="bookmark" size={10} color={colors.primaryFixed} style={{ marginRight: 2 }} />
                      <Text style={[styles.pinnedTagText, { color: colors.primaryFixed }]}>PINNED</Text>
                    </View>
                  )}
                </View>
                {project.status === 'blocked' ? (
                  <Feather name="alert-triangle" size={compactCards ? 14 : 16} color={colors.error} />
                ) : (
                  <Text style={[styles.version, { color: colors.onSurfaceVariant }, compactCards && styles.compactVersion]}>{project.version}</Text>
                )}
              </View>

              {/* Tech stack pills */}
              <View style={[styles.pillsRow, compactCards && styles.compactPillsRow]}>
                {project.techStack.map((tech) => (
                  <TechPill key={tech} label={tech} />
                ))}
              </View>

              {/* Footer row */}
              <View style={styles.footerRow}>
                <View style={{ flexDirection: compactCards ? 'row' : 'column', alignItems: compactCards ? 'center' : 'flex-start', gap: compactCards ? 6 : 0 }}>
                  <Text style={[styles.deadlineLabel, { color: colors.onSurfaceVariant }]}>DEADLINE</Text>
                  <Text style={[styles.deadlineValue, { color: accentColor }, compactCards && styles.compactDeadlineValue]}>
                    {project.deadline}
                  </Text>
                </View>
                <Text style={[styles.lastUpdated, { color: compactCards ? colors.primaryFixed : colors.onSurfaceVariant }, compactCards && styles.compactLastUpdated]}>
                  {compactCards ? `${computedProgress}%` : `Updated ${project.lastUpdated}`}
                </Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  accentBar: {
    height: 2.5,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  compactContent: {
    padding: 10,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactHeaderRow: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  projectName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  compactProjectName: {
    fontSize: 15,
    lineHeight: 20,
  },
  version: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  compactVersion: {
    fontSize: 11,
    lineHeight: 16,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  compactPillsRow: {
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  deadlineLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    opacity: 0.5,
    letterSpacing: 2,
    marginBottom: 2,
  },
  deadlineValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  compactDeadlineValue: {
    fontSize: 11,
    lineHeight: 16,
  },
  lastUpdated: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    opacity: 0.5,
  },
  compactLastUpdated: {
    fontSize: 11,
    opacity: 0.9,
  },
  containerWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  swipeActionBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeRightBg: {
    justifyContent: 'flex-start',
  },
  swipeLeftBg: {
    justifyContent: 'flex-end',
  },
  swipeContentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeContentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 6,
  },
  pinnedTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
