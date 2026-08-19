import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Skeleton } from './Skeleton';

interface ProjectCardSkeletonProps {
  compact?: boolean;
}

export const ProjectCardSkeleton: React.FC<ProjectCardSkeletonProps> = ({ compact }) => {
  const colors = useThemeColors();
  const { compactCards } = useSettingsStore();
  const isCompact = compact ?? compactCards;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.glassBorder,
        },
      ]}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Top accent bar placeholder */}
      <Skeleton
        width="38%"
        height={2.5}
        borderRadius={0}
        color={colors.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
      />

      <View style={[styles.content, isCompact && styles.compactContent]}>
        {/* Header Row */}
        <View style={[styles.headerRow, isCompact && styles.compactHeaderRow]}>
          <View style={styles.titleRow}>
            {/* Status dot */}
            <Skeleton width={isCompact ? 6 : 8} height={isCompact ? 6 : 8} circle />
            {/* Project title */}
            <Skeleton width={isCompact ? 130 : 160} height={isCompact ? 16 : 19} borderRadius={4} />
          </View>
          {/* Version badge */}
          <Skeleton width={38} height={isCompact ? 12 : 14} borderRadius={3} />
        </View>

        {/* Tech stack pills row */}
        <View style={[styles.pillsRow, isCompact && styles.compactPillsRow]}>
          <Skeleton width={52} height={isCompact ? 18 : 22} borderRadius={5} />
          <Skeleton width={68} height={isCompact ? 18 : 22} borderRadius={5} />
          <Skeleton width={46} height={isCompact ? 18 : 22} borderRadius={5} />
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          <View style={isCompact ? styles.compactDeadlineCol : styles.deadlineCol}>
            <Skeleton width={44} height={8} borderRadius={2} style={{ marginBottom: isCompact ? 0 : 3 }} />
            <Skeleton width={68} height={isCompact ? 11 : 13} borderRadius={3} />
          </View>
          <Skeleton width={85} height={isCompact ? 10 : 12} borderRadius={3} />
        </View>
      </View>
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
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  content: {
    padding: 16,
    paddingTop: 18,
  },
  compactContent: {
    padding: 10,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactHeaderRow: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  compactPillsRow: {
    marginBottom: 8,
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  deadlineCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  compactDeadlineCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
