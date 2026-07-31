import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useProjectStore, Project } from '../../store/useProjectStore';
import { TechPill } from '../../components/TechPill';

import { ProjectActionModal } from '../../components/ProjectActionModal';

// ─── Deleted Project Card ──────────────────────────────────────────────────────
function DeletedCard({
  project,
  onRestore,
  onPermanentDelete,
}: {
  project: Project;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <>
      <ProjectActionModal
        visible={modalVisible}
        project={project}
        onClose={() => setModalVisible(false)}
      />
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={() => setModalVisible(true)}
        delayLongPress={350}
      >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Feather name="trash-2" size={15} color={Colors.error} />
              <Text style={styles.cardName}>{project.name}</Text>
            </View>
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedBadgeText}>DELETED</Text>
            </View>
          </View>

          <Text style={styles.cardDesc} numberOfLines={2}>
            {project.description}
          </Text>

          {/* Tech pills */}
          <View style={styles.pillsRow}>
            {project.techStack.map((t) => (
              <TechPill key={t} label={t} />
            ))}
          </View>

          {/* Action buttons footer */}
          <View style={styles.cardFooter}>
            <Pressable style={styles.restoreBtn} onPress={onRestore}>
              <Feather name="rotate-ccw" size={13} color={Colors.primaryFixed} />
              <Text style={styles.restoreBtnText}>Restore</Text>
            </Pressable>

            <Pressable style={styles.permDeleteBtn} onPress={onPermanentDelete}>
              <Feather name="trash-2" size={13} color={Colors.error} />
              <Text style={styles.permDeleteBtnText}>Delete Permanently</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
    </>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function DeletedEmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Feather name="trash-2" size={40} color={`${Colors.onSurfaceVariant}40`} />
      </View>
      <Text style={styles.emptyTitle}>Trash is empty</Text>
      <Text style={styles.emptySubtitle}>
        Projects you delete will be moved here before permanent removal.
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DeletedScreen() {
  const insets = useSafeAreaInsets();
  const { projects, restoreProject, permanentlyDeleteProject } = useProjectStore();
  const deletedProjects = projects.filter((p) => p.isDeleted);

  const handleRestore = (project: Project) => {
    Alert.alert(
      'Restore Project',
      `Restore "${project.name}" back to active projects?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => restoreProject(project.id),
        },
      ]
    );
  };

  const handlePermanentDelete = (project: Project) => {
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => permanentlyDeleteProject(project.id),
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* App Bar */}
      <BlurView
        intensity={60}
        tint="dark"
        style={[
          styles.appBar,
          Platform.OS === 'android' && { backgroundColor: `${Colors.surface}E6` },
        ]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <View style={styles.appBarLeft}>
            <Feather name="trash-2" size={18} color={Colors.error} />
            <Text style={styles.appBarTitle}>Deleted Projects</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{deletedProjects.length}</Text>
          </View>
        </View>
      </BlurView>

      {/* List */}
      {deletedProjects.length === 0 ? (
        <DeletedEmptyState />
      ) : (
        <FlatList
          data={deletedProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeletedCard
              project={item}
              onRestore={() => handleRestore(item)}
              onPermanentDelete={() => handlePermanentDelete(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            deletedProjects.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Recently Deleted</Text>
              <Text style={styles.listHeaderSub}>
                {deletedProjects.length} project{deletedProjects.length !== 1 ? 's' : ''} in trash
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: `${Colors.error}1A`,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${Colors.error}33`,
  },
  countBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: Colors.error,
  },
  listContent: {
    paddingTop: 130,
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  listHeader: {
    marginBottom: 24,
  },
  listHeaderTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  listHeaderSub: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    marginTop: 2,
  },
  // ── Card ──
  card: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${Colors.error}33`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  deletedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${Colors.error}1A`,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.error}33`,
  },
  deletedBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: Colors.error,
    letterSpacing: 1,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 19,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}40`,
  },
  restoreBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primaryFixed,
  },
  permDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: `${Colors.error}1A`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
  },
  permDeleteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.error,
  },
  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.onSurfaceVariant}10`,
    borderWidth: 1,
    borderColor: `${Colors.onSurfaceVariant}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 21,
  },
});
