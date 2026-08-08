import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { getActiveUserId } from '@/utils/deviceUser';
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
  addProject: (project: Omit<Project, 'id' | 'milestones' | 'notes' | 'lastUpdated' | 'progress'> & { id?: string }) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  permanentlyDeleteProject: (projectId: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  addMilestone: (projectId: string, title: string) => Promise<void>;
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
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const MOCK_PROJECTS: Project[] = [
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

/** Optimized parallelized background fetch for project data */
const fetchProjectsBackground = async (
  userId: string,
  storageKey: string,
  set: (state: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void,
  get?: () => ProjectStore
) => {
  // Load pinned project IDs stored locally as well as in-memory state
  const storedPinnedIds = await getPinnedIdsFromLocalStorage(userId);
  const inMemoryPins = get ? get().projects.filter((p) => p.isPinned).map((p) => p.id) : [];
  const pinnedSet = new Set<string>([...storedPinnedIds, ...inMemoryPins]);

  // Parallel fetch: 1) owned projects, 2) shared project memberships
  const [ownedRes, membershipsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, is_pinned, user_id, invite_code')
      .eq('user_id', userId),
    supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId),
  ]);

  const ownedProjects = ownedRes.data || [];
  const sharedProjectIds = (membershipsRes.data || []).map((m: any) => m.project_id);

  let sharedProjects: any[] = [];
  if (sharedProjectIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, is_pinned, user_id, invite_code')
      .in('id', sharedProjectIds);
    sharedProjects = data || [];
  }

  const allDbProjects = [...ownedProjects, ...sharedProjects];

  if (allDbProjects.length === 0) {
    set({ isLoading: false });
    return;
  }

  const projectIds = allDbProjects.map((p: any) => p.id);
  const ownerIds = [...new Set(sharedProjects.map((p: any) => p.user_id?.toString()))].filter(Boolean);

  // Parallel fetch: 1) milestones, 2) members, 3) owner profiles
  const [milestonesRes, membersRes, ownerProfilesRes] = await Promise.all([
    supabase
      .from('milestones')
      .select('id, project_id, title, completed, completed_by, added_by')
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
    const projectMilestones = (dbMilestones || [])
      .filter((m: any) => m.project_id === row.id)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        completed: m.completed ?? false,
        completedBy: m.completed_by || undefined,
        addedBy: m.added_by || undefined,
      }));

    const projectMembers: ProjectMember[] = (allMembers || [])
      .filter((m: any) => m.project_id === row.id)
      .map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as MemberRole,
        name: profileMap.get(m.user_id) || 'Developer',
        joinedAt: m.joined_at,
      }));

    const isShared = row.user_id !== userId;
    const isPinned = pinnedSet.has(row.id.toString()) || (row.is_pinned ?? false);

    return {
      id: row.id,
      name: row.name,
      version: row.version || '',
      description: row.description || '',
      status: row.status as ProjectStatus,
      techStack: row.tech_stack || [],
      deadline: row.deadline || '',
      progress: row.progress ?? 0,
      repoUrl: row.repo_url || '',
      priority: row.priority as Priority,
      lastUpdated: row.last_updated || 'recently',
      notes: row.notes || '',
      isCompleted: row.is_completed ?? false,
      isDeleted: row.is_deleted ?? false,
      isPinned,
      milestones: projectMilestones,
      inviteCode: row.invite_code || undefined,
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

      // 1. Immediately render local cached projects if available
      const localData = await safeStorage.getItem(storageKey);
      let hasLocal = false;
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const projectsWithPins = parsed.map((p: Project) => ({
              ...p,
              isPinned: pinnedSet.has(p.id) || p.isPinned || false,
            }));
            set({ projects: projectsWithPins, isLoading: false });
            hasLocal = true;
          }
        } catch {
          // Fallback if cache parsing fails
        }
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

    const newProject: Project = {
      ...data,
      id: data.id || Date.now().toString(),
      progress: 0,
      lastUpdated: 'just now',
      milestones: [],
      notes: '',
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
      };

      await supabase.from('projects').insert(insertData);
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

    try {
      await supabase
        .from('milestones')
        .update({
          completed: updatedCompleted,
          completed_by: updatedCompleted ? userName : null,
        })
        .eq('id', milestoneId);

      await supabase
        .from('projects')
        .update({ progress: updatedProgress })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync toggleMilestone to Supabase:', err);
    }
  },

  addMilestone: async (projectId, title) => {
    const newMilestoneId = `m${Date.now()}`;
    let updatedProgress = 0;
    const userName = await getCurrentUserName();

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = [
          ...p.milestones,
          { id: newMilestoneId, title: title.trim(), completed: false, addedBy: userName },
        ];
        updatedProgress = Math.round(
          (updatedMilestones.filter((m) => m.completed).length / updatedMilestones.length) * 100
        );
        return { ...p, isCompleted: false, milestones: updatedMilestones, progress: updatedProgress };
      }),
    }));

    try {
      await supabase.from('milestones').insert({
        id: newMilestoneId,
        project_id: projectId,
        title: title.trim(),
        completed: false,
        added_by: userName,
      });

      await supabase
        .from('projects')
        .update({ progress: updatedProgress, is_completed: false })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync addMilestone to Supabase:', err);
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

    try {
      await supabase
        .from('milestones')
        .update({ title: trimmedTitle })
        .eq('id', milestoneId);
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

    try {
      await supabase.from('milestones').delete().eq('id', milestoneId);

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

      // Update Supabase
      const { error } = await supabase
        .from('projects')
        .update({ invite_code: code })
        .eq('id', projectId);

      if (error) {
        console.error('Failed to generate invite code:', error);
        return null;
      }

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, inviteCode: code } : p
        ),
      }));

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

      // 1. Normalize code (trim, uppercase, remove inner spaces, prepend TRK- if missing)
      let cleanedCode = code.trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanedCode.startsWith('TRK-') && cleanedCode.length === 4) {
        cleanedCode = `TRK-${cleanedCode}`;
      }

      const userId = await getActiveUserId();

      // 2. Try RPC function first
      let rpcError: string | null = null;
      try {
        const { data, error } = await supabase.rpc('join_project_by_invite_code', {
          code: cleanedCode,
          p_user_id: userId,
        });

        if (!error && data) {
          await get().fetchProjects({ forceRefresh: true });
          const joinedProject = get().projects.find((p) => p.id === data);
          return {
            success: true,
            projectName: joinedProject?.name || 'Project',
          };
        }
        if (error) {
          rpcError = error.message;
        }
      } catch (e: any) {
        rpcError = e?.message || 'RPC Error';
      }

      // 3. Fallback: Direct database query to find project by invite code (case-insensitive & prefix-flexible)
      const possibleCodes = [cleanedCode];
      if (cleanedCode.startsWith('TRK-')) {
        possibleCodes.push(cleanedCode.replace('TRK-', ''));
      }

      const { data: projectMatches } = await supabase
        .from('projects')
        .select('id, name, user_id, invite_code')
        .in('invite_code', possibleCodes);

      let targetProject = (projectMatches || [])[0];

      // If still not found, try ilike case-insensitive search
      if (!targetProject) {
        const { data: ilikeMatches } = await supabase
          .from('projects')
          .select('id, name, user_id, invite_code')
          .ilike('invite_code', cleanedCode)
          .limit(1);
        targetProject = (ilikeMatches || [])[0];
      }

      if (!targetProject) {
        // Check for specific RPC error messages
        if (rpcError && rpcError.toLowerCase().includes('already a member')) {
          return { success: false, error: 'You are already a member of this project' };
        }
        if (rpcError && rpcError.toLowerCase().includes('owner')) {
          return { success: false, error: 'You are the owner of this project' };
        }
        return { success: false, error: 'Invalid invite code. Please check the code and try again.' };
      }

      // 4. Check if user is the project owner
      if (targetProject.user_id === userId) {
        return { success: false, error: 'You are the owner of this project' };
      }

      // 5. Check if user is already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', targetProject.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
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
        return { success: false, error: insertError.message || 'Failed to join project' };
      }

      // 7. Refresh project store with forceRefresh
      await get().fetchProjects({ forceRefresh: true });

      return {
        success: true,
        projectName: targetProject.name,
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

      // Remove from Supabase
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
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
