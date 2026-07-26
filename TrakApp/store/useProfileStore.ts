import { create } from 'zustand';

export interface SocialLink {
  id: string;
  platform: 'github' | 'twitter' | 'linkedin' | 'website' | 'email';
  url: string;
  label: string;
}

export interface Profile {
  name: string;
  username: string;
  bio: string;
  role: string;
  location: string;
  avatarUrl: string;
  githubUrl: string;
  company: string;
  skills: string[];
  socialLinks: SocialLink[];
  joinedDate: string;
}

interface ProfileStore {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
}

const DEFAULT_PROFILE: Profile = {
  name: 'Harshit Jain',
  username: 'HarshitJain26-2',
  bio: 'Full-stack developer building tools for developers. Obsessed with great DX and clean architecture.',
  role: 'Software Engineer',
  location: 'India',
  avatarUrl: '',
  githubUrl: 'github.com/HarshitJain26-2',
  company: '',
  skills: ['React Native', 'TypeScript', 'Node.js', 'Expo', 'Zustand'],
  socialLinks: [
    { id: 'gh', platform: 'github', url: 'github.com/HarshitJain26-2', label: 'GitHub' },
    { id: 'em', platform: 'email', url: 'harshit@example.com', label: 'Email' },
  ],
  joinedDate: 'JUL 2024',
};

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: DEFAULT_PROFILE,

  updateProfile: (updates) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),

  addSkill: (skill) =>
    set((state) => ({
      profile: {
        ...state.profile,
        skills: state.profile.skills.includes(skill.trim())
          ? state.profile.skills
          : [...state.profile.skills, skill.trim()],
      },
    })),

  removeSkill: (skill) =>
    set((state) => ({
      profile: {
        ...state.profile,
        skills: state.profile.skills.filter((s) => s !== skill),
      },
    })),
}));
