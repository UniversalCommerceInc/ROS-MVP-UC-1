import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    // 1. Read parameters from the JSON body, just like the Gmail route
    const { accountId, autoConnect = false } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Implement the same robust access verification as the Gmail route
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
      // For personal accounts, the user must be the primary owner
      hasAccess = account.primary_owner_user_id === user.id;
    } else {
      // For team accounts, check for membership
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

    // Check for required environment variables
    const clientId = process.env.MICROSOFT_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Microsoft Client ID not configured' },
        { status: 500 },
      );
    }

    // Define the required Microsoft Graph API scopes
    const scopes = [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'offline_access', // Necessary for getting a refresh token
    ];

    // 3. Dynamically build the redirect URI from the request URL
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/auth/microsoft/callback`;

    // Construct the Microsoft OAuth authorization URL
    const authUrl = new URL(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('prompt', 'consent'); // Ensures the user consents and a refresh token is issued

    // 4. Encode both accountId and autoConnect in the state parameter
    const stateData = {
      accountId,
      autoConnect,
    };
    authUrl.searchParams.set('state', JSON.stringify(stateData));

    console.log('🔗 Generated Microsoft OAuth URL for auto-connection:', {
      accountId,
      userId: user.id,
      authUrl: authUrl.toString(),
    });

    // 5. Return the redirectUrl in a JSON response, matching the Gmail route's behavior
    return NextResponse.json({
      success: true,
      redirectUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('Error generating Microsoft OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 },
    );
  }
}
