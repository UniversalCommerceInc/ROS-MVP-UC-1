import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Get the current user to make sure we're checking the right account
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('🔍 DEBUG: Checking meeting creation for account:', accountId, 'user:', user.id);

    // 1. Check raw meetings table
    const { data: rawMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. Check calendar_events table
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Check recent scheduled_meetings
    const { data: scheduledMeetings, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 4. Check user's account memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_id, accounts(name)')
      .eq('user_id', user.id);

    // 5. Check if the provided accountId is valid for this user
    const validAccountIds = memberships?.map(m => m.account_id) || [];
    const isValidAccount = validAccountIds.includes(accountId);

    // 6. Get recent meeting creation activity logs (if any)
    const recentActivity = rawMeetings?.slice(0, 3).map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      source: meeting.source,
      meeting_id: meeting.meeting_id,
      created_at: meeting.created_at,
      created_by: meeting.created_by,
      participant_count: meeting.participant_emails?.length || 0,
      has_deal: !!meeting.deal_id
    }));

    return NextResponse.json({
      success: true,
      debug_info: {
        account_id: accountId,
        user_id: user.id,
        user_email: user.email,
        is_valid_account: isValidAccount,
        user_accounts: memberships?.map(m => ({
          id: m.account_id,
          name: m.accounts?.name || 'Unknown'
        })) || []
      },
      data_summary: {
        raw_meetings_count: rawMeetings?.length || 0,
        calendar_events_count: calendarEvents?.length || 0,
        scheduled_meetings_count: scheduledMeetings?.length || 0,
      },
      recent_meetings: recentActivity || [],
      raw_data: {
        latest_meetings: rawMeetings?.slice(0, 3) || [],
        latest_calendar_events: calendarEvents?.slice(0, 3) || [],
        latest_scheduled: scheduledMeetings?.slice(0, 2) || []
      },
      errors: {
        meetings_error: meetingsError,
        calendar_error: calendarError,
        scheduled_error: scheduledError,
        membership_error: membershipError
      },
      troubleshooting_tips: [
        rawMeetings?.length === 0 ? "No meetings found in database - try syncing calendar" : null,
        calendarEvents?.length === 0 ? "No calendar events found - try connecting Google Calendar" : null,
        !isValidAccount ? "Account ID doesn't match user's accounts - check account selector" : null,
        rawMeetings?.some(m => !m.title) ? "Some meetings have no title - check meeting creation process" : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Debug meeting creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
} 