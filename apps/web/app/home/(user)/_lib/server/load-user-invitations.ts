import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export type UserInvitation = {
  id: number;
  email: string;
  account_id: string;
  account_name: string;
  account_slug: string;
  account_picture_url: string | null;
  invited_by: string;
  invited_by_name: string;
  role: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
};

/**
 * @name loadUserInvitations
 * @description
 * Load pending invitations for the current user. It's a cached per-request function.
 */
export const loadUserInvitations = cache(async (): Promise<UserInvitation[]> => {
  const client = getSupabaseServerClient();
  
  // Get current user's email from auth
  const { data: { user } } = await client.auth.getUser();
  
  if (!user?.email) {
    return [];
  }
  
  console.log('🔍 Loading invitations for user:', user.email);
  
  const { data, error } = await client
    .from('invitations')
    .select(`
      id,
      email,
      account_id,
      role,
      invite_token,
      created_at,
      expires_at,
      invited_by,
      accounts(name, slug, picture_url)
    `)
    .eq('email', user.email)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  console.log('📊 Invitation query result:', { 
    data: data ? data.length : 0, 
    error: error?.message,
    userEmail: user.email 
  });

  if (error) {
    console.error('Error loading user invitations:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('❌ No invitations found for', user.email);
    return [];
  }

  console.log('✅ Found invitations:', data);

  // Transform the data to match our UserInvitation type
  const invitations = (data || []).map((item: any) => ({
    id: item.id,
    email: item.email,
    account_id: item.account_id,
    account_name: item.accounts?.name || 'Unknown Team', // Safe fallback
    account_slug: item.accounts?.slug || 'unknown', // Safe fallback
    account_picture_url: item.accounts?.picture_url || null,
    invited_by: item.invited_by,
    invited_by_name: 'Team Admin', // Simplified for now
    role: item.role,
    invite_token: item.invite_token,
    created_at: item.created_at,
    expires_at: item.expires_at,
  }));

  console.log('🎯 Transformed invitations:', invitations);
  return invitations;
}); 