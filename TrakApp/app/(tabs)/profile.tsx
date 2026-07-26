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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useProfileStore, Profile } from '../../store/useProfileStore';
import { useProjectStore } from '../../store/useProjectStore';

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
  onSave: (field: keyof Profile, value: string) => void;
}

function EditModal({ visible, title, field, initialValue, multiline, onClose, onSave }: EditModalProps) {
  const [val, setVal] = useState(initialValue);
  React.useEffect(() => { if (visible) setVal(initialValue); }, [visible]);

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
                  onSubmitEditing={multiline ? undefined : () => { onSave(field, val.trim()); onClose(); }}
                />
                <View style={editStyles.btnRow}>
                  <Pressable style={[editStyles.btn, editStyles.btnCancel]} onPress={onClose}>
                    <Text style={editStyles.btnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[editStyles.btn, editStyles.btnSave, !val.trim() && editStyles.btnDisabled]}
                    disabled={!val.trim()}
                    onPress={() => { onSave(field, val.trim()); onClose(); }}
                  >
                    <Text style={editStyles.btnSaveText}>Save</Text>
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
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, addSkill, removeSkill } = useProfileStore();
  const { projects } = useProjectStore();

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

  const openEdit = (field: keyof Profile, title: string, multiline = false) => {
    setEditModal({ visible: true, field, title, multiline });
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.root}>
      {/* Edit Modal */}
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        field={editModal.field}
        initialValue={String(profile[editModal.field] ?? '')}
        multiline={editModal.multiline}
        onClose={() => setEditModal((s) => ({ ...s, visible: false }))}
        onSave={(field, value) => updateProfile({ [field]: value })}
      />

      <AddSkillModal
        visible={showAddSkill}
        onClose={() => setShowAddSkill(false)}
        onAdd={addSkill}
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
          <Pressable style={styles.avatarWrap} onPress={() => openEdit('avatarUrl', 'Avatar URL')}>
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

        {/* ── GitHub & Links ── */}
        <View style={styles.glassCard}>
          <SectionHeader title="Links" />
          <InfoRow
            icon="github"
            label="GitHub Profile"
            value={profile.githubUrl}
            onEdit={() => openEdit('githubUrl', 'GitHub URL')}
            mono
            placeholder="github.com/username"
          />
          {profile.socialLinks.map((link, i) => (
            <React.Fragment key={link.id}>
              <View style={styles.divider} />
              <Pressable style={infoRowStyles.row}>
                <View style={infoRowStyles.iconWrap}>
                  <Feather name={PLATFORM_ICONS[link.platform] ?? 'link'} size={15} color={Colors.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={infoRowStyles.label}>{link.platform}</Text>
                  <Text style={[infoRowStyles.value, infoRowStyles.mono]} numberOfLines={1}>{link.url}</Text>
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* ── Tech Skills ── */}
        <View style={styles.glassCard}>
          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Tech Stack & Skills" />
            <Pressable
              style={styles.addSkillBtn}
              onPress={() => setShowAddSkill(true)}
              hitSlop={8}
            >
              <Feather name="plus" size={14} color={Colors.primaryFixed} />
            </Pressable>
          </View>
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

        {/* ── GitHub Heatmap placeholder ── */}
        <View style={styles.glassCard}>
          <SectionHeader title="Activity" />
          <View style={styles.heatmapWrap}>
            {Array.from({ length: 7 }).map((_, row) => (
              <View key={row} style={styles.heatmapRow}>
                {Array.from({ length: 26 }).map((_, col) => {
                  const intensity = Math.random();
                  const opacity = intensity < 0.3 ? 0.05 : intensity < 0.6 ? 0.25 : intensity < 0.85 ? 0.55 : 1;
                  return (
                    <View
                      key={col}
                      style={[styles.heatmapCell, { backgroundColor: `${Colors.primaryFixed}` , opacity }]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={styles.heatmapLabel}>GitHub-style contribution activity</Text>
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
});
