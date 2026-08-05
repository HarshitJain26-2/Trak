import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, useThemeColors } from '@/constants/colors';
import { useProjectStore, Project, ProjectStatus } from '@/store/useProjectStore';
import { StatusDot } from '@/components/common/StatusDot';
import { ProjectActionModal } from '@/components/modals/ProjectActionModal';

type StatusFilter = ProjectStatus | 'all';
const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Idle', value: 'idle' },
];

const TECH_FILTERS = ['React', 'Python', 'Go', 'Typescript', 'Rust', 'Kafka'];
const SORT_OPTIONS = ['Relevance', 'Name', 'Deadline', 'Updated'];

function SearchResultCard({ project }: { project: Project }) {
  const router = useRouter();
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const STATUS_ACCENT: Record<string, string> = {
    active: colors.primaryFixed,
    blocked: colors.error,
    warning: colors.statusWarning,
    idle: colors.secondaryContainer,
  };

  const accentColor = STATUS_ACCENT[project.status] ?? colors.primaryFixed;

  return (
    <>
      <ProjectActionModal
        visible={modalVisible}
        project={project}
        onClose={() => setModalVisible(false)}
      />
      <Pressable
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()
        }
        onPress={() => router.push(`/project/${project.id}`)}
        onLongPress={() => setModalVisible(true)}
        delayLongPress={350}
      >
      <Animated.View style={[styles.resultCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.glassBorder, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.resultLeft}>
          {/* Status accent bar */}
          <View style={[styles.resultAccentBar, { backgroundColor: accentColor }]} />
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: colors.onSurface }]}>{project.name}</Text>
            <View style={styles.resultMeta}>
              <View style={[styles.resultBadge, { backgroundColor: colors.surfaceContainerHighest }]}>
                <Text style={[styles.resultBadgeText, { color: colors.onSurfaceVariant }]}>
                  {project.id.padStart(2, '0').toUpperCase()}
                </Text>
              </View>
              <View style={styles.resultStatus}>
                <View
                  style={[
                    styles.resultStatusDot,
                    {
                      backgroundColor: accentColor,
                      shadowColor: accentColor,
                      shadowRadius: 4,
                      shadowOpacity: 0.8,
                      shadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                />
                <Text style={[styles.resultStatusText, { color: colors.onSurfaceVariant }]}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={`${colors.onSurfaceVariant}4D`} />
      </Animated.View>
    </Pressable>
    </>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { projects } = useProjectStore();
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Relevance');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const toggleTech = (tech: string) => {
    setActiveTechs((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        query.trim() === '' ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.techStack.some((t) => t.toLowerCase().includes(query.toLowerCase()));

      const matchesStatus = activeStatus === 'all' || p.status === activeStatus;

      const matchesTech =
        activeTechs.length === 0 ||
        activeTechs.some((t) => p.techStack.some((pt) => pt.toLowerCase() === t.toLowerCase()));

      return matchesQuery && matchesStatus && matchesTech;
    });
  }, [projects, query, activeStatus, activeTechs]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <SafeAreaView edges={['top']} style={styles.appBarInner}>
          <View style={styles.appBarLeft}>
            <Feather name="terminal" size={20} color={colors.primaryFixed} />
            <Text style={[styles.appBarTitle, { color: colors.primaryFixed }]}>Trak</Text>
          </View>
          <Pressable style={styles.iconBtn} hitSlop={8}>
            <Feather name="search" size={20} color={`${colors.onSurfaceVariant}80`} />
          </Pressable>
        </SafeAreaView>
      </BlurView>

      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SearchResultCard project={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.searchHeader}>
            {/* Search input */}
            <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder }]}>
              <Feather name="search" size={18} color={`${colors.onSurfaceVariant}80`} />
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder="Search projects..."
                placeholderTextColor={`${colors.onSurfaceVariant}4D`}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Feather name="x" size={16} color={`${colors.onSurfaceVariant}80`} />
                </Pressable>
              )}
            </View>

            {/* Status filters */}
            <View style={styles.filterGroup}>
              <View style={styles.filterGroupHeader}>
                <View style={[styles.filterAccent, { backgroundColor: colors.primaryFixed }]} />
                <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant }]}>Status</Text>
              </View>
              <View style={styles.filterChips}>
                {STATUS_FILTERS.map(({ label, value }) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder },
                      activeStatus === value && { backgroundColor: colors.primaryFixed, borderColor: colors.primaryFixed },
                    ]}
                    onPress={() => setActiveStatus(value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.onSurfaceVariant },
                        activeStatus === value && { color: colors.onPrimaryFixed },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Tech stack filters */}
            <View style={styles.filterGroup}>
              <View style={styles.filterGroupHeader}>
                <View style={[styles.filterAccent, { backgroundColor: colors.secondaryContainer }]} />
                <Text style={[styles.filterGroupLabel, { color: colors.onSurfaceVariant }]}>Tech Stack</Text>
              </View>
              <View style={styles.filterChips}>
                {TECH_FILTERS.map((tech) => {
                  const isActive = activeTechs.includes(tech);
                  return (
                    <Pressable
                      key={tech}
                      style={[
                        styles.techChip,
                        { backgroundColor: colors.surfaceContainer, borderColor: colors.glassBorder },
                        isActive && { borderColor: colors.primaryFixed },
                      ]}
                      onPress={() => toggleTech(tech)}
                    >
                      <Text style={[styles.techChipText, { color: colors.onSurfaceVariant }, isActive && { color: colors.primaryFixed }]}>
                        {tech}
                      </Text>
                      {isActive && (
                        <Feather name="x" size={14} color={colors.primaryFixed} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Results header */}
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultCount, { color: colors.onSurfaceVariant }]}>
                {filteredProjects.length} RESULTS FOUND
              </Text>
              <Pressable
                style={styles.sortButton}
                onPress={() => setShowSortOptions(!showSortOptions)}
              >
                <Feather name="list" size={16} color={colors.primaryFixed} />
                <Text style={[styles.sortButtonText, { color: colors.primaryFixed }]}>{sortBy}</Text>
              </Pressable>
            </View>

            {/* Sort options dropdown */}
            {showSortOptions && (
              <View style={[styles.sortDropdown, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[styles.sortOption, sortBy === opt && { backgroundColor: `${colors.primaryFixed}1A` }]}
                    onPress={() => { setSortBy(opt); setShowSortOptions(false); }}
                  >
                    <Text style={[styles.sortOptionText, { color: colors.onSurfaceVariant }, sortBy === opt && { color: colors.primaryFixed }]}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="search" size={48} color={`${colors.onSurfaceVariant}33`} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No results match your search</Text>
            <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>Try adjusting your filters</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
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
    height: 56,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },
  listContent: {
    paddingTop: 110,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  searchHeader: {
    gap: 20,
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  filterGroup: {
    gap: 10,
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterAccent: {
    width: 4,
    height: 12,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 2,
  },
  filterGroupLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryFixed,
  },
  filterChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: Colors.onPrimaryFixed,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  techChipActive: {
    borderColor: Colors.primaryFixed,
  },
  techChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  techChipTextActive: {
    color: Colors.primaryFixed,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}80`,
    letterSpacing: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.primaryFixed,
  },
  sortDropdown: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.outlineVariant}1A`,
  },
  sortOptionActive: {
    backgroundColor: `${Colors.primaryFixed}1A`,
  },
  sortOptionText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  sortOptionTextActive: {
    color: Colors.primaryFixed,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}33`,
    borderRadius: 12,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  resultAccentBar: {
    width: 6,
    height: 32,
    borderRadius: 3,
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 3,
  },
  resultBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  resultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    elevation: 2,
  },
  resultStatusText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: `${Colors.onSurfaceVariant}99`,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: `${Colors.onSurfaceVariant}80`,
  },
});
