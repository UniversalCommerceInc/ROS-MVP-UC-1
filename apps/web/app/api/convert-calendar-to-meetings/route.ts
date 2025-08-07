import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const MEETGEEK_API_KEY = process.env.MEETGEEK_API_KEY;

async function inviteMeetGeekBot(meetingLink: string, meetingName: string): Promise<string | null> {
  if (!MEETGEEK_API_KEY || !meetingLink) {
    return null;
  }

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
      const meetgeekMeetingId = result.meeting_id || result.id || result.meetingId;
      
      if (meetgeekMeetingId) {
        console.log(`✅ MeetGeek bot invited successfully, meeting ID: ${meetgeekMeetingId}`);
        return meetgeekMeetingId;
      } else {
        console.warn(`⚠️ MeetGeek response didn't contain meeting_id:`, result);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ MeetGeek API error (${response.status}):`, errorText);
      
      if (response.status === 403 && errorText.includes('paid subscription')) {
        console.log('⚠️ MeetGeek requires paid subscription - skipping bot invitation');
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to invite MeetGeek bot:', error);
    return null;
  }
}

function extractMeetingLink(description: string): string | null {
  if (!description) return null;

  // Microsoft Teams link
  const teamsMatch = description.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>]+/);
  if (teamsMatch) return teamsMatch[0];

  // Google Meet link
  const meetMatch = description.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/);
  if (meetMatch) return meetMatch[0];

  // Zoom link
  const zoomMatch = description.match(/https:\/\/[a-z0-9-]+\.zoom\.us\/j\/[0-9]+/);
  if (zoomMatch) return zoomMatch[0];

  return null;
}

async function convertCalendarEventsToMeetings(accountId: string, userId: string) {
  const supabase = getSupabaseServerClient();

  console.log(`🔄 Converting calendar events to meetings for account: ${accountId}`);

  // Get all calendar events for this account
  const { data: calendarEvents, error: calendarError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('account_id', accountId);

  if (calendarError) {
    console.error('Error fetching calendar events:', calendarError);
    throw new Error('Failed to fetch calendar events');
  }

  console.log(`📅 Found ${calendarEvents?.length || 0} calendar events to convert`);

  let processedCount = 0;
  let createdCount = 0;
  let invitedCount = 0;
  let skippedAttendees = 0;
  let skippedExisting = 0;
  let skippedNoLink = 0;
  let insertErrors = 0;
  let sampleEvents = [];
  let errorSamples = [];

  for (const event of calendarEvents || []) {
    processedCount++;

    console.log(`\n📅 Processing event ${processedCount}: "${event.title}"`);

    // Add sample data for first 3 events
    if (sampleEvents.length < 3) {
      sampleEvents.push({
        title: event.title,
        calendar_event_id: event.calendar_event_id,
        attendees_count: Array.isArray(event.attendees) ? event.attendees.length : 0,
        has_description: !!event.description,
        organizer_email: event.organizer_email
      });
    }

    // Skip events without attendees (solo events)
    const attendeesArray = Array.isArray(event.attendees) ? event.attendees : [];
    console.log(`   👥 Attendees count: ${attendeesArray.length}`);
    
    if (attendeesArray.length < 2) {
      console.log(`   ⏭️  SKIPPED: Only ${attendeesArray.length} attendees (need 2+)`);
      skippedAttendees++;
      continue;
    }

    // Check if meeting already exists (using meeting_id since calendar_event_id doesn't exist in meetings table)
    console.log(`   🔍 Checking for existing meeting with meeting_id: cal_${event.calendar_event_id}`);
    const { data: existingMeeting, error: existingError } = await supabase
      .from('meetings')
      .select('id, meeting_id')
      .eq('account_id', accountId)
      .eq('meeting_id', `cal_${event.calendar_event_id}`)
      .maybeSingle();

    if (existingError) {
      console.error(`   ❌ Error checking existing meeting:`, existingError);
    }

    if (existingMeeting) {
      console.log(`   ⏭️  SKIPPED: Meeting already exists with ID: ${existingMeeting.id}`);
      skippedExisting++;
      continue;
    }

    console.log(`   ✅ No existing meeting found - proceeding to create`);

    // Extract meeting link from description
    const meetingLink = extractMeetingLink(event.description || '');
    console.log(`   🔗 Meeting link found: ${meetingLink ? 'Yes' : 'No'}`);
    if (meetingLink) {
      console.log(`   🔗 Link: ${meetingLink}`);
    }

    // Invite MeetGeek bot if there's a meeting link
    let meetgeekMeetingId = null;
    if (meetingLink && event.title) {
      console.log(`   🤖 Inviting MeetGeek bot...`);
      meetgeekMeetingId = await inviteMeetGeekBot(meetingLink, event.title);
      if (meetgeekMeetingId) {
        invitedCount++;
        console.log(`   ✅ Bot invited! MeetGeek ID: ${meetgeekMeetingId}`);
      } else {
        console.log(`   ⚠️  Bot invitation failed`);
      }
    } else {
      console.log(`   ⏭️  No bot invitation (no link or no title)`);
    }

    // Create meeting record
    console.log(`   📝 Creating meeting record...`);
    const meetingData = {
      account_id: accountId,
      meeting_id: meetgeekMeetingId || `cal_${event.calendar_event_id}`,
      deal_id: null, // Not associated with any deal initially
      title: event.title,
      host_email: event.organizer_email,
      source: 'google_calendar' as const,
      language: 'en-US',
      timestamp_start_utc: event.start_time,
      timestamp_end_utc: event.end_time,
      timezone: event.timezone || 'UTC',
      participant_emails: attendeesArray.map((a: any) => a.email || a.displayName || 'Unknown').filter(Boolean),
      start_time: event.start_time,
      end_time: event.end_time,
      recording_url: null,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`   📊 Meeting data:`, {
      source_calendar_event_id: event.calendar_event_id,
      meeting_id: meetingData.meeting_id,
      title: meetingData.title,
      attendees_count: meetingData.participant_emails.length
    });

    const { error: insertError } = await supabase
      .from('meetings')
      .insert(meetingData);

    if (insertError) {
      console.error(`   ❌ INSERT ERROR:`, insertError);
      insertErrors++;
      
      // Capture error details for debugging
      if (errorSamples.length < 3) {
        errorSamples.push({
          event_title: event.title,
          error_message: insertError.message,
          error_details: insertError.details,
          error_hint: insertError.hint,
          error_code: insertError.code,
          meeting_data_sample: {
            source_calendar_event_id: event.calendar_event_id,
            meeting_id: meetingData.meeting_id,
            account_id: meetingData.account_id
          }
        });
      }
    } else {
      console.log(`   ✅ Successfully created meeting record!`);
      createdCount++;
    }
  }

  console.log(`\n🎉 Conversion complete:`, {
    processed: processedCount,
    created: createdCount,
    invited: invitedCount,
    skipped: {
      attendees: skippedAttendees,
      existing: skippedExisting,
      noLink: skippedNoLink
    },
    insertErrors: insertErrors
  });

  return {
    success: true,
    processed: processedCount,
    created: createdCount,
    invited: invitedCount,
    skippedAttendees: skippedAttendees,
    skippedExisting: skippedExisting,
    insertErrors: insertErrors,
    sampleEvents: sampleEvents,
    errorSamples: errorSamples,
    breakdown: {
      totalEvents: calendarEvents?.length || 0,
      processedEvents: processedCount,
      createdMeetings: createdCount,
      invitedBots: invitedCount,
      skippedReasons: {
        insufficientAttendees: skippedAttendees,
        alreadyExists: skippedExisting,
        insertErrors: insertErrors
      }
    },
    message: `Successfully converted ${createdCount} calendar events to meetings and invited MeetGeek bot to ${invitedCount} meetings`,
  };
}

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

    // Verify user has access to this account
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('User does not have access to account:', membershipError);
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    const result = await convertCalendarEventsToMeetings(accountId, user.id);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Calendar to meetings conversion error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert calendar events',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    // Verify user has access to this account
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('User does not have access to account:', membershipError);
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    const result = await convertCalendarEventsToMeetings(accountId, user.id);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Calendar to meetings conversion error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert calendar events',
      },
      { status: 500 }
    );
  }
} 