import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';

interface ListSkeletonProps {
  title?: string;
  count?: number;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ title, count = 4 }) => {
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
      {/* Header */}
      <View style={styles.listHeader}>
        {title ? (
          <Skeleton width={160} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
        ) : (
          <Skeleton width={140} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
        )}
        <Skeleton width={100} height={12} borderRadius={3} />
      </View>

      {/* List items */}
      <View style={styles.list}>
        {Array.from({ length: count }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            {/* Top accent bar */}
            <Skeleton width="40%" height={2.5} borderRadius={0} />

            <View style={styles.cardContent}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Skeleton width={16} height={16} circle />
                  <Skeleton width={140} height={16} borderRadius={4} />
                </View>
                <Skeleton width={60} height={18} borderRadius={4} />
              </View>

              {/* Description */}
              <Skeleton width="85%" height={12} borderRadius={3} style={{ marginBottom: 4 }} />
              <Skeleton width="55%" height={12} borderRadius={3} style={{ marginBottom: 12 }} />

              {/* Tech Stack Pills */}
              <View style={styles.pillsRow}>
                <Skeleton width={48} height={20} borderRadius={4} />
                <Skeleton width={62} height={20} borderRadius={4} />
                <Skeleton width={52} height={20} borderRadius={4} />
              </View>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Skeleton width={70} height={10} borderRadius={2} />
                <Skeleton width={80} height={10} borderRadius={2} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingTop: 130,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
});
