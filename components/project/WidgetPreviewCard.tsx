import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useProjectStore } from '@/store/useProjectStore';
import { getWidgetProjectData, requestAddWidget } from '@/services/widget';
import type { WidgetProjectData } from '@/services/widget';
import { DARK_THEME, LIGHT_THEME } from '@/widgets/TrakWidget';
import { triggerHaptic } from '@/utils/haptics';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useColorScheme } from 'react-native';
import { getThemeColors } from '@/constants/colors';

type WidgetSize = 'small' | 'medium' | 'large';

const SIZE_CONFIG: Record<WidgetSize, { width: number; height: number; label: string; maxProjects: number }> = {
  small: { width: 160, height: 110, label: 'Small', maxProjects: 2 },
  medium: { width: 260, height: 180, label: 'Medium', maxProjects: 3 },
  large: { width: 320, height: 260, label: 'Large', maxProjects: 5 },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'ACTIVE',
  warning: 'WARNING',
  blocked: 'BLOCKED',
  idle: 'IDLE',
};

const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status?.toLowerCase()] || status?.toUpperCase() || 'ACTIVE';

const getStatusColor = (status: string, isDark: boolean): string => {
  const s = status?.toLowerCase();
  if (s === 'active') return isDark ? '#72ff70' : '#00872e';
  if (s === 'blocked') return isDark ? '#ffb4ab' : '#cf222e';
  if (s === 'idle') return isDark ? '#4b8eff' : '#0969da';
  if (s === 'warning') return isDark ? '#ffd400' : '#9a6700';
  return isDark ? '#72ff70' : '#00872e';
};

// ─── Mini progress bar ────────────────────────────────────────────────────────

function MiniProgressBar({ progress, isDark }: { progress: number; isDark: boolean }) {
  const filled = Math.max(0, Math.min(100, progress));
  const accent = isDark ? '#72ff70' : '#00872e';
  const track = isDark ? '#72ff7033' : '#00872e33';

  return (
    <View style={[miniStyles.track, { backgroundColor: track }]}>
      <View style={[miniStyles.fill, { width: `${filled}%`, backgroundColor: accent }]} />
    </View>
  );
}

const miniStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});

// ─── Widget preview box ────────────────────────────────────────────────────────

function WidgetPreviewBox({
  projects,
  size,
  isDark,
}: {
  projects: WidgetProjectData[];
  size: WidgetSize;
  isDark: boolean;
}) {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const config = SIZE_CONFIG[size];
  const visible = projects.slice(0, config.maxProjects);

  return (
    <View
      style={[
        previewStyles.box,
        {
          width: config.width,
          height: config.height,
          backgroundColor: theme.bg as string,
          borderColor: (theme.border as string),
        },
      ]}
    >
      {/* Header */}
      <View style={previewStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[previewStyles.logoDot, { backgroundColor: theme.accent as string }]} />
          <Text style={[previewStyles.headerText, { color: theme.accent as string }]}>
            TRAK
          </Text>
        </View>
        <Text style={[previewStyles.headerCount, { color: (theme.subtleDim as string) }]}>
          {projects.length} pinned
        </Text>
      </View>

      {visible.length === 0 ? (
        <View style={previewStyles.empty}>
          <Feather name="smartphone" size={24} color={(theme.subtleDim as string)} />
          <Text style={[previewStyles.emptyText, { color: (theme.subtleDim as string) }]}>
            No pinned projects
          </Text>
          <Text style={[previewStyles.emptySub, { color: (theme.subtleDim as string) }]}>
            Pin projects to see them here
          </Text>
        </View>
      ) : (
        <View style={previewStyles.projectList}>
          {visible.map((p) => (
            <View
              key={p.id}
              style={[
                previewStyles.projectRow,
                { backgroundColor: (theme.cardBg as string) },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View
                  style={[
                    previewStyles.statusDot,
                    { backgroundColor: getStatusColor(p.status, isDark) },
                  ]}
                />
                <Text
                  style={[previewStyles.projectName, { color: (theme.text as string) }]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </View>
              <Text style={[previewStyles.statusText, { color: (theme.subtle as string) }]}>
                {getStatusLabel(p.status)}
              </Text>
              <View style={previewStyles.progressWrap}>
                <MiniProgressBar progress={p.progress} isDark={isDark} />
                <Text style={[previewStyles.progressText, { color: (theme.subtleDim as string) }]}>
                  {p.progress}%
                </Text>
              </View>
            </View>
          ))}
          {projects.length > config.maxProjects && (
            <Text style={[previewStyles.moreText, { color: (theme.subtleDim as string) }]}>
              +{projects.length - config.maxProjects} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    letterSpacing: 1,
  },
  headerCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  projectList: {
    flex: 1,
    gap: 4,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    flex: 1,
  },
  statusText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  progressText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
  },
  moreText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});

// ─── Main component ─────────────────────────────────────────────────────────────

export function WidgetPreviewCard({
  colors,
}: {
  colors: ReturnType<typeof getThemeColors>;
}) {
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
  const [widgetData, setWidgetData] = useState<WidgetProjectData[]>([]);
  const projects = useProjectStore((s) => s.projects);
  const togglePinProject = useProjectStore((s) => s.togglePinProject);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemColorScheme = useColorScheme();
  const themeColors = getThemeColors(themeMode, systemColorScheme);
  const isDark = themeColors.isDark;

  const pinnedProjects = projects.filter((p) => p.isPinned && !p.isDeleted);

  useEffect(() => {
    getWidgetProjectData().then(setWidgetData);
  }, [projects]);

  const handleAddWidget = async () => {
    triggerHaptic(15);
    const success = await requestAddWidget();
    if (!success) {
      Alert.alert(
        'Manual Setup Required',
        'Your launcher does not support direct widget pinning. Long-press your home screen → Add Widget → Trak.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View>
      {/* Size selector */}
      <View style={[styles.sizeSelector, { backgroundColor: colors.surfaceContainerHigh }]}>
        {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => {
          const isActive = widgetSize === size;
          return (
            <Pressable
              key={size}
              onPress={() => { triggerHaptic(10); setWidgetSize(size); }}
              style={[
                styles.sizeBtn,
                isActive && { backgroundColor: colors.primaryFixed },
              ]}
            >
              <Text
                style={[
                  styles.sizeText,
                  { color: isActive ? colors.onPrimaryFixed : colors.onSurfaceVariant },
                  isActive && styles.sizeTextActive,
                ]}
              >
                {SIZE_CONFIG[size].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Widget preview */}
      <View style={styles.previewWrap}>
        <WidgetPreviewBox
          projects={widgetData.length > 0 ? widgetData : pinnedProjects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            lastUpdated: p.lastUpdated,
            updatedAt: Date.now(),
          }))}
          size={widgetSize}
          isDark={isDark}
        />
      </View>

      {/* Pinned projects list */}
      {pinnedProjects.length > 0 ? (
        <View style={styles.pinnedList}>
          <Text style={[styles.pinnedHeader, { color: `${colors.onSurfaceVariant}90` }]}>
            PINNED PROJECTS ({pinnedProjects.length})
          </Text>
          {pinnedProjects.map((p) => (
            <View
              key={p.id}
              style={[
                styles.pinnedRow,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View style={[styles.pinnedDot, { backgroundColor: getStatusColor(p.status, isDark) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinnedName, { color: colors.onSurface }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.pinnedSub, { color: `${colors.onSurfaceVariant}90` }]}>
                  {getStatusLabel(p.status)}  ·  {p.progress}% complete
                </Text>
              </View>
              <Pressable
                onPress={() => { triggerHaptic(15); togglePinProject(p.id); }}
                style={[styles.unpinBtn, { backgroundColor: `${colors.primaryFixed}15` }]}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={colors.primaryFixed} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyPinned, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.glassBorder }]}>
          <Feather name="bookmark" size={20} color={`${colors.onSurfaceVariant}60`} />
          <Text style={[styles.emptyPinnedText, { color: `${colors.onSurfaceVariant}90` }]}>
            No pinned projects yet
          </Text>
          <Text style={[styles.emptyPinnedSub, { color: `${colors.onSurfaceVariant}60` }]}>
            Pin a project from the dashboard or project menu to show it on your home screen widget
          </Text>
        </View>
      )}

      {/* Add widget button (Android only) */}
      {Platform.OS === 'android' && (
        <Pressable
          style={({ pressed }) => [
            styles.addWidgetBtn,
            { backgroundColor: colors.primaryFixed },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleAddWidget}
        >
          <Feather name="plus-circle" size={16} color={colors.onPrimaryFixed} style={{ marginRight: 8 }} />
          <Text style={[styles.addWidgetText, { color: colors.onPrimaryFixed }]}>
            Add Widget to Home Screen
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sizeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  sizeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  sizeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  sizeTextActive: {
    fontFamily: 'Inter_600SemiBold',
  },
  previewWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  pinnedList: {
    gap: 8,
    marginBottom: 12,
  },
  pinnedHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginLeft: 4,
    marginBottom: 4,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pinnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinnedName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  pinnedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  unpinBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPinned: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  emptyPinnedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  emptyPinnedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  addWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  addWidgetText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
