import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import type { WidgetProjectData } from '@/services/widget';

// ─── Theme colors ─────────────────────────────────────────────────────────────

interface WidgetTheme {
  bg: ColorProp;
  accent: ColorProp;
  accentDim: ColorProp;   // progress bar track
  text: ColorProp;
  subtle: ColorProp;
  subtleDim: ColorProp;   // muted timestamps
  border: ColorProp;
  cardBg: ColorProp;
}

export const DARK_THEME: WidgetTheme = {
  bg: '#10131a',
  accent: '#72ff70',
  accentDim: '#72ff7033',
  text: '#e1e2eb',
  subtle: '#b9ccb2',
  subtleDim: '#b9ccb280',
  border: '#FFFFFF10',
  cardBg: '#161B22',
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
  const dark = theme === DARK_THEME;
  const s = status?.toLowerCase();
  if (s === 'active') return dark ? '#72ff70' : '#00872e';
  if (s === 'blocked') return dark ? '#ffb4ab' : '#cf222e';
  if (s === 'idle') return dark ? '#4b8eff' : '#0969da';
  if (s === 'warning') return dark ? '#ffd400' : '#9a6700';
  return theme.accent;
};

// ─── Progress bar (uses flex instead of %) ────────────────────────────────────

function renderProgressBar(progress: number, theme: WidgetTheme) {
  const filled = Math.max(0, Math.min(100, progress));
  const empty = 100 - filled;
  if (filled === 0) {
    return (
      <FlexWidget
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.accentDim,
        }}
      />
    );
  }
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.accentDim,
        overflow: 'hidden',
      }}
    >
      <FlexWidget style={{ flex: filled, height: 4, backgroundColor: theme.accent, borderRadius: 2 }} />
      <FlexWidget style={{ flex: empty, height: 4 }} />
    </FlexWidget>
  );
}

// ─── Project row renderers ────────────────────────────────────────────────────

function renderSmallProject(project: WidgetProjectData, theme: WidgetTheme) {
  return (
    <FlexWidget
      key={project.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `trak://project/${project.id}` }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        borderRadius: 8,
        backgroundColor: theme.cardBg,
        marginVertical: 2,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexGap: 6 }}>
        <FlexWidget
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: getStatusColor(project.status, theme),
          }}
        />
        <TextWidget
          text={project.name}
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: theme.text,
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
      <TextWidget
        text={`${project.progress}%`}
        style={{ fontSize: 10, color: theme.accent }}
      />
    </FlexWidget>
  );
}

function renderMediumProject(project: WidgetProjectData, theme: WidgetTheme) {
  return (
    <FlexWidget
      key={project.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `trak://project/${project.id}` }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 8,
        backgroundColor: theme.cardBg,
        marginVertical: 3,
      }}
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 4 }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <FlexWidget
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getStatusColor(project.status, theme),
            }}
          />
          <TextWidget
            text={project.name}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.text,
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
        {renderProgressBar(project.progress, theme)}
      </FlexWidget>
      <TextWidget
        text={`${project.progress}%`}
        style={{ fontSize: 12, color: theme.accent, fontWeight: '600' }}
      />
    </FlexWidget>
  );
}

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
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexGap: 6 }}>
          <FlexWidget
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getStatusColor(project.status, theme),
            }}
          />
          <TextWidget
            text={project.name}
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.text,
            }}
            maxLines={1}
            truncate="END"
          />
        </FlexWidget>
        <TextWidget
          text={getStatusLabel(project.status)}
          style={{ fontSize: 9, color: getStatusColor(project.status, theme), fontWeight: '700' }}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexGap: 8 }}>
        <FlexWidget style={{ flex: 1 }}>{renderProgressBar(project.progress, theme)}</FlexWidget>
        <TextWidget
          text={`${project.progress}%`}
          style={{ fontSize: 11, color: theme.accent, fontWeight: '600' }}
        />
      </FlexWidget>
      <TextWidget
        text={`Updated ${project.lastUpdated}`}
        style={{ fontSize: 9, color: theme.subtleDim }}
      />
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
      }}
    >
      <TextWidget
        text="No pinned projects"
        style={{ fontSize: 13, fontWeight: '600', color: theme.text, textAlign: 'center' }}
      />
      <TextWidget
        text="Pin projects in Trak to access them quickly here."
        style={{ fontSize: 11, color: theme.subtle, textAlign: 'center', marginTop: 4 }}
      />
    </FlexWidget>
  );
}

// ─── Widget header ────────────────────────────────────────────────────────────

function renderHeader(theme: WidgetTheme, showSubtitle: boolean) {
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
      <TextWidget
        text="TRAK"
        style={{ fontSize: 14, fontWeight: '700', color: theme.accent, letterSpacing: 1.5 }}
      />
      {showSubtitle && (
        <TextWidget
          text="WORKSPACE"
          style={{ fontSize: 9, color: theme.subtle, letterSpacing: 1 }}
        />
      )}
    </FlexWidget>
  );
}

// ─── Main widget renderer ─────────────────────────────────────────────────────

export function renderTrakWidgetContent(
  projects: WidgetProjectData[],
  width: number,
  height: number,
  theme: WidgetTheme
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
          <TextWidget
            text={`+ ${remaining} more`}
            style={{ fontSize: 10, color: theme.subtle, textAlign: 'center', marginTop: 2 }}
          />
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
        {remaining > 0 ? (
          <FlexWidget clickAction="OPEN_APP" style={{ alignItems: 'center', paddingVertical: 4 }}>
            <TextWidget
              text={`+ ${remaining} more project${remaining !== 1 ? 's' : ''}`}
              style={{ fontSize: 10, color: theme.accent, textAlign: 'center' }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget clickAction="OPEN_APP" style={{ alignItems: 'center', paddingTop: 4 }}>
            <TextWidget
              text="Open Trak →"
              style={{ fontSize: 10, color: theme.accent, textAlign: 'center' }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    );
  }

  // Large widget: up to 5 projects with full details
  const display = projects.slice(0, 5);
  const remaining = projects.length - 5;
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
        style={{ fontSize: 10, color: theme.subtle, letterSpacing: 1, marginBottom: 4 }}
      />
      {display.map((p) => renderLargeProject(p, theme))}
      <FlexWidget clickAction="OPEN_APP" style={{ alignItems: 'center', paddingTop: 6 }}>
        <TextWidget
          text="View all projects →"
          style={{ fontSize: 11, color: theme.accent, textAlign: 'center' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── Exported render function for requestWidgetUpdate ─────────────────────────

export function renderTrakWidget(): { light: React.JSX.Element; dark: React.JSX.Element } {
  const placeholder = (
    <FlexWidget style={{ flex: 1, backgroundColor: DARK_THEME.bg, borderRadius: 16, padding: 12 }}>
      <TextWidget text="TRAK" style={{ fontSize: 14, fontWeight: '700', color: DARK_THEME.accent }} />
      <TextWidget text="Loading..." style={{ fontSize: 11, color: DARK_THEME.subtle, marginTop: 4 }} />
    </FlexWidget>
  );
  return { light: placeholder, dark: placeholder };
}
