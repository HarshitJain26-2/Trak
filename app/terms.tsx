import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/constants/colors';
import { LegalDocument, LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/components/legal/LegalDocument';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.onSurfaceVariant }]}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated={LEGAL_VERSION} effectiveDate={LEGAL_EFFECTIVE_DATE}>
      <Section title="1. Acceptance of Terms">
        By creating an account or using Trak, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.
      </Section>

      <Section title="2. Description of Service">
        Trak is a developer-first project tracking and collaboration platform. It provides tools for managing projects, milestones, team members, and real-time updates.
      </Section>

      <Section title="3. User Accounts">
        You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to update it as necessary.
      </Section>

      <Section title="4. Acceptable Use">
        You agree not to use Trak for unlawful, abusive, or harmful purposes. This includes attempting to gain unauthorized access, distributing malware, or harassing other users.
      </Section>

      <Section title="5. Intellectual Property">
        Trak and its associated branding, code, and designs are the property of the project owner. You may not copy, modify, or distribute them without permission.
      </Section>

      <Section title="6. Limitation of Liability">
        Trak is provided "as is" without warranties of any kind. The project owner is not liable for any damages arising from the use or inability to use the service.
      </Section>

      <Section title="7. Changes to Terms">
        These terms may be updated from time to time. Continued use of Trak after changes constitutes acceptance of the revised terms.
      </Section>

      <Section title="8. Contact">
        For questions about these Terms, please contact the project owner through the channels provided in the application.
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
