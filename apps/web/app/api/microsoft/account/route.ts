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

    // Check if this account has Microsoft tokens
    const { data: microsoftTokens, error: microsoftError } = await supabase
      .from('microsoft_tokens')
      .select('email_address, expires_at, is_active')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (microsoftError) {
      console.error('Error checking Microsoft tokens:', microsoftError);
      return NextResponse.json(
        { error: 'Failed to check Microsoft connection' },
        { status: 500 },
      );
    }

    const hasMicrosoft = microsoftTokens && microsoftTokens.length > 0;
    const microsoftAccount = hasMicrosoft ? microsoftTokens[0] : null;

    return NextResponse.json({
      hasMicrosoft,
      microsoftAccount: microsoftAccount
        ? {
            email: microsoftAccount.email_address,
            expires_at: microsoftAccount.expires_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in Microsoft accounts check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
