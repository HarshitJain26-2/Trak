import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../lib/storage';

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
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
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

const PROFILE_STORAGE_KEY = 'trak_local_profile';

const saveProfileToLocalStorage = async (profile: Profile) => {
  try {
    await safeStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    // Silently handle fallback
  }
};

/** Get the authenticated user's ID, or null if not logged in */
const getAuthUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      // First attempt loading from local storage
      const localData = await safeStorage.getItem(PROFILE_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && typeof parsed === 'object') {
          set({ profile: { ...DEFAULT_PROFILE, ...parsed }, isLoading: false });
        }
      }

      const userId = await getAuthUserId();
      const profileId = userId || 'default_profile';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (!error && data) {
        const remoteProfile: Profile = {
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
        };
        await saveProfileToLocalStorage(remoteProfile);
        set({ profile: remoteProfile, isLoading: false });
        return;
      }
      set({ isLoading: false });
    } catch (err) {
      console.error('Error fetching profile:', err);
      set({ isLoading: false });
    }
  },

  checkUsernameAvailable: async (username: string): Promise<boolean> => {
    const clean = username.trim().toLowerCase();
    if (!clean) return true;

    try {
      const userId = await getAuthUserId();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', userId || 'default_profile')
        .maybeSingle();

      if (error) {
        return true;
      }

      return !data;
    } catch {
      return true;
    }
  },

  updateProfile: async (updates) => {
    try {
      const current = get().profile;
      const newProfile = { ...current, ...updates };

      if (updates.username !== undefined && updates.username.trim() !== '') {
        const cleanUsername = updates.username.trim().toLowerCase();
        newProfile.username = cleanUsername;

        // Check if username is already taken by another user
        const isAvailable = await get().checkUsernameAvailable(cleanUsername);
        if (!isAvailable) {
          return {
            success: false,
            error: `Username "${cleanUsername}" is already taken.`,
          };
        }
      }

      // Update state and save to local storage immediately
      set({ profile: newProfile });
      await saveProfileToLocalStorage(newProfile);

      const userId = await getAuthUserId();
      const profileId = userId || 'default_profile';

      try {
        await supabase.from('profiles').upsert({
          id: profileId,
          name: newProfile.name,
          username: newProfile.username || null,
          bio: newProfile.bio,
          role: newProfile.role,
          location: newProfile.location,
          avatar_url: newProfile.avatarUrl,
          github_url: newProfile.githubUrl,
          company: newProfile.company,
          skills: newProfile.skills,
          social_links: newProfile.socialLinks,
          joined_date: newProfile.joinedDate,
        });
      } catch (err) {
        console.error('Supabase profile sync warning:', err);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to updateProfile:', err);
      return { success: false, error: err?.message || 'Failed to update profile' };
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

