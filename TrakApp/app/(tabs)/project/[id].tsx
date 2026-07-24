import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useProjectStore } from '../../../store/useProjectStore';
import { TechPill } from '../../../components/TechPill';
import { StatusDot } from '../../../components/StatusDot';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getProject, toggleMilestone } = useProjectStore();
  const project = getProject(id);

  const [notesExpanded, setNotesExpanded] = useState(false);
  const notesHeight = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;

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

  if (!project) {
    return (
      <View style={styles.root}>
        <SafeAreaView>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.primaryFixed} />
          </Pressable>
        </SafeAreaView>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Project not found</Text>
        </View>
      </View>
    );
  }

  const completedCount = project.milestones.filter((m) => m.completed).length;
  const totalCount = project.milestones.length;

  const STATUS_COLORS: Record<string, string> = {
    active: Colors.primaryFixed,
    blocked: Colors.error,
    warning: Colors.statusWarning,
    idle: Colors.secondaryContainer,
  };

  const chevronDeg = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const notesMaxHeight = notesHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  return (
    <View style={styles.root}>
      {/* App Bar */}
      <BlurView
        intensity={60}
        tint="dark"
        style={[
          styles.appBar,
          Platform.OS === 'android' && { backgroundColor: `${Colors.surface}E6` },
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.appBarInner}>
          <View style={styles.appBarLeft}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={Colors.primaryFixed} />
            </Pressable>
            <Text style={styles.appBarTitle}>Trak</Text>
          </View>
          <View style={styles.appBarRight}>
            {/* Status chip */}
            <View style={styles.statusChip}>
              <StatusDot status={project.status} size={6} />
              <Text style={styles.statusChipText}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Text>
              <Feather name="chevron-down" size={14} color={Colors.onSurfaceVariant} />
            </View>
            {/* Priority badge */}
            {project.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Feather name="alert-circle" size={10} color={Colors.error} />
                <Text style={styles.priorityText}>HIGH</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Section */}
        <View style={styles.glassCard}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <Text style={styles.projectDesc}>{project.description}</Text>
            </View>
            <Text style={styles.progressPct}>{project.progress}%</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${project.progress}%`,
                  backgroundColor: STATUS_COLORS[project.status] ?? Colors.primaryFixed,
                },
              ]}
            />
          </View>

          {/* Meta pills */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Feather name="clock" size={12} color={Colors.onSurfaceVariant} />
              <Text style={styles.metaPillText}>04d 12h 41m</Text>
            </View>
            <View style={styles.metaPill}>
              <Feather name="terminal" size={12} color={Colors.secondaryFixed} />
              <Text style={[styles.metaPillText, { color: Colors.secondaryFixed }]}>
                {project.version}
              </Text>
            </View>
          </View>
        </View>

        {/* Repo link */}
        <Pressable style={styles.glassCard} onPress={() => {}}>
          <View style={styles.repoRow}>
            <View style={styles.repoLeft}>
              <Feather name="github" size={20} color={Colors.onSurfaceVariant} />
              <View>
                <Text style={styles.repoLabel}>Repository</Text>
                <Text style={styles.repoUrl}>{project.repoUrl}</Text>
              </View>
            </View>
            <Feather name="external-link" size={16} color={Colors.onSurfaceVariant} />
          </View>
        </Pressable>

        {/* Tech Stack */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ENVIRONMENT</Text>
          <View style={styles.techRow}>
            {project.techStack.map((tech) => (
              <TechPill key={tech} label={tech} />
            ))}
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.glassCardNoPad}>
          <View style={styles.milestonesHeader}>
            <Text style={styles.milestonesTitle}>Milestones</Text>
            <View style={styles.milestonesCount}>
              <Text style={styles.milestonesCountText}>
                {completedCount}/{totalCount}
              </Text>
            </View>
          </View>
          {project.milestones.map((milestone, index) => (
            <Pressable
              key={milestone.id}
              style={[
                styles.milestoneRow,
                index < project.milestones.length - 1 && styles.milestoneRowBorder,
              ]}
              onPress={() => toggleMilestone(project.id, milestone.id)}
            >
              {/* Checkbox */}
              <View style={[styles.checkbox, milestone.completed && styles.checkboxChecked]}>
                {milestone.completed && (
                  <Feather name="check" size={12} color={Colors.onPrimaryFixed} />
                )}
              </View>
              <Text
                style={[styles.milestoneText, milestone.completed && styles.milestoneTextDone]}
              >
                {milestone.title}
              </Text>
              {milestone.completed && (
                <Feather
                  name="check-circle"
                  size={16}
                  color={Colors.primaryFixed}
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </Pressable>
          ))}
        </View>

        {/* Developer Notes (collapsible) */}
        <View style={styles.glassCardNoPad}>
          <Pressable style={styles.notesToggle} onPress={toggleNotes}>
            <View style={styles.notesToggleLeft}>
              <Feather name="file-text" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.notesTitle}>Developer Notes</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
              <Feather name="chevron-down" size={20} color={Colors.onSurfaceVariant} />
            </Animated.View>
          </Pressable>
          <Animated.View style={{ maxHeight: notesMaxHeight, overflow: 'hidden' }}>
            <View style={styles.notesBorder} />
            <View style={styles.notesContent}>
              {project.notes.split('\n').map((line, i) => (
                <Text
                  key={i}
                  style={[
                    styles.notesText,
                    line.startsWith('###') && styles.notesHeading,
                    line.startsWith('-') && styles.notesBullet,
                  ]}
                >
                  {line.startsWith('-')
                    ? (
                      <Text>
                        <Text style={{ color: Colors.primaryFixed }}>- </Text>
                        {line.slice(2)}
                      </Text>
                    )
                    : line.replace('### ', '')}
                </Text>
              ))}
            </View>
          </Animated.View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

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
    height: 56,
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
    flex: 1,
  },
  milestoneTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
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
});
