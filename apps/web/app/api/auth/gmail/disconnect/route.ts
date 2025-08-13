import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const logger = await getLogger();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this account (personal or team)
    const { data: account } = await supabase
      .from('accounts')
      .select('id, primary_owner_user_id, is_personal_account')
      .eq('id', accountId)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 },
      );
    }

    let hasAccess = false;

    if (account.is_personal_account) {
      // Personal account: user must be the primary owner
      hasAccess = account.primary_owner_user_id === user.id;
    } else {
      // Team account: check membership
      const { data: membership } = await supabase
        .from('accounts_memberships')
        .select('account_role')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Delete Gmail tokens
    const { error: tokenDeleteError } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('account_id', accountId);

    if (tokenDeleteError) {
      logger.error('Failed to delete Gmail tokens', {
        error: tokenDeleteError,
        accountId,
      });
    }

    // Delete email sync status
    const { error: syncDeleteError } = await supabase
      .from('email_sync_status')
      .delete()
      .eq('account_id', accountId);

    if (syncDeleteError) {
      logger.error('Failed to delete email sync status', {
        error: syncDeleteError,
        accountId,
      });
    }

    logger.info('Gmail integration disconnected', {
      accountId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Gmail integration disconnected successfully',
    });

  } catch (error) {
    const logger = await getLogger();
    logger.error('Gmail disconnect failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 