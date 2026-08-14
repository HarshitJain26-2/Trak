import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { safeStorage } from '@/services/storage';
import { getActiveUserId } from '@/utils/deviceUser';

export interface SocialLink {
  id: string;
  platform: 'github' | 'twitter' | 'linkedin' | 'website' | 'email';
  url: string;
  label: string;
}

export interface Profile {
  name: string;
  username: string;
  email: string;
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
  fetchProfile: (forceRefresh?: boolean) => Promise<void>;
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
  email: '',
  bio: '',
  role: '',
  location: '',
  avatarUrl: '',
  githubUrl: '',
  company: '',
  skills: [],
  socialLinks: [],
  joinedDate: new Date().toISOString(),
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

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoading: false,

  clearProfile: () => {
    set({ profile: DEFAULT_PROFILE, isLoading: false });
  },

  fetchProfile: async (forceRefresh?: boolean) => {
    try {
      const userId = await getActiveUserId();
      const storageKey = getProfileStorageKey(userId);

      // Attempt loading from local storage for active user ID
      const localData = await safeStorage.getItem(storageKey);
      let hasLocal = false;
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && typeof parsed === 'object' && parsed.email) {
            set({ profile: { ...DEFAULT_PROFILE, ...parsed }, isLoading: false });
            hasLocal = true;
          }
        } catch {
          // Fallback
        }
      }

      if (!hasLocal) {
        set({ isLoading: true });
      }

      // Fetch profile from Supabase for this user ID
      let profileData: any = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, username, email, bio, role, location, avatar_url, github_url, company, skills, social_links, created_at')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          // Fallback to basic columns if extended columns do not exist yet
          const { data: baseData } = await supabase
            .from('profiles')
            .select('id, name, username, email, bio, role, avatar_url, created_at')
            .eq('id', userId)
            .maybeSingle();
          profileData = baseData;
        } else {
          profileData = data;
        }
      } catch (_) {
        const { data: baseData } = await supabase
          .from('profiles')
          .select('id, name, username, email, bio, role, avatar_url, created_at')
          .eq('id', userId)
          .maybeSingle();
        profileData = baseData;
      }

      const data = profileData;

      if (data) {
        const updatedProfile: Profile = {
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
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
        // No profile in DB yet — check Supabase auth user
        let authEmail = '';
        let authName = '';
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            authEmail = user.email || '';
            authName = user.user_metadata?.full_name || user.user_metadata?.name || (authEmail ? authEmail.split('@')[0] : '');
          }
        } catch {}

        let baseUsername = authEmail ? authEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
        if (!baseUsername) {
          baseUsername = `dev_${userId.slice(0, 6)}`;
        }

        const initialProf: Profile = {
          ...DEFAULT_PROFILE,
          name: authName || '',
          username: baseUsername,
          email: authEmail,
        };

        set({ profile: initialProf, isLoading: false });
        await saveProfileToLocalStorage(userId, initialProf);

        if (userId) {
          void Promise.resolve(
            supabase.from('profiles').upsert(
              {
                id: userId,
                name: initialProf.name,
                username: initialProf.username,
                email: initialProf.email || null,
                bio: initialProf.bio || '',
                role: initialProf.role || '',
              },
              { onConflict: 'id' }
            )
          ).catch((e) => {
            console.warn('[useProfileStore] Profile auto-upsert notice:', e?.message);
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      set({ isLoading: false });
    }
  },

  checkUsernameAvailable: async (username: string): Promise<boolean> => {
    const clean = username.trim().toLowerCase();
    // Enforce minimum length and valid format before querying
    if (!clean || clean.length < 3) return false;
    if (!/^[a-z0-9_.-]+$/.test(clean)) return false;

    try {
      const userId = await getActiveUserId();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', userId)
        .maybeSingle();

      if (error) {
        // Fail safe: if we can't verify availability, treat as taken
        console.warn('Username check error:', error.message);
        return false;
      }

      return !data; // true = no conflict found = available
    } catch {
      // Network error etc. — fail safe
      return false;
    }
  },

  updateProfile: async (updates) => {
    try {
      const current = get().profile;
      const newProfile = { ...current, ...updates };

      if (updates.username !== undefined && updates.username.trim() !== '') {
        const cleanUsername = updates.username.trim().toLowerCase();
        newProfile.username = cleanUsername;

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

      const userId = await getActiveUserId();
      await saveProfileToLocalStorage(userId, newProfile);

      try {
        // 1. Always sync core profile columns first (guaranteed to exist in table)
        const coreProfileData = {
          id: userId,
          name: newProfile.name,
          username: newProfile.username || null,
          email: newProfile.email || null,
          bio: newProfile.bio || '',
          role: newProfile.role || '',
          avatar_url: newProfile.avatarUrl || '',
        };

        const { error: coreErr } = await supabase
          .from('profiles')
          .upsert(coreProfileData, { onConflict: 'id' });

        if (coreErr) {
          // If upsert failed due to unique constraint on username/email
          if (coreErr.code === '23505') {
            if (coreErr.message?.includes('username')) {
              set({ profile: current });
              return { success: false, error: `Username "${newProfile.username}" is already taken.` };
            }
            if (coreErr.message?.includes('email')) {
              set({ profile: current });
              return { success: false, error: 'An account with this email already exists.' };
            }
          }
          console.warn('Supabase core profile sync notice:', coreErr.message || coreErr);
        }

        // 2. Try syncing extended profile columns if they exist
        try {
          await supabase
            .from('profiles')
            .update({
              location: newProfile.location || '',
              github_url: newProfile.githubUrl || '',
              company: newProfile.company || '',
              skills: newProfile.skills || [],
              social_links: newProfile.socialLinks || [],
            })
            .eq('id', userId);
        } catch (_) {}
      } catch (err: any) {
        console.warn('Supabase profile sync warning:', err?.message || err);
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
      const userId = await getActiveUserId();
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
      const userId = await getActiveUserId();
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
      const userId = await getActiveUserId();
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
      const userId = await getActiveUserId();
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
      const userId = await getActiveUserId();
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
