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

// ─── Completed Project Card ────────────────────────────────────────────────────
function CompletedCard({
  project,
  onReactivate,
}: {
  project: Project;
  onReactivate: () => void;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const completedCount = project.milestones.filter((m) => m.completed).length;
  const totalCount = project.milestones.length;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => router.push(`/project/${project.id}`)}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Completed accent bar — always 100% width in green */}
        <View style={styles.accentBar} />

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Feather name="check-circle" size={14} color={Colors.primaryFixed} />
              <Text style={styles.cardName}>{project.name}</Text>
            </View>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>DONE</Text>
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

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>MILESTONES</Text>
              <Text style={styles.footerValue}>
                {completedCount}/{totalCount}
              </Text>
            </View>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>VERSION</Text>
              <Text style={styles.footerValue}>{project.version}</Text>
            </View>
            <Pressable style={styles.reactivateBtn} onPress={onReactivate}>
              <Feather name="refresh-cw" size={12} color={Colors.onSurfaceVariant} />
              <Text style={styles.reactivateBtnText}>Reactivate</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function CompletedEmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Feather name="check-square" size={40} color={`${Colors.primaryFixed}40`} />
      </View>
      <Text style={styles.emptyTitle}>No completed projects</Text>
      <Text style={styles.emptySubtitle}>
        Projects you mark as done will appear here.
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CompletedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projects, unmarkCompleted } = useProjectStore();
  const completedProjects = projects.filter((p) => p.isCompleted);

  const handleReactivate = (project: Project) => {
    Alert.alert(
      'Reactivate Project',
      `Move "${project.name}" back to active deployments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: () => unmarkCompleted(project.id),
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
            <Feather name="check-square" size={18} color={Colors.primaryFixed} />
            <Text style={styles.appBarTitle}>Completed</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{completedProjects.length}</Text>
          </View>
        </View>
      </BlurView>

      {/* List */}
      {completedProjects.length === 0 ? (
        <CompletedEmptyState />
      ) : (
        <FlatList
          data={completedProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CompletedCard
              project={item}
              onReactivate={() => handleReactivate(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            completedProjects.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Shipped Deployments</Text>
              <Text style={styles.listHeaderSub}>
                {completedProjects.length} project{completedProjects.length !== 1 ? 's' : ''} completed
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
    color: Colors.primaryFixed,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
  },
  countBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: Colors.primaryFixed,
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
    borderColor: `${Colors.primaryFixed}20`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  accentBar: {
    height: 2,
    width: '100%',
    backgroundColor: Colors.primaryFixed,
    opacity: 0.5,
  },
  cardContent: {
    padding: 16,
    paddingTop: 14,
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
  completedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${Colors.primaryFixed}1A`,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}33`,
  },
  completedBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: Colors.primaryFixed,
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
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  footerLeft: {
    gap: 2,
  },
  footerLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    opacity: 0.4,
    letterSpacing: 1.5,
  },
  footerValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: Colors.onSurface,
  },
  reactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
  },
  reactivateBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
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
    backgroundColor: `${Colors.primaryFixed}0D`,
    borderWidth: 1,
    borderColor: `${Colors.primaryFixed}20`,
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
