// app/api/auth/gmail/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');

  // Parse state parameter (could be legacy accountId string or new JSON format)
  let accountId: string;
  let isAutoConnect = false;
  let fromSettings = false;

  try {
    const stateData = JSON.parse(stateParam || '');
    accountId = stateData.accountId;
    isAutoConnect = stateData.autoConnect || false;
    fromSettings = stateData.fromSettings || false;
  } catch {
    // Legacy format - state is just the account ID
    accountId = stateParam || '';
  }

  logger.info('Gmail OAuth callback received', {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!accountId,
    accountId,
    isAutoConnect,
    fromSettings,
  });

  // Handle OAuth errors from Google
  if (error) {
    logger.error('Gmail OAuth error from Google', { error, state: stateParam });

    const redirectUrl = new URL('/home', request.url);
    redirectUrl.searchParams.set('error', 'oauth_error');
    redirectUrl.searchParams.set('details', error);
    redirectUrl.searchParams.set('source', 'gmail_oauth');

    return NextResponse.redirect(redirectUrl);
  }

  // Handle missing code or state
  if (!code || !stateParam) {
    logger.error('Missing OAuth code or state', {
      hasCode: !!code,
      hasState: !!stateParam,
    });

    const redirectUrl = new URL('/home', request.url);
    redirectUrl.searchParams.set('error', 'missing_oauth_params');

    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error('User authentication failed in Gmail callback', {
        error: userError,
        hasUser: !!user,
        state: stateParam,
      });

      const redirectUrl = new URL('/auth/sign-in', request.url);
      redirectUrl.searchParams.set('error', 'authentication_required');

      return NextResponse.redirect(redirectUrl);
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('Missing Google OAuth credentials');

      const redirectUrl = new URL('/home', request.url);
      redirectUrl.searchParams.set('error', 'configuration_error');

      return NextResponse.redirect(redirectUrl);
    }

    // Build redirect URI dynamically from the current request
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.protocol}//${requestUrl.host}/api/auth/gmail/callback`;

    const tokenRequestBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    logger.info('Token request params', {
      hasCode: !!code,
      clientId: clientId.substring(0, 20) + '...',
      redirectUri,
      state: stateParam,
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    const tokenResponseText = await tokenResponse.text();
    logger.info('Token response received', {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
      bodyLength: tokenResponseText.length,
      state: stateParam,
    });

    if (!tokenResponse.ok) {
      logger.error('Token exchange failed', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenResponseText,
        state: stateParam,
      });

      const redirectUrl = new URL('/home', request.url);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');

      return NextResponse.redirect(redirectUrl);
    }

    const tokens = JSON.parse(tokenResponseText);

    if (!tokens.access_token) {
      logger.error('No access token received', {
        hasRefreshToken: !!tokens.refresh_token,
        tokenKeys: Object.keys(tokens),
        state: stateParam,
      });

      const redirectUrl = new URL('/home', request.url);
      redirectUrl.searchParams.set('error', 'no_access_token');

      return NextResponse.redirect(redirectUrl);
    }

    // Get user info from Google
    logger.info('Fetching user info', { state: stateParam });
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      logger.error('Failed to fetch user info', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        state: stateParam,
      });

      const redirectUrl = new URL('/home', request.url);
      redirectUrl.searchParams.set('error', 'user_info_failed');

      return NextResponse.redirect(redirectUrl);
    }

    const userInfo = await userInfoResponse.json();

    logger.info('Getting Supabase user', { state: stateParam });

    if (!user) {
      logger.error('No authenticated user found', {
        hasUserInfo: !!userInfo,
        state: stateParam,
      });

      const redirectUrl = new URL('/auth/sign-in', request.url);
      redirectUrl.searchParams.set('error', 'authentication_required');

      return NextResponse.redirect(redirectUrl);
    }

    // Check for existing tokens
    const { data: existingTokens } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('email_address', userInfo.email)
      .single();

    // Prepare token data
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
    const scopeToStore =
      tokens.scope ||
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

    const tokenData = {
      account_id: accountId,
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      email_address: userInfo.email,
      scope: scopeToStore,
    };

    logger.info('Token data prepared', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accountId: accountId,
      userEmail: userInfo.email,
      expiresIn: tokens.expires_in,
    });

    let tokenUpdateResult;

    // Try to update existing tokens first
    if (existingTokens) {
      logger.info('Updating existing tokens', { state: stateParam });
      tokenUpdateResult = await supabase
        .from('gmail_tokens')
        .update(tokenData)
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('email_address', userInfo.email)
        .select();
    } else {
      // Delete any conflicting tokens and insert new ones
      logger.info('Trying delete and insert approach', { state: stateParam });

      const { error: deleteError } = await supabase
        .from('gmail_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('email_address', userInfo.email);

      if (deleteError) {
        logger.warn('Failed to delete existing tokens', {
          error: deleteError,
          state: stateParam,
        });
      }

      // Insert new tokens
      tokenUpdateResult = await supabase
        .from('gmail_tokens')
        .insert(tokenData)
        .select();
    }

    logger.info('Token operation result', {
      success: !!tokenUpdateResult?.data,
      error: tokenUpdateResult?.error,
      state: stateParam,
    });

    if (tokenUpdateResult?.error) {
      logger.error('Failed to save Gmail tokens', {
        error: tokenUpdateResult.error,
        accountId: accountId,
        userEmail: userInfo.email,
      });

      const redirectUrl = new URL('/home', request.url);
      redirectUrl.searchParams.set('error', 'save_tokens_failed');

      return NextResponse.redirect(redirectUrl);
    }

    // Create email sync status record if it doesn't exist
    const { data: existingSyncStatus } = await supabase
      .from('email_sync_status')
      .select('*')
      .eq('account_id', accountId);

    if (!existingSyncStatus || existingSyncStatus.length === 0) {
      const { error: syncStatusError } = await supabase
        .from('email_sync_status')
        .insert({
          account_id: accountId,
          status: 'not_started',
          emails_synced: 0,
          last_sync_email_id: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (syncStatusError) {
        logger.warn('Failed to create email sync status', {
          error: syncStatusError,
          accountId: accountId,
        });
      }
    } else {
      // Update existing sync status
      const { error: syncStatusError } = await supabase
        .from('email_sync_status')
        .update({
          status: 'ready',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId);

      if (syncStatusError) {
        logger.warn('Failed to update email sync status', {
          error: syncStatusError,
          accountId: accountId,
        });
      }
    }

    // Get account details for redirect
    const { data: account } = await supabase
      .from('accounts')
      .select('name, slug')
      .eq('id', accountId)
      .single();

    // Use the auto-connect flag from the parsed state (already set above)
    logger.info('Redirect logic', {
      isAutoConnect,
      fromSettings,
      accountSlug: account?.slug,
    });

    // Check if this was initiated from settings (could be passed in state)
    const accountName = account?.slug || account?.name || 'default';

    let redirectPath: string;
    if (isAutoConnect) {
      redirectPath = `/home/${accountName}/dealflow?gmail_connected=true&auto_setup=complete`;
    } else if (fromSettings) {
      redirectPath = `/home/settings?gmail_connected=true&calendar=${scopeToStore.includes('calendar') ? 'yes' : 'no'}`;
    } else {
      redirectPath = `/home/${accountName}/emails?connected=true&calendar=${scopeToStore.includes('calendar') ? 'yes' : 'no'}`;
    }

    logger.info('Gmail OAuth success', {
      userId: user.id,
      accountId: accountId,
      userEmail: userInfo.email,
      redirectPath,
      hasCalendarScope: scopeToStore.includes('calendar'),
    });

    const finalRedirectUrl = new URL(redirectPath, request.url);
    return NextResponse.redirect(finalRedirectUrl);
  } catch (error) {
    logger.error('Gmail OAuth callback error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user?.id,
      state: stateParam,
    });

    const redirectUrl = new URL('/home', request.url);
    redirectUrl.searchParams.set('error', 'callback_error');

    return NextResponse.redirect(redirectUrl);
  }
}
