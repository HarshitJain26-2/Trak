import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';

export const ProfileSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Profile Header Card Skeleton */}
      <View style={[styles.profileCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
        {/* Avatar */}
        <Skeleton width={72} height={72} circle style={{ marginBottom: 14 }} />

        {/* Name */}
        <Skeleton width={160} height={22} borderRadius={5} style={{ marginBottom: 6 }} />

        {/* Username */}
        <Skeleton width={110} height={14} borderRadius={4} style={{ marginBottom: 12 }} />

        {/* Joined Date tag */}
        <Skeleton width={130} height={22} borderRadius={11} />
      </View>

      {/* Stats Grid Skeleton */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Skeleton width={36} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
          <Skeleton width={48} height={10} borderRadius={2} />
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Skeleton width={36} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
          <Skeleton width={48} height={10} borderRadius={2} />
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
          <Skeleton width={36} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={10} borderRadius={2} />
        </View>
      </View>

      {/* Developer Info Section Skeleton */}
      <View style={styles.sectionHeader}>
        <Skeleton width={120} height={12} borderRadius={3} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
        <View style={styles.infoRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1 }}>
            <Skeleton width={40} height={8} borderRadius={2} style={{ marginBottom: 4 }} />
            <Skeleton width={140} height={14} borderRadius={3} />
          </View>
        </View>
        <View style={styles.infoRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1 }}>
            <Skeleton width={40} height={8} borderRadius={2} style={{ marginBottom: 4 }} />
            <Skeleton width={180} height={14} borderRadius={3} />
          </View>
        </View>
        <View style={styles.infoRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1 }}>
            <Skeleton width={55} height={8} borderRadius={2} style={{ marginBottom: 4 }} />
            <Skeleton width={120} height={14} borderRadius={3} />
          </View>
        </View>
      </View>

      {/* Skills Section Skeleton */}
      <View style={styles.sectionHeader}>
        <Skeleton width={60} height={12} borderRadius={3} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
        <View style={styles.pillsRow}>
          <Skeleton width={65} height={26} borderRadius={8} />
          <Skeleton width={80} height={26} borderRadius={8} />
          <Skeleton width={55} height={26} borderRadius={8} />
          <Skeleton width={70} height={26} borderRadius={8} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingTop: 110,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  profileCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
});
