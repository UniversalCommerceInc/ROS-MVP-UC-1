'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function getMeetings(accountId: string) {
  const supabase = getSupabaseServerClient();

  try {
    console.log(`🔍 Fetching meetings for account: ${accountId}`);

    // Fetch all meetings with enhanced data including summaries and highlights
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(
        `
        *,
        summaries (
          summary,
          ai_insights
        ),
        highlights (
          highlight
        )
      `,
      )
      .eq('account_id', accountId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching meetings:', error);
      return [];
    }

    if (!meetings || meetings.length === 0) {
      console.log('📋 No meetings found for account:', accountId);
      return [];
    }

    // For each meeting, fetch recent emails from participants to add email context
    const meetingsWithEmailContext = await Promise.all(
      meetings.map(async (meeting) => {
        let emailInsights: string[] = [];

        // Add calendar source information to insights
        const calendarSourceInsight =
          meeting.source === 'microsoft_calendar'
            ? '📅 Microsoft Calendar'
            : meeting.source === 'google_calendar'
              ? '📅 Google Calendar'
              : '📅 Calendar';

        return {
          ...meeting,
          emailInsights,
          calendarSource: calendarSourceInsight,
        };
      }),
    );

    console.log(`🔍 DEBUG: meetings query result:`, {
      count: meetings?.length || 0,
      sources: [...new Set(meetings.map((m) => m.source))], // Show unique sources
      meetings: meetings || [],
    });

    // Transform the data to match the expected format
    const transformedMeetings =
      meetingsWithEmailContext?.map((meeting) => ({
        // Core meeting properties
        id: meeting.id,
        dealId: meeting.deal_id || `meeting_${meeting.id}`,
        deal_id: meeting.deal_id,
        dealName: meeting.title || 'Meeting',
        title: meeting.title,
        meeting_id: meeting.meeting_id,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        timestamp_start_utc: meeting.timestamp_start_utc,
        timestamp_end_utc: meeting.timestamp_end_utc,
        participant_emails: meeting.participant_emails || [],
        source: meeting.source || 'unknown',
        language: meeting.language || 'en-US',
        host_email: meeting.host_email,
        recording_url: meeting.recording_url,
        created_at: meeting.created_at,
        updated_at: meeting.updated_at,

        // Deal information (hardcoded as null since we removed the join)
        deal: null,

        // Derived properties for UI compatibility
        hasActualTranscript:
          !!meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_'),
        _source: meeting.source || 'calendar',
        _status: meeting.deal_id ? 'deal-associated' : 'standalone',

        // Default highlights structure for non-deal meetings
        highlights: meeting.deal_id
          ? undefined
          : {
              title: meeting.title,
              participants: meeting.participant_emails || [],
              startTime: meeting.start_time,
              endTime: meeting.end_time,
              source: meeting.source,
            },

        // Default action items for non-deal meetings
        action_items: [],

        // Meeting type indicator
        meeting_type: meeting.deal_id ? 'deal' : 'general',

        // Additional UI properties for compatibility
        date:
          meeting.start_time ||
          meeting.timestamp_start_utc ||
          meeting.created_at,
        impact:
          meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_')
            ? ('progress' as const)
            : ('neutral' as const),
        momentum:
          meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_')
            ? 25
            : 0,
        keyOutcome: meeting.title || 'Meeting',
        decisions: [],
        actionItems: [], // Add missing actionItems field for UI compatibility
        insights: [
          ...(meeting.host_email ? [`Host: ${meeting.host_email}`] : []),
          meeting.calendarSource, // Enhanced source information
          ...(meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_')
            ? ['📝 Transcript available']
            : []),
          ...(meeting.deal_id
            ? [`💼 Deal: Associated`]
            : ['📅 General meeting']),

          // Add meeting summary if available
          ...(meeting.summaries &&
          meeting.summaries.length > 0 &&
          meeting.summaries[0]?.summary
            ? [
                `📋 Summary: ${meeting.summaries[0].summary.substring(0, 200)}${meeting.summaries[0].summary.length > 200 ? '...' : ''}`,
              ]
            : []),

          // Add AI insights if available
          ...(meeting.summaries &&
          meeting.summaries.length > 0 &&
          meeting.summaries[0]?.ai_insights
            ? [
                `🤖 AI Insights: ${meeting.summaries[0].ai_insights.substring(0, 150)}${meeting.summaries[0].ai_insights.length > 150 ? '...' : ''}`,
              ]
            : []),

          // Add highlights if available
          ...(meeting.highlights && meeting.highlights.length > 0
            ? meeting.highlights
                .slice(0, 3)
                .map((h: any) => `✨ ${h.highlight}`)
            : []),

          // Add email insights
          ...(meeting.emailInsights || []),

          // Add participant count insight
          ...(meeting.participant_emails &&
          meeting.participant_emails.length > 0
            ? [
                `👥 ${meeting.participant_emails.length} participants: ${meeting.participant_emails.slice(0, 2).join(', ')}${meeting.participant_emails.length > 2 ? '...' : ''}`,
              ]
            : []),

          // Add calendar-specific insights based on source
          ...(meeting.source === 'microsoft_calendar'
            ? ['🔗 Teams meeting link detected']
            : []),
          ...(meeting.source === 'google_calendar'
            ? ['🔗 Google Meet link detected']
            : []),
        ],
        participants: meeting.participant_emails || [],
        duration:
          meeting.duration ||
          (meeting.start_time && meeting.end_time
            ? Math.round(
                (new Date(meeting.end_time).getTime() -
                  new Date(meeting.start_time).getTime()) /
                  (1000 * 60),
              )
            : 60),
        transcriptAvailable:
          !!meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_'),
        recordingAvailable: !!meeting.recording_url,
        keyInsightSnippet:
          meeting.meeting_id &&
          meeting.meeting_id !== 'null' &&
          !meeting.meeting_id.startsWith('cal_')
            ? 'Meeting with transcript - click to view details'
            : `${meeting.calendarSource} meeting - click to view details`,
        meetingSummary: meeting.title || 'Meeting',

        // Enhanced data from joins
        meetingSummaries: meeting.summaries || [],
        meetingHighlights: meeting.highlights || [],
        fullSummary:
          meeting.summaries && meeting.summaries.length > 0
            ? meeting.summaries[0]?.summary
            : null,
        aiInsights:
          meeting.summaries && meeting.summaries.length > 0
            ? meeting.summaries[0]?.ai_insights
            : null,
        emailInsights: meeting.emailInsights || [],
      })) || [];

    console.log(
      `📊 Fetched ${transformedMeetings.length} meetings for account ${accountId}`,
    );
    console.log(
      `📊 Breakdown: ${transformedMeetings.filter((m) => m.deal_id).length} deal meetings, ${transformedMeetings.filter((m) => !m.deal_id).length} general meetings`,
    );
    console.log(
      `📊 Calendar sources: ${[...new Set(transformedMeetings.map((m) => m.source))].join(', ')}`,
    );
    console.log(
      `🔍 DEBUG: Sample transformed meeting:`,
      transformedMeetings[0] || 'None',
    );

    return transformedMeetings;
  } catch (error) {
    console.error('Error in getMeetings:', error);
    throw error;
  }
}

export async function getAllMeetings(accountId: string) {
  return getMeetings(accountId);
}

export async function getMeetingsByDeal(dealId: string, accountId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Verify account exists and user has access
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account not found:', accountError);
      return {
        success: false,
        error: 'Account not found or inaccessible',
        meetings: [],
      };
    }

    const { data: calendarEvents, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId)
      .eq('calendar_event_id', dealId);

    if (error) {
      console.error('Error fetching calendar events for deal:', error);
      return {
        success: false,
        error: 'Failed to fetch calendar events',
        meetings: [],
      };
    }

    // Transform calendar events to match the UI interface
    const transformedMeetings = calendarEvents.map((event: any) => {
      const startDate = event.start_time;
      const endDate = event.end_time;
      const duration =
        endDate && startDate
          ? Math.round(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                (1000 * 60),
            )
          : 30;

      const attendeeList = Array.isArray(event.attendees)
        ? event.attendees
        : [];
      const participants = attendeeList
        .map((a: any) => a.email || a.displayName || 'Unknown')
        .filter(Boolean);

      // Determine calendar source
      const calendarSource =
        event.source === 'microsoft_calendar'
          ? '📅 Microsoft Calendar'
          : event.source === 'google_calendar'
            ? '📅 Google Calendar'
            : '📅 Calendar';

      return {
        id: event.id,
        dealId: event.calendar_event_id,
        dealName: event.title || 'Untitled Meeting',
        date: startDate,
        impact: 'neutral' as const,
        momentum: 0,
        keyOutcome: `${event.title || 'Calendar Event'} - ${event.location || 'Location TBD'}`,
        decisions: [],
        actionItems: [],
        insights: [
          `Organizer: ${event.organizer_name || event.organizer_email || 'Unknown'}`,
          `Duration: ${duration} minutes`,
          calendarSource,
          ...(event.location ? [`Location: ${event.location}`] : []),
          ...(event.meeting_link ? [`Meeting Link Available`] : []),
          ...(event.source === 'microsoft_calendar'
            ? ['🔗 Teams meeting detected']
            : []),
          ...(event.source === 'google_calendar'
            ? ['🔗 Google Meet detected']
            : []),
        ],
        participants:
          participants.length > 0
            ? participants
            : [event.organizer_email || 'Unknown'],
        duration: duration,
        transcriptAvailable: false,
        recordingAvailable: !!event.meeting_link,
        keyInsightSnippet: `${calendarSource} meeting with ${attendeeList.length || 1} participants`,
      };
    });

    return {
      success: true,
      meetings: transformedMeetings,
    };
  } catch (error) {
    console.error('Error in getMeetingsByDeal:', error);
    return {
      success: false,
      error: 'Internal server error',
      meetings: [],
    };
  }
}

// New function to check calendar connection status
export async function getCalendarConnectionStatus(accountId: string) {
  const supabase = getSupabaseServerClient();

  try {
    // Check Google Calendar connection
    const { data: googleTokens } = await supabase
      .from('gmail_tokens')
      .select('email_address, is_active, expires_at')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    // Check Microsoft Calendar connection
    const { data: microsoftTokens } = await supabase
      .from('microsoft_tokens')
      .select('email_address, is_active, expires_at')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    return {
      google: {
        connected: !!googleTokens,
        email: googleTokens?.email_address,
        expires_at: googleTokens?.expires_at,
      },
      microsoft: {
        connected: !!microsoftTokens,
        email: microsoftTokens?.email_address,
        expires_at: microsoftTokens?.expires_at,
      },
    };
  } catch (error) {
    console.error('Error checking calendar connection status:', error);
    return {
      google: { connected: false, email: null, expires_at: null },
      microsoft: { connected: false, email: null, expires_at: null },
    };
  }
}
