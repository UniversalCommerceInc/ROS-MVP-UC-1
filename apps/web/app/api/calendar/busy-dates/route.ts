import { NextResponse } from 'next/server';

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { groupEventsByDate } from '~/features/busyTimes';
import { refreshGoogleToken } from '~/features/gmail/utils';

const CENTRAL_TZ = 'America/Chicago';

class MicrosoftAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

// Helper function to refresh Microsoft token if expired
async function refreshMicrosoftToken(
  accountId: string,
  supabase: any,
): Promise<{
  success: boolean;
  access_token?: string;
  expires_at?: string;
  error?: string;
}> {
  try {
    const { data: tokenData, error: fetchError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (fetchError || !tokenData) {
      return {
        success: false,
        error: 'Microsoft account not connected',
      };
    }

    // Check if token is actually expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now < expiresAt) {
      return {
        success: true,
        access_token: tokenData.access_token,
        expires_at: tokenData.expires_at,
      };
    }

    console.log(
      '🔄 Refreshing expired Microsoft token for account:',
      accountId,
    );

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
          scope:
            'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite',
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `Failed to refresh Microsoft token: ${tokenResponse.status} ${errorText}`,
      );
    }

    const newTokenData = await tokenResponse.json();
    const expiresIn = newTokenData.expires_in || 3600;
    const newExpiryDate = new Date();
    newExpiryDate.setSeconds(newExpiryDate.getSeconds() + expiresIn);
    const newExpiresAt = newExpiryDate.toISOString();

    await supabase
      .from('microsoft_tokens')
      .update({
        access_token: newTokenData.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    return {
      success: true,
      access_token: newTokenData.access_token,
      expires_at: newExpiresAt,
    };
  } catch (error) {
    console.error('❌ Error refreshing Microsoft token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh token',
    };
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account ID is required',
        },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated',
        },
        { status: 401 },
      );
    }

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied to this account',
        },
        { status: 403 },
      );
    }

    let allEvents: { start: string; end: string }[] = [];

    // Fetch Google Calendar events
    const { data: gmailToken, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!gmailError && gmailToken) {
      console.log('✅ Found Gmail token, fetching Google Calendar events');

      let googleAccessToken = gmailToken?.access_token;
      let tokenExpiry = gmailToken?.expires_at
        ? new Date(gmailToken.expires_at)
        : null;

      // Refresh Google token if expired
      if (tokenExpiry && tokenExpiry < new Date() && gmailToken.refresh_token) {
        try {
          const refreshed = await refreshGoogleToken(gmailToken.refresh_token);
          if (refreshed.access_token && refreshed.expires_at) {
            googleAccessToken = refreshed.access_token;
            await supabase
              .from('gmail_tokens')
              .update({
                access_token: googleAccessToken,
                expires_at: refreshed.expires_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', gmailToken.id);
            console.log('🔄 Refreshed Google access token');
          }
        } catch (err) {
          console.error('Failed to refresh Google token:', err);
        }
      }

      if (googleAccessToken) {
        const now = new Date();
        const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const params = new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: future.toISOString(),
          maxResults: '250',
          singleEvents: 'true',
          orderBy: 'startTime',
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const googleEvents = (data.items || [])
            .filter((item: any) => item.start?.dateTime && item.end?.dateTime)
            .map((item: any) => ({
              start: item.start.dateTime,
              end: item.end.dateTime,
            }));

          allEvents.push(...googleEvents);
          console.log(
            '📅 Added',
            googleEvents.length,
            'Google Calendar events',
          );
        } else {
          console.error('Google Calendar API error:', await response.text());
        }
      }
    }

    // Fetch Microsoft Calendar events
    const { data: microsoftToken, error: microsoftError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!microsoftError && microsoftToken) {
      console.log(
        '✅ Found Microsoft token, fetching Microsoft Calendar events',
      );

      // Refresh Microsoft token if needed
      const tokenResult = await refreshMicrosoftToken(accountId, supabase);

      if (tokenResult.success && tokenResult.access_token) {
        try {
          const authProvider = new MicrosoftAuthProvider(
            tokenResult.access_token,
          );
          const graphClient = Client.initWithMiddleware({ authProvider });

          const now = new Date();
          const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          const events = await graphClient
            .api('/me/events')
            .select('start,end,subject,isAllDay')
            .filter(
              `start/dateTime ge '${now.toISOString()}' and start/dateTime le '${future.toISOString()}'`,
            )
            .top(250)
            .get();

          const microsoftEvents = (events.value || [])
            .filter(
              (item: any) =>
                item.start?.dateTime && item.end?.dateTime && !item.isAllDay,
            )
            .map((item: any) => ({
              start: item.start.dateTime,
              end: item.end.dateTime,
            }));

          allEvents.push(...microsoftEvents);
          console.log(
            '📅 Added',
            microsoftEvents.length,
            'Microsoft Calendar events',
          );
        } catch (msError) {
          console.error('❌ Microsoft Graph API error:', msError);
        }
      } else {
        console.warn('⚠️ Could not get valid Microsoft access token');
      }
    }

    // Fetch internal events from our database
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('start_time, end_time')
      .eq('account_id', accountId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (calendarError) {
      console.error('Error fetching calendar events:', calendarError);
    } else {
      const internalEvents = calendarEvents.map((event: any) => ({
        start: event.start_time,
        end: event.end_time,
      }));

      allEvents.push(...internalEvents);
      console.log(
        '📅 Added',
        internalEvents.length,
        'internal calendar events',
      );
    }

    console.log('📅 Total events collected:', allEvents.length);
    const busyTimes = groupEventsByDate(allEvents, CENTRAL_TZ);

    return NextResponse.json({
      success: true,
      busyTimes,
      eventSources: {
        google: !!gmailToken && !gmailError,
        microsoft: !!microsoftToken && !microsoftError,
        internal: !calendarError,
        totalEvents: allEvents.length,
      },
    });
  } catch (error) {
    console.error('Error in busy-dates route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
