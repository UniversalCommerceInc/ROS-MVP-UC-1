// /api/slack/install/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json(
      { error: 'Account ID is required' },
      { status: 400 },
    );
  }

  try {
    // Get the authenticated user
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url));
    }

    const slackUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackUrl.searchParams.append('client_id', process.env.SLACK_CLIENT_ID!);
    slackUrl.searchParams.append(
      'scope',
      'chat:write,users:read,app_mentions:read',
    );
    slackUrl.searchParams.append(
      'redirect_uri',
      process.env.SLACK_REDIRECT_URI!,
    );

    // Pass both account ID and user ID through state parameter
    const stateData = JSON.stringify({
      accountId,
      userId: user.id,
    });
    slackUrl.searchParams.append(
      'state',
      Buffer.from(stateData).toString('base64'),
    );

    return NextResponse.redirect(slackUrl.toString());
  } catch (error) {
    console.error('Error in Slack install:', error);
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }
}
