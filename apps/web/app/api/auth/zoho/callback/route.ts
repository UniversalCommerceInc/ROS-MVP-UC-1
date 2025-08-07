// app/api/auth/zoho/callback/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state'); // This is the accountId
  const error = requestUrl.searchParams.get('error');

  console.log('Zoho callback - Code:', code?.substring(0, 10) + '...');
  console.log('Zoho callback - State (Account ID):', state);

  // Verify user is still authenticated
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Authentication error:', authError);
    return NextResponse.redirect(
      new URL('/import/zoho?error=authentication_required', request.url),
    );
  }

  // The state parameter is our account ID
  const accountId = state;

  // Get account name from database using account ID
  let accountName = 'default'; // fallback

  if (accountId) {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('slug, name')
      .eq('id', accountId)
      .single();

    if (!accountError && account) {
      accountName = account.slug || account.name;
      console.log('Found account:', { slug: account.slug, name: account.name });
      console.log('Using account name for redirect:', accountName);
    } else {
      console.error('Failed to get account details:', accountError);
    }
  } else {
    console.error('No account ID found in state parameter');
    return NextResponse.redirect(
      new URL('/import/zoho?error=missing_account_id', request.url),
    );
  }

  if (error) {
    console.error('Zoho OAuth error:', error);
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/zoho?error=${encodeURIComponent(error)}`,
        request.url,
      ),
    );
  }

  if (!code || !accountId) {
    console.error('Missing code or account ID');
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/zoho?error=missing_code_or_account_id`,
        request.url,
      ),
    );
  }

  // Verify user still has access to this account
  const { data: membership } = await supabase
    .from('accounts_memberships')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    console.error('User no longer has access to account');
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/zoho?error=access_denied`,
        request.url,
      ),
    );
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Zoho credentials');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://accounts.zoho.in/oauth/v2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/zoho/callback`,
          code,
        }),
      },
    );

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Zoho token exchange error:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Received Zoho tokens successfully');

    // Store tokens in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: dbError } = await supabase.from('zoho_tokens').upsert({
      account_id: accountId,
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      api_domain: tokens.api_domain || 'https://www.zohoapis.in',
      scope: tokens.scope || 'ZohoCRM.modules.ALL',
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store tokens');
    }

    console.log('Tokens stored successfully');

    // Redirect to account-specific import page
    console.log(`Redirecting to: /home/${accountName}/import/zoho`);

    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/zoho?connected=true&user_id=${user.id}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error('Zoho OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/home/${accountName}/import/zoho?error=connection_failed`,
        request.url,
      ),
    );
  }
}
