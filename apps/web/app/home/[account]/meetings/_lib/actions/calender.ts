'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { refreshGoogleToken } from '~/features/gmail/utils';

interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  optional?: boolean;
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: CalendarEventAttendee[];
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      uri: string;
    }>;
  };
  status?: string;
  visibility?: string;
}

export async function syncCalendarEvents(accountId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Verify account exists and user has access
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return {
        success: false,
        error: 'Account not found or inaccessible',
      };
    }

    // Get Gmail tokens for the account
    const { data: gmailTokens, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (gmailError || !gmailTokens) {
      return {
        success: false,
        error: 'Google Calendar access token not available',
      };
    }

    let accessToken = gmailTokens.access_token;
    const refreshToken = gmailTokens.refresh_token;
    const tokenExpiry = gmailTokens.expires_at
      ? new Date(gmailTokens.expires_at)
      : null;

    // Refresh token if expired
    if (tokenExpiry && tokenExpiry < new Date() && refreshToken) {
      try {
        const refreshed = await refreshGoogleToken(refreshToken);
        accessToken = refreshed.access_token;
        const newExpiry = new Date(refreshed.token_expiry);

        // Update the DB with the new token/expiry
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: accessToken,
            expires_at: newExpiry.toISOString(),
          })
          .eq('id', gmailTokens.id);
      } catch (err) {
        console.error('Failed to refresh Google token:', err);
        return {
          success: false,
          error: 'Failed to refresh Google token',
        };
      }
    }

    // Fetch calendar events from Google Calendar API
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch calendar events',
      };
    }

    const calendarData = await response.json();

    // Convert calendar events to meetings
    for (const event of calendarData.items) {
      // Skip events without attendees or that are not meetings
      if (!event.attendees || event.attendees.length < 2) {
        continue;
      }

      // Create meeting record that matches the existing meetings table schema
      const meetingData = {
        account_id: accountId,
        deal_id: `calendar-${event.id}`, // You can later map this to actual deals
        title: event.summary || 'Calendar Meeting',
        summary: event.description || `Calendar Meeting: ${event.summary}`,
        highlights: {
          title: event.summary,
          attendees:
            event.attendees?.map((a: { email: string }) => a.email) || [],
          startTime: event.start?.dateTime || event.start?.date,
          endTime: event.end?.dateTime || event.end?.date,
        },
        action_items: [], // Can be populated later from meeting notes
        transcript_url: null, // Calendar events don't have transcripts initially
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
        participant_emails:
          event.attendees?.map((a: { email: string }) => a.email) || [],
        updated_at: new Date().toISOString(),
      };

      // Insert the meeting (ignore duplicates based on meeting_id)
      const { error } = await supabase.from('meetings').upsert(meetingData, {
        onConflict: 'account_id,meeting_id',
        ignoreDuplicates: true,
      });

      if (error) {
        console.error('Error saving calendar event as meeting:', error);
      }
    }

    return {
      success: true,
      eventsProcessed: calendarData.items.length,
    };
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function createCalendarEvent(
  accountId: string,
  eventData: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: string[];
  },
): Promise<{
  success: boolean;
  error?: string;
  eventId?: string;
  eventUrl?: string;
  meetLink?: string;
  icsContent?: string;
}> {
  try {
    const supabase = getSupabaseServerClient();

    // Verify account exists
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return {
        success: false,
        error: 'Account not found or inaccessible',
      };
    }

    // Get Gmail tokens for the account
    const { data: gmailTokens, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (gmailError || !gmailTokens) {
      console.error('Error fetching Gmail tokens:', gmailError);
      return {
        success: false,
        error:
          'Gmail account not found. Please connect your Gmail account first.',
      };
    }

    let googleAccessToken = gmailTokens.access_token;
    let googleRefreshToken = gmailTokens.refresh_token;
    let tokenExpiry = gmailTokens.expires_at
      ? new Date(gmailTokens.expires_at)
      : null;

    // Refresh token if expired
    if (tokenExpiry && tokenExpiry < new Date() && googleRefreshToken) {
      try {
        const refreshed = await refreshGoogleToken(googleRefreshToken);
        googleAccessToken = refreshed.access_token;
        tokenExpiry = new Date(refreshed.token_expiry);
        // Update the DB with the new token/expiry
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: googleAccessToken,
            expires_at: tokenExpiry.toISOString(),
          })
          .eq('id', gmailTokens.id);
      } catch (err) {
        console.error('Failed to refresh Google token:', err);
        return {
          success: false,
          error: 'Failed to refresh Google token',
        };
      }
    }

    if (!googleAccessToken) {
      console.error('No Google access token available');
      return {
        success: false,
        error: 'No valid Google access token available',
      };
    }

    // Debug: Log token info
    console.log('🔍 Debug token info:');
    console.log('Access token exists:', !!googleAccessToken);
    console.log('Access token length:', googleAccessToken?.length);
    console.log('Account email:', gmailTokens.email_address);

    // Check token scopes
    const tokenInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleAccessToken}`,
    );
    if (tokenInfoResponse.ok) {
      const tokenInfo = await tokenInfoResponse.json();
      console.log('Token scopes:', tokenInfo.scope);
      console.log('Token valid for:', tokenInfo.audience);

      // Check if we have the necessary scopes
      const requiredScopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];
      const missingScopes = requiredScopes.filter(
        (scope) => !tokenInfo.scope.includes(scope),
      );
      if (missingScopes.length > 0) {
        console.error('Missing required scopes:', missingScopes);
        return {
          success: false,
          error: `Missing required Google Calendar scopes: ${missingScopes.join(', ')}`,
        };
      }
    }

    // Format attendees with proper structure
    const formattedAttendees =
      eventData.attendees?.map((email) => ({
        email,
        responseStatus: 'needsAction',
        optional: false,
      })) || [];

    console.log('📧 Attendees:', formattedAttendees);

    // Format the event data
    const formattedSummary = eventData.summary.trim() || 'Untitled Meeting';
    const formattedDescription =
      eventData.description?.trim() ||
      `Meeting scheduled by ${gmailTokens.email_address}`;

    // Add Google Meet conferenceData
    const calendarEvent = {
      summary: formattedSummary,
      description: formattedDescription,
      start: {
        dateTime: eventData.start,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: eventData.end,
        timeZone: 'America/New_York',
      },
      attendees: formattedAttendees,
      sendUpdates: 'all', // Ensure email notifications are sent
      guestsCanModify: false,
      guestsCanSeeOtherGuests: true,
      conferenceData: {
        createRequest: {
          requestId: `${accountId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
          status: { statusCode: 'success' },
        },
      },
    };

    console.log(
      '📅 Creating calendar event:',
      JSON.stringify(calendarEvent, null, 2),
    );

    // First, verify the calendar access
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
      {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Calendar access error:', errorText);
      return {
        success: false,
        error: `Failed to access calendar: ${errorText}`,
      };
    }

    const calendarInfo = await calendarResponse.json();
    console.log('Calendar access verified:', calendarInfo);

    // Create the calendar event with explicit notification settings
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
        new URLSearchParams({
          conferenceDataVersion: '1',
          sendUpdates: 'all',
          supportsAttachments: 'true',
        }).toString(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...calendarEvent,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: true,
          sendUpdates: 'all', // Ensure email notifications are sent
        }),
      },
    );

    console.log('Calendar API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendar API error:', errorText);
      return {
        success: false,
        error: `Failed to create calendar event: ${errorText}`,
      };
    }

    const createdEvent = await response.json();
    console.log('✅ Calendar event created:', createdEvent);

    // Extract Google Meet join link
    let meetLink = createdEvent.hangoutLink;
    if (!meetLink && createdEvent.conferenceData?.entryPoints) {
      const meetEntry = createdEvent.conferenceData.entryPoints.find(
        (ep: any) => ep.entryPointType === 'video',
      );
      if (meetEntry) meetLink = meetEntry.uri;
    }

    if (!meetLink) {
      console.error('No Google Meet link generated');
      return {
        success: false,
        error: 'Failed to generate Google Meet link',
      };
    }

    console.log('✅ Google Meet link generated:', meetLink);

    // Generate .ics file content
    const icsContent = generateICSFile({
      summary: formattedSummary,
      description: formattedDescription,
      startTime: eventData.start,
      endTime: eventData.end,
      location: meetLink || '',
      organizer: gmailTokens.email_address,
      attendees: formattedAttendees.map((a) => a.email),
      eventId: createdEvent.id,
    });

    // Send email with .ics attachment
    try {
      console.log(
        'Sending email notification to:',
        formattedAttendees.map((a) => a.email),
      );
      const notificationResponse = await fetch(
        '/api/calendar/send-notification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: createdEvent.id,
            attendees: formattedAttendees.map((a) => a.email),
            summary: formattedSummary,
            startTime: eventData.start,
            endTime: eventData.end,
            location: meetLink,
            icsContent,
          }),
        },
      );

      if (!notificationResponse.ok) {
        const errorText = await notificationResponse.text();
        console.error('Failed to send email notification:', errorText);
      } else {
        console.log('✅ Email notification sent with .ics attachment');
      }
    } catch (err) {
      console.error('Error sending email notification:', err);
    }

    return {
      success: true,
      eventId: createdEvent.id,
      eventUrl: createdEvent.htmlLink,
      meetLink,
      icsContent,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

// Helper function to generate .ics file content
function generateICSFile({
  summary,
  description,
  startTime,
  endTime,
  location,
  organizer,
  attendees,
  eventId,
}: {
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  attendees: string[];
  eventId: string;
}) {
  const formatDate = (date: string) => {
    return (
      new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    );
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vellora//Calendar Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `DTSTAMP:${formatDate(new Date().toISOString())}`,
    `ORGANIZER;CN="${organizer}":mailto:${organizer}`,
    ...attendees.map(
      (email) =>
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${email}":mailto:${email}`,
    ),
    `UID:${eventId}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

export async function getCalendarEvents(accountId: string) {
  const supabase = getSupabaseServerClient();

  // Verify account exists
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    throw new Error('Account not found or inaccessible');
  }

  // Get Gmail tokens for the account
  const { data: gmailTokens, error: gmailError } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (gmailError || !gmailTokens) {
    throw new Error(
      'Google Calendar access token not available. Please re-authenticate.',
    );
  }

  let accessToken = gmailTokens.access_token;
  const refreshToken = gmailTokens.refresh_token;
  const tokenExpiry = gmailTokens.expires_at
    ? new Date(gmailTokens.expires_at)
    : null;

  // Refresh token if expired
  if (tokenExpiry && tokenExpiry < new Date() && refreshToken) {
    try {
      const refreshed = await refreshGoogleToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(refreshed.token_expiry);

      // Update the DB with the new token/expiry
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiry.toISOString(),
        })
        .eq('id', gmailTokens.id);
    } catch (err) {
      console.error('Failed to refresh Google token:', err);
      throw new Error('Failed to refresh Google token');
    }
  }

  // Debug: Check token info
  console.log('🔍 Debug token info:');
  console.log('Provider token exists:', !!accessToken);
  console.log('Provider token length:', accessToken?.length);
  console.log('Account email:', gmailTokens.email_address);

  try {
    // First, let's check what scopes this token has
    console.log('🔍 Checking token scopes...');
    const tokenInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`,
    );
    if (tokenInfoResponse.ok) {
      const tokenInfo = await tokenInfoResponse.json();
      console.log('Token scopes:', tokenInfo.scope);
      console.log('Token valid for:', tokenInfo.audience);
    } else {
      console.log('Could not get token info:', tokenInfoResponse.status);
    }

    // Fetch calendar events from Google Calendar API
    console.log('🔍 Attempting Calendar API call...');

    // Get events from the past 30 days and next 30 days for a more complete view
    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const params = new URLSearchParams({
      timeMin: pastDate.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: '250', // Increased from 50 to get more events
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    console.log(
      '📅 Fetching events from:',
      pastDate.toISOString(),
      'to:',
      futureDate.toISOString(),
    );

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Calendar API response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log('Calendar API error body:', errorBody);

      // If token is expired, we might need to refresh
      if (response.status === 401) {
        throw new Error(
          'Calendar access expired. Please sign out and sign back in.',
        );
      }
      throw new Error(`Calendar API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    console.log(
      '✅ Calendar API success, events found:',
      data.items?.length || 0,
    );

    // Debug: Log event types
    if (data.items?.length > 0) {
      console.log('📋 Event breakdown:');
      const eventTypes = data.items.reduce((acc: any, event: any) => {
        const hasDateTime = !!(event.start?.dateTime && event.end?.dateTime);
        const hasDate = !!(event.start?.date && event.end?.date);
        const hasAttendees = !!(event.attendees && event.attendees.length > 0);

        const type = hasDateTime ? 'timed' : hasDate ? 'all-day' : 'unknown';
        acc[type] = (acc[type] || 0) + 1;

        if (hasAttendees) {
          acc.withAttendees = (acc.withAttendees || 0) + 1;
        }

        return acc;
      }, {});

      console.log('   - Timed events:', eventTypes.timed || 0);
      console.log('   - All-day events:', eventTypes['all-day'] || 0);
      console.log('   - Events with attendees:', eventTypes.withAttendees || 0);
      console.log('   - Unknown format:', eventTypes.unknown || 0);
    }

    // Transform Google Calendar events to our format
    const events =
      data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
        attendees:
          event.attendees?.map((attendee: any) => ({
            email: attendee.email,
            displayName: attendee.displayName,
            responseStatus: attendee.responseStatus,
          })) || [],
        description: event.description || null,
        location: event.location || null,
        created_at: event.created,
        updated_at: event.updated,
      })) || [];

    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}
