import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { getActiveUserId, emailToUUID, getDeviceId } from '@/utils/deviceUser';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ProjectStatus = 'active' | 'blocked' | 'idle' | 'warning';
export type Priority = 'low' | 'medium' | 'high';
export type MemberRole = 'owner' | 'member';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;  // display name of who completed it
  addedBy?: string;      // display name of who added it
  description?: string;  // optional detailed description
  deadline?: string;     // optional target deadline date & time
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: MemberRole;
  name: string;          // display name
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  description: string;
  status: ProjectStatus;
  techStack: string[];
  deadline: string;
  progress: number; // 0–100
  repoUrl: string;
  priority: Priority;
  lastUpdated: string;
  milestones: Milestone[];
  notes: string;
  isCompleted?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  // Collaboration fields
  inviteCode?: string;
  members?: ProjectMember[];
  isShared?: boolean;     // true if user is a member (not owner)
  ownerName?: string;     // owner's display name (for shared projects)
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  fetchProjects: (opts?: { forceRefresh?: boolean }) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'notes' | 'milestones' | 'lastUpdated' | 'progress'> & { id?: string; milestones?: Milestone[]; notes?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  permanentlyDeleteProject: (projectId: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  addMilestone: (projectId: string, title: string, description?: string, deadline?: string) => Promise<void>;
  editMilestone: (projectId: string, milestoneId: string, updates: { title?: string; description?: string; deadline?: string }) => Promise<void>;
  renameMilestone: (projectId: string, milestoneId: string, newTitle: string) => Promise<void>;
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  markCompleted: (projectId: string) => Promise<void>;
  unmarkCompleted: (projectId: string) => Promise<void>;
  togglePinProject: (projectId: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  clearProjects: () => void;
  // Collaboration actions
  generateInviteCode: (projectId: string) => Promise<string | null>;
  joinProjectByCode: (code: string) => Promise<{ success: boolean; projectName?: string; error?: string }>;
  leaveProject: (projectId: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  removeMember: (projectId: string, targetUserId: string) => Promise<void>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'trak-main',
    name: 'Trak',
    version: 'v1.0.0',
    description: 'Developer status tracker & feature roadmap engine',
    status: 'active',
    techStack: ['React Native', 'Expo', 'Supabase', 'Zustand', 'TS'],
    deadline: '2026-12-31 18:00',
    progress: 19,
    repoUrl: 'github.com/HarshitJain26-2/Trak',
    priority: 'high',
    lastUpdated: 'Just now',
    milestones: [
      { id: 'trak_m1', title: 'Logo change', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m2', title: 'Other than leader no one can delete slide delete', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m3', title: 'Remove member from project', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m4', title: 'Dead line work for real time', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m5', title: 'User should not able to undo done tasks in completed section only owner can', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m6', title: 'Add discription for feature adding deadline also', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m7', title: 'Save changes button', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m8', title: 'Google Authentication', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m9', title: 'Remove link', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m10', title: 'Add other button at tech stack', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m11', title: 'Developer notes', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m12', title: 'Add time in deadline', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m13', title: 'Time remaining not showing clearly', completed: false, addedBy: 'Harshit Jain' },
      { id: 'trak_m14', title: 'Core Navigation Setup', completed: true, addedBy: 'Harshit Jain' },
      { id: 'trak_m15', title: 'Zustand Store Integration', completed: true, addedBy: 'Harshit Jain' },
      { id: 'trak_m16', title: 'Supabase RLS Schema', completed: true, addedBy: 'Harshit Jain' },
    ],
    notes: '### Trak Platform Development Scope\nTracks active roadmap for Trak application features.',
  },
  {
    id: '1',
    name: 'Kernel v2.0',
    version: 'v1.4.2',
    description: 'System-wide performance tracking module',
    status: 'active',
    techStack: ['Rust', 'WASM', 'PostgreSQL'],
    deadline: 'OCT 24',
    progress: 75,
    repoUrl: 'github.com/trak-io/kernel-v2',
    priority: 'high',
    lastUpdated: '2m ago',
    milestones: [
      { id: 'm1', title: 'Setup CI/CD', completed: true },
      { id: 'm2', title: 'API Integration', completed: true },
      { id: 'm3', title: 'Unit Tests', completed: false },
    ],
    notes:
      '### Changelog\n- Fixed auth bug causing 401 on valid tokens\n- Optimized database queries for large datasets\n- Updated telemetry hooks for better observability\n\n### Context\nProject transitioned to Rust for performance bottlenecks in the event loop.',
  },
  {
    id: '2',
    name: 'Cloud Interface',
    version: 'v0.9.8',
    description: 'Cloud deployment management dashboard',
    status: 'warning',
    techStack: ['Next.js', 'Tailwind'],
    deadline: 'NOV 02',
    progress: 50,
    repoUrl: 'github.com/trak-io/cloud-interface',
    priority: 'medium',
    lastUpdated: '14h ago',
    milestones: [
      { id: 'm1', title: 'Design System', completed: true },
      { id: 'm2', title: 'API Routes', completed: false },
    ],
    notes: '### Context\nCloud interface nearing beta. AWS integration pending approval.',
  },
  {
    id: '3',
    name: 'Auth Service',
    version: 'v2.1.0',
    description: 'Unified authentication and authorization service',
    status: 'blocked',
    techStack: ['Go', 'Redis'],
    deadline: 'CRITICAL',
    progress: 100,
    repoUrl: 'github.com/trak-io/auth-svc',
    priority: 'high',
    lastUpdated: '1m ago',
    milestones: [
      { id: 'm1', title: 'OAuth2 flow', completed: true },
      { id: 'm2', title: 'Rate limiting', completed: true },
      { id: 'm3', title: 'Security audit', completed: false },
    ],
    notes: '### Context\nBlocked on security audit from infra team. Priority ticket raised.',
  },
];

const getProjectStorageKey = (userId: string) => `trak_local_projects_${userId}`;
const getPinnedStorageKey = (userId: string) => `trak_pinned_projects_${userId}`;
const getSharedStorageKey = (userId: string) => `trak_shared_projects_${userId}`;

const getPinnedIdsFromLocalStorage = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    const raw = await safeStorage.getItem(getPinnedStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

const savePinnedIdsToLocalStorage = async (userId: string, pinnedIds: string[]) => {
  try {
    if (!userId) return;
    await safeStorage.setItem(getPinnedStorageKey(userId), JSON.stringify(pinnedIds));
  } catch (err) {
    // Silently handle fallback
  }
};

const getSharedIdsFromLocalStorage = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    const raw = await safeStorage.getItem(getSharedStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

const saveSharedIdsToLocalStorage = async (userId: string, sharedIds: string[]) => {
  try {
    if (!userId) return;
    await safeStorage.setItem(getSharedStorageKey(userId), JSON.stringify(sharedIds));
  } catch (err) {
    // Silently handle fallback
  }
};

const saveToLocalStorage = async (userId: string, projects: Project[]) => {
  try {
    if (!userId) return;
    await safeStorage.setItem(getProjectStorageKey(userId), JSON.stringify(projects));
  } catch (err) {
    // Silently handle fallback
  }
};

/** Generate a random short invite code like TRK-A4F9 */
const generateShortCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TRK-${code}`;
};

/** Get current user's display name */
const getCurrentUserName = async (): Promise<string> => {
  try {
    const userId = await getActiveUserId();
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
    return data?.name || 'Developer';
  } catch {
    return 'Developer';
  }
};

// Track the realtime channel globally within the module
let realtimeChannel: RealtimeChannel | null = null;

const getLocalProjectsFromStorage = async (): Promise<Project[]> => {
  try {
    const allKeys = await safeStorage.getAllKeys();
    const projectKeys = allKeys.filter(
      (k) => k.startsWith('trak_local_projects_') || k === 'trak_projects' || k === 'trak_local_projects_default'
    );
    let recovered: Project[] = [];
    for (const sk of projectKeys) {
      const raw = await safeStorage.getItem(sk);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const p of parsed) {
            if (!recovered.some((rp) => rp.id === p.id)) {
              recovered.push(p);
            }
          }
        }
      }
    }
    return recovered;
  } catch {
    return [];
  }
};

/** Optimized parallelized background fetch for project data */
const fetchProjectsBackground = async (
  userId: string,
  storageKey: string,
  set: (state: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void,
  get?: () => ProjectStore
) => {
  // Load pinned & shared project IDs stored locally as well as in-memory state
  const storedPinnedIds = await getPinnedIdsFromLocalStorage(userId);
  const localSharedIds = await getSharedIdsFromLocalStorage(userId);
  const inMemoryPins = get ? get().projects.filter((p) => p.isPinned).map((p) => p.id) : [];
  const pinnedSet = new Set<string>([...storedPinnedIds, ...inMemoryPins]);

  // Construct list of user IDs to query (Auth user.id, emailToUUID, and deviceId)
  const userIdsToQuery = [userId];
  try {
    const devId = await getDeviceId();
    if (devId && !userIdsToQuery.includes(devId)) {
      userIdsToQuery.push(devId);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const altId = emailToUUID(user.email);
      if (altId && !userIdsToQuery.includes(altId)) {
        userIdsToQuery.push(altId);
      }
    }
  } catch (_) {}

  // Parallel fetch: 1) owned projects, 2) shared project memberships
  const [ownedRes, membershipsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, is_pinned, user_id, invite_code')
      .in('user_id', userIdsToQuery),
    supabase
      .from('project_members')
      .select('project_id')
      .in('user_id', userIdsToQuery),
  ]);

  let ownedProjects = ownedRes.data || [];
  if (ownedProjects.length === 0) {
    const { data: fallbackProjects } = await supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, is_pinned, user_id, invite_code');
    if (fallbackProjects && fallbackProjects.length > 0) {
      ownedProjects = fallbackProjects;
    }
  }

  const hasMembershipsData = Array.isArray(membershipsRes.data);
  const dbSharedProjectIds = (membershipsRes.data || []).map((m: any) => m.project_id);

  // If online query succeeded, dbSharedProjectIds is the authoritative source of truth from Supabase.
  // If offline/error, fallback to localSharedIds.
  const sharedProjectIds = hasMembershipsData
    ? dbSharedProjectIds
    : localSharedIds;

  // Sync local storage with current authoritative shared project IDs
  if (hasMembershipsData) {
    await saveSharedIdsToLocalStorage(userId, dbSharedProjectIds);
  }

  let sharedProjects: any[] = [];
  if (sharedProjectIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, is_pinned, user_id, invite_code')
      .in('id', sharedProjectIds);
    sharedProjects = data || [];
  }

  // If any shared project in sharedProjectIds was blocked by RLS, preserve it from local store cache
  if (get) {
    const fetchedIds = new Set([...ownedProjects, ...sharedProjects].map((p: any) => p.id));
    const localProjects = get().projects;
    for (const spId of sharedProjectIds) {
      if (!fetchedIds.has(spId)) {
        const localMatch = localProjects.find((p) => p.id === spId);
        if (localMatch) {
          sharedProjects.push({
            id: localMatch.id,
            name: localMatch.name,
            version: localMatch.version,
            description: localMatch.description,
            status: localMatch.status,
            tech_stack: localMatch.techStack,
            deadline: localMatch.deadline,
            progress: localMatch.progress,
            repo_url: localMatch.repoUrl,
            priority: localMatch.priority,
            last_updated: localMatch.lastUpdated,
            notes: localMatch.notes,
            is_completed: localMatch.isCompleted,
            is_deleted: localMatch.isDeleted,
            isPinned: localMatch.isPinned,
            user_id: 'owner_shared',
            invite_code: localMatch.inviteCode,
          });
        }
      }
    }
  }

  const allDbProjects = [...ownedProjects, ...sharedProjects];

  // Auto-sync any local projects that are not yet in Supabase
  if (get) {
    const currentProjects = get().projects;
    const dbProjectIds = new Set(allDbProjects.map((p: any) => p.id));
    const localProjectsToSync = currentProjects.filter((p) => !dbProjectIds.has(p.id));

    for (const localP of localProjectsToSync) {
      try {
        await supabase.from('projects').upsert({
          id: localP.id,
          user_id: userId,
          name: localP.name,
          version: localP.version,
          description: localP.description,
          status: localP.status,
          tech_stack: localP.techStack,
          deadline: localP.deadline,
          progress: localP.progress,
          repo_url: localP.repoUrl,
          priority: localP.priority,
          last_updated: localP.lastUpdated,
          notes: localP.notes,
          is_completed: localP.isCompleted ?? false,
          is_deleted: localP.isDeleted ?? false,
        });

        if (localP.milestones && localP.milestones.length > 0) {
          for (const m of localP.milestones) {
            await supabase.from('milestones').upsert({
              id: m.id,
              project_id: localP.id,
              title: m.title,
              completed: m.completed,
              completed_by: m.completedBy,
              added_by: m.addedBy,
            });
          }
        }
      } catch (_) {}
    }
  }

  if (allDbProjects.length === 0) {
    const existingLocal = (get && get().projects.length > 0) ? get().projects : await getLocalProjectsFromStorage();
    if (existingLocal.length > 0) {
      // Re-sync local projects to Supabase under current user ID to prevent data loss
      for (const p of existingLocal) {
        try {
          await supabase.from('projects').upsert({
            id: p.id,
            user_id: userId,
            name: p.name,
            version: p.version,
            description: p.description,
            status: p.status,
            tech_stack: p.techStack,
            deadline: p.deadline,
            progress: p.progress,
            repo_url: p.repoUrl,
            priority: p.priority,
            last_updated: p.lastUpdated,
            notes: p.notes,
            is_completed: p.isCompleted ?? false,
            is_deleted: p.isDeleted ?? false,
          });
        } catch (_) {}
      }
      set({ projects: existingLocal, isLoading: false });
      await saveToLocalStorage(userId, existingLocal);
      return;
    }

    await saveToLocalStorage(userId, []);
    set({ projects: [], isLoading: false });
    return;
  }

  const projectIds = allDbProjects.map((p: any) => p.id);
  const ownerIds = [...new Set(sharedProjects.map((p: any) => p.user_id?.toString()))].filter(Boolean);

  // Parallel fetch: 1) milestones, 2) members, 3) owner profiles
  const [milestonesRes, membersRes, ownerProfilesRes] = await Promise.all([
    supabase
      .from('milestones')
      .select('id, project_id, title, completed, completed_by, added_by, description, deadline')
      .in('project_id', projectIds),
    supabase
      .from('project_members')
      .select('id, project_id, user_id, role, joined_at')
      .in('project_id', projectIds),
    ownerIds.length > 0
      ? supabase.from('profiles').select('id, name').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const dbMilestones = milestonesRes.data || [];
  const allMembers = membersRes.data || [];
  const ownerProfiles = ownerProfilesRes.data || [];

  const memberUserIds = [...new Set(allMembers.map((m: any) => m.user_id))].filter(Boolean);
  let memberProfiles: any[] = [];
  if (memberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', memberUserIds);
    memberProfiles = profiles || [];
  }

  const profileMap = new Map<string, string>();
  [...memberProfiles, ...ownerProfiles].forEach((p: any) => {
    if (p?.id) profileMap.set(p.id, p.name || 'Developer');
  });

  const formattedProjects: Project[] = allDbProjects.map((row: any) => {
    const localMatch = get ? get().projects.find((p) => p.id === row.id) : undefined;
    const dbMilestoneIds = new Set((dbMilestones || []).filter((m: any) => m.project_id === row.id).map((m: any) => m.id));

    const dbProjectMilestones = (dbMilestones || [])
      .filter((m: any) => m.project_id === row.id)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        completed: m.completed ?? false,
        completedBy: m.completed_by || undefined,
        addedBy: m.added_by || undefined,
        description: m.description || undefined,
        deadline: m.deadline || undefined,
      }));

    const unsyncedLocalMilestones = localMatch?.milestones
      ? localMatch.milestones.filter((lm) => !dbMilestoneIds.has(lm.id))
      : [];

    if (unsyncedLocalMilestones.length > 0) {
      for (const m of unsyncedLocalMilestones) {
        void Promise.resolve(
          supabase.from('milestones').upsert({
            id: m.id,
            project_id: row.id,
            title: m.title,
            completed: m.completed,
            completed_by: m.completedBy,
            added_by: m.addedBy,
            description: m.description,
            deadline: m.deadline,
          })
        ).catch(() => {});
      }
    }

    const projectMilestones = [...dbProjectMilestones, ...unsyncedLocalMilestones];
    const calculatedProgress = projectMilestones.length > 0
      ? Math.round((projectMilestones.filter((m) => m.completed).length / projectMilestones.length) * 100)
      : (row.progress ?? 0);

    const projectMembers: ProjectMember[] = (allMembers || [])
      .filter((m: any) => m.project_id === row.id)
      .map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as MemberRole,
        name: profileMap.get(m.user_id) || 'Developer',
        joinedAt: m.joined_at,
      }));

    const isShared = !userIdsToQuery.includes(row.user_id);
    const isPinned = pinnedSet.has(row.id.toString()) || (row.is_pinned ?? false);
    const inviteCode = row.invite_code || generateShortCode();

    if (!row.invite_code && !isShared) {
      void Promise.resolve(supabase.from('projects').update({ invite_code: inviteCode }).eq('id', row.id)).catch(() => {});
    }

    return {
      id: row.id,
      name: row.name,
      version: row.version || '',
      description: row.description || '',
      status: row.status as ProjectStatus,
      techStack: row.tech_stack || [],
      deadline: row.deadline || '',
      progress: calculatedProgress,
      repoUrl: row.repo_url || '',
      priority: row.priority as Priority,
      lastUpdated: row.last_updated || 'recently',
      notes: row.notes || '',
      isCompleted: row.is_completed ?? false,
      isDeleted: row.is_deleted ?? false,
      isPinned,
      milestones: projectMilestones,
      inviteCode,
      members: projectMembers,
      isShared,
      ownerName: isShared ? (profileMap.get(row.user_id?.toString()) || 'Developer') : undefined,
    };
  });

  const finalPinnedIds = formattedProjects.filter((p) => p.isPinned).map((p) => p.id);
  await savePinnedIdsToLocalStorage(userId, finalPinnedIds);
  await saveToLocalStorage(userId, formattedProjects);
  set({ projects: formattedProjects, isLoading: false });
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  currentUserId: null,

  setCurrentUserId: (userId: string | null) => {
    set({ currentUserId: userId });
  },

  clearProjects: () => {
    set({ projects: [], currentUserId: null });
  },

  fetchProjects: async (opts?: { forceRefresh?: boolean }) => {
    try {
      const userId = await getActiveUserId();
      set({ currentUserId: userId });

      const storageKey = getProjectStorageKey(userId);
      const pinnedIds = await getPinnedIdsFromLocalStorage(userId);
      const pinnedSet = new Set(pinnedIds);

      // 1. Immediately scan ALL local storage keys for cached projects
      const allKeys = await safeStorage.getAllKeys();
      const projectKeys = allKeys.filter(
        (k) => k.startsWith('trak_local_projects_') || k === 'trak_projects' || k === 'trak_local_projects_default'
      );
      const devId = await getDeviceId();
      const storageKeys = [...new Set([storageKey, getProjectStorageKey(devId), ...projectKeys])];

      let recoveredProjects: Project[] = [];
      for (const sk of storageKeys) {
        try {
          const raw = await safeStorage.getItem(sk);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const p of parsed) {
                if (!recoveredProjects.some((rp) => rp.id === p.id)) {
                  recoveredProjects.push(p);
                }
              }
            }
          }
        } catch (_) {}
      }

      let hasLocal = false;
      if (recoveredProjects.length > 0) {
        const projectsWithPins = recoveredProjects.map((p: Project) => ({
          ...p,
          isPinned: pinnedSet.has(p.id) || p.isPinned || false,
        }));
        set({ projects: projectsWithPins, isLoading: false });
        hasLocal = true;
      }

      if (!hasLocal) {
        set({ isLoading: true });
      }

      if (hasLocal && !opts?.forceRefresh && get().projects.length > 0) {
        fetchProjectsBackground(userId, storageKey, set, get).catch(() => {});
        return;
      }

      await fetchProjectsBackground(userId, storageKey, set, get);
    } catch (err) {
      console.error('Error fetching projects:', err);
      set({ isLoading: false });
    }
  },

  addProject: async (data) => {
    const userId = await getActiveUserId();
    const inviteCode = generateShortCode();

    const initialMilestones: Milestone[] = data.milestones || [];
    const calculatedProgress = initialMilestones.length > 0
      ? Math.round((initialMilestones.filter((m) => m.completed).length / initialMilestones.length) * 100)
      : 0;

    const newProject: Project = {
      ...data,
      id: data.id || Date.now().toString(),
      progress: calculatedProgress,
      lastUpdated: 'just now',
      milestones: initialMilestones,
      notes: data.notes || '',
      inviteCode,
    };

    set((state) => ({ projects: [newProject, ...state.projects] }));
    await saveToLocalStorage(userId, get().projects);

    try {
      const insertData: any = {
        id: newProject.id,
        user_id: userId,
        name: newProject.name,
        version: newProject.version,
        description: newProject.description,
        status: newProject.status,
        tech_stack: newProject.techStack,
        deadline: newProject.deadline,
        progress: newProject.progress,
        repo_url: newProject.repoUrl,
        priority: newProject.priority,
        last_updated: newProject.lastUpdated,
        notes: newProject.notes,
        is_completed: false,
        is_deleted: false,
        invite_code: inviteCode,
      };

      const { error } = await supabase.from('projects').upsert(insertData);
      if (error) {
        console.error('Failed to sync addProject to Supabase:', error.message);
      }

      if (initialMilestones.length > 0) {
        for (const m of initialMilestones) {
          const { error: mErr } = await supabase.from('milestones').upsert({
            id: m.id,
            project_id: newProject.id,
            title: m.title,
            completed: m.completed ?? false,
            completed_by: m.completedBy || null,
            added_by: m.addedBy || null,
          });
          if (mErr) {
            console.error('Failed to sync initial milestone to Supabase:', mErr.message);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync addProject to Supabase:', err);
    }

    return newProject;
  },

  deleteProject: async (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isDeleted: true } : p
      ),
    }));
    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      await supabase
        .from('projects')
        .update({ is_deleted: true })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync deleteProject to Supabase:', err);
    }
  },

  restoreProject: async (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isDeleted: false } : p
      ),
    }));
    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      await supabase
        .from('projects')
        .update({ is_deleted: false })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync restoreProject to Supabase:', err);
    }
  },

  permanentlyDeleteProject: async (projectId) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync permanentlyDeleteProject to Supabase:', err);
    }
  },

  toggleMilestone: async (projectId, milestoneId) => {
    const proj = get().projects.find((p) => p.id === projectId);
    const targetM = proj?.milestones.find((m) => m.id === milestoneId);

    // Requirement: User should not able to undo done tasks in completed section only owner can
    if (targetM?.completed && proj?.isShared) {
      throw new Error('ONLY_OWNER_CAN_UNDO');
    }

    let updatedCompleted = false;
    let updatedProgress = 0;
    const userName = await getCurrentUserName();

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = p.milestones.map((m) => {
          if (m.id === milestoneId) {
            updatedCompleted = !m.completed;
            return {
              ...m,
              completed: !m.completed,
              completedBy: !m.completed ? userName : undefined,
            };
          }
          return m;
        });
        updatedProgress = updatedMilestones.length > 0
          ? Math.round((updatedMilestones.filter((m) => m.completed).length / updatedMilestones.length) * 100)
          : 0;
        return { ...p, milestones: updatedMilestones, progress: updatedProgress };
      }),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          completed: updatedCompleted,
          completed_by: updatedCompleted ? userName : null,
        })
        .eq('id', milestoneId);

      if (error) {
        console.error('Failed to sync toggleMilestone to Supabase:', error.message);
      }

      await supabase
        .from('projects')
        .update({ progress: updatedProgress })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync toggleMilestone to Supabase:', err);
    }
  },

  addMilestone: async (projectId, title, description, deadline) => {
    const newMilestoneId = `m${Date.now()}`;
    let updatedProgress = 0;
    const userName = await getCurrentUserName();

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = [
          ...p.milestones,
          {
            id: newMilestoneId,
            title: title.trim(),
            description: description?.trim() || undefined,
            deadline: deadline?.trim() || undefined,
            completed: false,
            addedBy: userName,
          },
        ];
        updatedProgress = Math.round(
          (updatedMilestones.filter((m) => m.completed).length / updatedMilestones.length) * 100
        );
        return { ...p, isCompleted: false, milestones: updatedMilestones, progress: updatedProgress };
      }),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      const project = get().projects.find((p) => p.id === projectId);
      if (project) {
        // Ensure parent project exists in Supabase so foreign key constraints pass
        await supabase.from('projects').upsert({
          id: project.id,
          user_id: userId,
          name: project.name,
          version: project.version,
          description: project.description,
          status: project.status,
          tech_stack: project.techStack,
          deadline: project.deadline,
          progress: updatedProgress,
          repo_url: project.repoUrl,
          priority: project.priority,
          last_updated: project.lastUpdated,
          notes: project.notes,
          is_completed: false,
          is_deleted: project.isDeleted ?? false,
          invite_code: project.inviteCode,
        });
      }

      const { error } = await supabase.from('milestones').upsert({
        id: newMilestoneId,
        project_id: projectId,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline?.trim() || null,
        completed: false,
        added_by: userName,
      });

      if (error) {
        console.error('Failed to sync addMilestone to Supabase:', error.message);
      }

      await supabase
        .from('projects')
        .update({ progress: updatedProgress, is_completed: false })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync addMilestone to Supabase:', err);
    }
  },

  editMilestone: async (projectId, milestoneId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) =>
                m.id === milestoneId
                  ? {
                      ...m,
                      ...(updates.title !== undefined && { title: updates.title.trim() }),
                      ...(updates.description !== undefined && { description: updates.description.trim() || undefined }),
                      ...(updates.deadline !== undefined && { deadline: updates.deadline.trim() || undefined }),
                    }
                  : m
              ),
            }
          : p
      ),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      const updatePayload: any = {};
      if (updates.title !== undefined) updatePayload.title = updates.title.trim();
      if (updates.description !== undefined) updatePayload.description = updates.description.trim() || null;
      if (updates.deadline !== undefined) updatePayload.deadline = updates.deadline.trim() || null;

      const { error } = await supabase
        .from('milestones')
        .update(updatePayload)
        .eq('id', milestoneId);

      if (error) {
        console.error('Failed to sync editMilestone to Supabase:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync editMilestone to Supabase:', err);
    }
  },

  renameMilestone: async (projectId, milestoneId, newTitle) => {
    const trimmedTitle = newTitle.trim();

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) =>
                m.id === milestoneId ? { ...m, title: trimmedTitle } : m
              ),
            }
          : p
      ),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      const { error } = await supabase
        .from('milestones')
        .update({ title: trimmedTitle })
        .eq('id', milestoneId);

      if (error) {
        console.error('Failed to sync renameMilestone to Supabase:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync renameMilestone to Supabase:', err);
    }
  },

  deleteMilestone: async (projectId, milestoneId) => {
    let updatedProgress = 0;

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = p.milestones.filter((m) => m.id !== milestoneId);
        updatedProgress = updatedMilestones.length > 0
          ? Math.round((updatedMilestones.filter((m) => m.completed).length / updatedMilestones.length) * 100)
          : 0;
        return { ...p, milestones: updatedMilestones, progress: updatedProgress };
      }),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);

      if (error) {
        console.error('Failed to sync deleteMilestone to Supabase:', error.message);
      }

      await supabase
        .from('projects')
        .update({ progress: updatedProgress })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync deleteMilestone to Supabase:', err);
    }
  },

  markCompleted: async (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isCompleted: true, progress: 100 } : p
      ),
    }));

    try {
      await supabase
        .from('projects')
        .update({ is_completed: true, progress: 100 })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync markCompleted to Supabase:', err);
    }
  },

  unmarkCompleted: async (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isCompleted: false } : p
      ),
    }));

    try {
      await supabase
        .from('projects')
        .update({ is_completed: false })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync unmarkCompleted to Supabase:', err);
    }
  },

  togglePinProject: async (projectId) => {
    const { projects } = get();
    const userId = await getActiveUserId();
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    const newPinnedState = !target.isPinned;
    const updated = projects.map((p) =>
      p.id === projectId ? { ...p, isPinned: newPinnedState } : p
    );
    set({ projects: updated });

    if (userId) {
      const pinnedIds = updated.filter((p) => p.isPinned).map((p) => p.id);
      await savePinnedIdsToLocalStorage(userId, pinnedIds);
      await saveToLocalStorage(userId, updated);
    }

    try {
      await supabase
        .from('projects')
        .update({ is_pinned: newPinnedState })
        .eq('id', projectId);
    } catch (err) {
      // Local persistence handles pin status gracefully
    }
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  // ─── Collaboration Actions ─────────────────────────────────────────────────

  generateInviteCode: async (projectId) => {
    try {
      const code = generateShortCode();
      const userId = await getActiveUserId();

      // 1. Update Supabase DB (with SELECT verification & RPC fallback)
      const { data, error } = await supabase
        .from('projects')
        .update({ invite_code: code })
        .eq('id', projectId)
        .select('id, invite_code');

      if (error || !data || data.length === 0) {
        // Fallback update via SECURITY DEFINER RPC function
        try {
          await supabase.rpc('regenerate_invite_code', {
            p_project_id: projectId,
            p_code: code,
          });
        } catch (rpcErr) {
          console.warn('RPC regenerate_invite_code error:', rpcErr);
        }
      }

      // 2. Update local Zustand state
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, inviteCode: code } : p
        ),
      }));

      // 3. Save to local storage immediately so local cache stays in sync
      await saveToLocalStorage(userId, get().projects);

      return code;
    } catch (err) {
      console.error('Failed to generate invite code:', err);
      return null;
    }
  },

  joinProjectByCode: async (code: string) => {
    try {
      if (!code || !code.trim()) {
        return { success: false, error: 'Please enter a valid invite code' };
      }

      // 1. Extract clean normalized token (e.g. "TRK-A4F9" -> "A4F9", "a4f9" -> "A4F9")
      const normalizedInput = code.trim().toUpperCase().replace(/^TRK-/, '').replace(/[^A-Z0-9]/g, '');

      if (!normalizedInput) {
        return { success: false, error: 'Invalid invite code format' };
      }

      const userId = await getActiveUserId();
      const userIdsToQuery = [userId];
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const altId = emailToUUID(user.email);
          if (altId && !userIdsToQuery.includes(altId)) {
            userIdsToQuery.push(altId);
          }
        }
      } catch (_) {}

      // 2. Direct JavaScript search across all projects in Supabase (100% case & prefix insensitive)
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, name, user_id, invite_code');

      let targetProject = (allProjects || []).find((p: any) => {
        if (!p.invite_code) return false;
        const normalizedDBCode = p.invite_code.trim().toUpperCase().replace(/^TRK-/, '').replace(/[^A-Z0-9]/g, '');
        return normalizedDBCode === normalizedInput;
      });

      // 3. Fallback to RPC function if direct query returned no rows (e.g. strict RLS)
      if (!targetProject) {
        const fullCodeToTry = `TRK-${normalizedInput}`;
        const codesToTry = [fullCodeToTry, normalizedInput];
        for (const tryCode of codesToTry) {
          try {
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('join_project_by_invite_code', {
              code: tryCode,
              p_user_id: userId,
            });
            if (!rpcErr && rpcRes) {
              await get().fetchProjects({ forceRefresh: true });
              const joinedProject = get().projects.find((p) => p.id === rpcRes);
              return {
                success: true,
                projectName: joinedProject?.name || 'Project',
              };
            }
          } catch (_) {}
        }
      }

      if (!targetProject) {
        return { success: false, error: 'Invalid invite code. Please check the code and try again.' };
      }

      // 4. Check if user is the project owner (across all user ID aliases)
      if (userIdsToQuery.includes(targetProject.user_id)) {
        return { success: false, error: 'You are the owner of this project' };
      }

      // 5. Check if user is already a member (across all user ID aliases)
      const { data: existingMembers } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', targetProject.id)
        .in('user_id', userIdsToQuery);

      if (existingMembers && existingMembers.length > 0) {
        return { success: false, error: 'You are already a member of this project' };
      }

      // 6. Insert new member into project_members
      const memberId = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const { error: insertError } = await supabase.from('project_members').insert({
        id: memberId,
        project_id: targetProject.id,
        user_id: userId,
        role: 'member',
      });

      if (insertError) {
        if (insertError.message?.toLowerCase().includes('unique') || insertError.message?.toLowerCase().includes('duplicate')) {
          return { success: false, error: 'You are already a member of this project' };
        }
        console.warn('Supabase member insert warning:', insertError.message);
      }

      // Fetch target project's full row and milestones
      const [fullProjRes, fullMilestonesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', targetProject.id).maybeSingle(),
        supabase.from('milestones').select('*').eq('project_id', targetProject.id),
      ]);

      const fullProj = fullProjRes.data;
      const fullMilestones = fullMilestonesRes.data || [];

      const joinedProjectObject: Project = {
        id: targetProject.id,
        name: fullProj?.name || targetProject.name,
        version: fullProj?.version || '',
        description: fullProj?.description || '',
        status: (fullProj?.status as ProjectStatus) || 'active',
        techStack: fullProj?.tech_stack || [],
        deadline: fullProj?.deadline || '',
        progress: fullProj?.progress ?? 0,
        repoUrl: fullProj?.repo_url || '',
        priority: (fullProj?.priority as Priority) || 'medium',
        lastUpdated: fullProj?.last_updated || 'recently',
        notes: fullProj?.notes || '',
        isCompleted: fullProj?.is_completed ?? false,
        isDeleted: fullProj?.is_deleted ?? false,
        isPinned: false,
        milestones: fullMilestones.map((m: any) => ({
          id: m.id,
          title: m.title,
          completed: m.completed ?? false,
          completedBy: m.completed_by || undefined,
          addedBy: m.added_by || undefined,
        })),
        inviteCode: fullProj?.invite_code || targetProject.invite_code,
        members: [],
        isShared: true,
        ownerName: 'Project Lead',
      };

      // Persist shared project ID locally so it appears immediately on Home screen
      const currentSharedIds = await getSharedIdsFromLocalStorage(userId);
      if (!currentSharedIds.includes(targetProject.id)) {
        await saveSharedIdsToLocalStorage(userId, [...currentSharedIds, targetProject.id]);
      }

      // Add joined project into local state & storage immediately
      const updatedProjects = [
        joinedProjectObject,
        ...get().projects.filter((p) => p.id !== joinedProjectObject.id),
      ];
      set({ projects: updatedProjects });
      await saveToLocalStorage(userId, updatedProjects);

      // Trigger background sync
      fetchProjectsBackground(userId, getProjectStorageKey(userId), set, get).catch(() => {});

      return {
        success: true,
        projectName: joinedProjectObject.name,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to join project' };
    }
  },

  leaveProject: async (projectId) => {
    try {
      const userId = await getActiveUserId();

      // Remove from local state immediately
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
      }));

      // Update local storage cache & local shared IDs
      const currentProjects = get().projects;
      await saveToLocalStorage(userId, currentProjects);

      const currentSharedIds = await getSharedIdsFromLocalStorage(userId);
      const updatedSharedIds = currentSharedIds.filter((id) => id !== projectId);
      await saveSharedIdsToLocalStorage(userId, updatedSharedIds);

      // Remove from Supabase project_members
      const userIdsToQuery = [userId];
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const altId = emailToUUID(user.email);
          if (altId && !userIdsToQuery.includes(altId)) {
            userIdsToQuery.push(altId);
          }
        }
      } catch (_) {}

      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .in('user_id', userIdsToQuery);
    } catch (err) {
      console.error('Failed to leave project:', err);
    }
  },

  fetchProjectMembers: async (projectId) => {
    try {
      const { data: members } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);

      if (!members || members.length === 0) return [];

      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p.name || 'Developer'));

      return members.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as MemberRole,
        name: profileMap.get(m.user_id) || 'Developer',
        joinedAt: m.joined_at,
      }));
    } catch (err) {
      console.error('Failed to fetch project members:', err);
      return [];
    }
  },

  removeMember: async (projectId: string, targetUserId: string) => {
    try {
      // 1. Remove member from local state immediately
      set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            members: (p.members || []).filter((m) => m.userId !== targetUserId),
          };
        }),
      }));

      const userId = await getActiveUserId();
      await saveToLocalStorage(userId, get().projects);

      // 2. Delete member row from Supabase project_members
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', targetUserId);
    } catch (err) {
      console.error('Failed to remove member from project:', err);
    }
  },

  subscribeToRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    const channel = supabase
      .channel('trak-collab')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones' },
        () => {
          get().fetchProjects();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => {
          get().fetchProjects();
        }
      )
      .subscribe();

    realtimeChannel = channel;
  },

  unsubscribeFromRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },
}));
