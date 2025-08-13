import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const checkAllAccounts = searchParams.get('checkAllAccounts') === 'true';

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

    // Helper function to check Gmail status for a specific account
    async function checkAccountGmailStatus(checkAccountId: string) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('gmail_tokens')
        .select('*')
        .eq('account_id', checkAccountId)
        .single();

      const { data: syncStatus, error: syncError } = await supabase
        .from('email_sync_status')
        .select('*')
        .eq('account_id', checkAccountId)
        .single();

      const isConnected = !!tokenData && !tokenError;
      const hasCalendarAccess = isConnected && tokenData?.scope?.includes('calendar');

      return {
        isConnected,
        emailAddress: tokenData?.email_address || null,
        hasCalendarAccess,
        lastSyncAt: syncStatus?.started_at || null,
        totalEmailsSynced: syncStatus?.emails_synced || 0,
        syncStatus: syncStatus?.status || 'not_started',
        errorMessage: syncStatus?.error_message || null,
        accountId: checkAccountId
      };
    }

    // Check the primary account first
    let gmailStatus = await checkAccountGmailStatus(accountId);

    // If not connected and checkAllAccounts is true, check other accounts
    if (!gmailStatus.isConnected && checkAllAccounts) {
      // Get all accounts the user has access to
      const { data: userAccounts } = await supabase
        .from('accounts_memberships')
        .select('account_id, accounts!inner(id, name)')
        .eq('user_id', user.id);

      if (userAccounts && userAccounts.length > 0) {
        for (const userAccount of userAccounts) {
          const teamAccountStatus = await checkAccountGmailStatus(userAccount.account_id);
          if (teamAccountStatus.isConnected) {
            gmailStatus = teamAccountStatus;
            break; // Use the first connected account found
          }
        }
      }
    }

    logger.info('Gmail status check', {
      accountId,
      checkedAccountId: gmailStatus.accountId,
      isConnected: gmailStatus.isConnected,
      hasCalendarAccess: gmailStatus.hasCalendarAccess,
      syncStatus: gmailStatus.syncStatus,
      checkAllAccounts,
    });

    return NextResponse.json(gmailStatus);

  } catch (error) {
    const logger = await getLogger();
    logger.error('Gmail status check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 