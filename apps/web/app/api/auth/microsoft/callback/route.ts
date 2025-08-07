import { type NextRequest, NextResponse } from 'next/server';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

async function getAccountName(
  accountId: string,
  supabase: any,
): Promise<string> {
  try {
    const { data: accountData } = await supabase
      .from('accounts')
      .select('name, slug')
      .eq('id', accountId)
      .single();

    return accountData?.slug || accountData?.name || accountId;
  } catch {
    return accountId;
  }
}

export async function GET(request: NextRequest) {
  const logger = await getLogger();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const supabase = getSupabaseServerClient();

  let accountId: string;
  let isAutoConnect = false;
  let fromSettings = false;

  try {
    const stateData = JSON.parse(stateParam || '');
    accountId = stateData.accountId;
    isAutoConnect = stateData.autoConnect || false;
    fromSettings = stateData.fromSettings || false;
  } catch {
    accountId = stateParam || '';
  }

  logger.info('Microsoft OAuth callback received', {
    hasCode: !!code,
    hasState: !!accountId,
    error,
    errorDescription,
    isAutoConnect,
    fromSettings,
  });

  const accountName = accountId
    ? await getAccountName(accountId, supabase)
    : 'account';

  if (error) {
    logger.error('Microsoft OAuth error', {
      error,
      errorDescription,
      accountId,
    });
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/emails?error=oauth_failed&details=${encodeURIComponent(
          errorDescription || error,
        )}`,
        request.url,
      ),
    );
  }

  if (!code || !accountId) {
    logger.error('Missing OAuth code or state', {
      hasCode: !!code,
      hasState: !!accountId,
    });
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/emails?error=invalid_request&details=missing_params`,
        request.url,
      ),
    );
  }

  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri =
      process.env.MICROSOFT_REDIRECT_URI ||
      'http://localhost:3000/api/auth/microsoft/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured');
    }

    const tokenRequestBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope:
        'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite offline_access',
    });

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody,
      },
    );

    const tokenResponseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      logger.error('Token exchange failed', {
        status: tokenResponse.status,
        responseBody: tokenResponseText,
        accountId,
      });
      throw new Error(
        `Token exchange failed: ${tokenResponse.status} - ${tokenResponseText}`,
      );
    }

    const tokens = JSON.parse(tokenResponseText);

    const userInfoResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      const userInfoError = await userInfoResponse.text();
      logger.error('User info fetch failed', {
        status: userInfoResponse.status,
        error: userInfoError,
        accountId,
      });
      throw new Error(`User info fetch failed: ${userInfoResponse.status}`);
    }

    const userInfo = await userInfoResponse.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        `User not authenticated: ${userError?.message || 'No user found'}`,
      );
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
    const emailAddress = userInfo.mail || userInfo.userPrincipalName;

    const scopeToStore =
      'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite';

    const tokenData = {
      account_id: accountId,
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      email_address: emailAddress,
      tenant_id: userInfo.tenant_id || null,
      last_sync: new Date().toISOString(),
      is_active: true,
      sync_status: 'pending',
      scope: scopeToStore,
    };

    const { error: microsoftError } = await supabase
      .from('microsoft_tokens')
      .upsert(tokenData, {
        onConflict: 'account_id,email_address',
      });

    if (microsoftError) {
      await supabase
        .from('microsoft_tokens')
        .delete()
        .eq('account_id', accountId)
        .eq('email_address', emailAddress);

      const { error: insertError2 } = await supabase
        .from('microsoft_tokens')
        .insert(tokenData);

      if (insertError2) {
        throw new Error(`Database error: ${insertError2.message}`);
      }
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
      const syncUrl = `${baseUrl}/api/microsoft/sync`;

      await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          email: emailAddress,
        }),
      });
    } catch (err) {
      logger.warn('Initial Microsoft sync failed', { err });
    }

    let redirectPath: string;

    if (isAutoConnect) {
      redirectPath = `/home/${accountName}/dealflow?microsoft_connected=true&auto_setup=complete`;
    } else if (fromSettings) {
      redirectPath = `/home/settings?microsoft_connected=true&calendar=${scopeToStore.includes('Calendars') ? 'yes' : 'no'}`;
    } else {
      redirectPath = `/home/${accountName}/emails?connected=true&provider=microsoft&calendar=${scopeToStore.includes('Calendars') ? 'yes' : 'no'}`;
    }

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    logger.error('Microsoft OAuth callback failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountId,
      timestamp: new Date().toISOString(),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(
        `/home/${accountId}/emails?error=connection_failed&details=${encodeURIComponent(errorMessage)}`,
        request.url,
      ),
    );
  }
}
