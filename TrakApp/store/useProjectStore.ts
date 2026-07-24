import { create } from 'zustand';

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
}

interface ProjectStore {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'milestones' | 'notes' | 'lastUpdated' | 'progress'>) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  getProject: (id: string) => Project | undefined;
}

const MOCK_PROJECTS: Project[] = [
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
];

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: MOCK_PROJECTS,

  addProject: (data) => {
    const newProject: Project = {
      ...data,
      id: Date.now().toString(),
      progress: 0,
      lastUpdated: 'just now',
      milestones: [],
      notes: '',
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
  },

  toggleMilestone: (projectId, milestoneId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) =>
                m.id === milestoneId ? { ...m, completed: !m.completed } : m
              ),
            }
          : p
      ),
    }));
  },

  getProject: (id) => get().projects.find((p) => p.id === id),
}));
