import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { accountId, autoConnect = false } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this account (personal or team)
    const { data: account } = await supabase
      .from('accounts')
      .select('id, primary_owner_user_id, is_personal_account')
      .eq('id', accountId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let hasAccess = false;

    if (account.is_personal_account) {
      // Personal account: user must be the primary owner
      hasAccess = account.primary_owner_user_id === user.id;
    } else {
      // Team account: check membership
      const { data: membership } = await supabase
        .from('accounts_memberships')
        .select('account_role')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .single();

      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Generate Gmail OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Client ID not configured' },
        { status: 500 },
      );
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    // Build redirect URI dynamically from the current request
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/auth/gmail/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    // Encode auto_connect info in state parameter (Google preserves this)
    const stateData = {
      accountId,
      autoConnect,
    };
    authUrl.searchParams.set('state', JSON.stringify(stateData));

    console.log('🔗 Generated Gmail OAuth URL for auto-connection:', {
      accountId,
      userId: user.id,
      authUrl: authUrl.toString(),
    });

    return NextResponse.json({
      success: true,
      redirectUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('Error generating Gmail OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 },
    );
  }
}
