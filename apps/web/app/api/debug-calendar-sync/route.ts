import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const searchTerm = searchParams.get('searchTerm') || 'test meeting asd';

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required as query parameter' },
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

    // Get Gmail tokens for this account
    const { data: tokens, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({
        success: false,
        error: 'No active Gmail tokens found for account',
        accountId,
      });
    }

    let accessToken = tokens.access_token;

    // Check if token needs refresh
    if (new Date(tokens.expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        // Update token in database
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: refreshData.access_token,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('account_id', accountId);
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to refresh Gmail token',
        });
      }
    }

    // Fetch ALL calendar events from Google Calendar API
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
      return NextResponse.json({
        success: false,
        error: `Failed to fetch calendar events: ${response.status}`,
      });
    }

    const calendarData = await response.json();
    const allEvents = calendarData.items || [];

    // Analyze ALL events and categorize them
    const analysis = {
      totalEvents: allEvents.length,
      filteredOut: {
        noAttendees: [] as any[],
        insufficientAttendees: [] as any[],
        allDayEvents: [] as any[],
        noStartTime: [] as any[],
        noEndTime: [] as any[],
        validEvents: [] as any[],
      },
      searchMatches: [] as any[],
    };

    for (const event of allEvents) {
      const eventInfo = {
        id: event.id,
        title: event.summary || 'Untitled',
        start: event.start,
        end: event.end,
        attendees: event.attendees || [],
        attendeeCount: (event.attendees || []).length,
        organizer: event.organizer?.email,
        status: event.status,
        eventType: event.eventType,
        description: event.description || '',
        isMatchingSearch: (event.summary || '').toLowerCase().includes(searchTerm.toLowerCase()),
      };

      // Check search term match
      if (eventInfo.isMatchingSearch) {
        analysis.searchMatches.push(eventInfo);
      }

      // Apply the same filtering logic as the sync
      if (!event.attendees) {
        analysis.filteredOut.noAttendees.push(eventInfo);
      } else if (event.attendees.length < 2) {
        analysis.filteredOut.insufficientAttendees.push(eventInfo);
      } else if (!event.start?.dateTime || !event.end?.dateTime) {
        if (!event.start?.dateTime) analysis.filteredOut.noStartTime.push(eventInfo);
        if (!event.end?.dateTime) analysis.filteredOut.noEndTime.push(eventInfo);
        if (event.start?.date || event.end?.date) analysis.filteredOut.allDayEvents.push(eventInfo);
      } else {
        // This would pass the filters
        analysis.filteredOut.validEvents.push(eventInfo);
      }
    }

    // Additional debug: show recent events
    const recentEvents = allEvents
      .filter((event: any) => {
        const eventTime = new Date(event.start?.dateTime || event.start?.date || '');
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        return eventTime >= threeDaysAgo && eventTime <= threeDaysFromNow;
      })
      .map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled',
        start: event.start,
        end: event.end,
        attendees: (event.attendees || []).map((a: any) => a.email),
        attendeeCount: (event.attendees || []).length,
        organizer: event.organizer?.email,
        description: event.description || '',
      }));

    return NextResponse.json({
      success: true,
      searchTerm,
      accountId,
      analysis,
      recentEvents: recentEvents.slice(0, 10), // Show only recent 10
      summary: {
        total: analysis.totalEvents,
        searchMatches: analysis.searchMatches.length,
        noAttendees: analysis.filteredOut.noAttendees.length,
        insufficientAttendees: analysis.filteredOut.insufficientAttendees.length,
        allDayEvents: analysis.filteredOut.allDayEvents.length,
        validForSync: analysis.filteredOut.validEvents.length,
      },
    });

  } catch (error) {
    console.error('Debug calendar sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to debug calendar sync',
      },
      { status: 500 }
    );
  }
} 