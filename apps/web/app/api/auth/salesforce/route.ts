// app/api/auth/salesforce/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

const SCOPES = ['openid', 'api', 'refresh_token', 'id', 'profile', 'email'];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const accountId = requestUrl.searchParams.get('accountId');

  // Verify user is authenticated and has access to the account
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  // Verify user has access to this account
  const { data: membership } = await supabase
    .from('accounts_memberships')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Simple state - just the account ID (Salesforce will return this to us)
  const state = accountId;

  const clientId = process.env.NEXT_PUBLIC_SALESFORCE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/salesforce/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID missing' }, { status: 500 });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    state,
    prompt: 'consent',
  });

  return NextResponse.redirect(
    new URL(
      `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`,
    ),
  );
}
