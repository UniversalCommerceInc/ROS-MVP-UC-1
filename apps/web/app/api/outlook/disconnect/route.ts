import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

export async function POST(request: NextRequest) {
  const logger = await getLogger();
  
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this account
    const { data: account } = await supabase
      .from('accounts')
      .select('id, primary_owner_user_id')
      .eq('id', accountId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has permission (account owner or team member)
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    const isOwner = account.primary_owner_user_id === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete Microsoft tokens for this account
    const { error: deleteError } = await supabase
      .from('microsoft_tokens')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Error deleting Microsoft tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Outlook' },
        { status: 500 }
      );
    }

    logger.info(`Microsoft/Outlook disconnected for account: ${accountId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Outlook disconnected successfully'
    });

  } catch (error) {
    logger.error('Error in outlook disconnect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}