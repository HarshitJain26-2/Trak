import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, useColorScheme, PanResponder, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getThemeColors } from '@/constants/colors';
import { StatusDot } from '@/components/common/StatusDot';
import { TechPill } from '@/components/common/TechPill';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { ProjectActionModal } from '@/components/modals/ProjectActionModal';
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
  const { markCompleted, deleteProject } = useProjectStore();

  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;

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

  // Swipe pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80;
        if (gestureState.dx > threshold) {
          // Slide Right -> Mark Complete
          triggerHaptic(25);
          Animated.timing(panX, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            markCompleted(project.id);
          });
        } else if (gestureState.dx < -threshold) {
          // Slide Left -> Delete Project
          triggerHaptic(25);
          Animated.timing(panX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            deleteProject(project.id);
          });
        } else {
          // Snap back
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
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

  const cardBorderColor = panX.interpolate({
    inputRange: [-80, 0, 80],
    outputRange: ['#EF4444', colors.glassBorder, '#22C55E'],
    extrapolate: 'clamp',
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePress = () => {
    triggerHaptic(10);
    router.push(`/project/${project.id}`);
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

      {/* Slide Right Action Background (Mark Complete - Vibrant Green) */}
      <View style={[styles.swipeActionBg, styles.swipeRightBg, { backgroundColor: '#22C55E' }]}>
        <Animated.View style={[styles.swipeContentLeft, { opacity: rightOpacity, transform: [{ scale: rightScale }] }]}>
          <Feather name="check-circle" size={24} color="#FFFFFF" />
          <Text style={[styles.swipeText, { color: '#FFFFFF' }]}>Mark Complete</Text>
        </Animated.View>
      </View>

      {/* Slide Left Action Background (Delete - Red) */}
      <View style={[styles.swipeActionBg, styles.swipeLeftBg, { backgroundColor: '#EF4444' }]}>
        <Animated.View style={[styles.swipeContentRight, { opacity: leftOpacity, transform: [{ scale: leftScale }] }]}>
          <Text style={[styles.swipeText, { color: '#FFFFFF' }]}>Delete</Text>
          <Feather name="trash-2" size={24} color="#FFFFFF" />
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
          <Animated.View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder, transform: [{ scale: scaleAnim }] }]}>
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
    fontFamily: 'JetBrainsMono_400Regular',
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
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    opacity: 0.5,
    letterSpacing: 2,
    marginBottom: 2,
  },
  deadlineValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  compactDeadlineValue: {
    fontSize: 11,
    lineHeight: 16,
  },
  lastUpdated: {
    fontFamily: 'JetBrainsMono_400Regular',
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
});
