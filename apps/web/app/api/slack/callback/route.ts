// /api/slack/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// import { getSupabaseServerClient } from '@kit/supabase/server-client';

const supabase = getSupabaseServerAdminClient();

export async function GET(req: NextRequest) {
  console.log('🔵 Slack callback started');

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('📝 Callback params:', {
      code: code?.substring(0, 10) + '...',
      state,
      error,
    });

    // Parse state data
    let stateData: { accountId: string; userId: string } | null = null;
    try {
      if (state) {
        const decodedState = Buffer.from(state, 'base64').toString('utf-8');
        stateData = JSON.parse(decodedState);
        console.log('✅ State parsed successfully:', stateData);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse state:', parseError);
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 },
      );
    }

    // Get account slug for proper redirect
    const getAccountSlug = async (accountId: string) => {
      try {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('slug')
          .eq('id', accountId)
          .single();

        if (accountError) {
          console.error('❌ Error getting account slug:', accountError);
          return null;
        }

        console.log('✅ Account slug found:', accountData?.slug);
        return accountData?.slug;
      } catch (err) {
        console.error('❌ Exception getting account slug:', err);
        return null;
      }
    };

    const getRedirectUrl = async (path: string) => {
      try {
        const accountSlug = stateData
          ? await getAccountSlug(stateData.accountId)
          : null;

        // Always use the account-specific integrations path if we have state data
        const baseUrl = accountSlug
          ? `/home/${accountSlug}/integrations`
          : stateData
            ? `/home/account/integrations` // Fallback if slug lookup fails but we have account data
            : '/'; // Only fallback to root if no state data at all

        const fullPath = `${baseUrl}${path}`;

        // Create absolute URL but force HTTP in development
        const requestUrl = new URL(req.url);
        const protocol =
          process.env.NODE_ENV === 'development'
            ? 'http:'
            : requestUrl.protocol;
        const host = requestUrl.host;

        const absoluteUrl = `${protocol}//${host}${fullPath}`;
        console.log('🔗 Redirect URL:', absoluteUrl);
        return absoluteUrl;
      } catch (err) {
        console.error('❌ Error building redirect URL:', err);
        const requestUrl = new URL(req.url);
        const protocol =
          process.env.NODE_ENV === 'development'
            ? 'http:'
            : requestUrl.protocol;

        // If we have state data, try to use account-specific path even on error
        const fallbackPath = stateData
          ? `/home/account/integrations?error=redirect_failed`
          : `/?error=redirect_failed`;

        return `${protocol}//${requestUrl.host}${fallbackPath}`;
      }
    };

    if (error) {
      console.error('❌ Slack OAuth error:', error);
      return NextResponse.redirect(
        await getRedirectUrl('?error=slack_oauth_failed'),
      );
    }

    if (!code || !stateData) {
      console.error('❌ Missing required data:', {
        hasCode: !!code,
        hasStateData: !!stateData,
      });
      return NextResponse.json(
        { error: 'Missing code or state data' },
        { status: 400 },
      );
    }

    console.log('🔄 Exchanging code for access token...');

    // Exchange code for access token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });

    const data = await tokenRes.json();
    console.log('📄 Slack API response:', {
      ok: data.ok,
      team: data.team?.name,
    });
    console.log('🔍 Full Slack OAuth data:', JSON.stringify(data, null, 2));

    if (!data.ok) {
      console.error('❌ Slack OAuth failed:', data);
      return NextResponse.redirect(
        await getRedirectUrl('?error=slack_oauth_failed'),
      );
    }

    const {
      team,
      access_token,
      authed_user,
      scope,
      bot_user_id,
      app_id,
      enterprise,
      incoming_webhook,
    } = data;

    console.log('🔍 Verifying account exists...');

    // Verify the account exists
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('id, slug')
      .eq('id', stateData.accountId)
      .single();

    if (accountError || !accountData) {
      console.error('❌ Account not found:', accountError);
      return NextResponse.redirect(
        await getRedirectUrl('?error=account_not_found'),
      );
    }

    console.log('✅ Account verified:', accountData.slug);
    console.log('💾 Storing Slack token...');

    // Upsert Slack token using admin client with user ID from state
    const { error: upsertError } = await supabase.from('slack_tokens').upsert(
      {
        account_id: stateData.accountId,
        user_id: stateData.userId, // Use user ID from state
        access_token,
        team_id: team.id,
        team_name: team.name,
        authed_user_id: authed_user.id,
        authed_user_token: authed_user.access_token,
        scope,
        bot_user_id,
        app_id,
        enterprise_id: enterprise?.id,
        enterprise_name: enterprise?.name,
        webhook_url: incoming_webhook?.url,
        incoming_webhook_channel: incoming_webhook?.channel,
        incoming_webhook_channel_id: incoming_webhook?.channel_id,
        incoming_webhook_configuration_url: incoming_webhook?.configuration_url,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'account_id',
      },
    );

    if (upsertError) {
      console.error('❌ Failed to store Slack token:', upsertError);
      return NextResponse.redirect(
        await getRedirectUrl('?error=slack_storage_failed'),
      );
    }

    console.log('✅ Slack token stored successfully');
    console.log(
      `🎉 Slack integration successful for account: ${stateData.accountId}, team: ${team.name}`,
    );

    const successUrl = await getRedirectUrl('?success=slack_connected');
    console.log('🚀 Redirecting to:', successUrl);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('💥 Slack callback error:', error);

    // Try to get a safe redirect URL even if everything fails
    try {
      const requestUrl = new URL(req.url);
      const protocol =
        process.env.NODE_ENV === 'development' ? 'http:' : requestUrl.protocol;

      // If we have state data, try to redirect to account integrations, otherwise to root
      const fallbackPath = stateData
        ? `/home/account/integrations?error=slack_callback_failed`
        : `/?error=slack_callback_failed`;

      const fallbackUrl = `${protocol}//${requestUrl.host}${fallbackPath}`;
      return NextResponse.redirect(fallbackUrl);
    } catch (redirectError) {
      console.error('💥 Even redirect failed:', redirectError);
      return NextResponse.json(
        {
          error: 'Slack callback failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  }
}
