import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/colors';

interface AuthFooterProps {
  /** Show the secondary metadata line */
  showMetadata?: boolean;
}

export const AuthFooter: React.FC<AuthFooterProps> = ({ showMetadata = true }) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.buildVersion, { color: `${colors.onSurfaceVariant}50` }]}>
        BUILD V2.4.0-STABLE
      </Text>
      {showMetadata && (
        <Text style={[styles.metadata, { color: `${colors.onSurfaceVariant}35` }]}>
          SECURE WORKSPACE • REALTIME SYNC
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  buildVersion: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 1.2,
  },
  metadata: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 1.5,
  },
});
