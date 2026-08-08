import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Platform, TextInput, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Project } from '@/store/useProjectStore';
import { ProjectCard } from '@/components/project/ProjectCard';
import EmptyState from '@/components/common/EmptyState';
import { JoinProjectModal } from '@/components/modals/JoinProjectModal';
import { MemberAvatar } from '@/components/common/MemberAvatar';

export default function DashboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { projects, fetchProjects, joinProjectByCode, subscribeToRealtime, unsubscribeFromRealtime } = useProjectStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

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
    if (sharedProjects.length > 0 || true) {
      // Show FAB menu with options: New Project, Join Project
      setFabMenuOpen(!fabMenuOpen);
    } else {
      router.push('/new-project');
    }
  };

  const hasAnyProjects = activeProjects.length > 0 || sharedProjects.length > 0;

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
            {/* Active Deployments Section */}
            {activeProjects.length > 0 && (
              <>
                <View style={styles.listHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Active Deployments</Text>
                  <Text style={[styles.sessionId, { color: colors.onSurfaceVariant }]}>Session ID: 49fa-122k-trak</Text>
                </View>
                {activeProjects.map((project, index) => (
                  <View key={project.id} style={index < activeProjects.length - 1 ? { marginBottom: 16 } : undefined}>
                    <ProjectCard project={project} />
                  </View>
                ))}
              </>
            )}

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
          {isSearchOpen ? (
            <View style={[styles.searchBarContainer, { backgroundColor: colors.surfaceContainerHigh, borderColor: `${colors.primaryFixed}33` }]}>
              <Feather name="search" size={18} color={colors.primaryFixed} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder="Search active projects..."
                placeholderTextColor={`${colors.onSurfaceVariant}70`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor={colors.primaryFixed}
              />
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.appBarLeft}>
                <Feather name="terminal" size={20} color={colors.primaryFixed} />
                <Text style={[styles.appBarTitle, { color: colors.primaryFixed }]}>Trak</Text>
              </View>
              <View style={styles.appBarRight}>
                <Pressable
                  onPress={() => setIsSearchOpen(true)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather name="search" size={20} color={`${colors.onSurfaceVariant}80`} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </BlurView>

      {/* Project list */}
      {renderContent()}

      {/* FAB Menu Overlay */}
      {fabMenuOpen && (
        <Pressable style={styles.fabOverlay} onPress={() => setFabMenuOpen(false)}>
          <View style={styles.fabMenuContainer}>
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
              <Text style={[styles.fabMenuLabel, { color: colors.onSurface }]}>Join Project</Text>
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
    fontSize: 24,
    lineHeight: 30,
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
  },
  listContent: {
    paddingTop: 130, // clears the fixed app bar (safe area + 56px)
    paddingHorizontal: 20,
    paddingBottom: 140, // clears the FAB + tab bar
  },
  listHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  sessionId: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    marginTop: 2,
  },
  // ── Shared Section ──
  sharedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}60`,
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
    color: `${Colors.onSurfaceVariant}80`,
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
    backgroundColor: '#1A1F2B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabMenuItemPressed: {
    backgroundColor: '#232830',
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
    color: Colors.onSurface,
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
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS shadow
    shadowColor: Colors.primaryFixed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fabActive: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
});
