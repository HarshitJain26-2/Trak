import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import type { WidgetProjectData } from '@/services/widget';

// ─── Theme colors ─────────────────────────────────────────────────────────────

export interface WidgetTheme {
  bg: ColorProp;
  accent: ColorProp;
  accentDim: ColorProp;
  text: ColorProp;
  subtle: ColorProp;
  subtleDim: ColorProp;
  border: ColorProp;
  cardBg: ColorProp;
  errorColor: ColorProp;
}

export const DARK_THEME: WidgetTheme = {
  bg: '#0d1117',
  accent: '#72ff70',
  accentDim: '#72ff7033',
  text: '#e1e2eb',
  subtle: '#8b949e',
  subtleDim: '#8b949e80',
  border: '#FFFFFF12',
  cardBg: '#161B22',
  errorColor: '#ff7b72',
};

export const LIGHT_THEME: WidgetTheme = {
  bg: '#f6f8fa',
  accent: '#00872e',
  accentDim: '#00872e33',
  text: '#1f2328',
  subtle: '#57606a',
  subtleDim: '#57606a80',
  border: '#00000010',
  cardBg: '#ffffff',
  errorColor: '#cf222e',
};

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'ACTIVE',
  warning: 'WARNING',
  blocked: 'BLOCKED',
  idle: 'IDLE',
};

const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status?.toLowerCase()] || status?.toUpperCase() || 'ACTIVE';

const getStatusColor = (status: string, theme: WidgetTheme): ColorProp => {
  const dark = theme.bg === DARK_THEME.bg;
  const s = status?.toLowerCase();
  if (s === 'active') return dark ? '#72ff70' : '#00872e';
  if (s === 'blocked') return dark ? '#ffb4ab' : '#cf222e';
  if (s === 'idle') return dark ? '#4b8eff' : '#0969da';
  if (s === 'warning') return dark ? '#ffd400' : '#9a6700';
  return theme.accent;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate 2-letter initials from a project name */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Relative time label from epoch ms */
function timeAgo(epochMs: number): string {
  if (!epochMs) return '';
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function renderProgressBar(progress: number, theme: WidgetTheme, height: number = 4) {
  const filled = Math.max(0, Math.min(100, progress));
  const empty = 100 - filled;
  if (filled === 0) {
    return (
      <FlexWidget
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: theme.accentDim,
        }}
      />
    );
  }
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        height,
        borderRadius: height / 2,
        backgroundColor: theme.accentDim,
        overflow: 'hidden',
      }}
    >
      <FlexWidget style={{ flex: filled, height, backgroundColor: theme.accent, borderRadius: height / 2 }} />
      <FlexWidget style={{ flex: empty, height }} />
    </FlexWidget>
  );
}

// ─── Project initial avatar ──────────────────────────────────────────────────

function renderAvatar(name: string, size: number, theme: WidgetTheme) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.accentDim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={getInitials(name)}
        style={{ fontSize: size * 0.38, fontWeight: '700', color: theme.accent }}
      />
    </FlexWidget>
  );
}

// ─── Small project row ──────────────────────────────────────────────────────

function renderSmallProject(project: WidgetProjectData, theme: WidgetTheme) {
  return (
    <FlexWidget
      key={project.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `trak://project/${project.id}` }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        borderRadius: 8,
        backgroundColor: theme.cardBg,
        marginVertical: 2,
        flexGap: 6,
      }}
    >
      {renderAvatar(project.name, 22, theme)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
        <TextWidget
          text={project.name}
          style={{ fontSize: 11, fontWeight: '600', color: theme.text }}
          maxLines={1}
          truncate="END"
        />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
          <FlexWidget
            style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: getStatusColor(project.status, theme) }}
          />
          <TextWidget text={getStatusLabel(project.status)} style={{ fontSize: 8, color: theme.subtle }} />
        </FlexWidget>
      </FlexWidget>
      <TextWidget
        text={`${project.progress}%`}
        style={{ fontSize: 11, color: theme.accent, fontWeight: '700' }}
      />
    </FlexWidget>
  );
}

// ─── Medium project row ─────────────────────────────────────────────────────

function renderMediumProject(project: WidgetProjectData, theme: WidgetTheme) {
  return (
    <FlexWidget
      key={project.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `trak://project/${project.id}` }}
      style={{
        flexDirection: 'column',
        padding: 8,
        borderRadius: 10,
        backgroundColor: theme.cardBg,
        marginVertical: 3,
        flexGap: 5,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        {renderAvatar(project.name, 26, theme)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 1 }}>
          <TextWidget
            text={project.name}
            style={{ fontSize: 12, fontWeight: '600', color: theme.text }}
            maxLines={1}
            truncate="END"
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
            <FlexWidget
              style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: getStatusColor(project.status, theme) }}
            />
            <TextWidget text={getStatusLabel(project.status)} style={{ fontSize: 8, color: getStatusColor(project.status, theme) }} />
          </FlexWidget>
        </FlexWidget>
        <TextWidget
          text={`${project.progress}%`}
          style={{ fontSize: 12, color: theme.accent, fontWeight: '700' }}
        />
      </FlexWidget>
      {renderProgressBar(project.progress, theme)}
    </FlexWidget>
  );
}

// ─── Large project row ──────────────────────────────────────────────────────

function renderLargeProject(project: WidgetProjectData, theme: WidgetTheme) {
  return (
    <FlexWidget
      key={project.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `trak://project/${project.id}` }}
      style={{
        flexDirection: 'column',
        padding: 10,
        borderRadius: 10,
        backgroundColor: theme.cardBg,
        marginVertical: 4,
        flexGap: 6,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        {renderAvatar(project.name, 28, theme)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
          <TextWidget
            text={project.name}
            style={{ fontSize: 13, fontWeight: '600', color: theme.text }}
            maxLines={1}
            truncate="END"
          />
          <TextWidget
            text={`Updated ${timeAgo(project.updatedAt)}`}
            style={{ fontSize: 9, color: theme.subtleDim }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 4,
            backgroundColor: theme.accentDim,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <FlexWidget
            style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: getStatusColor(project.status, theme) }}
          />
          <TextWidget
            text={getStatusLabel(project.status)}
            style={{ fontSize: 8, color: getStatusColor(project.status, theme), fontWeight: '700', letterSpacing: 0.5 }}
          />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <FlexWidget style={{ flex: 1 }}>{renderProgressBar(project.progress, theme, 5)}</FlexWidget>
        <TextWidget
          text={`${project.progress}%`}
          style={{ fontSize: 11, color: theme.accent, fontWeight: '700' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function renderEmptyState(theme: WidgetTheme) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        flexGap: 4,
      }}
    >
      <TextWidget
        text="No pinned projects"
        style={{ fontSize: 13, fontWeight: '600', color: theme.text, textAlign: 'center' }}
      />
      <TextWidget
        text="Pin projects in Trak to access them quickly here."
        style={{ fontSize: 10, color: theme.subtle, textAlign: 'center' }}
      />
      <TextWidget
        text="Open Trak →"
        style={{ fontSize: 11, color: theme.accent, textAlign: 'center', marginTop: 6 }}
      />
    </FlexWidget>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function renderErrorState(theme: WidgetTheme) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        flexGap: 4,
      }}
    >
      <TextWidget
        text="Couldn't load projects"
        style={{ fontSize: 13, fontWeight: '600', color: theme.errorColor, textAlign: 'center' }}
      />
      <TextWidget
        text="Open Trak to refresh your widget."
        style={{ fontSize: 10, color: theme.subtle, textAlign: 'center' }}
      />
      <TextWidget
        text="Open Trak →"
        style={{ fontSize: 11, color: theme.accent, textAlign: 'center', marginTop: 6 }}
      />
    </FlexWidget>
  );
}

// ─── Signed out state ─────────────────────────────────────────────────────────

function renderSignedOutState(theme: WidgetTheme) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        flexGap: 4,
      }}
    >
      <TextWidget
        text="TRAK"
        style={{ fontSize: 16, fontWeight: '700', color: theme.accent, letterSpacing: 2 }}
      />
      <TextWidget
        text="Open Trak to continue."
        style={{ fontSize: 11, color: theme.subtle, textAlign: 'center', marginTop: 4 }}
      />
    </FlexWidget>
  );
}

// ─── Widget header ────────────────────────────────────────────────────────────

function renderHeader(theme: WidgetTheme, showPinnedLabel: boolean) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        marginBottom: 4,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 5 }}>
        <FlexWidget
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: theme.accent,
          }}
        />
        <TextWidget
          text="TRAK"
          style={{ fontSize: 13, fontWeight: '700', color: theme.accent, letterSpacing: 1.5 }}
        />
      </FlexWidget>
      {showPinnedLabel && (
        <TextWidget
          text="PINNED"
          style={{ fontSize: 8, color: theme.subtle, letterSpacing: 1 }}
        />
      )}
    </FlexWidget>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function renderFooter(theme: WidgetTheme, updatedAt: number, showOpenTrak: boolean) {
  return (
    <FlexWidget
      clickAction={showOpenTrak ? 'OPEN_APP' : undefined}
      style={{ alignItems: 'center', paddingTop: 4 }}
    >
      <TextWidget
        text={updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Open Trak →'}
        style={{ fontSize: 9, color: showOpenTrak ? theme.accent : theme.subtleDim, textAlign: 'center' }}
      />
    </FlexWidget>
  );
}

// ─── Main widget renderer ─────────────────────────────────────────────────────

export function renderTrakWidgetContent(
  projects: WidgetProjectData[],
  width: number,
  height: number,
  theme: WidgetTheme,
  updatedAt: number = 0
): React.JSX.Element {
  const isSmall = width <= 180 && height <= 180;
  const isMedium = !isSmall && height <= 180;

  // Empty state
  if (projects.length === 0) {
    return (
      <FlexWidget
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          borderRadius: 16,
          padding: 12,
        }}
      >
        {renderHeader(theme, !isSmall)}
        {renderEmptyState(theme)}
      </FlexWidget>
    );
  }

  // Small widget: top 2 projects
  if (isSmall) {
    const display = projects.slice(0, 2);
    const remaining = projects.length - 2;
    return (
      <FlexWidget
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          borderRadius: 16,
          padding: 10,
        }}
      >
        {renderHeader(theme, false)}
        {display.map((p) => renderSmallProject(p, theme))}
        {remaining > 0 && (
          <FlexWidget clickAction="OPEN_APP" style={{ alignItems: 'center', marginTop: 2 }}>
            <TextWidget
              text={`+ ${remaining} more`}
              style={{ fontSize: 9, color: theme.accent, textAlign: 'center' }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    );
  }

  // Medium widget: top 3 projects with progress bars
  if (isMedium) {
    const display = projects.slice(0, 3);
    const remaining = projects.length - 3;
    return (
      <FlexWidget
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          borderRadius: 16,
          padding: 12,
        }}
      >
        {renderHeader(theme, true)}
        {display.map((p) => renderMediumProject(p, theme))}
        {renderFooter(theme, updatedAt, remaining > 0)}
      </FlexWidget>
    );
  }

  // Large widget: up to 5 projects with full details
  const display = projects.slice(0, 5);
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        borderRadius: 16,
        padding: 14,
      }}
    >
      {renderHeader(theme, true)}
      <TextWidget
        text="PINNED PROJECTS"
        style={{ fontSize: 9, color: theme.subtle, letterSpacing: 1, marginBottom: 4 }}
      />
      {display.map((p) => renderLargeProject(p, theme))}
      {renderFooter(theme, updatedAt, true)}
    </FlexWidget>
  );
}

// ─── Render with pre-loaded data (used by refreshWidget) ──────────────────────

export function renderWidgetWithData(
  projects: WidgetProjectData[],
  updatedAt: number
): { light: React.JSX.Element; dark: React.JSX.Element } {
  // Use standard widget dimensions for refresh
  const w = 260;
  const h = 180;
  return {
    light: renderTrakWidgetContent(projects, w, h, LIGHT_THEME, updatedAt),
    dark: renderTrakWidgetContent(projects, w, h, DARK_THEME, updatedAt),
  };
}

// ─── Render error state ───────────────────────────────────────────────────────

export function renderWidgetError(): { light: React.JSX.Element; dark: React.JSX.Element } {
  return {
    light: (
      <FlexWidget style={{ flex: 1, backgroundColor: LIGHT_THEME.bg, borderRadius: 16, padding: 12 }}>
        {renderHeader(LIGHT_THEME, false)}
        {renderErrorState(LIGHT_THEME)}
      </FlexWidget>
    ),
    dark: (
      <FlexWidget style={{ flex: 1, backgroundColor: DARK_THEME.bg, borderRadius: 16, padding: 12 }}>
        {renderHeader(DARK_THEME, false)}
        {renderErrorState(DARK_THEME)}
      </FlexWidget>
    ),
  };
}

// ─── Render signed-out state ──────────────────────────────────────────────────

export function renderWidgetSignedOut(): { light: React.JSX.Element; dark: React.JSX.Element } {
  return {
    light: (
      <FlexWidget style={{ flex: 1, backgroundColor: LIGHT_THEME.bg, borderRadius: 16, padding: 12 }}>
        {renderSignedOutState(LIGHT_THEME)}
      </FlexWidget>
    ),
    dark: (
      <FlexWidget style={{ flex: 1, backgroundColor: DARK_THEME.bg, borderRadius: 16, padding: 12 }}>
        {renderSignedOutState(DARK_THEME)}
      </FlexWidget>
    ),
  };
}
