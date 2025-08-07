import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    // Get account ID from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify account access
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // First verify the deal belongs to this account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // Fetch completed meetings with summaries and highlights
    const { data: completedMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration,
        participant_emails,
        recording_url,
        summaries (
          id,
          summary,
          ai_insights
        ),
        highlights (
          id,
          highlight
        )
      `)
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: false });

    if (meetingsError) {
      console.error('Error fetching completed meetings:', meetingsError);
    }

    // Fetch scheduled meetings
    const { data: scheduledMeetings, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select(`
        id,
        meeting_title,
        meeting_description,
        start_time,
        end_time,
        attendees,
        meeting_link,
        status
      `)
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: true });

    if (scheduledError) {
      console.error('Error fetching scheduled meetings:', scheduledError);
    }

    // Transform completed meetings data
    const transformedCompletedMeetings = (completedMeetings || []).map((meeting) => {
      const summary = meeting.summaries?.[0]; // Get the first summary
      const highlights = meeting.highlights || [];
      
      // Calculate duration in minutes
      const duration = meeting.duration || 
        (meeting.start_time && meeting.end_time 
          ? Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60))
          : null);

      return {
        id: meeting.id,
        title: meeting.title || 'Meeting',
        date: meeting.start_time,
        duration,
        participants: meeting.participant_emails || [],
        summary: summary?.summary || '',
        actionItems: highlights.map((h: any) => h.highlight) || [],
        type: 'completed' as const,
        recordingUrl: meeting.recording_url,
        aiInsights: summary?.ai_insights,
      };
    });

    // Transform scheduled meetings data
    const transformedScheduledMeetings = (scheduledMeetings || []).map((meeting) => {
      // Calculate duration in minutes
      const duration = meeting.start_time && meeting.end_time 
        ? Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60))
        : null;

      // Extract participant emails from attendees JSON
      const participants = Array.isArray(meeting.attendees) 
        ? meeting.attendees.map((attendee: any) => attendee.email || attendee.name || '').filter(Boolean)
        : [];

      return {
        id: meeting.id,
        title: meeting.meeting_title || 'Scheduled Meeting',
        date: meeting.start_time,
        duration,
        participants,
        summary: meeting.meeting_description || '',
        actionItems: [],
        type: 'scheduled' as const,
        meetingLink: meeting.meeting_link,
        status: meeting.status,
      };
    });

    // Combine and sort all meetings by date
    const allMeetings = [
      ...transformedCompletedMeetings,
      ...transformedScheduledMeetings,
    ].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    console.log('📅 Successfully fetched meetings:', {
      dealId,
      accountId,
      completedCount: transformedCompletedMeetings.length,
      scheduledCount: transformedScheduledMeetings.length,
      totalCount: allMeetings.length,
    });

    return NextResponse.json({ meetings: allMeetings });
  } catch (error) {
    console.error('Error in GET /api/deals/[dealId]/meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
} 