import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../lib/storage';
import { getActiveUserId } from '../lib/deviceUser';
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
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'milestones' | 'notes' | 'lastUpdated' | 'progress'>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  permanentlyDeleteProject: (projectId: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  addMilestone: (projectId: string, title: string) => Promise<void>;
  renameMilestone: (projectId: string, milestoneId: string, newTitle: string) => Promise<void>;
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  markCompleted: (projectId: string) => Promise<void>;
  unmarkCompleted: (projectId: string) => Promise<void>;
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

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const userId = await getActiveUserId();
      set({ currentUserId: userId });

      const storageKey = getProjectStorageKey(userId);

      // 1. Fetch owned projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

      // 2. Fetch shared projects (where user is a member)
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      const sharedProjectIds = (memberships || []).map((m: any) => m.project_id);

      let sharedProjects: any[] = [];
      if (sharedProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', sharedProjectIds);
        sharedProjects = data || [];
      }

      // Combine both sets
      const allDbProjects = [
        ...(ownedProjects || []),
        ...sharedProjects,
      ];

      if (allDbProjects.length > 0) {
        const projectIds = allDbProjects.map((p: any) => p.id);
        const { data: dbMilestones } = await supabase
          .from('milestones')
          .select('*')
          .in('project_id', projectIds);

        // Fetch members for all projects
        const { data: allMembers } = await supabase
          .from('project_members')
          .select('*')
          .in('project_id', projectIds);

        // Fetch member profiles
        const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))];
        let memberProfiles: any[] = [];
        if (memberUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', memberUserIds);
          memberProfiles = profiles || [];
        }

        // Fetch owner profiles for shared projects
        const ownerIds = [...new Set(sharedProjects.map((p: any) => p.user_id?.toString()))];
        let ownerProfiles: any[] = [];
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', ownerIds);
          ownerProfiles = profiles || [];
        }

        const profileMap = new Map<string, string>();
        [...memberProfiles, ...ownerProfiles].forEach((p: any) => {
          profileMap.set(p.id, p.name || 'Developer');
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
            milestones: projectMilestones,
            inviteCode: row.invite_code || undefined,
            members: projectMembers,
            isShared,
            ownerName: isShared ? (profileMap.get(row.user_id?.toString()) || 'Developer') : undefined,
          };
        });

        await saveToLocalStorage(userId, formattedProjects);
        set({ projects: formattedProjects, isLoading: false });
        return;
      }

      // Supabase returned empty — user has no projects yet
      // Still attempt loading from local storage in case of offline scenario
      const localData = await safeStorage.getItem(storageKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ projects: parsed, isLoading: false });
          return;
        }
      }

      // New user with no projects — show empty list (never show mock data)
      set({ projects: [], isLoading: false });
    } catch (err) {
      try {
        const userId = await getActiveUserId();
        const localData = await safeStorage.getItem(getProjectStorageKey(userId));
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            set({ projects: parsed, isLoading: false });
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      // Error state — show empty list, not shared mock data
      set({ projects: [], isLoading: false });
    }
  },

  addProject: async (data) => {
    const userId = await getActiveUserId();

    const newProject: Project = {
      ...data,
      id: Date.now().toString(),
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

  joinProjectByCode: async (code) => {
    try {
      const trimmedCode = code.trim().toUpperCase();
      const userId = await getActiveUserId();

      // Use the RPC function to join
      const { data, error } = await supabase.rpc('join_project_by_invite_code', {
        code: trimmedCode,
        p_user_id: userId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Refresh projects to include the newly joined project
      await get().fetchProjects();

      // Find the joined project name
      const joinedProject = get().projects.find((p) => p.id === data);

      return {
        success: true,
        projectName: joinedProject?.name || 'Project',
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
