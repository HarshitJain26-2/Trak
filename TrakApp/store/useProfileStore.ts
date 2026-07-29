import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  isLoading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  addSkill: (skill: string) => Promise<void>;
  removeSkill: (skill: string) => Promise<void>;
  addLink: (link: Omit<SocialLink, 'id'>) => Promise<void>;
  updateLink: (id: string, updates: Partial<Omit<SocialLink, 'id'>>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  username: '',
  bio: '',
  role: '',
  location: '',
  avatarUrl: '',
  githubUrl: '',
  company: '',
  skills: [],
  socialLinks: [],
  joinedDate: '',
};

/** Get the authenticated user's ID, or null if not logged in */
const getAuthUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const userId = await getAuthUserId();
      if (!userId) {
        console.log('No authenticated user; using default profile.');
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.log('Supabase profile unavailable or empty, using fallback state.');
        set({ isLoading: false });
        return;
      }

      set({
        profile: {
          name: data.name || DEFAULT_PROFILE.name,
          username: data.username || DEFAULT_PROFILE.username,
          bio: data.bio || DEFAULT_PROFILE.bio,
          role: data.role || DEFAULT_PROFILE.role,
          location: data.location || DEFAULT_PROFILE.location,
          avatarUrl: data.avatar_url || '',
          githubUrl: data.github_url || DEFAULT_PROFILE.githubUrl,
          company: data.company || '',
          skills: data.skills || DEFAULT_PROFILE.skills,
          socialLinks: (data.social_links as SocialLink[]) || DEFAULT_PROFILE.socialLinks,
          joinedDate: data.joined_date || DEFAULT_PROFILE.joinedDate,
        },
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching profile from Supabase:', err);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    set((state) => ({ profile: { ...state.profile, ...updates } }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const current = get().profile;
      await supabase.from('profiles').upsert({
        id: userId,
        name: current.name,
        username: current.username,
        bio: current.bio,
        role: current.role,
        location: current.location,
        avatar_url: current.avatarUrl,
        github_url: current.githubUrl,
        company: current.company,
        skills: current.skills,
        social_links: current.socialLinks,
        joined_date: current.joinedDate,
      });
    } catch (err) {
      console.error('Failed to sync updateProfile to Supabase:', err);
    }
  },

  addSkill: async (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;

    set((state) => ({
      profile: {
        ...state.profile,
        skills: state.profile.skills.includes(trimmed)
          ? state.profile.skills
          : [...state.profile.skills, trimmed],
      },
    }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const updatedSkills = get().profile.skills;
      await supabase
        .from('profiles')
        .update({ skills: updatedSkills })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to sync addSkill to Supabase:', err);
    }
  },

  removeSkill: async (skill) => {
    set((state) => ({
      profile: {
        ...state.profile,
        skills: state.profile.skills.filter((s) => s !== skill),
      },
    }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const updatedSkills = get().profile.skills;
      await supabase
        .from('profiles')
        .update({ skills: updatedSkills })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to sync removeSkill to Supabase:', err);
    }
  },

  addLink: async (link) => {
    const newLink: SocialLink = { ...link, id: `link_${Date.now()}` };

    set((state) => ({
      profile: {
        ...state.profile,
        socialLinks: [...state.profile.socialLinks, newLink],
      },
    }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const updatedLinks = get().profile.socialLinks;
      await supabase
        .from('profiles')
        .update({ social_links: updatedLinks })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to sync addLink to Supabase:', err);
    }
  },

  updateLink: async (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        socialLinks: state.profile.socialLinks.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const updatedLinks = get().profile.socialLinks;
      await supabase
        .from('profiles')
        .update({ social_links: updatedLinks })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to sync updateLink to Supabase:', err);
    }
  },

  removeLink: async (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        socialLinks: state.profile.socialLinks.filter((l) => l.id !== id),
      },
    }));

    try {
      const userId = await getAuthUserId();
      if (!userId) return;

      const updatedLinks = get().profile.socialLinks;
      await supabase
        .from('profiles')
        .update({ social_links: updatedLinks })
        .eq('id', userId);
    } catch (err) {
      console.error('Failed to sync removeLink to Supabase:', err);
    }
  },
}));

