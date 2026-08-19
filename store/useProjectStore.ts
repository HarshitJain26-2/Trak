import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { getActiveUserId, emailToUUID, getDeviceId } from '@/utils/deviceUser';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from '@/services/notifications';
import { Alert } from 'react-native';


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
  members?: ProjectMember[];
  isShared?: boolean;     // true if user is a member (not owner)
  ownerName?: string;     // owner's display name (for shared projects)
  joinCode?: string;      // Unique shareable join code (e.g. TRK-7K4P9Q)
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  isLoaded: boolean;
  isInitialLoading: boolean;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  fetchProjects: (opts?: { forceRefresh?: boolean }) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'notes' | 'milestones' | 'lastUpdated' | 'progress'> & { id?: string; milestones?: Milestone[]; notes?: string }) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Omit<Project, 'id'>>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  permanentlyDeleteProject: (projectId: string) => Promise<void>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  addMilestone: (projectId: string, title: string, description?: string, deadline?: string) => Promise<void>;
  editMilestone: (projectId: string, milestoneId: string, updates: { title?: string; description?: string; deadline?: string }) => Promise<void>;
  renameMilestone: (projectId: string, milestoneId: string, newTitle: string) => Promise<void>;
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<void>;
  markCompleted: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  unmarkCompleted: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  togglePinProject: (projectId: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  clearProjects: () => void;
  // Collaboration actions
  leaveProject: (projectId: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  removeMember: (projectId: string, targetUserId: string) => Promise<void>;
  joinProjectByCode: (code: string) => Promise<{ success: boolean; projectId?: string; error?: string; status?: 'joined' | 'already_member' | 'already_owner' }>;
  regenerateJoinCode: (projectId: string) => Promise<{ success: boolean; newCode?: string; error?: string }>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const MOCK_PROJECTS: Project[] = [];

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


/** Get current user's display name */
const getCurrentUserName = async (): Promise<string> => {
  try {
    const userId = await getActiveUserId();
    
    // 1. Check local profile store
    try {
      const localProfileStr = await safeStorage.getItem(`trak_local_profile_${userId}`);
      if (localProfileStr) {
        const localP = JSON.parse(localProfileStr);
        if (localP.name?.trim()) return localP.name.trim();
        if (localP.username?.trim()) return localP.username.trim();
      }
    } catch (_) {}

    // 2. Check Supabase profiles table
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, username, email')
        .eq('id', userId)
        .maybeSingle();
      if (data?.name?.trim()) return data.name.trim();
      if (data?.username?.trim()) return data.username.trim();
      if (data?.email) return data.email.split('@')[0];
    } catch (_) {}

    // 3. Check Supabase auth metadata
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.user_metadata?.full_name?.trim()) return authData.user.user_metadata.full_name.trim();
      if (authData.user?.user_metadata?.name?.trim()) return authData.user.user_metadata.name.trim();
      if (authData.user?.email) return authData.user.email.split('@')[0];
    } catch (_) {}

    return 'Developer';
  } catch {
    return 'Developer';
  }
};

// Track the realtime channel globally within the module
let realtimeChannel: RealtimeChannel | null = null;

// Flag to force refresh on next fetchProjects call (set after join/leave)
let _forceNextRefresh = false;

// Track in-flight background fetch promise to prevent duplicate simultaneous network calls
let inFlightFetchProjects: Promise<void> | null = null;

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
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, user_id, join_code')
      .in('user_id', userIdsToQuery),
    supabase
      .from('project_members')
      .select('project_id')
      .in('user_id', userIdsToQuery),
  ]);

  let ownedProjects = ownedRes.data || [];

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
    const { data, error: sharedErr } = await supabase
      .from('projects')
      .select('id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted, user_id')
      .in('id', sharedProjectIds);
    sharedProjects = data || [];

    // Fallback: If direct query returned fewer projects than shared memberships, call secure RPC
    if (sharedProjects.length < sharedProjectIds.length) {
      try {
        const { data: rpcData } = await supabase.rpc('get_shared_projects', {
          p_project_ids: sharedProjectIds,
        });
        if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
          sharedProjects = rpcData;
        }
      } catch (_) {}
    }
  }

  const allDbProjects = [...ownedProjects, ...sharedProjects];

  // Auto-sync any local projects that are not yet in Supabase (OWNED projects only)
  let localProjectsToSync: Project[] = [];
  if (get) {
    const currentProjects = get().projects;
    const dbProjectIds = new Set(allDbProjects.map((p: any) => p.id));
    localProjectsToSync = currentProjects.filter((p) => !p.isShared && p.id && !dbProjectIds.has(p.id));

    // Preserve local shared projects if they are in sharedProjectIds but DB direct fetch was blocked
    const validSharedIdSet = new Set(sharedProjectIds);
    const cachedSharedProjectsToKeep = currentProjects.filter(
      (p) => p.isShared && validSharedIdSet.has(p.id) && !dbProjectIds.has(p.id)
    );
    if (cachedSharedProjectsToKeep.length > 0) {
      localProjectsToSync.push(...cachedSharedProjectsToKeep);
    }

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
    if (hasMembershipsData && localProjectsToSync.length === 0) {
      // Server query completed online and authoritatively returned 0 projects, AND no local unsynced projects exist.
      await saveToLocalStorage(userId, []);
      set({ projects: [], isLoading: false });
      return;
    }

    if (localProjectsToSync.length > 0) {
      await saveToLocalStorage(userId, localProjectsToSync);
      set({ projects: localProjectsToSync, isLoading: false });
      return;
    }

    // Offline / Network fallback if database query failed
    let userLocal: Project[] = [];
    try {
      const raw = await safeStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          userLocal = parsed;
        }
      }
    } catch (_) {}

    if (userLocal.length > 0) {
      set({ projects: userLocal, isLoading: false });
      await saveToLocalStorage(userId, userLocal);
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
      ? supabase.from('profiles').select('id, name, username, email').in('id', ownerIds)
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
      .select('id, name, username, email')
      .in('id', memberUserIds);
    memberProfiles = profiles || [];
  }

  const activeUserDisplayName = await getCurrentUserName();

  const profileMap = new Map<string, string>();
  [...memberProfiles, ...ownerProfiles].forEach((p: any) => {
    if (p?.id) {
      const displayName = p.name?.trim() || p.username?.trim() || (p.email ? p.email.split('@')[0] : '');
      if (displayName) {
        profileMap.set(p.id, displayName);
      }
    }
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
      .map((m: any) => {
        const isSelf = userIdsToQuery.includes(m.user_id);
        const resolvedName = (isSelf ? activeUserDisplayName : profileMap.get(m.user_id)) || (isSelf ? 'You' : 'Member');
        return {
          id: m.id,
          userId: m.user_id,
          role: m.role as MemberRole,
          name: resolvedName,
          joinedAt: m.joined_at,
        };
      });

    const isShared = !userIdsToQuery.includes(row.user_id);
    const isPinned = pinnedSet.has(row.id.toString());

    const resolvedOwnerName = isShared
      ? (profileMap.get(row.user_id?.toString()) || 'Team Leader')
      : undefined;

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
      members: projectMembers,
      isShared,
      ownerName: resolvedOwnerName,
      joinCode: row.join_code || undefined,
    };
  });

  const finalProjects = [...formattedProjects, ...localProjectsToSync];

  const finalPinnedIds = finalProjects.filter((p) => p.isPinned).map((p) => p.id);
  await savePinnedIdsToLocalStorage(userId, finalPinnedIds);
  await saveToLocalStorage(userId, finalProjects);
  set({ projects: finalProjects, isLoading: false, isLoaded: true, isInitialLoading: false });
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  isLoaded: false,
  isInitialLoading: false,
  currentUserId: null,

  setCurrentUserId: (userId: string | null) => {
    set({ currentUserId: userId });
  },

  clearProjects: () => {
    set({ projects: [], isLoaded: false, isInitialLoading: false, currentUserId: null });
  },

  fetchProjects: async (opts?: { forceRefresh?: boolean }) => {
    try {
      // Consume the module-level force-refresh flag (set after join/leave)
      const shouldForce = opts?.forceRefresh || _forceNextRefresh;
      if (_forceNextRefresh) _forceNextRefresh = false;

      // If an identical background fetch is already in flight and not forcing refresh, await it
      if (inFlightFetchProjects && !shouldForce) {
        await inFlightFetchProjects;
        return;
      }

      const userId = await getActiveUserId();
      if (!userId) {
        set({ projects: [], isLoading: false, currentUserId: null });
        return;
      }
      set({ currentUserId: userId });

      const storageKey = getProjectStorageKey(userId);
      const pinnedIds = await getPinnedIdsFromLocalStorage(userId);
      const pinnedSet = new Set(pinnedIds);

      // Load local projects strictly for active user ID
      let userLocalProjects: Project[] = [];
      try {
        const raw = await safeStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            userLocalProjects = parsed;
          }
        }
      } catch (_) {}

      let hasLocal = false;
      if (userLocalProjects.length > 0) {
        const projectsWithPins = userLocalProjects.map((p: Project) => ({
          ...p,
          isPinned: pinnedSet.has(p.id) || p.isPinned || false,
        }));
        set({ projects: projectsWithPins, isLoading: false, isLoaded: true, isInitialLoading: false });
        hasLocal = true;
      } else {
        set({ projects: [], isLoading: true, isInitialLoading: true });
      }

      const executeFetch = async () => {
        try {
          await fetchProjectsBackground(userId, storageKey, set, get);
        } catch (_) {}
      };

      if (hasLocal && !shouldForce && get().projects.length > 0) {
        // Run background fetch with in-flight deduplication
        inFlightFetchProjects = executeFetch();
        try {
          await inFlightFetchProjects;
        } finally {
          inFlightFetchProjects = null;
        }
        return;
      }

      inFlightFetchProjects = executeFetch();
      try {
        await inFlightFetchProjects;
      } finally {
        inFlightFetchProjects = null;
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      set({ isLoading: false, isInitialLoading: false });
    }
  },

  addProject: async (data) => {
    const userId = await getActiveUserId();

    // Ensure creator profile is synced to Supabase so other users see the leader's real name
    try {
      const myName = await getCurrentUserName();
      if (userId && myName && myName !== 'Developer' && myName !== 'User') {
        await supabase.from('profiles').update({ name: myName }).eq('id', userId);
      }
    } catch (_) {}

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

  updateProject: async (projectId, updates) => {
    const userId = await getActiveUserId();
    const now = 'just now';

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates, lastUpdated: now } : p
      ),
    }));

    await saveToLocalStorage(userId, get().projects);

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.version !== undefined) dbUpdates.version = updates.version;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.techStack !== undefined) dbUpdates.tech_stack = updates.techStack;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.repoUrl !== undefined) dbUpdates.repo_url = updates.repoUrl;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      dbUpdates.last_updated = now;

      await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync updateProject to Supabase:', err);
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
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };
    if (project.isShared) {
      return { success: false, error: 'Only the project leader can mark this project as complete.' };
    }

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isCompleted: true, progress: 100 } : p
      ),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      await supabase
        .from('projects')
        .update({ is_completed: true, progress: 100 })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync markCompleted to Supabase:', err);
    }

    return { success: true };
  },

  unmarkCompleted: async (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };
    if (project.isShared) {
      return { success: false, error: 'Only the project leader can reactivate this project.' };
    }

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isCompleted: false } : p
      ),
    }));

    const userId = await getActiveUserId();
    await saveToLocalStorage(userId, get().projects);

    try {
      await supabase
        .from('projects')
        .update({ is_completed: false })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync unmarkCompleted to Supabase:', err);
    }

    return { success: true };
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

    // Pin state is managed locally (is_pinned column does not exist in DB)
  },

  getProject: (id) => get().projects.find((p) => p.id === id),


  leaveProject: async (projectId) => {
    try {
      _forceNextRefresh = true;
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
        .select('id, name, username, email')
        .in('id', userIds);

      const activeUserName = await getCurrentUserName();
      const activeUserId = await getActiveUserId();

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        if (p?.id) {
          const displayName = p.name?.trim() || p.username?.trim() || (p.email ? p.email.split('@')[0] : '');
          if (displayName) profileMap.set(p.id, displayName);
        }
      });

      return members.map((m: any) => {
        const isSelf = m.user_id === activeUserId;
        const resolvedName = (isSelf ? activeUserName : profileMap.get(m.user_id)) || (isSelf ? 'You' : 'Member');
        return {
          id: m.id,
          userId: m.user_id,
          role: m.role as MemberRole,
          name: resolvedName,
          joinedAt: m.joined_at,
        };
      });
    } catch (err) {
      console.error('Failed to fetch project members:', err);
      return [];
    }
  },

  removeMember: async (projectId: string, targetUserId: string) => {
    try {
      const targetProject = get().projects.find((p) => p.id === projectId);
      const projectName = targetProject?.name || 'Project';
      const activeUserId = await getActiveUserId();

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

      // 3. Notify member removal
      if (activeUserId === targetUserId) {
        void notificationService.sendImmediateNotification(
          '🚨 Removed from Project',
          `The project leader removed you from "${projectName}".`
        );
      } else {
        void notificationService.sendImmediateNotification(
          '👤 Member Removed',
          `Member was removed from project "${projectName}".`
        );
      }
    } catch (err) {
      console.error('Failed to remove member from project:', err);
    }
  },

  joinProjectByCode: async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !/^TRK-[A-Z0-9]{6}$/.test(cleanCode)) {
      return {
        success: false,
        error: 'Enter a valid Trak project code (e.g. TRK-XXXXXX).',
      };
    }

    try {
      const { data, error } = await supabase.rpc('join_project_by_code', {
        code: cleanCode,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to join project.',
        };
      }

      const result = data as {
        success: boolean;
        status?: 'joined' | 'already_member' | 'already_owner';
        project_id?: string;
        project_name?: string;
        error?: string;
        message?: string;
      };

      if (!result.success && result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Refresh projects in background without flashing skeletons
      void get().fetchProjects({ forceRefresh: true });

      return {
        success: true,
        projectId: result.project_id,
        status: result.status,
      };
    } catch (err: any) {
      console.error('Failed to join project by code:', err);
      return {
        success: false,
        error: err?.message || 'Unable to join project. Check your connection.',
      };
    }
  },

  regenerateJoinCode: async (projectId: string) => {
    try {
      const { data, error } = await supabase.rpc('regenerate_project_join_code', {
        p_project_id: projectId,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to regenerate join code.',
        };
      }

      const result = data as {
        success: boolean;
        join_code?: string;
        error?: string;
      };

      if (!result.success || !result.join_code) {
        return {
          success: false,
          error: result.error || 'Failed to regenerate join code.',
        };
      }

      const newCode = result.join_code;

      // Update in local Zustand store immediately
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, joinCode: newCode } : p
        ),
      }));

      const activeUserId = await getActiveUserId();
      if (activeUserId) {
        await saveToLocalStorage(activeUserId, get().projects);
      }

      return {
        success: true,
        newCode,
      };
    } catch (err: any) {
      console.error('Failed to regenerate join code:', err);
      return {
        success: false,
        error: err?.message || 'Unable to regenerate code.',
      };
    }
  },


  subscribeToRealtime: () => {
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (_) {}
      realtimeChannel = null;
    }

    const channel = supabase
      .channel('trak-collab')
      // 1. Projects Table Changes (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload: any) => {
          void get().fetchProjects({ forceRefresh: true });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload: any) => {
          const updatedRow = payload.new;
          if (updatedRow && updatedRow.id) {
            // Apply immediate optimistic state update directly into Zustand store
            set((state) => ({
              projects: state.projects.map((p) => {
                if (p.id !== updatedRow.id) return p;
                return {
                  ...p,
                  name: updatedRow.name ?? p.name,
                  version: updatedRow.version ?? p.version,
                  description: updatedRow.description ?? p.description,
                  status: updatedRow.status ?? p.status,
                  techStack: updatedRow.tech_stack ?? p.techStack,
                  deadline: updatedRow.deadline ?? p.deadline,
                  progress: updatedRow.progress ?? p.progress,
                  repoUrl: updatedRow.repo_url ?? p.repoUrl,
                  priority: updatedRow.priority ?? p.priority,
                  lastUpdated: updatedRow.last_updated ?? p.lastUpdated,
                  notes: updatedRow.notes ?? p.notes,
                  isCompleted: updatedRow.is_completed ?? p.isCompleted,
                  isDeleted: updatedRow.is_deleted ?? p.isDeleted,
                  joinCode: updatedRow.join_code ?? p.joinCode,
                };
              }),
            }));
          }
          // Reconcile complete relations in background
          void get().fetchProjects({ forceRefresh: true });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            // Instantly remove from Zustand store so UI drops card immediately
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== deletedId),
            }));
            void getActiveUserId().then((userId) => {
              void saveToLocalStorage(userId, get().projects);
            });
          }
        }
      )
      // 2. Milestones Changes (* for task completion, new tasks, renames)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones' },
        (payload: any) => {
          void get().fetchProjects({ forceRefresh: true });
        }
      )
      // 3. Project Members Changes (New Collaborator Joined)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_members' },
        async (payload: any) => {
          void get().fetchProjects({ forceRefresh: true });
          try {
            const activeUserId = await getActiveUserId();
            if (payload.new && payload.new.user_id !== activeUserId) {
              void notificationService.sendImmediateNotification(
                '👥 New Member Joined',
                'A new team member has joined your project.'
              );
            }
          } catch (_) {}
        }
      )
      // 4. Project Members Changes (Collaborator Left / Removed)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'project_members' },
        async (payload: any) => {
          try {
            const activeUserId = await getActiveUserId();
            if (payload.old && payload.old.user_id === activeUserId) {
              // Current user was removed from a project — immediately purge it from UI
              const removedProjectId = payload.old.project_id;
              set((state) => ({
                projects: state.projects.filter((p) => p.id !== removedProjectId),
              }));

              // Clean shared IDs cache
              const currentSharedIds = await getSharedIdsFromLocalStorage(activeUserId);
              const updatedSharedIds = currentSharedIds.filter((id) => id !== removedProjectId);
              await saveSharedIdsToLocalStorage(activeUserId, updatedSharedIds);
              await saveToLocalStorage(activeUserId, get().projects);

              void notificationService.sendImmediateNotification(
                '⚠️ Removed from Project',
                'The project leader has removed you from the project.'
              );
            }
          } catch (_) {}

          // Refetch to reconcile state with the server for all users
          void get().fetchProjects({ forceRefresh: true });
        }
      )
      // 5. Profiles Changes (Collaborator updated their name/avatar)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          void get().fetchProjects({ forceRefresh: true });
        }
      )
      .subscribe((status: string, err?: any) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Subscription error:', err?.message || err || 'CHANNEL_ERROR');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Subscription timed out, re-initiating...');
          setTimeout(() => {
            get().subscribeToRealtime();
          }, 2000);
        }
      });

    realtimeChannel = channel;
  },

  unsubscribeFromRealtime: () => {
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (_) {}
      realtimeChannel = null;
    }
  },
}));
