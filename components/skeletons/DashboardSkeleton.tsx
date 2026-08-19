import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';

export const DashboardSkeleton: React.FC = () => {
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
      {/* Search bar placeholder */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.isDark ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <Skeleton width={18} height={18} borderRadius={4} />
        <Skeleton width="60%" height={14} borderRadius={4} />
      </View>

      {/* Section Header placeholder */}
      <View style={styles.sectionHeader}>
        <Skeleton width={130} height={15} borderRadius={4} />
        <Skeleton width={32} height={15} borderRadius={4} />
      </View>

      {/* Project Cards Skeletons */}
      <View style={styles.cardsContainer}>
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardsContainer: {
    gap: 16,
  },
});
