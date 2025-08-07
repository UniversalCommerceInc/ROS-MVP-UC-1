'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getCalendarEvents } from './calender';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
}

interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  optional?: boolean;
}

export async function syncCalendarToMeetings(accountId: string) {
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
        processed: 0,
        saved: 0,
      };
    }

    console.log(`Starting calendar sync for account: ${account.name}`);

    // Check if account has already synced calendar events
    const { data: existingEvents, error: checkError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing events:', checkError);
    }

    console.log(
      `Found ${existingEvents?.length || 0} existing events, proceeding with sync...`,
    );

    // Get calendar events from Google
    const events = await getCalendarEvents(accountId);
    let processedCount = 0;
    let savedCount = 0;

    console.log(`Processing ${events.length} calendar events...`);

    for (const event of events) {
      processedCount++;

      console.log(`\n📅 Event ${processedCount}: "${event.title}"`);
      console.log(
        `   Start: ${event.start_time} (type: ${typeof event.start_time})`,
      );
      console.log(`   End: ${event.end_time} (type: ${typeof event.end_time})`);
      console.log(
        `   Has dateTime: start=${!!event.start_time}, end=${!!event.end_time}`,
      );

      // Only skip events that are completely missing time information
      if (!event.start_time || !event.end_time) {
        console.log(`   ⏭️  SKIPPED: Missing start or end time`);
        continue;
      }

      // Check if it's a date-only event (all-day) - but don't skip them anymore!
      const startIsDateOnly = !event.start_time.includes('T');
      const endIsDateOnly = !event.end_time.includes('T');

      if (startIsDateOnly || endIsDateOnly) {
        console.log(
          `   📅 All-day event detected (start: ${startIsDateOnly}, end: ${endIsDateOnly}) - including it!`,
        );
        // Convert date-only events to have times for consistency
        if (startIsDateOnly && event.start_time) {
          event.start_time = event.start_time + 'T09:00:00Z'; // Default to 9 AM
        }
        if (endIsDateOnly && event.end_time) {
          event.end_time = event.end_time + 'T17:00:00Z'; // Default to 5 PM
        }
      }

      console.log(`   ✅ Processing event...`);

      // Create calendar event record
      const calendarEventData = {
        account_id: accountId,
        calendar_event_id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || null,
        start_time: event.start_time,
        end_time: event.end_time,
        timezone: 'UTC',
        location: event.location || null,
        organizer_email: null,
        organizer_name: null,
        attendees: event.attendees || [],
        meeting_link: null,
        calendar_id: 'primary',
        status: 'confirmed',
        visibility: 'default',
        source: 'google_calendar',
        raw_event_data: event,
      };

      console.log(`   💾 Saving to database...`);

      // Upsert calendar event (update if exists, insert if new)
      const { error } = await supabase
        .from('calendar_events')
        .upsert(calendarEventData, {
          onConflict: 'account_id,calendar_event_id',
          ignoreDuplicates: false, // Update existing records
        });

      if (error) {
        console.error(`   ❌ Error saving calendar event ${event.id}:`, error);
      } else {
        console.log(`   ✅ Successfully saved event`);
        savedCount++;
      }
    }

    console.log(
      `\n🎉 Sync complete: processed ${processedCount}, saved ${savedCount}`,
    );

    return {
      success: true,
      processed: processedCount,
      saved: savedCount,
      message: `Successfully synced ${savedCount} calendar events! Your calendar is now integrated.`,
    };
  } catch (error) {
    console.error('Error in syncCalendarToMeetings:', error);

    // Check if it's a Gmail/token related error
    if (
      error instanceof Error &&
      (error.message.includes('token') ||
        error.message.includes('Gmail') ||
        error.message.includes('authentication') ||
        error.message.includes('access_token') ||
        error.message.includes('refresh_token') ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized'))
    ) {
      return {
        success: false,
        error:
          'Please connect Gmail & Calendar first. Go to Emails → Connect Gmail & Calendar',
        processed: 0,
        saved: 0,
      };
    }

    return {
      success: false,
      error: 'Internal server error',
      processed: 0,
      saved: 0,
    };
  }
}
