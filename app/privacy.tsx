import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { LegalDocument, LEGAL_VERSION } from '@/components/legal/LegalDocument';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.onSurfaceVariant }]}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated={LEGAL_VERSION}>
      <Section title="1. Introduction">
        This Privacy Policy explains how Trak handles your information. By using Trak, you acknowledge the practices described in this policy.
      </Section>

      <Section title="2. Information We Collect">
        Trak may collect information you provide directly, such as your name, email address, and project data. This information is used to provide and improve the service.
      </Section>

      <Section title="3. How We Use Information">
        Your information is used to operate the application, authenticate your account, sync your projects, and communicate important updates.
      </Section>

      <Section title="4. Data Storage">
        Project and account data may be stored locally on your device and synchronized with our backend infrastructure. We take reasonable measures to protect your data.
      </Section>

      <Section title="5. Third-Party Services">
        Trak may rely on third-party services for authentication, cloud storage, and analytics. These services have their own privacy policies.
      </Section>

      <Section title="6. Your Choices">
        You can update your account information, manage notification preferences, and delete your data through the application settings where available.
      </Section>

      <Section title="7. Security">
        We implement reasonable security measures to protect your information. However, no method of transmission or storage is completely secure.
      </Section>

      <Section title="8. Changes to This Policy">
        This Privacy Policy may be updated from time to time. Continued use of Trak after changes constitutes acceptance of the revised policy.
      </Section>

      <Section title="9. Contact">
        For questions about this Privacy Policy, please contact the project owner through the channels provided in the application.
      </Section>
    </LegalDocument>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
});
