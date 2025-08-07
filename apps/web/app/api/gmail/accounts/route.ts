import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accountId = url.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json(
      { error: 'Account ID is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this account has Gmail tokens
    const { data: gmailTokens, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('email_address, expires_at, is_active')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (gmailError) {
      console.error('Error checking Gmail tokens:', gmailError);
      return NextResponse.json(
        { error: 'Failed to check Gmail connection' },
        { status: 500 },
      );
    }

    const hasGmail = gmailTokens && gmailTokens.length > 0;
    const gmailAccount = hasGmail ? gmailTokens[0] : null;

    return NextResponse.json({
      hasGmail,
      gmailAccount: gmailAccount
        ? {
            email: gmailAccount.email_address,
            expires_at: gmailAccount.expires_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in Gmail accounts check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
