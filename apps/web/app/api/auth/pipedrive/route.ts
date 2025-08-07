// app/api/auth/pipedrive/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const accountId = requestUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Check if already connected
  const { data: existingToken } = await supabase
    .from('pipedrive_tokens')
    .select('access_token, expires_at')
    .eq('account_id', accountId)
    .single();

  if (existingToken && new Date(existingToken.expires_at) > new Date()) {
    // Already connected with valid token, get account name and redirect
    const { data: account } = await supabase
      .from('accounts')
      .select('slug, name')
      .eq('id', accountId)
      .single();

    const accountName = account?.slug || account?.name || 'default';
    console.log(accountName, account, 'accountName-----------------');

    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/pipedrive?connected=true`,
        request.url,
      ),
    );
  }

  // Verify user is authenticated and has access to the account
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Simple state - just the account ID (Pipedrive will return this to us)
  const state = accountId;

  const clientId = process.env.NEXT_PUBLIC_PIPEDRIVE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/pipedrive/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID missing' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(
    new URL(`https://oauth.pipedrive.com/oauth/authorize?${params.toString()}`),
  );
}
