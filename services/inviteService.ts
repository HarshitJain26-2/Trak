import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from './supabase';
import { safeStorage } from './storage';

const PENDING_INVITE_KEY = 'trak_pending_invite_token';

export interface ProjectInvite {
  id: string;
  projectId: string;
  createdBy: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  isActive: boolean;
  createdAt: string;
  rawToken?: string;
  inviteUrl?: string;
}

export interface InviteValidationResult {
  valid: boolean;
  status: 'VALID' | 'ALREADY_OWNER' | 'ALREADY_MEMBER' | 'EXPIRED' | 'REVOKED' | 'MAX_USES_REACHED' | 'INVALID' | 'PROJECT_NOT_FOUND';
  projectId: string | null;
  projectName: string | null;
  projectDescription: string | null;
  ownerName: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number | null;
}

export interface JoinInviteResult {
  success: boolean;
  status: 'JOINED' | 'ALREADY_OWNER' | 'ALREADY_MEMBER' | 'EXPIRED' | 'REVOKED' | 'MAX_USES_REACHED' | 'INVALID' | 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'ERROR';
  projectId: string | null;
  projectName: string | null;
  error?: string;
}

/**
 * Generate a cryptographically secure random token (32 bytes = 256 bits of entropy).
 * Formatted as a URL-safe base64 / hex string.
 */
export async function generateSecureToken(): Promise<string> {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    // Convert Uint8Array to URL-safe base64
    let binary = '';
    for (let i = 0; i < randomBytes.length; i++) {
      binary += String.fromCharCode(randomBytes[i]);
    }
    const base64 = (typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64'))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64;
  } catch (err) {
    // Fallback using UUID + random bytes
    const uuid1 = Crypto.randomUUID().replace(/-/g, '');
    const uuid2 = Crypto.randomUUID().replace(/-/g, '');
    return `${uuid1}${uuid2}`;
  }
}

/**
 * Compute SHA-256 hash of the invite token for secure storage & lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const cleanToken = token.trim();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    cleanToken,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest.toLowerCase();
}

/**
 * Construct the shareable HTTPS invite URL and deep-link scheme.
 */
export function buildInviteUrls(token: string): { httpsUrl: string; deepLinkUrl: string } {
  let origin = 'https://trak.app';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    origin = window.location.origin;
  }

  const httpsUrl = `${origin}/invite/${encodeURIComponent(token)}`;
  const deepLinkUrl = Linking.createURL(`invite/${encodeURIComponent(token)}`);

  return { httpsUrl, deepLinkUrl };
}

/**
 * Pending Invite Token Management for Seamless Authentication Redirects.
 */
export async function setPendingInviteToken(token: string): Promise<void> {
  try {
    await safeStorage.setItem(PENDING_INVITE_KEY, token.trim());
  } catch {}
}

export async function getPendingInviteToken(): Promise<string | null> {
  try {
    const token = await safeStorage.getItem(PENDING_INVITE_KEY);
    return token ? token.trim() : null;
  } catch {
    return null;
  }
}

export async function clearPendingInviteToken(): Promise<void> {
  try {
    await safeStorage.removeItem(PENDING_INVITE_KEY);
  } catch {}
}

/**
 * Invite Service API
 */
export const inviteService = {
  generateSecureToken,
  hashToken,
  buildInviteUrls,
  setPendingInviteToken,
  getPendingInviteToken,
  clearPendingInviteToken,

  /**
   * Create or regenerate an active project invite link.
   */
  createInvite: async (
    projectId: string,
    options: {
      expiresInHours?: number | null; // e.g. 1, 24, 168 (7d), 720 (30d), or null for never
      expiresAt?: string | null;      // ISO UTC timestamp string for custom expiration
      maxUses?: number | null;        // e.g. 1, 5, 10, or null for unlimited
    } = {}
  ): Promise<{ invite: ProjectInvite | null; rawToken: string | null; error?: string }> => {
    try {
      const rawToken = await generateSecureToken();
      const tokenHash = await hashToken(rawToken);

      let expiresAt: string | null = options.expiresAt || null;
      if (!expiresAt && options.expiresInHours && options.expiresInHours > 0) {
        const d = new Date();
        d.setTime(d.getTime() + options.expiresInHours * 60 * 60 * 1000);
        expiresAt = d.toISOString();
      }

      const { data, error } = await supabase.rpc('create_project_invite', {
        p_project_id: projectId,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
        p_max_uses: options.maxUses ?? null,
      });

      if (error) {
        return { invite: null, rawToken: null, error: error.message || 'Failed to create invite' };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return { invite: null, rawToken: null, error: 'No invite data returned' };
      }

      const { httpsUrl } = buildInviteUrls(rawToken);

      const invite: ProjectInvite = {
        id: row.id,
        projectId: row.project_id,
        createdBy: row.created_by,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        uses: row.uses,
        isActive: row.is_active,
        createdAt: row.created_at,
        rawToken,
        inviteUrl: httpsUrl,
      };

      return { invite, rawToken };
    } catch (err: any) {
      return { invite: null, rawToken: null, error: err?.message || 'Error creating invite' };
    }
  },

  /**
   * Update existing active invite settings without changing the URL or raw token.
   */
  updateInviteSettings: async (
    projectId: string,
    inviteId: string,
    options: {
      expiresAt?: string | null;
      maxUses?: number | null;
    }
  ): Promise<{ invite: ProjectInvite | null; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('update_project_invite_settings', {
        p_project_id: projectId,
        p_invite_id: inviteId,
        p_expires_at: options.expiresAt ?? null,
        p_max_uses: options.maxUses ?? null,
      });

      if (error) {
        return { invite: null, error: error.message || 'Failed to update invite settings' };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return { invite: null, error: 'No updated invite returned' };
      }

      const invite: ProjectInvite = {
        id: row.id,
        projectId: row.project_id,
        createdBy: row.created_by,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        uses: row.uses,
        isActive: row.is_active,
        createdAt: row.created_at,
      };

      return { invite };
    } catch (err: any) {
      return { invite: null, error: err?.message || 'Error updating invite settings' };
    }
  },

  /**
   * Revoke an invite link (sets is_active = false).
   */
  revokeInvite: async (projectId: string, inviteId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.rpc('revoke_project_invite', {
        p_project_id: projectId,
        p_invite_id: inviteId ?? null,
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to revoke invite' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error revoking invite' };
    }
  },

  /**
   * Fetch the current active invite for a project (owner only).
   */
  getActiveInvite: async (projectId: string): Promise<ProjectInvite | null> => {
    try {
      const { data, error } = await supabase.rpc('get_project_active_invite', {
        p_project_id: projectId,
      });

      if (error || !data) return null;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.id) return null;

      return {
        id: row.id,
        projectId: row.project_id,
        createdBy: row.created_by,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        uses: row.uses,
        isActive: row.is_active,
        createdAt: row.created_at,
      };
    } catch {
      return null;
    }
  },

  /**
   * Validate an invite token (works for authenticated and anonymous callers).
   */
  validateInvite: async (token: string): Promise<InviteValidationResult> => {
    try {
      if (!token || !token.trim()) {
        return {
          valid: false,
          status: 'INVALID',
          projectId: null,
          projectName: null,
          projectDescription: null,
          ownerName: null,
          expiresAt: null,
          maxUses: null,
          uses: null,
        };
      }

      const tokenHash = await hashToken(token);
      const { data, error } = await supabase.rpc('validate_project_invite', {
        p_token_hash: tokenHash,
      });

      if (error || !data) {
        return {
          valid: false,
          status: 'INVALID',
          projectId: null,
          projectName: null,
          projectDescription: null,
          ownerName: null,
          expiresAt: null,
          maxUses: null,
          uses: null,
        };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return {
          valid: false,
          status: 'INVALID',
          projectId: null,
          projectName: null,
          projectDescription: null,
          ownerName: null,
          expiresAt: null,
          maxUses: null,
          uses: null,
        };
      }

      return {
        valid: !!row.valid,
        status: (row.status || 'INVALID') as InviteValidationResult['status'],
        projectId: row.project_id || null,
        projectName: row.project_name || null,
        projectDescription: row.project_description || null,
        ownerName: row.owner_name || null,
        expiresAt: row.expires_at || null,
        maxUses: row.max_uses ?? null,
        uses: row.uses ?? null,
      };
    } catch {
      return {
        valid: false,
        status: 'INVALID',
        projectId: null,
        projectName: null,
        projectDescription: null,
        ownerName: null,
        expiresAt: null,
        maxUses: null,
        uses: null,
      };
    }
  },

  /**
   * Atomic join project with an invite token.
   */
  joinProjectWithInvite: async (token: string, userId?: string): Promise<JoinInviteResult> => {
    try {
      if (!token || !token.trim()) {
        return {
          success: false,
          status: 'INVALID',
          projectId: null,
          projectName: null,
          error: 'Please provide a valid invite token',
        };
      }

      const tokenHash = await hashToken(token);
      const { data, error } = await supabase.rpc('join_project_with_invite', {
        p_token_hash: tokenHash,
        p_user_id: userId ?? null,
      });

      if (error) {
        return {
          success: false,
          status: 'ERROR',
          projectId: null,
          projectName: null,
          error: error.message || 'Unable to join project',
        };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return {
          success: false,
          status: 'ERROR',
          projectId: null,
          projectName: null,
          error: 'No join response received',
        };
      }

      return {
        success: !!row.success,
        status: (row.status || (row.success ? 'JOINED' : 'ERROR')) as JoinInviteResult['status'],
        projectId: row.project_id || null,
        projectName: row.project_name || null,
        error: row.error || undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'ERROR',
        projectId: null,
        projectName: null,
        error: err?.message || 'Failed to execute join operation',
      };
    }
  },

  /**
   * Native Share Helper
   */
  shareInviteLink: async (params: {
    url: string;
    projectName: string;
    ownerName?: string;
  }): Promise<{ shared: boolean; method: 'native' | 'web' | 'clipboard' }> => {
    const title = `Join ${params.projectName} on Trak`;
    const apkUrl = 'https://expo.dev/artifacts/eas/C9uJa4BuYlJFgAzauw9eLb2Iyc4iCHk_6F3ext-9C04.apk';
    const message = `You've been invited to collaborate on "${params.projectName}" on Trak!\n\n🔗 Open Invite: ${params.url}\n📲 Download Android App (APK): ${apkUrl}`;

    // 1. Native Mobile (iOS / Android)
    if (Platform.OS !== 'web') {
      try {
        const result = await Share.share(
          {
            title,
            message,
            url: params.url,
          },
          {
            dialogTitle: `Share ${params.projectName}`,
          }
        );
        if (result.action === Share.sharedAction) {
          return { shared: true, method: 'native' };
        }
        return { shared: false, method: 'native' };
      } catch {
        await Clipboard.setStringAsync(params.url);
        return { shared: true, method: 'clipboard' };
      }
    }

    // 2. Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
          url: params.url,
        });
        return { shared: true, method: 'web' };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { shared: false, method: 'web' };
        }
      }
    }

    // 3. Fallback: Copy to Clipboard
    try {
      await Clipboard.setStringAsync(params.url);
      return { shared: true, method: 'clipboard' };
    } catch {
      return { shared: false, method: 'clipboard' };
    }
  },
};
