import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { StatusDot } from './StatusDot';
import { TechPill } from './TechPill';
import type { Project } from '../store/useProjectStore';
import { ProjectActionModal } from './ProjectActionModal';
import { useSettingsStore } from '../store/useSettingsStore';
import { triggerHaptic } from '../lib/haptics';

interface ProjectCardProps {
  project: Project;
  onLongPress?: () => void;
}

const PRIORITY_ACCENT_COLORS: Record<string, string> = {
  high: Colors.error,           // Red
  medium: Colors.statusWarning, // Yellow
  low: Colors.primaryFixed,     // Green
};

const STATUS_ACCENT_COLORS: Record<string, string> = {
  active: Colors.primaryFixed,
  warning: Colors.statusWarning,
  blocked: Colors.error,
  idle: Colors.secondaryContainer,
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLongPress }) => {
  const router = useRouter();
  const compactCards = useSettingsStore((s) => s.compactCards);
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const accentColor = PRIORITY_ACCENT_COLORS[project.priority] ?? STATUS_ACCENT_COLORS[project.status] ?? Colors.primaryFixed;
  
  const computedProgress = project.milestones && project.milestones.length > 0
    ? Math.round((project.milestones.filter((m) => m.completed).length / project.milestones.length) * 100)
    : project.progress;

  const progressWidth = `${computedProgress}%` as any;

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
    <>
      <ProjectActionModal
        visible={modalVisible}
        project={project}
        onClose={() => setModalVisible(false)}
      />
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={350}
      >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* Progress accent bar */}
        <View style={[styles.accentBar, { width: progressWidth, backgroundColor: accentColor }]} />

        <View style={[styles.content, compactCards && styles.compactContent]}>
          {/* Header row */}
          <View style={[styles.headerRow, compactCards && styles.compactHeaderRow]}>
            <View style={styles.titleRow}>
              <StatusDot status={project.status} size={compactCards ? 6 : 8} animated={project.status === 'active'} />
              <Text style={[styles.projectName, compactCards && styles.compactProjectName]} numberOfLines={1}>
                {project.name}
              </Text>
            </View>
            {project.status === 'blocked' ? (
              <Feather name="alert-triangle" size={compactCards ? 14 : 16} color={Colors.error} />
            ) : (
              <Text style={[styles.version, compactCards && styles.compactVersion]}>{project.version}</Text>
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
              <Text style={styles.deadlineLabel}>DEADLINE</Text>
              <Text style={[styles.deadlineValue, { color: accentColor }, compactCards && styles.compactDeadlineValue]}>
                {project.deadline}
              </Text>
            </View>
            <Text style={[styles.lastUpdated, compactCards && styles.compactLastUpdated]}>
              {compactCards ? `${computedProgress}%` : `Updated ${project.lastUpdated}`}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Android shadow
    elevation: 4,
  },
  accentBar: {
    height: 2,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
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
    fontSize: 20,
    lineHeight: 26,
    color: Colors.onSurface,
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
    color: Colors.onSurfaceVariant,
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
    color: Colors.onSurfaceVariant,
    opacity: 0.4,
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
    color: Colors.onSurfaceVariant,
    opacity: 0.4,
  },
  compactLastUpdated: {
    fontSize: 11,
    color: Colors.primaryFixed,
    opacity: 0.8,
  },
});
