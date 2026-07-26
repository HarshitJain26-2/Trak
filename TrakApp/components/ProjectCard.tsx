import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { StatusDot } from './StatusDot';
import { TechPill } from './TechPill';
import type { Project } from '../store/useProjectStore';

interface ProjectCardProps {
  project: Project;
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

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const router = useRouter();
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
    router.push(`/project/${project.id}`);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* Progress accent bar */}
        <View style={[styles.accentBar, { width: progressWidth, backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <StatusDot status={project.status} size={8} animated={project.status === 'active'} />
              <Text style={styles.projectName}>{project.name}</Text>
            </View>
            {project.status === 'blocked' ? (
              <Feather name="alert-triangle" size={16} color={Colors.error} />
            ) : (
              <Text style={styles.version}>{project.version}</Text>
            )}
          </View>

          {/* Tech stack pills */}
          <View style={styles.pillsRow}>
            {project.techStack.map((tech) => (
              <TechPill key={tech} label={tech} />
            ))}
          </View>

          {/* Footer row */}
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.deadlineLabel}>DEADLINE</Text>
              <Text style={[styles.deadlineValue, { color: accentColor }]}>
                {project.deadline}
              </Text>
            </View>
            <Text style={styles.lastUpdated}>Updated {project.lastUpdated}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
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
    // glow via shadow
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  version: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
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
  lastUpdated: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    opacity: 0.4,
  },
});
