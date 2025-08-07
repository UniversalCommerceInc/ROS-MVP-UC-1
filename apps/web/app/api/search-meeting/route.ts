import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const searchTerm = searchParams.get('q') || 'test meeting asd';

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Search in meetings table
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId)
      .ilike('title', `%${searchTerm}%`)
      .order('created_at', { ascending: false });

    // Search in calendar_events table  
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId)
      .ilike('title', `%${searchTerm}%`)
      .order('created_at', { ascending: false });

    // Also get all recent meetings (last 24 hours) to see what was actually synced
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: recentMeetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    const { data: recentCalendarEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      search_term: searchTerm,
      found: {
        meetings: meetings || [],
        calendar_events: calendarEvents || [],
      },
      recent_activity: {
        meetings_last_24h: recentMeetings || [],
        calendar_events_last_24h: recentCalendarEvents || [],
      },
      suggestions: [
        meetings?.length === 0 && calendarEvents?.length === 0 ? 
          "Meeting not found in database - may not have been synced from Google Calendar" : null,
        "Try clicking 'Sync Calendar' button to import from Google Calendar",
        "Check if meeting exists in your Google Calendar",
        "Meeting might be filtered out if it has less than 2 attendees"
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Search meeting error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
} 