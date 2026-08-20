import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { TechPill } from '@/components/common/TechPill';
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectActionModal } from '@/components/modals/ProjectActionModal';
import { ListSkeleton } from '@/components/skeletons';
import { triggerHaptic } from '@/utils/haptics';

// ─── Calculate Days Remaining Before Auto-Delete ──────────────────────────────
function getDaysRemaining(deletedAt?: string): number {
  if (!deletedAt) return 15;
  const deletedTime = new Date(deletedAt).getTime();
  if (isNaN(deletedTime)) return 15;
  const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
  return Math.max(1, 15 - elapsedDays);
}

// ─── Deleted Project Card ──────────────────────────────────────────────────────
function DeletedCard({
  project,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
}: {
  project: Project;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = React.useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const daysLeft = getDaysRemaining(project.deletedAt);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();

  const handleCardPress = () => {
    if (isSelectionMode) {
      triggerHaptic(10);
      onToggleSelect();
    }
  };

  const handleLongPress = () => {
    triggerHaptic(20);
    if (!isSelectionMode) {
      onToggleSelect(); // enters selection mode with this item
    } else {
      setModalVisible(true);
    }
  };

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
        onPress={handleCardPress}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: isSelected ? colors.primaryFixed : `${colors.error}33`,
              borderWidth: isSelected ? 2 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                {isSelectionMode ? (
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.primaryFixed : 'transparent',
                        borderColor: isSelected ? colors.primaryFixed : `${colors.onSurfaceVariant}60`,
                      },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={14} color={colors.onPrimaryFixed} />}
                  </View>
                ) : (
                  <Feather name="trash-2" size={15} color={colors.error} />
                )}
                <Text style={[styles.cardName, { color: colors.onSurface }]}>{project.name}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={[
                    styles.daysLeftBadge,
                    {
                      backgroundColor: daysLeft <= 3 ? `${colors.error}20` : `${colors.onSurfaceVariant}15`,
                      borderColor: daysLeft <= 3 ? `${colors.error}40` : `${colors.onSurfaceVariant}25`,
                    },
                  ]}
                >
                  <Feather name="clock" size={10} color={daysLeft <= 3 ? colors.error : colors.onSurfaceVariant} />
                  <Text
                    style={[
                      styles.daysLeftText,
                      { color: daysLeft <= 3 ? colors.error : colors.onSurfaceVariant },
                    ]}
                  >
                    {daysLeft}d left
                  </Text>
                </View>

                <View style={[styles.deletedBadge, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}33` }]}>
                  <Text style={[styles.deletedBadgeText, { color: colors.error }]}>DELETED</Text>
                </View>
              </View>
            </View>

            {project.description ? (
              <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                {project.description}
              </Text>
            ) : null}

            {/* Tech pills */}
            {project.techStack && project.techStack.length > 0 ? (
              <View style={styles.pillsRow}>
                {project.techStack.map((t) => (
                  <TechPill key={t} label={t} />
                ))}
              </View>
            ) : null}

            {/* Action buttons footer (hidden in selection mode) */}
            {!isSelectionMode && (
              <View style={styles.cardFooter}>
                <Pressable
                  style={[styles.restoreBtn, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}40` }]}
                  onPress={onRestore}
                >
                  <Feather name="rotate-ccw" size={13} color={colors.primaryFixed} />
                  <Text style={[styles.restoreBtnText, { color: colors.primaryFixed }]}>Restore</Text>
                </Pressable>

                <Pressable
                  style={[styles.permDeleteBtn, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}40` }]}
                  onPress={onPermanentDelete}
                >
                  <Feather name="trash-2" size={13} color={colors.error} />
                  <Text style={[styles.permDeleteBtnText, { color: colors.error }]}>Delete Permanently</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function DeletedEmptyState() {
  const colors = useThemeColors();
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.onSurfaceVariant}10`, borderColor: `${colors.onSurfaceVariant}20` }]}>
        <Feather name="trash-2" size={40} color={`${colors.onSurfaceVariant}40`} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Trash is empty</Text>
      <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
        Projects you delete will be moved here and automatically removed after 15 days.
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DeletedScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const {
    projects,
    isLoaded,
    isInitialLoading,
    restoreProject,
    permanentlyDeleteProject,
    bulkPermanentlyDeleteProjects,
    bulkRestoreProjects,
  } = useProjectStore();

  const deletedProjects = projects.filter((p) => p.isDeleted);
  const { dialogProps, ask } = useConfirmDialog();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelect = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    triggerHaptic(15);
    if (selectedIds.length === deletedProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletedProjects.map((p) => p.id));
    }
  };

  const exitSelectionMode = () => {
    triggerHaptic(10);
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleRestoreSingle = async (project: Project) => {
    const ok = await ask({
      title: 'Restore Project',
      message: `Restore "${project.name}" back to Active Deployments?`,
      confirmLabel: 'Restore',
      destructive: false,
      icon: 'rotate-ccw',
    });
    if (ok) {
      triggerHaptic(15);
      void restoreProject(project.id);
    }
  };

  const handlePermanentDeleteSingle = async (project: Project) => {
    const ok = await ask({
      title: 'Delete Forever',
      message: `Permanently erase "${project.name}" from your workspace?\nThis action cannot be undone.`,
      confirmLabel: 'Delete Forever',
      destructive: true,
      icon: 'x-circle',
    });
    if (ok) {
      triggerHaptic(20);
      void permanentlyDeleteProject(project.id);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await ask({
      title: `Restore ${count} Project${count > 1 ? 's' : ''}`,
      message: `Restore ${count} selected project${count > 1 ? 's' : ''} back to Active Deployments?`,
      confirmLabel: `Restore (${count})`,
      destructive: false,
      icon: 'rotate-ccw',
    });
    if (ok) {
      triggerHaptic(20);
      setIsProcessing(true);
      try {
        await bulkRestoreProjects(selectedIds);
        exitSelectionMode();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await ask({
      title: `Delete ${count} Project${count > 1 ? 's' : ''} Forever`,
      message: `Permanently erase ${count} selected project${count > 1 ? 's' : ''} from your workspace?\nThis action cannot be undone.`,
      confirmLabel: `Delete Forever (${count})`,
      destructive: true,
      icon: 'trash-2',
    });
    if (ok) {
      triggerHaptic(25);
      setIsProcessing(true);
      try {
        await bulkPermanentlyDeleteProjects(selectedIds);
        exitSelectionMode();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ConfirmDialog {...dialogProps} />

      {/* App Bar */}
      <BlurView
        intensity={60}
        tint={colors.isDark ? 'dark' : 'light'}
        style={[
          styles.appBar,
          { borderBottomColor: colors.glassBorder },
          Platform.OS === 'android' && { backgroundColor: colors.surface },
        ]}
      >
        <View style={[styles.appBarInner, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
          <View style={styles.appBarLeft}>
            <Feather name="trash-2" size={20} color={colors.error} />
            <Text style={[styles.appBarTitle, { color: colors.onSurface }]}>Deleted Projects</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {deletedProjects.length > 0 && (
              <Pressable
                onPress={isSelectionMode ? exitSelectionMode : () => setIsSelectionMode(true)}
                style={[
                  styles.selectToggleBtn,
                  {
                    backgroundColor: isSelectionMode ? `${colors.primaryFixed}20` : colors.surfaceContainerHigh,
                    borderColor: isSelectionMode ? `${colors.primaryFixed}40` : colors.glassBorder,
                  },
                ]}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.selectToggleText,
                    { color: isSelectionMode ? colors.primaryFixed : colors.onSurfaceVariant },
                  ]}
                >
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </Text>
              </Pressable>
            )}

            <View style={[styles.countBadge, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}33` }]}>
              <Text style={[styles.countBadgeText, { color: colors.error }]}>{deletedProjects.length}</Text>
            </View>
          </View>
        </View>
      </BlurView>

      {/* List */}
      {isInitialLoading && !isLoaded && projects.length === 0 ? (
        <ListSkeleton title="Recently Deleted" />
      ) : deletedProjects.length === 0 ? (
        <DeletedEmptyState />
      ) : (
        <FlatList
          data={deletedProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeletedCard
              project={item}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onRestore={() => handleRestoreSingle(item)}
              onPermanentDelete={() => handlePermanentDeleteSingle(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: Math.max(insets.top, 24) + 68,
              paddingBottom: isSelectionMode && selectedIds.length > 0
                ? Math.max(insets.bottom, 16) + 140
                : Math.max(insets.bottom, 16) + 80,
            },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* 15-Day Auto Delete Info Banner */}
              <View style={[styles.infoBanner, { backgroundColor: `${colors.primaryFixed}0D`, borderColor: `${colors.primaryFixed}25` }]}>
                <Feather name="clock" size={14} color={colors.primaryFixed} style={{ marginTop: 1 }} />
                <Text style={[styles.infoBannerText, { color: colors.onSurfaceVariant }]}>
                  Projects in trash are automatically deleted forever after <Text style={{ color: colors.primaryFixed, fontFamily: 'Inter_600SemiBold' }}>15 days</Text>.
                </Text>
              </View>

              <View style={styles.subHeaderRow}>
                <Text style={[styles.listHeaderTitle, { color: colors.onSurface }]}>Recently Deleted</Text>
                {isSelectionMode ? (
                  <Pressable onPress={handleSelectAll} hitSlop={8}>
                    <Text style={[styles.selectAllText, { color: colors.primaryFixed }]}>
                      {selectedIds.length === deletedProjects.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.listHeaderSub, { color: colors.onSurfaceVariant }]}>
                    {deletedProjects.length} project{deletedProjects.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          }
        />
      )}

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedIds.length > 0 && (
        <View
          style={[
            styles.bulkActionBarWrap,
            { bottom: Math.max(insets.bottom, 16) + 64 },
          ]}
        >
          <BlurView
            intensity={80}
            tint={colors.isDark ? 'dark' : 'light'}
            style={[
              styles.bulkActionBar,
              {
                backgroundColor: colors.isDark ? 'rgba(20,24,20,0.92)' : 'rgba(255,255,255,0.94)',
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.bulkActionLeft}>
              <View style={[styles.selectedCountBadge, { backgroundColor: colors.primaryFixed }]}>
                <Text style={[styles.selectedCountText, { color: colors.onPrimaryFixed }]}>
                  {selectedIds.length}
                </Text>
              </View>
              <Text style={[styles.selectedLabel, { color: colors.onSurface }]}>selected</Text>
            </View>

            <View style={styles.bulkActionButtons}>
              <Pressable
                style={[styles.bulkRestoreBtn, { backgroundColor: `${colors.primaryFixed}20`, borderColor: `${colors.primaryFixed}50` }]}
                onPress={handleBulkRestore}
                disabled={isProcessing}
                hitSlop={6}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primaryFixed} />
                ) : (
                  <>
                    <Feather name="rotate-ccw" size={14} color={colors.primaryFixed} />
                    <Text style={[styles.bulkRestoreText, { color: colors.primaryFixed }]}>Restore</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.bulkDeleteBtn, { backgroundColor: `${colors.error}20`, borderColor: `${colors.error}50` }]}
                onPress={handleBulkDelete}
                disabled={isProcessing}
                hitSlop={6}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Feather name="trash-2" size={14} color={colors.error} />
                    <Text style={[styles.bulkDeleteText, { color: colors.error }]}>Delete Forever</Text>
                  </>
                )}
              </Pressable>
            </View>
          </BlurView>
        </View>
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
    gap: 10,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  selectToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectToggleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  countBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 4,
  },
  infoBannerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  listHeaderSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  selectAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    flex: 1,
  },
  daysLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  daysLeftText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
  },
  deletedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  deletedBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  permDeleteBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  permDeleteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 140,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bulkActionBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 20,
  },
  bulkActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  bulkActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  selectedLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bulkRestoreText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bulkDeleteText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
