import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useProfileStore } from '../store/useProfileStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SetupProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile, isLoading } = useProfileStore();

  // Pre-fill with existing profile data for returning users
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill once the profile is loaded from Supabase
  useEffect(() => {
    setName(profile.name || '');
    setUsername(profile.username || '');
    // Extract username from github URL if it's stored as a URL
    const gh = profile.githubUrl || '';
    setGithubUsername(gh.replace(/^(https?:\/\/)?(www\.)?github\.com\//, ''));
    setRole(profile.role || '');
    setBio(profile.bio || '');
    setLocation(profile.location || '');
    setCompany(profile.company || '');
  }, [profile.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const joinedDate =
        now.toLocaleString('default', { month: 'short' }).toUpperCase() +
        ' ' +
        now.getFullYear();

      const cleanGh = githubUsername.trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');

      await updateProfile({
        name: name.trim() || 'Developer',
        username: username.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim(),
        company: company.trim(),
        githubUrl: cleanGh ? `github.com/${cleanGh}` : '',
        joinedDate: profile.joinedDate || joinedDate,
        socialLinks: cleanGh
          ? [{ id: 'gh', platform: 'github' as const, url: `github.com/${cleanGh}`, label: 'GitHub' }]
          : profile.socialLinks,
      });

      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.primaryFixed} size="large" />
      </View>
    );
  }

  const isNewUser = !profile.name;

  return (
    <View style={styles.root}>
      {/* Ambient blobs */}
      <View style={[styles.blob, styles.blobTL]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBR]} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Header bar ── */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.topIconBox}>
                <Feather name="user" size={16} color={Colors.primaryFixed} />
              </View>
              <View>
                <Text style={styles.topTitle}>
                  {isNewUser ? 'Complete your profile' : 'Update your profile'}
                </Text>
                <Text style={styles.topSubtitle}>
                  {isNewUser
                    ? 'Fill in your details to get started'
                    : 'All fields are optional'}
                </Text>
              </View>
            </View>

            {/* Skip button */}
            <Pressable style={styles.skipBtn} onPress={handleSkip} hitSlop={8}>
              <Text style={styles.skipText}>Skip</Text>
              <Feather name="chevron-right" size={14} color={`${Colors.onSurfaceVariant}80`} />
            </Pressable>
          </View>

          {/* ── Form ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Section: Identity */}
            <SectionLabel icon="user" label="IDENTITY" />

            <InputField
              label="Full Name"
              placeholder="e.g. Alex Chen"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              icon="user"
            />

            <InputField
              label="Username"
              placeholder="e.g. alexchen"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
              autoCapitalize="none"
              returnKeyType="next"
              icon="at-sign"
              mono
              hint="No spaces, lowercase"
            />

            {/* Section: Role */}
            <SectionLabel icon="briefcase" label="ROLE & BIO" />

            <InputField
              label="Role / Title"
              placeholder="e.g. Full-Stack Engineer"
              value={role}
              onChangeText={setRole}
              autoCapitalize="words"
              returnKeyType="next"
              icon="briefcase"
            />

            <InputField
              label="Bio"
              placeholder="What do you build? What drives you?"
              value={bio}
              onChangeText={setBio}
              multiline
              returnKeyType="default"
              icon="edit-3"
              hint="Keep it short — a sentence or two"
            />

            {/* Section: Location */}
            <SectionLabel icon="map-pin" label="WHERE YOU'RE BASED" />

            <InputField
              label="Location"
              placeholder="e.g. San Francisco, CA"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
              returnKeyType="next"
              icon="map-pin"
            />

            <InputField
              label="Company / Team"
              placeholder="e.g. Acme Corp"
              value={company}
              onChangeText={setCompany}
              autoCapitalize="words"
              returnKeyType="next"
              icon="home"
            />

            {/* Section: Links */}
            <SectionLabel icon="github" label="GITHUB" />

            <InputField
              label="GitHub Username"
              placeholder="e.g. alexchen"
              value={githubUsername}
              onChangeText={(t) =>
                setGithubUsername(t.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\s/g, ''))
              }
              autoCapitalize="none"
              returnKeyType="done"
              icon="github"
              mono
              hint="Just your username — not the full URL"
            />

            {/* Bottom spacer for button */}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Save button ── */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#002203" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#002203" />
                  <Text style={styles.saveBtnText}>
                    {isNewUser ? 'Save & Enter Trak' : 'Save Changes'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.skipFooterBtn} onPress={handleSkip}>
              <Text style={styles.skipFooterText}>
                {isNewUser ? 'Skip for now, I\'ll fill this in later' : 'Cancel, go back to app'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <Feather name={icon} size={12} color={`${Colors.primaryFixed}90`} />
      <Text style={sectionStyles.text}>{label}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: `${Colors.primaryFixed}90`,
    letterSpacing: 2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: `${Colors.outlineVariant}33`,
  },
});

// ─── Input field ───────────────────────────────────────────────────────────────
function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  multiline,
  autoCapitalize,
  returnKeyType,
  icon,
  mono,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done' | 'default';
  icon: keyof typeof Feather.glyphMap;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.row, multiline && inputStyles.rowMulti]}>
        <Feather
          name={icon}
          size={15}
          color={`${Colors.onSurfaceVariant}60`}
          style={{ marginTop: multiline ? 1 : 0 }}
        />
        <TextInput
          style={[
            inputStyles.input,
            mono && inputStyles.inputMono,
            multiline && inputStyles.inputMulti,
          ]}
          placeholder={placeholder}
          placeholderTextColor={`${Colors.onSurfaceVariant}35`}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          selectionColor={Colors.primaryFixed}
          textAlignVertical={multiline ? 'top' : 'center'}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
      {hint ? <Text style={inputStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { gap: 5 },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowMulti: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    padding: 0,
  },
  inputMono: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: Colors.secondary,
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 72,
    lineHeight: 22,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}55`,
    marginLeft: 2,
  },
});

// ─── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: SCREEN_WIDTH / 2,
  },
  blobTL: {
    top: -SCREEN_WIDTH * 0.4,
    left: -SCREEN_WIDTH * 0.3,
    backgroundColor: `${Colors.primaryFixed}07`,
  },
  blobBR: {
    bottom: -SCREEN_WIDTH * 0.4,
    right: -SCREEN_WIDTH * 0.3,
    backgroundColor: `${Colors.secondaryContainer}07`,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}25`,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  topIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${Colors.primaryFixed}15`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}25`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  topSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}80`,
    marginTop: 1,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${Colors.surfaceContainerHigh}80`,
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: `${Colors.onSurfaceVariant}90`,
  },

  // Form
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}20`,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 12,
    paddingVertical: 15,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#002203',
  },
  skipFooterBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipFooterText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}60`,
    textAlign: 'center',
  },
});
