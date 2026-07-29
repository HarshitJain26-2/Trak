import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { useProfileStore } from '../store/useProfileStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  {
    key: 'identity',
    title: 'Who are you?',
    subtitle: 'Let\'s set up your developer identity.',
    icon: 'user' as const,
  },
  {
    key: 'role',
    title: 'Your role & bio',
    subtitle: 'Tell the world what you build.',
    icon: 'briefcase' as const,
  },
  {
    key: 'location',
    title: 'Where are you?',
    subtitle: 'Optional, but nice to show.',
    icon: 'map-pin' as const,
  },
];

export default function SetupProfileScreen() {
  const router = useRouter();
  const { updateProfile } = useProfileStore();

  // Step tracking
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');

  // Validation for current step
  const isStepValid = () => {
    if (step === 0) return name.trim().length > 0 && username.trim().length > 0;
    if (step === 1) return role.trim().length > 0;
    return true; // Step 2 is fully optional
  };

  const animateNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    if (step < STEPS.length - 1) {
      animateNext();
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      animateNext();
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    const now = new Date();
    const joinedDate = now.toLocaleString('default', { month: 'short' }).toUpperCase() + ' ' + now.getFullYear();

    await updateProfile({
      name: name.trim() || 'Developer',
      username: username.trim(),
      role: role.trim(),
      bio: bio.trim(),
      location: location.trim(),
      company: company.trim(),
      githubUrl: githubUrl.trim() ? `github.com/${githubUrl.trim().replace(/^(https?:\/\/)?(github\.com\/)?/, '')}` : '',
      joinedDate,
      socialLinks: [
        ...(githubUrl.trim()
          ? [{
              id: 'gh',
              platform: 'github' as const,
              url: `github.com/${githubUrl.trim().replace(/^(https?:\/\/)?(github\.com\/)?/, '')}`,
              label: 'GitHub',
            }]
          : []),
      ],
      skills: [],
    });

    router.replace('/(tabs)');
  };

  const handlePressIn = () =>
    Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.root}>
      {/* Ambient blobs */}
      <View style={[styles.blob, styles.blobTL]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBR]} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Progress dots */}
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              {/* Step header */}
              <View style={styles.stepHeader}>
                <View style={styles.stepIconBox}>
                  <Feather name={currentStep.icon} size={22} color={Colors.primaryFixed} />
                </View>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepLabel}>STEP {step + 1} OF {STEPS.length}</Text>
                  <Text style={styles.stepTitle}>{currentStep.title}</Text>
                  <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
                </View>
              </View>

              {/* ── STEP 0: Identity ── */}
              {step === 0 && (
                <View style={styles.fields}>
                  <Field
                    label="FULL NAME"
                    icon="user"
                    placeholder="e.g. Alex Chen"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Field
                    label="USERNAME"
                    icon="at-sign"
                    placeholder="e.g. alexchen"
                    value={username}
                    onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
                    autoCapitalize="none"
                    mono
                    returnKeyType="next"
                  />
                  <Field
                    label="GITHUB USERNAME"
                    icon="github"
                    placeholder="e.g. alexchen (optional)"
                    value={githubUrl}
                    onChangeText={setGithubUrl}
                    autoCapitalize="none"
                    mono
                    returnKeyType="done"
                    hint="Just your username, not the full URL"
                  />
                </View>
              )}

              {/* ── STEP 1: Role & Bio ── */}
              {step === 1 && (
                <View style={styles.fields}>
                  <Field
                    label="ROLE / TITLE"
                    icon="briefcase"
                    placeholder="e.g. Full-Stack Engineer"
                    value={role}
                    onChangeText={setRole}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Field
                    label="BIO"
                    icon="edit-3"
                    placeholder="What do you build? What drives you? (optional)"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    returnKeyType="default"
                    hint="A sentence or two works great"
                  />
                </View>
              )}

              {/* ── STEP 2: Location & Company ── */}
              {step === 2 && (
                <View style={styles.fields}>
                  <Field
                    label="LOCATION"
                    icon="map-pin"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChangeText={setLocation}
                    autoCapitalize="words"
                    returnKeyType="next"
                    hint="City, Country or remote"
                  />
                  <Field
                    label="COMPANY / TEAM"
                    icon="home"
                    placeholder="e.g. Acme Corp (optional)"
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />

                  {/* Preview card */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>PREVIEW</Text>
                    <Text style={styles.previewName}>{name || 'Your Name'}</Text>
                    <Text style={styles.previewRole}>{role || 'Your Role'}</Text>
                    {bio ? <Text style={styles.previewBio} numberOfLines={2}>{bio}</Text> : null}
                    <View style={styles.previewPills}>
                      {location ? (
                        <View style={styles.previewPill}>
                          <Feather name="map-pin" size={10} color={Colors.onSurfaceVariant} />
                          <Text style={styles.previewPillText}>{location}</Text>
                        </View>
                      ) : null}
                      {company ? (
                        <View style={styles.previewPill}>
                          <Feather name="home" size={10} color={Colors.onSurfaceVariant} />
                          <Text style={styles.previewPillText}>{company}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            {/* Skip (only on optional steps or last step) */}
            {(step === 2 || (step === 1 && !role.trim())) && (
              <Pressable style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>{isLast ? 'Skip & Finish' : 'Skip'}</Text>
              </Pressable>
            )}

            <Animated.View style={[styles.nextBtnWrap, { transform: [{ scale: btnScale }] }]}>
              <Pressable
                style={[styles.nextBtn, !isStepValid() && styles.nextBtnDisabled]}
                onPress={handleNext}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!isStepValid() && step !== 2}
              >
                <Text style={styles.nextBtnText}>
                  {isLast ? 'Launch Trak' : 'Continue'}
                </Text>
                <Feather
                  name={isLast ? 'zap' : 'arrow-right'}
                  size={18}
                  color="#002203"
                />
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Reusable field component ──────────────────────────────────────────────────
function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  multiline,
  autoCapitalize,
  returnKeyType,
  hint,
  mono,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done' | 'default';
  hint?: string;
  mono?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, multiline && fieldStyles.inputWrapMulti]}>
        <Feather
          name={icon}
          size={15}
          color={`${Colors.onSurfaceVariant}70`}
          style={{ marginTop: multiline ? 2 : 0 }}
        />
        <TextInput
          style={[
            fieldStyles.input,
            mono && fieldStyles.inputMono,
            multiline && fieldStyles.inputMulti,
          ]}
          placeholder={placeholder}
          placeholderTextColor={`${Colors.onSurfaceVariant}40`}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          selectionColor={Colors.primaryFixed}
          textAlignVertical={multiline ? 'top' : 'center'}
          numberOfLines={multiline ? 4 : 1}
        />
      </View>
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}99`,
    letterSpacing: 2,
  },
  inputWrap: {
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
  inputWrapMulti: {
    alignItems: 'flex-start',
    paddingTop: 13,
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
    minHeight: 88,
    lineHeight: 22,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}60`,
    marginLeft: 2,
  },
});

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
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
    backgroundColor: `${Colors.primaryFixed}08`,
  },
  blobBR: {
    bottom: -SCREEN_WIDTH * 0.4,
    right: -SCREEN_WIDTH * 0.3,
    backgroundColor: `${Colors.secondaryContainer}08`,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${Colors.onSurfaceVariant}25`,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: `${Colors.primaryFixed}50`,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  stepIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primaryFixed}15`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}25`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  stepMeta: { flex: 1, gap: 2 },
  stepLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: `${Colors.primaryFixed}70`,
    letterSpacing: 2,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  stepSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: `${Colors.onSurfaceVariant}CC`,
    lineHeight: 18,
  },
  fields: { gap: 16 },
  // Preview card on step 3
  previewCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}20`,
    padding: 16,
    gap: 6,
    marginTop: 4,
  },
  previewLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: `${Colors.primaryFixed}70`,
    letterSpacing: 2,
    marginBottom: 4,
  },
  previewName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  previewRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.primaryFixed,
  },
  previewBio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}CC`,
    lineHeight: 18,
  },
  previewPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewPillText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}20`,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.onSurfaceVariant}80`,
  },
  nextBtnWrap: { width: '100%' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnDisabled: {
    opacity: 0.45,
  },
  nextBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#002203',
  },
});
