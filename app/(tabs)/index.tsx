import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Platform,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore } from '@/store/useProjectStore';
import { ProjectCard } from '@/components/project/ProjectCard';
import EmptyState from '@/components/common/EmptyState';
import { JoinProjectModal } from '@/components/modals/JoinProjectModal';
import { QRScannerModal } from '@/components/modals/QRScannerModal';
import { MemberAvatar } from '@/components/common/MemberAvatar';

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { projects, fetchProjects, joinProjectByCode, subscribeToRealtime, unsubscribeFromRealtime } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const handleQRScanned = async (code: string) => {
    setShowQRScanner(false);
    const res = await joinProjectByCode(code);
    if (!res.success) {
      setShowJoinModal(true);
    }
  };

  // Fetch projects and subscribe to realtime updates on mount / focus
  useFocusEffect(
    React.useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  useEffect(() => {
    fetchProjects();
    subscribeToRealtime();
    return () => unsubscribeFromRealtime();
  }, []);

  const activeProjects = projects
    .filter((p) => {
      if (p.isCompleted || p.isDeleted || p.isShared) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const sharedProjects = projects
    .filter((p) => {
      if (p.isCompleted || p.isDeleted || !p.isShared) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPressIn = () =>
    Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, speed: 30 }).start();
  const handleFabPressOut = () =>
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const handleFabPress = () => {
    setFabMenuOpen(!fabMenuOpen);
  };

  const hasAnyProjects = activeProjects.length > 0 || sharedProjects.length > 0 || searchQuery.trim().length > 0;

  // Build data for rendering
  const renderContent = () => {
    if (!hasAnyProjects) {
      return <EmptyState onCreatePress={() => router.push('/new-project')} />;
    }

    return (
      <FlatList
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={() => null}
        ListHeaderComponent={
          <View>
            {/* Embedded Permanent Search Bar (replaces old "Active Deployments" text) */}
            <View style={styles.homeSearchWrap}>
              <View
                style={[
                  styles.homeSearchBar,
                  {
                    backgroundColor: colors.isDark ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
                    borderColor: `${colors.primaryFixed}33`,
                  },
                ]}
              >
                <Feather name="search" size={18} color={colors.primaryFixed} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.homeSearchInput, { color: colors.onSurface }]}
                  placeholder="Search active deployments & tech stack..."
                  placeholderTextColor={`${colors.onSurfaceVariant}70`}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  selectionColor={colors.primaryFixed}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Feather name="x" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Active Deployments Section */}
            {activeProjects.length > 0 ? (
              <>
                {activeProjects.map((project, index) => (
                  <View key={project.id} style={index < activeProjects.length - 1 ? { marginBottom: 16 } : undefined}>
                    <ProjectCard project={project} />
                  </View>
                ))}
              </>
            ) : searchQuery.trim().length > 0 && sharedProjects.length === 0 ? (
              <View style={styles.noResultsWrap}>
                <Feather name="search" size={24} color={colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
                <Text style={[styles.noResultsText, { color: colors.onSurfaceVariant }]}>
                  No deployments match "{searchQuery}"
                </Text>
              </View>
            ) : null}

            {/* Shared With Me Section */}
            {sharedProjects.length > 0 && (
              <>
                <View style={[styles.listHeader, { marginTop: activeProjects.length > 0 ? 32 : 0 }]}>
                  <View style={styles.sharedTitleRow}>
                    <Feather name="users" size={18} color={colors.secondaryContainer} />
                    <Text style={[styles.sectionTitle, { color: colors.secondaryFixedDim }]}>
                      Shared with me
                    </Text>
                  </View>
                  <Text style={[styles.sharedCount, { color: colors.onSurfaceVariant }]}>{sharedProjects.length} project{sharedProjects.length !== 1 ? 's' : ''}</Text>
                </View>
                {sharedProjects.map((project, index) => (
                  <View key={project.id} style={index < sharedProjects.length - 1 ? { marginBottom: 16 } : undefined}>
                    <View style={styles.sharedCardWrapper}>
                      {project.ownerName && (
                        <View style={styles.ownerTag}>
                          <MemberAvatar name={project.ownerName} size={18} />
                          <Text style={[styles.ownerTagText, { color: colors.onSurfaceVariant }]}>from {project.ownerName}</Text>
                        </View>
                      )}
                      <ProjectCard project={project} />
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {/* Join Project Modal */}
      <JoinProjectModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={joinProjectByCode}
        onOpenQRScanner={() => setShowQRScanner(true)}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onCodeScanned={handleQRScanned}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

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
            <Feather name="terminal" size={20} color={colors.primaryFixed} />
            <Text style={[styles.appBarTitle, { color: colors.primaryFixed }]}>Trak</Text>
          </View>
          <View style={styles.appBarRight}>
            <Pressable
              onPress={() => setShowNotificationsModal(true)}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Feather name="bell" size={20} color={colors.onSurface} />
              <View style={[styles.notifBadge, { backgroundColor: colors.primaryFixed }]} />
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Project list */}
      {renderContent()}

      {/* FAB Menu Overlay */}
      {fabMenuOpen && (
        <Pressable style={styles.fabOverlay} onPress={() => setFabMenuOpen(false)}>
          <View style={styles.fabMenuContainer}>
            {/* Scan QR Code option */}
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }, pressed && styles.fabMenuItemPressed]}
              onPress={() => {
                setFabMenuOpen(false);
                setShowQRScanner(true);
              }}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                <Feather name="maximize" size={18} color={colors.primaryFixed} />
              </View>
              <Text style={[styles.fabMenuLabel, { color: colors.onSurface }]}>Scan QR Code</Text>
            </Pressable>
            {/* Join Project option */}
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }, pressed && styles.fabMenuItemPressed]}
              onPress={() => {
                setFabMenuOpen(false);
                setShowJoinModal(true);
              }}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: `${colors.secondary}1A`, borderColor: `${colors.secondary}30` }]}>
                <Feather name="user-plus" size={18} color={colors.secondary} />
              </View>
              <Text style={[styles.fabMenuLabel, { color: colors.onSurface }]}>Join via Code</Text>
            </Pressable>
            {/* New Project option */}
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }, pressed && styles.fabMenuItemPressed]}
              onPress={() => {
                setFabMenuOpen(false);
                router.push('/new-project');
              }}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: `${colors.primaryFixed}1A`, borderColor: `${colors.primaryFixed}30` }]}>
                <Feather name="plus" size={18} color={colors.primaryFixed} />
              </View>
              <Text style={[styles.fabMenuLabel, { color: colors.onSurface }]}>New Project</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={handleFabPress}
          style={[styles.fab, { backgroundColor: colors.primaryContainer }, fabMenuOpen && { backgroundColor: colors.surfaceContainerHighest }]}
        >
          <Feather name={fabMenuOpen ? 'x' : 'plus'} size={32} color={colors.onPrimary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Notifications Modal ────────────────────────────────────────────────────────
function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const { projects } = useProjectStore();

  const notifications = React.useMemo(() => {
    const list: { id: string; title: string; desc: string; time: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [];

    projects.forEach((p) => {
      list.push({
        id: `proj-${p.id}`,
        title: `Deployment "${p.name}"`,
        desc: `Status: ${p.status || 'Active'} • ${p.techStack.join(', ') || 'General'}`,
        time: p.lastUpdated ? new Date(p.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
        icon: 'cpu',
        color: colors.primaryFixed,
      });

      p.milestones.forEach((m) => {
        if (m.completed) {
          list.push({
            id: `ms-${m.id}`,
            title: `Feature Shipped: ${m.title}`,
            desc: `Project: ${p.name}`,
            time: 'Completed',
            icon: 'check-circle',
            color: colors.secondaryFixed,
          });
        }
      });
    });

    if (list.length === 0) {
      list.push({
        id: 'welcome',
        title: 'Welcome to Trak',
        desc: 'All systems operational. Start by creating a project.',
        time: 'Now',
        icon: 'bell',
        color: colors.primaryFixed,
      });
    }

    return list.slice(0, 10);
  }, [projects, colors]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={notifStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[notifStyles.sheet, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <View style={[notifStyles.handle, { backgroundColor: `${colors.onSurfaceVariant}40` }]} />
              <View style={notifStyles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="bell" size={20} color={colors.primaryFixed} />
                  <Text style={[notifStyles.title, { color: colors.onSurface }]}>Notifications & Activity</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {notifications.map((item) => (
                  <View key={item.id} style={[notifStyles.item, { borderBottomColor: colors.glassBorder }]}>
                    <View style={[notifStyles.iconBox, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                      <Feather name={item.icon} size={16} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[notifStyles.itemTitle, { color: colors.onSurface }]}>{item.title}</Text>
                      <Text style={[notifStyles.itemDesc, { color: colors.onSurfaceVariant }]}>{item.desc}</Text>
                    </View>
                    <Text style={[notifStyles.itemTime, { color: `${colors.onSurfaceVariant}80` }]}>{item.time}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const notifStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  itemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  itemTime: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    gap: 8,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  homeSearchWrap: {
    marginBottom: 20,
  },
  homeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  homeSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
  },
  noResultsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noResultsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 130, // clears the fixed app bar
    paddingHorizontal: 20,
    paddingBottom: 140, // clears the FAB
  },
  listHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  sharedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  sharedCardWrapper: {
    position: 'relative',
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingLeft: 4,
  },
  ownerTagText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
  },
  // ── FAB & Menu ──
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 30,
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    gap: 12,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
  },
  fabMenuItemPressed: {
    opacity: 0.8,
  },
  fabMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fabMenuLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    zIndex: 40,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
});
