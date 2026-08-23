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

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated={LEGAL_VERSION} effectiveDate={LEGAL_EFFECTIVE_DATE}>
      <Section title="1. Introduction">
        This Privacy Policy explains how Trak ("we", "us") collects, uses, and protects your information when you use the Trak app and related services. By using Trak, you acknowledge the practices described here.
      </Section>

      <Section title="2. Data Controller & Contact">
        The data controller is Harshit Jain, operating Trak as an individual developer. For privacy requests, email traksupportforyou@gmail.com.
      </Section>

      <Section title="3. Information We Collect">
        Account information (name, username, email); authentication data (passwords are never stored in plain text by Trak; Google sign-in shares your Google name and email); project and workspace data you create (projects, milestones, tasks, deadlines, team memberships, join codes); device push tokens for notifications you opted into; and a locally cached session on your device. We do not collect advertising identifiers, precise location, or browsing history.
      </Section>

      <Section title="4. How We Use Information & Legal Bases">
        We use your data to provide and authenticate your account (contract), sync your projects in real time (contract), deliver push notifications you opted into (consent), secure the service and prevent abuse (legitimate interests), and comply with legal obligations. We do not use your data for advertising, profiling, or automated decision-making.
      </Section>

      <Section title="5. Sharing Your Information">
        We do not sell or rent your personal information. We share it only with: Supabase (authentication, database, real-time sync); Google (only if you use Google sign-in); Expo and device push services (FCM/APNs) for notifications you enabled; and Firebase Hosting, which hosts our static policy pages only. Your name and contributions are visible to members of projects you join.
      </Section>

      <Section title="6. International Data Transfers">
        Our providers operate globally, so your data may be processed outside your country of residence. We rely on provider safeguards under applicable law, including standard contractual clauses and adequacy decisions.
      </Section>

      <Section title="7. Data Retention & Deletion">
        We keep your data while your account is active. Deleted projects are purged automatically after 15 days. On a verified account deletion request, we delete your personal data within 30 days; temporary backup copies are overwritten within the provider's backup cycle.
      </Section>

      <Section title="8. Your Data Protection Rights">
        Depending on your location (including under GDPR/UK GDPR), you may request access, rectification, erasure, portability, restriction, objection, and withdrawal of consent. Email us to exercise these rights; we respond within 30 days. EEA/UK users may lodge a complaint with their supervisory authority.
      </Section>

      <Section title="9. California Privacy Rights (CCPA/CPRA)">
        We do not sell your personal information and do not share it for cross-context behavioral advertising. California residents have the right to know, delete, and correct their personal information and will not be discriminated against for exercising these rights.
      </Section>

      <Section title="10. Children's Privacy">
        Trak is not directed to children under 13 (or under 16 where that is the minimum age). We do not knowingly collect data from children and will delete it promptly if discovered. Third-party sign-in providers' own age requirements also apply.
      </Section>

      <Section title="11. Security">
        We protect your data with HTTPS/TLS encryption in transit, provider encryption at rest, Supabase Row Level Security access control, and time-limited OTP codes for account recovery. No transmission method is 100% secure.
      </Section>

      <Section title="12. Data Breach Notification">
        If a personal data breach poses a risk to your rights, we will notify the relevant supervisory authority within legally required timeframes (including 72 hours under GDPR where applicable) and notify affected users without undue delay where the risk is high.
      </Section>

      <Section title="13. Analytics & Crash Reporting">
        Trak currently uses no analytics, telemetry, or crash-reporting services. If we add any, we will update this policy and obtain consent where required before doing so.
      </Section>

      <Section title="14. Cookies & Tracking">
        Our web resources set no advertising, analytics, or third-party tracking cookies. The app stores a session token locally, which is strictly necessary to keep you signed in. If non-essential cookies are ever introduced, we will present a consent notice first.
      </Section>

      <Section title="15. Push Notifications">
        Notifications are sent only after you grant permission. You can opt out anytime in your device settings.
      </Section>

      <Section title="16. Changes to This Policy">
        We may update this policy; the Effective Date shows when the current version took effect and Last Updated shows the most recent revision. Material changes will be announced in-app before taking effect. Continued use after the effective date constitutes acceptance.
      </Section>

      <Section title="17. Contact">
        Questions or privacy requests: traksupportforyou@gmail.com.
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
