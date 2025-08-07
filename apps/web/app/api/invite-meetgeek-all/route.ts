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
        console.log(`   ✅ MeetGeek bot invited successfully, meeting ID: ${meetgeekMeetingId}`);
        return meetgeekMeetingId;
      } else {
        console.warn(`   ⚠️ MeetGeek response didn't contain meeting_id:`, result);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.error(`   ❌ MeetGeek API error (${response.status}):`, errorText);
      
      if (response.status === 403 && errorText.includes('paid subscription')) {
        console.log('   ⚠️ MeetGeek requires paid subscription - skipping bot invitation');
      }
      return null;
    }
  } catch (error) {
    console.error('   ❌ Failed to invite MeetGeek bot:', error);
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

async function inviteBotToAllMeetings(accountId: string, userId: string) {
  const supabase = getSupabaseServerClient();

  console.log(`🤖 Starting MeetGeek bot invitation for ALL meetings in account: ${accountId}`);

  // Get all calendar events for this account (including past, present, future)
  const { data: calendarEvents, error: calendarError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('account_id', accountId)
    .order('start_time', { ascending: false }); // Most recent first

  if (calendarError) {
    console.error('Error fetching calendar events:', calendarError);
    throw new Error('Failed to fetch calendar events');
  }

  console.log(`📅 Found ${calendarEvents?.length || 0} calendar events to process`);

  let processedCount = 0;
  let invitedCount = 0;
  let skippedCount = 0;
  let updatedMeetingsCount = 0;

  for (const event of calendarEvents || []) {
    processedCount++;

    console.log(`\n📅 Processing event ${processedCount}: "${event.title}"`);
    console.log(`   📅 Date: ${event.start_time}`);

    // Skip events without attendees (solo events)
    const attendeesArray = Array.isArray(event.attendees) ? event.attendees : [];
    if (attendeesArray.length < 2) {
      console.log(`   ⏭️  Skipping: Only ${attendeesArray.length} attendees`);
      skippedCount++;
      continue;
    }

    // Extract meeting link - first check the meeting_link field, then description
    let meetingLink = event.meeting_link;
    if (!meetingLink && event.description) {
      meetingLink = extractMeetingLink(event.description);
    }

    if (!meetingLink) {
      console.log(`   ⏭️  Skipping: No meeting link found`);
      skippedCount++;
      continue;
    }

    console.log(`   🔗 Meeting link: ${meetingLink}`);
    console.log(`   👥 Attendees: ${attendeesArray.length}`);

    // Always try to invite MeetGeek bot
    console.log(`   🤖 Inviting MeetGeek bot...`);
    const meetgeekMeetingId = await inviteMeetGeekBot(meetingLink, event.title || 'Meeting');
    
    if (meetgeekMeetingId) {
      invitedCount++;
      
      // Update or create meeting record with the MeetGeek ID
      const { data: existingMeeting } = await supabase
        .from('meetings')
        .select('id, meeting_id')
        .eq('account_id', accountId)
        .eq('calendar_event_id', event.calendar_event_id)
        .single();

      if (existingMeeting) {
        // Update existing meeting with MeetGeek ID
        const { error: updateError } = await supabase
          .from('meetings')
          .update({ 
            meeting_id: meetgeekMeetingId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMeeting.id);

        if (!updateError) {
          updatedMeetingsCount++;
          console.log(`   ✅ Updated meeting record with MeetGeek ID`);
        } else {
          console.error(`   ❌ Error updating meeting record:`, updateError);
        }
      } else {
        // Create new meeting record
        const meetingData = {
          account_id: accountId,
          calendar_event_id: event.calendar_event_id,
          meeting_id: meetgeekMeetingId,
          deal_id: null,
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

        const { error: insertError } = await supabase
          .from('meetings')
          .insert(meetingData);

        if (!insertError) {
          updatedMeetingsCount++;
          console.log(`   ✅ Created meeting record with MeetGeek ID`);
        } else {
          console.error(`   ❌ Error creating meeting record:`, insertError);
        }
      }
    } else {
      console.log(`   ⚠️  MeetGeek bot invitation failed or skipped`);
      skippedCount++;
    }
  }

  console.log(`\n🎉 MeetGeek bot invitation complete:`, {
    processed: processedCount,
    invited: invitedCount,
    skipped: skippedCount,
    meetingsUpdated: updatedMeetingsCount,
    scope: 'ALL calendar events (past, present, future)'
  });

  return {
    success: true,
    processed: processedCount,
    invited: invitedCount,
    skipped: skippedCount,
    meetingsUpdated: updatedMeetingsCount,
    message: `Successfully invited MeetGeek bot to ${invitedCount} meetings and updated ${updatedMeetingsCount} meeting records`,
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

    const result = await inviteBotToAllMeetings(accountId, user.id);
    return NextResponse.json(result);

  } catch (error) {
    console.error('MeetGeek bot invitation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite MeetGeek bot',
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

    const result = await inviteBotToAllMeetings(accountId, user.id);
    return NextResponse.json(result);

  } catch (error) {
    console.error('MeetGeek bot invitation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite MeetGeek bot',
      },
      { status: 500 }
    );
  }
} 