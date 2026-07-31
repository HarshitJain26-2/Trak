import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useProfileStore, Profile, SocialLink } from '../../store/useProfileStore';
import { useProjectStore } from '../../store/useProjectStore';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { safeStorage } from '../../lib/storage';
import { ConfirmDialog, useConfirmDialog } from '../../components/ConfirmDialog';
import { ActionSheet, useActionSheet, ActionOption } from '../../components/ActionSheet';

// ─── Platform icons ────────────────────────────────────────────────────────────
const PLATFORM_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  github: 'github',
  twitter: 'twitter',
  linkedin: 'linkedin',
  website: 'globe',
  email: 'mail',
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={[statStyles.card, accent && statStyles.cardAccent]}>
      <Text style={[statStyles.value, accent && statStyles.valueAccent]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(17,20,27,0.8)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardAccent: {
    backgroundColor: `${Colors.primaryFixed}10`,
    borderColor: `${Colors.primaryFixed}25`,
  },
  value: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 22,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  valueAccent: {
    color: Colors.primaryFixed,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
    textAlign: 'center',
  },
});

// ─── Edit Field Modal ──────────────────────────────────────────────────────────
interface EditModalProps {
  visible: boolean;
  title: string;
  field: keyof Profile;
  initialValue: string;
  multiline?: boolean;
  onClose: () => void;
  onSave: (field: keyof Profile, value: string) => Promise<void>;
}

function EditModal({ visible, title, field, initialValue, multiline, onClose, onSave }: EditModalProps) {
  const [val, setVal] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  React.useEffect(() => { if (visible) setVal(initialValue); }, [visible]);

  const handleSave = async () => {
    if (!val.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(field, val.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={editStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={editStyles.card}>
                <Text style={editStyles.title}>Edit {title}</Text>
                <TextInput
                  style={[editStyles.input, multiline && editStyles.inputMulti]}
                  value={val}
                  onChangeText={setVal}
                  multiline={multiline}
                  autoFocus
                  placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                  selectionColor={Colors.primaryFixed}
                  returnKeyType={multiline ? 'default' : 'done'}
                  onSubmitEditing={multiline ? undefined : handleSave}
                />
                <View style={editStyles.btnRow}>
                  <Pressable style={[editStyles.btn, editStyles.btnCancel]} onPress={onClose} disabled={saving}>
                    <Text style={editStyles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[editStyles.btn, editStyles.btnSave, (!val.trim() || saving) && editStyles.btnDisabled]}
                    disabled={!val.trim() || saving}
                    onPress={handleSave}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#002203" />
                    ) : (
                      <Text style={editStyles.btnSaveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1F2B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.onSurface,
    marginBottom: 14,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
    marginBottom: 16,
  },
  inputMulti: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.surfaceContainerHigh, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  btnSave: { backgroundColor: Colors.primaryFixed },
  btnDisabled: { opacity: 0.4 },
  btnCancelText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.onSurfaceVariant },
  btnSaveText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#002203' },
});

// ─── Add Skill Modal ────────────────────────────────────────────────────────────
function AddSkillModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (s: string) => void }) {
  const [val, setVal] = useState('');
  React.useEffect(() => { if (visible) setVal(''); }, [visible]);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={editStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={editStyles.card}>
                <Text style={editStyles.title}>Add Skill</Text>
                <TextInput
                  style={editStyles.input}
                  value={val}
                  onChangeText={setVal}
                  placeholder="e.g. GraphQL, Docker..."
                  placeholderTextColor={`${Colors.onSurfaceVariant}60`}
                  autoFocus
                  selectionColor={Colors.primaryFixed}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (val.trim()) { onAdd(val.trim()); onClose(); } }}
                />
                <View style={editStyles.btnRow}>
                  <Pressable style={[editStyles.btn, editStyles.btnCancel]} onPress={onClose}>
                    <Text style={editStyles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[editStyles.btn, editStyles.btnSave, !val.trim() && editStyles.btnDisabled]}
                    disabled={!val.trim()}
                    onPress={() => { onAdd(val.trim()); onClose(); }}
                  >
                    <Text style={editStyles.btnSaveText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Link Modal (Add / Edit) ───────────────────────────────────────────────────
const PLATFORM_OPTIONS: { value: SocialLink['platform']; label: string }[] = [
  { value: 'github',   label: 'GitHub' },
  { value: 'twitter',  label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website',  label: 'Website' },
  { value: 'email',    label: 'Email' },
];

interface LinkModalProps {
  visible: boolean;
  initial?: SocialLink | null;
  onClose: () => void;
  onSave: (data: Omit<SocialLink, 'id'>) => void;
}

function LinkModal({ visible, initial, onClose, onSave }: LinkModalProps) {
  const [platform, setPlatform] = useState<SocialLink['platform']>('github');
  const [label, setLabel]       = useState('');
  const [url, setUrl]           = useState('');

  React.useEffect(() => {
    if (visible) {
      setPlatform(initial?.platform ?? 'github');
      setLabel(initial?.label ?? '');
      setUrl(initial?.url ?? '');
    }
  }, [visible]);

  const isValid = label.trim().length > 0 && url.trim().length > 0;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={linkStyles.overlay}>
            <TouchableWithoutFeedback>
              <View style={linkStyles.sheet}>
                {/* Handle */}
                <View style={linkStyles.handle} />
                <Text style={linkStyles.title}>{initial ? 'Edit Link' : 'Add Link'}</Text>

                {/* Platform picker */}
                <Text style={linkStyles.fieldLabel}>PLATFORM</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[linkStyles.platformChip, platform === opt.value && linkStyles.platformChipActive]}
                      onPress={() => setPlatform(opt.value)}
                    >
                      <Feather
                        name={PLATFORM_ICONS[opt.value] ?? 'link'}
                        size={13}
                        color={platform === opt.value ? '#002203' : Colors.onSurfaceVariant}
                      />
                      <Text style={[linkStyles.platformChipText, platform === opt.value && linkStyles.platformChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Label */}
                <Text style={linkStyles.fieldLabel}>LABEL</Text>
                <TextInput
                  style={linkStyles.input}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. My GitHub"
                  placeholderTextColor={`${Colors.onSurfaceVariant}50`}
                  selectionColor={Colors.primaryFixed}
                  returnKeyType="next"
                />

                {/* URL */}
                <Text style={linkStyles.fieldLabel}>URL / ADDRESS</Text>
                <TextInput
                  style={[linkStyles.input, { marginBottom: 20 }]}
                  value={url}
                  onChangeText={setUrl}
                  placeholder={platform === 'email' ? 'you@example.com' : 'https://...'}
                  placeholderTextColor={`${Colors.onSurfaceVariant}50`}
                  selectionColor={Colors.primaryFixed}
                  autoCapitalize="none"
                  keyboardType={platform === 'email' ? 'email-address' : 'url'}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (isValid) { onSave({ platform, label: label.trim(), url: url.trim() }); onClose(); } }}
                />

                <View style={editStyles.btnRow}>
                  <Pressable style={[editStyles.btn, editStyles.btnCancel]} onPress={onClose}>
                    <Text style={editStyles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[editStyles.btn, editStyles.btnSave, !isValid && editStyles.btnDisabled]}
                    disabled={!isValid}
                    onPress={() => { onSave({ platform, label: label.trim(), url: url.trim() }); onClose(); }}
                  >
                    <Text style={editStyles.btnSaveText}>{initial ? 'Save' : 'Add Link'}</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const linkStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1F2B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: `${Colors.onSurfaceVariant}40`,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.onSurface,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 999,
    borderWidth: 1, borderColor: `${Colors.outlineVariant}33`,
  },
  platformChipActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryFixed,
  },
  platformChipText: {
    fontFamily: 'Inter_400Regular', fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  platformChipTextActive: { color: '#002203', fontFamily: 'Inter_600SemiBold' },
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
    fontFamily: 'Inter_400Regular', fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1, borderColor: `${Colors.primaryFixed}33`,
    marginBottom: 14,
  },
});

// ─── Row with edit button ──────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  onEdit,
  placeholder = 'Not set',
  mono = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onEdit: () => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const isEmpty = !value;
  return (
    <Pressable style={infoRowStyles.row} onPress={onEdit}>
      <View style={infoRowStyles.iconWrap}>
        <Feather name={icon} size={15} color={Colors.onSurfaceVariant} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={[infoRowStyles.value, mono && infoRowStyles.mono, isEmpty && infoRowStyles.placeholder]}>
          {isEmpty ? placeholder : value}
        </Text>
      </View>
      <Feather name="edit-2" size={14} color={`${Colors.onSurfaceVariant}50`} />
    </Pressable>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: Colors.secondary,
  },
  placeholder: {
    color: `${Colors.onSurfaceVariant}50`,
    fontStyle: 'italic',
  },
});

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
      color: `${Colors.onSurfaceVariant}80`,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 4,
    }}>
      {title}
    </Text>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, addSkill, removeSkill, addLink, updateLink, removeLink } = useProfileStore();
  const { projects } = useProjectStore();
  const { dialogProps, ask } = useConfirmDialog();
  const { actionSheetProps, showActionSheet } = useActionSheet();

  const handleLogOut = async () => {
    const confirmed = await ask({
      title: 'Log Out',
      message: 'Are you sure you want to log out of Trak?',
      confirmLabel: 'Log Out',
      destructive: true,
      icon: 'log-out',
    });
    if (!confirmed) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    await safeStorage.removeItem('trak_local_profile');
    await safeStorage.removeItem('trak_local_projects');
    useProfileStore.getState().clearProfile();
    useProjectStore.getState().clearProjects();
    router.replace('/auth');
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => !p.isCompleted).length;
  const completedProjects = projects.filter((p) => p.isCompleted).length;
  const totalFeatures = projects.reduce((sum, p) => sum + p.milestones.length, 0);

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    field: keyof Profile;
    title: string;
    multiline?: boolean;
  }>({ visible: false, field: 'name', title: '' });

  const [showAddSkill, setShowAddSkill] = useState(false);

  // Link modal state
  const [linkModal, setLinkModal] = useState<{
    visible: boolean;
    editing: SocialLink | null;
  }>({ visible: false, editing: null });

  const openEdit = (field: keyof Profile, title: string, multiline = false) => {
    setEditModal({ visible: true, field, title, multiline });
  };

  // Return only the first letter of the first name
  const getInitials = (name: string) =>
    (name.trim().split(' ')[0]?.[0] ?? '?').toUpperCase();

  // Pick from photo library
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateProfile({ avatarUrl: result.assets[0].uri });
    }
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateProfile({ avatarUrl: result.assets[0].uri });
    }
  };

  // Show action sheet when avatar is tapped
  const handleAvatarPress = () => {
    const options: ActionOption[] = [
      {
        label: 'Photo Library',
        icon: 'image' as const,
        onPress: pickFromLibrary,
      },
      {
        label: 'Take Photo',
        icon: 'camera' as const,
        onPress: takePhoto,
      },
    ];

    if (profile.avatarUrl) {
      options.push({
        label: 'Remove Photo',
        icon: 'trash-2' as const,
        destructive: true,
        onPress: () => updateProfile({ avatarUrl: '' }),
      });
    }

    showActionSheet({
      title: 'Profile Photo',
      message: 'Choose how to update your photo',
      options,
    });
  };

  const handleSaveLink = (data: Omit<SocialLink, 'id'>) => {
    if (linkModal.editing) {
      updateLink(linkModal.editing.id, data);
    } else {
      addLink(data);
    }
  };

  return (
    <View style={styles.root}>
      {/* Themed Dialogs */}
      <ConfirmDialog {...dialogProps} />
      <ActionSheet {...actionSheetProps} />

      {/* Edit Modal */}
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        field={editModal.field}
        initialValue={String(profile[editModal.field] ?? '')}
        multiline={editModal.multiline}
        onClose={() => setEditModal((s) => ({ ...s, visible: false }))}
        onSave={async (field, value) => {
          const res = await updateProfile({ [field]: value });
          if (!res.success && res.error) {
            Alert.alert('Update Failed', res.error);
          }
        }}
      />

      <AddSkillModal
        visible={showAddSkill}
        onClose={() => setShowAddSkill(false)}
        onAdd={addSkill}
      />

      <LinkModal
        visible={linkModal.visible}
        initial={linkModal.editing}
        onClose={() => setLinkModal({ visible: false, editing: null })}
        onSave={handleSaveLink}
      />

      {/* App Bar */}
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.appBar, Platform.OS === 'android' && { backgroundColor: `${Colors.surface}E6` }]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <View style={styles.appBarLeft}>
            <Feather name="user" size={18} color={Colors.primaryFixed} />
            <Text style={styles.appBarTitle}>Profile</Text>
          </View>
        </View>
      </BlurView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name Hero ── */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <Pressable style={styles.avatarWrap} onPress={handleAvatarPress}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={10} color="#002203" />
            </View>
          </Pressable>

          {/* Name + role */}
          <Pressable onPress={() => openEdit('name', 'Name')} style={styles.nameRow}>
            <Text style={styles.heroName}>{profile.name || 'Your Name'}</Text>
            <Feather name="edit-2" size={14} color={`${Colors.primaryFixed}80`} />
          </Pressable>
          <Pressable onPress={() => openEdit('role', 'Role')} style={styles.roleRow}>
            <Text style={styles.heroRole}>{profile.role || 'Your Role'}</Text>
          </Pressable>
          <Pressable onPress={() => openEdit('bio', 'Bio', true)} style={styles.bioWrap}>
            <Text style={styles.heroBio} numberOfLines={3}>
              {profile.bio || 'Tap to add a bio...'}
            </Text>
          </Pressable>

          {/* Location + company pill row */}
          <View style={styles.pillMeta}>
            {profile.location ? (
              <View style={styles.metaPill}>
                <Feather name="map-pin" size={11} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaPillText}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.company ? (
              <View style={styles.metaPill}>
                <Feather name="briefcase" size={11} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaPillText}>{profile.company}</Text>
              </View>
            ) : null}
            <View style={styles.metaPill}>
              <Feather name="calendar" size={11} color={Colors.onSurfaceVariant} />
              <Text style={styles.metaPillText}>Since {profile.joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatCard value={totalProjects} label="Total Projects" />
          <StatCard value={activeProjects} label="Active" accent />
          <StatCard value={completedProjects} label="Shipped" />
          <StatCard value={totalFeatures} label="Features" />
        </View>

        {/* ── Developer Info ── */}
        <View style={styles.glassCard}>
          <SectionHeader title="Developer Info" />
          <InfoRow
            icon="user"
            label="Name"
            value={profile.name}
            onEdit={() => openEdit('name', 'Name')}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="at-sign"
            label="Username"
            value={profile.username}
            onEdit={() => openEdit('username', 'Username')}
            mono
          />
          <View style={styles.divider} />
          <InfoRow
            icon="briefcase"
            label="Role"
            value={profile.role}
            onEdit={() => openEdit('role', 'Role')}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="home"
            label="Company"
            value={profile.company}
            onEdit={() => openEdit('company', 'Company')}
            placeholder="No company set"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="map-pin"
            label="Location"
            value={profile.location}
            onEdit={() => openEdit('location', 'Location')}
          />
        </View>

        {/* ── Links ── */}
        <View style={styles.glassCard}>
          <SectionHeader title="Links" />

          {/* GitHub is always first, non-removable */}
          <InfoRow
            icon="github"
            label="GitHub Profile"
            value={profile.githubUrl}
            onEdit={() => openEdit('githubUrl', 'GitHub URL')}
            mono
            placeholder="github.com/username"
          />

          {/* Social links — editable & removable */}
          {profile.socialLinks.map((link) => (
            <React.Fragment key={link.id}>
              <View style={styles.divider} />
              <View style={infoRowStyles.row}>
                <View style={infoRowStyles.iconWrap}>
                  <Feather name={PLATFORM_ICONS[link.platform] ?? 'link'} size={15} color={Colors.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={infoRowStyles.label}>{link.label}</Text>
                  <Text style={[infoRowStyles.value, infoRowStyles.mono]} numberOfLines={1}>{link.url}</Text>
                </View>
                {/* Edit button */}
                <Pressable
                  hitSlop={8}
                  style={linkRowStyles.iconBtn}
                  onPress={() => setLinkModal({ visible: true, editing: link })}
                >
                  <Feather name="edit-2" size={14} color={`${Colors.onSurfaceVariant}60`} />
                </Pressable>
                {/* Delete button */}
                <Pressable
                  hitSlop={8}
                  style={linkRowStyles.iconBtn}
                  onPress={() =>
                    Alert.alert('Remove Link', `Remove "${link.label}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeLink(link.id) },
                    ])
                  }
                >
                  <Feather name="trash-2" size={14} color={`${Colors.error}80`} />
                </Pressable>
              </View>
            </React.Fragment>
          ))}

          {/* Add link button at bottom */}
          <View style={styles.divider} />
          <Pressable
            style={linkRowStyles.addRow}
            onPress={() => setLinkModal({ visible: true, editing: null })}
          >
            <Feather name="plus-circle" size={15} color={`${Colors.primaryFixed}80`} />
            <Text style={linkRowStyles.addRowText}>Add a new link</Text>
          </Pressable>
        </View>

        {/* ── Tech Skills ── */}
        <View style={styles.glassCard}>
          <SectionHeader title="Tech Stack & Skills" />
          <View style={styles.skillsGrid}>
            {profile.skills.map((skill) => (
              <Pressable
                key={skill}
                style={styles.skillChip}
                onLongPress={() =>
                  Alert.alert('Remove Skill', `Remove "${skill}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeSkill(skill) },
                  ])
                }
              >
                <Text style={styles.skillChipText}>{skill}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.skillChipAdd} onPress={() => setShowAddSkill(true)}>
              <Feather name="plus" size={13} color={`${Colors.primaryFixed}80`} />
              <Text style={styles.skillChipAddText}>Add skill</Text>
            </Pressable>
          </View>
          <Text style={styles.skillHint}>Long-press a skill to remove it</Text>
        </View>

        {/* ── Account Actions (Log Out) ── */}
        <View style={[styles.glassCard, styles.logoutCard]}>
          <Pressable style={styles.logoutBtn} onPress={handleLogOut}>
            <Feather name="log-out" size={16} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out of Trak</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  appBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}4D`,
    overflow: 'hidden',
  },
  appBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 140,
  },

  // Hero card
  heroCard: {
    backgroundColor: 'rgba(17,20,27,0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}20`,
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.primaryFixed },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: `${Colors.primaryFixed}20`,
    borderWidth: 2, borderColor: `${Colors.primaryFixed}50`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: Colors.primaryFixed,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  roleRow: { marginBottom: 10 },
  heroRole: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: Colors.secondaryFixed,
  },
  bioWrap: { marginBottom: 14, paddingHorizontal: 8 },
  heroBio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  pillMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 999,
    borderWidth: 1, borderColor: `${Colors.outlineVariant}33`,
  },
  metaPillText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },

  // Glass card
  glassCard: {
    backgroundColor: 'rgba(17,20,27,0.8)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  divider: {
    height: 1,
    backgroundColor: `${Colors.outlineVariant}20`,
    marginVertical: 0,
  },

  // Skills
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addSkillBtn: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderWidth: 1, borderColor: `${Colors.primaryFixed}33`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  skillChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: `${Colors.primaryFixed}15`,
    borderRadius: 999,
    borderWidth: 1, borderColor: `${Colors.primaryFixed}30`,
  },
  skillChipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.primaryFixed,
  },
  skillChipAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 999,
    borderWidth: 1, borderColor: `${Colors.outlineVariant}33`,
    borderStyle: 'dashed',
  },
  skillChipAddText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}70`,
  },
  skillHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: `${Colors.onSurfaceVariant}50`,
    marginTop: 4,
  },

  // Heatmap
  heatmapWrap: { gap: 3, marginBottom: 10 },
  heatmapRow: { flexDirection: 'row', gap: 3 },
  heatmapCell: {
    width: 10, height: 10, borderRadius: 2,
  },
  heatmapLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}50`,
    textAlign: 'center',
  },
  logoutCard: {
    borderColor: 'rgba(255, 82, 82, 0.25)',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  logoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FF5252',
  },
});


const linkRowStyles = StyleSheet.create({
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  addRowText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.primaryFixed}80`,
  },
});
