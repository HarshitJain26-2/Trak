import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';
import { MilestoneSkeleton } from './MilestoneSkeleton';

export const ProjectDetailsSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.surface }]}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress & Info Card Skeleton */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={22} borderRadius={5} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="50%" height={14} borderRadius={4} />
            </View>
            <Skeleton width={48} height={28} borderRadius={6} />
          </View>

          {/* Progress bar track */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Skeleton width="45%" height={6} borderRadius={3} />
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Skeleton width={110} height={28} borderRadius={8} />
            <Skeleton width={70} height={28} borderRadius={8} />
          </View>
        </View>

        {/* Team Section Card Skeleton */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionTitleRow}>
            <Skeleton width={120} height={16} borderRadius={4} />
            <Skeleton width={26} height={18} borderRadius={6} />
          </View>
          <View style={styles.teamAvatars}>
            <Skeleton width={130} height={36} borderRadius={8} />
            <Skeleton width={100} height={36} borderRadius={8} />
          </View>
        </View>

        {/* Repository Link Card Skeleton */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.repoRow}>
            <Skeleton width={20} height={20} borderRadius={4} />
            <Skeleton width="60%" height={14} borderRadius={4} />
          </View>
        </View>

        {/* Milestones Card Skeleton */}
        <View style={[styles.glassCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <View style={styles.milestonesHeader}>
            <Skeleton width={140} height={18} borderRadius={4} />
            <Skeleton width={60} height={24} borderRadius={6} />
          </View>

          <View style={styles.milestonesList}>
            <MilestoneSkeleton />
            <MilestoneSkeleton />
            <MilestoneSkeleton />
            <MilestoneSkeleton />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 110,
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  glassCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  teamAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  milestonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  milestonesList: {
    gap: 10,
  },
});
