import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { Skeleton } from './Skeleton';

export const MilestoneSkeleton: React.FC = () => {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceContainerHigh,
          borderColor: colors.glassBorder,
        },
      ]}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Checkbox placeholder */}
      <Skeleton width={20} height={20} borderRadius={6} />

      <View style={styles.textCol}>
        {/* Title */}
        <Skeleton width="65%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
        {/* Subtitle / Deadline */}
        <View style={styles.metaRow}>
          <Skeleton width={70} height={10} borderRadius={3} />
          <Skeleton width={50} height={10} borderRadius={3} />
        </View>
      </View>

      {/* Action menu icon placeholder */}
      <Skeleton width={16} height={16} borderRadius={4} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  textCol: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
