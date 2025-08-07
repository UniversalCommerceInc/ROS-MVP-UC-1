import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
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
        { status: 401 }
      );
    }

    // Check for meetings with various criteria
    const queries = [];

    // 1. Meetings by account_id
    const { data: meetingsByAccount } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId);

    // 2. All meetings (to see if there are any at all)
    const { data: allMeetings } = await supabase
      .from('meetings')
      .select('*')
      .limit(10);

    // 3. Meetings with calendar_event_id field
    const { data: meetingsWithCalendarId } = await supabase
      .from('meetings')
      .select('*')
      .not('calendar_event_id', 'is', null)
      .limit(10);

    // 4. Get calendar events for comparison
    const { data: calendarEvents } = await supabase
      .from('calendar_events')
      .select('calendar_event_id, title, attendees')
      .eq('account_id', accountId)
      .limit(5);

    // 5. Check for any meetings created by this user
    const { data: meetingsByUser } = await supabase
      .from('meetings')
      .select('*')
      .eq('created_by', user.id)
      .limit(10);

    return NextResponse.json({
      success: true,
      accountId,
      userId: user.id,
      queries: {
        meetingsByAccount: {
          count: meetingsByAccount?.length || 0,
          sample: meetingsByAccount?.[0] || null
        },
        allMeetings: {
          count: allMeetings?.length || 0,
          sample: allMeetings?.[0] || null
        },
        meetingsWithCalendarId: {
          count: meetingsWithCalendarId?.length || 0,
          sample: meetingsWithCalendarId?.[0] || null
        },
        meetingsByUser: {
          count: meetingsByUser?.length || 0,
          sample: meetingsByUser?.[0] || null
        },
        calendarEventsSample: calendarEvents || []
      }
    });

  } catch (error) {
    console.error('Comprehensive debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 