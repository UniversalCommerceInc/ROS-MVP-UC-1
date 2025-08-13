import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();

  try {
    const { data: sessionData, error: sessionError } = await requireUser(client);

    if (sessionError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = sessionData.user;
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if user has access to this account
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .single();

    if (!account) {
      // Check if it's a team account they have access to
      const { data: membership } = await client
        .from('accounts_memberships')
        .select('account_id')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Delete Microsoft tokens
    const { error: deleteError } = await client
      .from('microsoft_tokens')
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error('Error deleting Microsoft tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Microsoft account' },
        { status: 500 }
      );
    }

    // Also delete email sync status if it exists
    await client
      .from('email_sync_status')
      .delete()
      .eq('account_id', accountId)
      .eq('provider', 'microsoft');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Microsoft disconnect route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}