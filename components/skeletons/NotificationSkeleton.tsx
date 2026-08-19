import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';

export const NotificationSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View
      style={styles.container}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[styles.item, { borderBottomColor: colors.glassBorder }]}>
          {/* Icon Box */}
          <Skeleton width={36} height={36} borderRadius={10} />

          {/* Text content */}
          <View style={styles.textCol}>
            <Skeleton width="75%" height={14} borderRadius={3} style={{ marginBottom: 6 }} />
            <Skeleton width="50%" height={11} borderRadius={3} />
          </View>

          {/* Time tag */}
          <Skeleton width={36} height={10} borderRadius={2} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  textCol: {
    flex: 1,
  },
});
