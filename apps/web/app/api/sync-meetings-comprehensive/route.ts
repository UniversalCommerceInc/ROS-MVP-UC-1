// Enhanced sync-meetings-comprehensive API with Microsoft Calendar support
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

const MEETGEEK_API_KEY = process.env.MEETGEEK_API_KEY;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees: string[];
  meeting_link?: string;
  organizer_email?: string;
  source: 'google' | 'microsoft';
}

interface CalendarTokens {
  google?: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    email_address: string;
  };
  microsoft?: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    email_address: string;
    tenant_id?: string | null;
  };
}

async function getCalendarTokens(accountId: string): Promise<CalendarTokens> {
  const supabase = getSupabaseServerClient();
  const tokens: CalendarTokens = {};

  // Get Google tokens
  const { data: googleTokens } = await supabase
    .from('gmail_tokens')
    .select('access_token, refresh_token, expires_at, email_address')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .single();

  if (googleTokens) {
    tokens.google = googleTokens;
  }

  // Get Microsoft tokens
  const { data: microsoftTokens } = await supabase
    .from('microsoft_tokens')
    .select('access_token, refresh_token, expires_at, email_address, tenant_id')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .single();

  if (microsoftTokens) {
    tokens.microsoft = microsoftTokens;
  }

  return tokens;
}

async function refreshGoogleToken(
  accountId: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (response.ok) {
      const data = await response.json();

      // Update token in database
      const supabase = getSupabaseServerClient();
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: data.access_token,
          expires_at: new Date(
            Date.now() + data.expires_in * 1000,
          ).toISOString(),
        })
        .eq('account_id', accountId);

      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh Google token:', error);
  }
  return null;
}

async function refreshMicrosoftToken(
  accountId: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope:
            'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read',
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();

      // Update token in database
      const supabase = getSupabaseServerClient();
      await supabase
        .from('microsoft_tokens')
        .update({
          access_token: data.access_token,
          expires_at: new Date(
            Date.now() + data.expires_in * 1000,
          ).toISOString(),
        })
        .eq('account_id', accountId);

      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh Microsoft token:', error);
  }
  return null;
}

async function getGoogleCalendarEvents(
  tokens: CalendarTokens['google'],
  accountId: string,
): Promise<CalendarEvent[]> {
  if (!tokens) return [];

  let accessToken = tokens.access_token;

  // Check if token needs refresh
  if (new Date(tokens.expires_at) <= new Date()) {
    console.log('Google token expired, refreshing...');
    const newToken = await refreshGoogleToken(accountId, tokens.refresh_token);
    if (!newToken) return [];
    accessToken = newToken;
  }

  // Get events from 1 year ago to 1 year in the future
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${oneYearAgo.toISOString()}&` +
      `timeMax=${oneYearFromNow.toISOString()}&` +
      `maxResults=2500&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    console.error('Failed to fetch Google calendar events:', response.status);
    return [];
  }

  const calendarData = await response.json();
  const events: CalendarEvent[] = [];

  for (const event of calendarData.items || []) {
    // Skip events without attendees or that are not meetings
    if (!event.attendees || event.attendees.length < 2) continue;
    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    // Extract meeting link
    let meetingLink = null;
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === 'video',
      );
      if (videoEntry) meetingLink = videoEntry.uri;
    }

    // Check description for meeting links
    if (!meetingLink && event.description) {
      meetingLink = extractMeetingLink(event.description);
    }

    events.push({
      id: `google_${event.id}`,
      title: event.summary || 'Untitled Meeting',
      description: event.description || null,
      start_time: event.start.dateTime,
      end_time: event.end.dateTime,
      location: event.location || null,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      meeting_link: meetingLink,
      organizer_email: event.organizer?.email || null,
      source: 'google',
    });
  }

  console.log(`📅 Found ${events.length} Google Calendar events`);
  return events;
}

async function getMicrosoftCalendarEvents(
  tokens: CalendarTokens['microsoft'],
  accountId: string,
): Promise<CalendarEvent[]> {
  if (!tokens) return [];

  let accessToken = tokens.access_token;

  // Check if token needs refresh
  if (new Date(tokens.expires_at) <= new Date()) {
    console.log('Microsoft token expired, refreshing...');
    const newToken = await refreshMicrosoftToken(
      accountId,
      tokens.refresh_token,
    );
    if (!newToken) return [];
    accessToken = newToken;
  }

  // Get events from 1 year ago to 1 year in the future
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events?` +
      `$filter=start/dateTime ge '${oneYearAgo.toISOString()}' and start/dateTime le '${oneYearFromNow.toISOString()}'&` +
      `$select=id,subject,body,start,end,location,attendees,organizer,onlineMeeting&` +
      `$top=2500&` +
      `$orderby=start/dateTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    console.error(
      'Failed to fetch Microsoft calendar events:',
      response.status,
    );
    return [];
  }

  const calendarData = await response.json();
  const events: CalendarEvent[] = [];

  for (const event of calendarData.value || []) {
    // Skip events without attendees or that are not meetings
    if (!event.attendees || event.attendees.length < 2) continue;
    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    // Extract meeting link from onlineMeeting or body
    let meetingLink = null;
    if (event.onlineMeeting?.joinUrl) {
      meetingLink = event.onlineMeeting.joinUrl;
    } else if (event.body?.content) {
      meetingLink = extractMeetingLink(event.body.content);
    }

    events.push({
      id: `microsoft_${event.id}`,
      title: event.subject || 'Untitled Meeting',
      description: event.body?.content || null,
      start_time: event.start.dateTime,
      end_time: event.end.dateTime,
      location: event.location?.displayName || null,
      attendees:
        event.attendees
          ?.map((a: any) => a.emailAddress?.address)
          .filter(Boolean) || [],
      meeting_link: meetingLink,
      organizer_email: event.organizer?.emailAddress?.address || null,
      source: 'microsoft',
    });
  }

  console.log(`📅 Found ${events.length} Microsoft Calendar events`);
  return events;
}

function extractMeetingLink(description: string): string | null {
  if (!description) return null;

  // Microsoft Teams
  let match = description.match(
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"']+/,
  );
  if (match) return match[0];

  // Google Meet
  match = description.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/);
  if (match) return match[0];

  // Zoom
  match = description.match(/https:\/\/[a-z0-9-]+\.zoom\.us\/j\/[0-9]+/);
  if (match) return match[0];

  return null;
}

async function inviteMeetGeekBot(
  meetingLink: string,
  meetingName: string,
): Promise<string | null> {
  if (!MEETGEEK_API_KEY || !meetingLink) return null;

  try {
    console.log(`🤖 Inviting MeetGeek bot to: ${meetingName}`);

    const authHeader = MEETGEEK_API_KEY.startsWith('Bearer ')
      ? MEETGEEK_API_KEY
      : `Bearer ${MEETGEEK_API_KEY}`;

    const response = await fetch('https://api.meetgeek.ai/v1/bot/join', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        join_link: meetingLink,
        meeting_name: meetingName,
        language_code: 'en-US',
        template_name: 'General meeting',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const meetgeekMeetingId =
        result.meeting_id || result.id || result.meetingId;

      if (meetgeekMeetingId) {
        console.log(
          `✅ MeetGeek bot invited successfully, meeting ID: ${meetgeekMeetingId}`,
        );
        return meetgeekMeetingId;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ MeetGeek API error (${response.status}):`, errorText);
    }
  } catch (error) {
    console.error('❌ Failed to invite MeetGeek bot:', error);
  }
  return null;
}

async function syncCalendarEventsToMeetings(accountId: string): Promise<{
  processed: number;
  saved: number;
  invited: number;
  sources: string[];
}> {
  const supabase = getSupabaseServerClient();

  console.log(
    `🔄 Starting comprehensive meeting sync for account: ${accountId}`,
  );

  // Get tokens for both Google and Microsoft
  const tokens = await getCalendarTokens(accountId);
  const sources: string[] = [];

  if (tokens.google) sources.push('Google Calendar');
  if (tokens.microsoft) sources.push('Microsoft Calendar');

  if (sources.length === 0) {
    throw new Error(
      'No calendar tokens found. Please connect Google Calendar or Microsoft Calendar first.',
    );
  }

  console.log(`📅 Connected calendars: ${sources.join(', ')}`);

  // Fetch events from all connected calendars
  const [googleEvents, microsoftEvents] = await Promise.all([
    getGoogleCalendarEvents(tokens.google, accountId),
    getMicrosoftCalendarEvents(tokens.microsoft, accountId),
  ]);

  const allEvents = [...googleEvents, ...microsoftEvents];
  let processedCount = 0;
  let savedCount = 0;
  let invitedCount = 0;

  console.log(`📅 Processing ${allEvents.length} total calendar events...`);

  for (const event of allEvents) {
    processedCount++;

    console.log(
      `\n📅 Event ${processedCount}: "${event.title}" (${event.source})`,
    );
    console.log(`   📅 Date: ${event.start_time} to ${event.end_time}`);
    console.log(`   👥 Attendees: ${event.attendees.length}`);
    console.log(`   🔗 Has meeting link: ${event.meeting_link ? 'Yes' : 'No'}`);

    // Check if this event is already stored in calendar_events
    const { data: existingCalendarEvent } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('account_id', accountId)
      .eq('calendar_event_id', event.id)
      .single();

    // Store/update calendar event
    const calendarEventData = {
      account_id: accountId,
      calendar_event_id: event.id,
      title: event.title,
      description: event.description || null,
      start_time: event.start_time,
      end_time: event.end_time,
      timezone: 'UTC',
      location: event.location || null,
      organizer_email: event.organizer_email,
      organizer_name: null,
      attendees: event.attendees || [],
      meeting_link: event.meeting_link,
      calendar_id: 'primary',
      status: 'confirmed',
      visibility: 'default',
      source:
        event.source === 'google' ? 'google_calendar' : 'microsoft_calendar',
      raw_event_data: event as any,
    };

    if (!existingCalendarEvent) {
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .insert(calendarEventData);

      if (calendarError) {
        console.error(`❌ Error saving calendar event:`, calendarError);
        continue;
      }
      savedCount++;
      console.log(`   ✅ Saved calendar event`);
    } else {
      // Update existing calendar event
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(calendarEventData)
        .eq('id', existingCalendarEvent.id);

      if (!updateError) {
        console.log(`   ✅ Updated calendar event`);
      }
    }

    // Invite MeetGeek bot if there's a meeting link
    let meetgeekMeetingId = null;

    if (event.meeting_link) {
      console.log(`   🤖 Inviting MeetGeek bot to meeting...`);
      meetgeekMeetingId = await inviteMeetGeekBot(
        event.meeting_link,
        event.title,
      );
      if (meetgeekMeetingId) {
        invitedCount++;
        console.log(`   ✅ MeetGeek bot invited! ID: ${meetgeekMeetingId}`);
      }
    }

    // Create/update meeting record
    const { data: existingMeeting } = await supabase
      .from('meetings')
      .select('id, meeting_id')
      .eq('account_id', accountId)
      .eq('meeting_id', `cal_${event.id}`)
      .maybeSingle();

    const meetingData = {
      account_id: accountId,
      meeting_id: meetgeekMeetingId || `cal_${event.id}`,
      deal_id: null,
      title: event.title,
      host_email: event.organizer_email,
      source:
        event.source === 'google' ? 'google_calendar' : 'microsoft_calendar',
      language: 'en-US',
      timestamp_start_utc: event.start_time,
      timestamp_end_utc: event.end_time,
      timezone: 'UTC',
      participant_emails: event.attendees,
      start_time: event.start_time,
      end_time: event.end_time,
      recording_url: null,
      updated_at: new Date().toISOString(),
    };

    if (!existingMeeting) {
      const { error: meetingError } = await supabase
        .from('meetings')
        .insert(meetingData);

      if (!meetingError) {
        console.log(`   ✅ Created meeting record`);
      }
    } else if (
      meetgeekMeetingId &&
      existingMeeting.meeting_id !== meetgeekMeetingId
    ) {
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          meeting_id: meetgeekMeetingId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMeeting.id);

      if (!updateError) {
        console.log(`   ✅ Updated meeting record with MeetGeek ID`);
      }
    }
  }

  console.log(`\n🎉 Comprehensive sync complete:`, {
    processed: processedCount,
    saved: savedCount,
    invited: invitedCount,
    sources: sources,
    timeRange: '1 year ago to 1 year future',
  });

  return {
    processed: processedCount,
    saved: savedCount,
    invited: invitedCount,
    sources,
  };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const userIdParam = searchParams.get('userId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { triggerSource } = body;

    const supabase = getSupabaseServerClient();
    let userId: string;

    if (userIdParam) {
      const authHeader = request.headers.get('authorization');
      if (
        !authHeader?.startsWith(
          'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        )
      ) {
        return NextResponse.json(
          { error: 'Unauthorized server-to-server call' },
          { status: 401 },
        );
      }
      userId = userIdParam;
    } else {
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
      userId = user.id;
    }

    // Verify account exists and user has access
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or inaccessible' },
        { status: 404 },
      );
    }

    // Verify user has access to this account
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Perform comprehensive sync
    const syncResult = await syncCalendarEventsToMeetings(accountId);

    return NextResponse.json({
      success: true,
      processed: syncResult.processed,
      saved: syncResult.saved,
      invited: syncResult.invited,
      sources: syncResult.sources,
      message: `Successfully synced ${syncResult.saved} calendar events from ${syncResult.sources.join(' and ')} and invited MeetGeek bot to ${syncResult.invited} meetings`,
      accountId,
      triggerSource,
    });
  } catch (error) {
    console.error('Comprehensive meeting sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to sync meetings',
      },
      { status: 500 },
    );
  }
}
