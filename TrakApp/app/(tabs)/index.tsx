import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Animated, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useProjectStore, Project } from '../../store/useProjectStore';
import { ProjectCard } from '../../components/ProjectCard';
import EmptyState from '../../components/EmptyState';

export default function DashboardScreen() {
  const router = useRouter();
  const { projects } = useProjectStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeProjects = projects.filter((p) => {
    if (p.isCompleted || p.isDeleted) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.techStack.some((t) => t.toLowerCase().includes(q))
    );
  });

  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPressIn = () =>
    Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, speed: 30 }).start();
  const handleFabPressOut = () =>
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  const handleFabPress = () => router.push('/new-project');

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>Active Deployments</Text>
      <Text style={styles.sessionId}>Session ID: 49fa-122k-trak</Text>
    </View>
  );

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
          {isSearchOpen ? (
            <View style={styles.searchBarContainer}>
              <Feather name="search" size={18} color={Colors.primaryFixed} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search active projects..."
                placeholderTextColor={`${Colors.onSurfaceVariant}70`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor={Colors.primaryFixed}
              />
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={Colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.appBarLeft}>
                <Feather name="terminal" size={20} color={Colors.primaryFixed} />
                <Text style={styles.appBarTitle}>Trak</Text>
              </View>
              <View style={styles.appBarRight}>
                <Pressable
                  onPress={() => setIsSearchOpen(true)}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather name="search" size={20} color={`${Colors.onSurfaceVariant}80`} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </BlurView>

      {/* Project list */}
      {activeProjects.length === 0 ? (
        <EmptyState onCreatePress={() => router.push('/new-project')} />
      ) : (
        <FlatList
          data={activeProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProjectCard project={item} />}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={handleFabPress}
          style={styles.fab}
        >
          <Feather name="plus" size={32} color="#11141B" />
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
});
