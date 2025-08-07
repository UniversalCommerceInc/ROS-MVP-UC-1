import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { NextResponse } from 'next/server';
import { loadUserInvitations } from '../../../home/(user)/_lib/server/load-user-invitations';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        user: null,
        error: userError?.message || 'No user logged in'
      });
    }

    // Get user invitations
    const invitations = await loadUserInvitations();
    
    // Get all invitations (for debugging)
    const { data: allInvitations } = await client
      .from('invitations')
      .select(`
        id,
        email,
        invite_token,
        created_at,
        expires_at,
        accounts(name, slug)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get all users (for debugging email matches) 
    const { data: allUsers } = await client.auth.admin.listUsers();
    const recentUsers = allUsers?.users?.slice(0, 10).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    })) || [];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at,
        createdAt: user.created_at
      },
      userInvitations: invitations,
      allRecentInvitations: allInvitations,
      allRecentUsers: recentUsers,
      debug: {
        userEmail: user.email,
        invitationCount: invitations.length,
        totalInvitations: allInvitations?.length || 0,
        totalUsers: recentUsers.length,
        environment: process.env.NODE_ENV,
        message: invitations.length > 0 
          ? `Found ${invitations.length} invitations for ${user.email}` 
          : `No invitations found for ${user.email}. Total invitations in DB: ${allInvitations?.length || 0}`
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 