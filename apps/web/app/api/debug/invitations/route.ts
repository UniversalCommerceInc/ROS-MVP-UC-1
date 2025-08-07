import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        error: 'No user logged in',
        userError: userError?.message
      });
    }

    // 1. Get ALL invitations in the database
    const { data: allInvitations, error: allError } = await client
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Get invitations with account join (no filter)
    const { data: withAccounts, error: accountError } = await client
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
      .order('created_at', { ascending: false });

    // 3. Get invitations filtered by email only
    const { data: emailFiltered, error: emailError } = await client
      .from('invitations')
      .select('*')
      .eq('email', user.email || '')
      .order('created_at', { ascending: false });

    // 4. Get invitations filtered by email and expiry
    const { data: fullFilter, error: fullError } = await client
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
      .eq('email', user.email || '')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // 5. Try raw SQL as a workaround
    let functionResult = null;
    let functionError = null;
    try {
      const result = await client.rpc('get_user_invitations' as any);
      functionResult = result.data;
      functionError = result.error?.message;
    } catch (error: any) {
      functionError = error.message;
    }

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      queries: {
        allInvitations: {
          count: allInvitations?.length || 0,
          data: allInvitations,
          error: allError?.message
        },
        withAccounts: {
          count: withAccounts?.length || 0,
          data: withAccounts,
          error: accountError?.message
        },
        emailFiltered: {
          count: emailFiltered?.length || 0,
          data: emailFiltered,
          error: emailError?.message
        },
        fullFilter: {
          count: fullFilter?.length || 0,
          data: fullFilter,
          error: fullError?.message
        },
        functionResult: {
          data: functionResult,
          error: functionError
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug invitations error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 