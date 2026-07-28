import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../lib/storage';

export type ProjectStatus = 'active' | 'blocked' | 'idle' | 'warning';
export type Priority = 'low' | 'medium' | 'high';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
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
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
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
}

const STORAGE_KEY = 'trak_local_projects';

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
  {
    id: '4',
    name: 'Data Pipeline',
    version: 'v2.0-beta',
    description: 'Distributed data ingestion and transformation pipeline',
    status: 'active',
    techStack: ['Python', 'Kafka', 'S3'],
    deadline: 'DEC 12',
    progress: 25,
    repoUrl: 'github.com/trak-io/data-pipeline',
    priority: 'low',
    lastUpdated: '2d ago',
    milestones: [
      { id: 'm1', title: 'Kafka setup', completed: true },
      { id: 'm2', title: 'S3 sink', completed: false },
      { id: 'm3', title: 'Monitoring', completed: false },
    ],
    notes: '### Context\nEarly beta. Schema validation layer in progress.',
  },
  {
    id: '5',
    name: 'Legacy API v1',
    version: 'v1.0.0',
    description: 'Original REST API — fully migrated to v2',
    status: 'idle',
    techStack: ['Node.js', 'Express', 'MySQL'],
    deadline: 'DONE',
    progress: 100,
    repoUrl: 'github.com/trak-io/api-v1',
    priority: 'low',
    lastUpdated: '3mo ago',
    milestones: [
      { id: 'm1', title: 'Initial release', completed: true },
      { id: 'm2', title: 'v2 migration', completed: true },
      { id: 'm3', title: 'Deprecation notice', completed: true },
    ],
    notes: '### Context\nFully deprecated. Replaced by Auth Service v2.',
    isCompleted: true,
  },
];

const saveToLocalStorage = async (projects: Project[]) => {
  try {
    await safeStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    // Silently handle fallback
  }
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const { data: dbProjects, error: pError } = await supabase
        .from('projects')
        .select('*');

      if (!pError && dbProjects && dbProjects.length > 0) {
        const { data: dbMilestones } = await supabase
          .from('milestones')
          .select('*');

        const formattedProjects: Project[] = dbProjects.map((row: any) => {
          const projectMilestones = (dbMilestones || [])
            .filter((m: any) => m.project_id === row.id)
            .map((m: any) => ({
              id: m.id,
              title: m.title,
              completed: m.completed ?? false,
            }));

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
          };
        });

        await saveToLocalStorage(formattedProjects);
        set({ projects: formattedProjects, isLoading: false });
        return;
      }

      // Supabase is empty or unavailable; attempt loading from local storage
      const localData = await safeStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          set({ projects: parsed, isLoading: false });
          return;
        }
      }

      // On first launch with no local or remote projects, default to empty list
      set({ projects: [], isLoading: false });
    } catch (err) {
      try {
        const localData = await safeStorage.getItem(STORAGE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            set({ projects: parsed, isLoading: false });
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      set({ projects: [], isLoading: false });
    }
  },

  addProject: async (data) => {
    const newProject: Project = {
      ...data,
      id: Date.now().toString(),
      progress: 0,
      lastUpdated: 'just now',
      milestones: [],
      notes: '',
    };

    set((state) => ({ projects: [newProject, ...state.projects] }));
    await saveToLocalStorage(get().projects);

    try {
      await supabase.from('projects').insert({
        id: newProject.id,
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
      });
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
    await saveToLocalStorage(get().projects);

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
    await saveToLocalStorage(get().projects);

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
    await saveToLocalStorage(get().projects);

    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch (err) {
      console.error('Failed to sync permanentlyDeleteProject to Supabase:', err);
    }
  },

  toggleMilestone: async (projectId, milestoneId) => {
    let updatedCompleted = false;
    let updatedProgress = 0;

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = p.milestones.map((m) => {
          if (m.id === milestoneId) {
            updatedCompleted = !m.completed;
            return { ...m, completed: !m.completed };
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
        .update({ completed: updatedCompleted })
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

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedMilestones = [
          ...p.milestones,
          { id: newMilestoneId, title: title.trim(), completed: false },
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
}));

// Automatically attempt to fetch projects from Supabase on app startup
useProjectStore.getState().fetchProjects();
