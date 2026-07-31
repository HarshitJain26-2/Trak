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
  clearProfile: () => void;
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

const getProfileStorageKey = (userId: string) => `trak_local_profile_${userId}`;

const saveProfileToLocalStorage = async (userId: string, profile: Profile) => {
  try {
    if (!userId) return;
    await safeStorage.setItem(getProfileStorageKey(userId), JSON.stringify(profile));
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

  clearProfile: () => {
    set({ profile: DEFAULT_PROFILE, isLoading: false });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const userId = await getAuthUserId();
      if (!userId) {
        set({ profile: DEFAULT_PROFILE, isLoading: false });
        return;
      }

      const storageKey = getProfileStorageKey(userId);

      // First attempt loading from local storage
      const localData = await safeStorage.getItem(storageKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && typeof parsed === 'object') {
          set({ profile: { ...DEFAULT_PROFILE, ...parsed }, isLoading: false });
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const updatedProfile: Profile = {
          name: data.name || '',
          username: data.username || '',
          bio: data.bio || '',
          role: data.role || '',
          location: data.location || '',
          avatarUrl: data.avatar_url || '',
          githubUrl: data.github_url || '',
          company: data.company || '',
          skills: data.skills || [],
          socialLinks: (data.social_links as SocialLink[]) || [],
          joinedDate: data.created_at || new Date().toISOString(),
        };
        set({ profile: updatedProfile, isLoading: false });
        await saveProfileToLocalStorage(userId, updatedProfile);
      } else {
        set({ isLoading: false });
      }
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

      // Optimistic update
      set({ profile: newProfile });

      const userId = await getAuthUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };
      
      await saveProfileToLocalStorage(userId, newProfile);

      try {
        await supabase.from('profiles').upsert({
          id: userId,
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
      await saveProfileToLocalStorage(userId, get().profile);

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
      await saveProfileToLocalStorage(userId, get().profile);

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
      await saveProfileToLocalStorage(userId, get().profile);

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
      await saveProfileToLocalStorage(userId, get().profile);

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
      await saveProfileToLocalStorage(userId, get().profile);

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

