// /api/calendar-status/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Import the token refresh utilities
import {
  getValidGmailToken,
  refreshGoogleToken,
} from '~/lib/utils/google-token-utils';
import {
  getValidMicrosoftToken,
  refreshMicrosoftToken,
} from '~/lib/utils/microsoft-token-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Verify user has access to this account
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Check and refresh Google Calendar connection
    let googleStatus = {
      connected: false,
      email: null as string | null,
      expires_at: null as string | null,
      last_sync: null as string | null,
      meeting_count: 0,
      token_refreshed: false,
      error: null as string | null,
    };

    try {
      // Try to get valid Google token (will refresh if expired)
      const googleTokenResult = await getValidGmailToken(accountId);

      if (googleTokenResult.success) {
        // Get updated token data from database
        const { data: googleTokens } = await supabase
          .from('gmail_tokens')
          .select('email_address, is_active, expires_at, last_sync')
          .eq('account_id', accountId)
          .single();

        if (googleTokens && googleTokens.is_active !== false) {
          googleStatus = {
            connected: true,
            email: googleTokens.email_address,
            expires_at: googleTokens.expires_at,
            last_sync: googleTokens.last_sync,
            meeting_count: 0, // Will be set below
            token_refreshed: true, // Token was checked/refreshed
            error: null,
          };
        }
      } else {
        googleStatus.error = googleTokenResult.error || 'Google token invalid';
      }
    } catch (error) {
      console.error('Error checking Google token:', error);
      googleStatus.error = 'Failed to check Google token';
    }

    // Check and refresh Microsoft Calendar connection
    let microsoftStatus = {
      connected: false,
      email: null as string | null,
      expires_at: null as string | null,
      last_sync: null as string | null,
      tenant_id: null as string | null,
      meeting_count: 0,
      token_refreshed: false,
      error: null as string | null,
    };

    try {
      // Try to get valid Microsoft token (will refresh if expired)
      const microsoftTokenResult = await getValidMicrosoftToken(accountId);

      if (microsoftTokenResult.success) {
        // Get updated token data from database
        const { data: microsoftTokens } = await supabase
          .from('microsoft_tokens')
          .select('email_address, is_active, expires_at, last_sync, tenant_id')
          .eq('account_id', accountId)
          .single();

        if (microsoftTokens && microsoftTokens.is_active !== false) {
          microsoftStatus = {
            connected: true,
            email: microsoftTokens.email_address,
            expires_at: microsoftTokens.expires_at,
            last_sync: microsoftTokens.last_sync,
            tenant_id: microsoftTokens.tenant_id,
            meeting_count: 0, // Will be set below
            token_refreshed: true, // Token was checked/refreshed
            error: null,
          };
        }
      } else {
        microsoftStatus.error =
          microsoftTokenResult.error || 'Microsoft token invalid';
      }
    } catch (error) {
      console.error('Error checking Microsoft token:', error);
      microsoftStatus.error = 'Failed to check Microsoft token';
    }

    // Get meeting statistics by source
    const { data: meetingStats } = await supabase
      .from('meetings')
      .select('source')
      .eq('account_id', accountId);

    const sourceStats =
      meetingStats?.reduce((acc: Record<string, number>, meeting: any) => {
        const source = meeting.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}) || {};

    // Update meeting counts
    googleStatus.meeting_count = sourceStats['google_calendar'] || 0;
    microsoftStatus.meeting_count = sourceStats['microsoft_calendar'] || 0;

    const connectionStatus = {
      google: googleStatus,
      microsoft: microsoftStatus,
      total_meetings: Object.values(sourceStats).reduce(
        (sum: number, count: any) => sum + count,
        0,
      ),
      sources: sourceStats,
      refreshed_at: new Date().toISOString(), // Timestamp when tokens were checked/refreshed
    };

    return NextResponse.json(connectionStatus);
  } catch (error) {
    console.error('Calendar status check error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check calendar status',
      },
      { status: 500 },
    );
  }
}
