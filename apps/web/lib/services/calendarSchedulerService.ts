import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export interface CalendarEventDetails {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: { email: string; displayName?: string }[];
  dealId: string;
  user: any;
  gmailAccount?: { access_token: string; refresh_token: string };
  microsoftAccount?: { access_token: string; refresh_token: string };
  timeZone?: string;
  meetingProvider?: 'google' | 'microsoft';
}

class MicrosoftAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class CalendarSchedulerService {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  async scheduleEvent(details: CalendarEventDetails) {
    const provider = details.meetingProvider || 'google';

    if (provider === 'microsoft' && details.microsoftAccount) {
      return this.scheduleTeamsEvent(details);
    } else if (details.gmailAccount) {
      return this.scheduleGoogleEvent(details);
    } else {
      throw new Error(`No valid account credentials provided for ${provider}`);
    }
  }

  private async scheduleGoogleEvent(details: CalendarEventDetails) {
    this.oauth2Client.setCredentials({
      access_token: details.gmailAccount!.access_token,
      refresh_token: details.gmailAccount!.refresh_token,
    });

    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    } as any);

    const userTimeZone = details.timeZone || 'UTC';
    console.log(
      '📅 Creating Google Calendar event with timezone:',
      userTimeZone,
    );

    let startDateTime = details.startTime;
    let endDateTime = details.endTime;

    console.log('📅 Received datetime strings:', {
      startDateTime,
      endDateTime,
      userTimeZone,
    });

    const hasTimezoneOffset =
      startDateTime &&
      (startDateTime.includes('+') ||
        startDateTime.includes('-') ||
        startDateTime.includes('Z'));

    let eventStart, eventEnd;

    if (hasTimezoneOffset) {
      eventStart = { dateTime: startDateTime };
      eventEnd = { dateTime: endDateTime };
    } else {
      eventStart = { dateTime: startDateTime, timeZone: userTimeZone };
      eventEnd = { dateTime: endDateTime, timeZone: userTimeZone };
    }

    const eventDetails = {
      summary: details.title,
      description: details.description,
      start: eventStart,
      end: eventEnd,
      location: details.location,
      attendees: details.attendees,
      conferenceData: {
        createRequest: {
          requestId: `${details.dealId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    console.log(
      '📅 Creating Google Calendar event:',
      JSON.stringify(eventDetails, null, 2),
    );

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventDetails,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      console.log('✅ Google Calendar event created:', response.data.id);
      return {
        ...response.data,
        provider: 'google',
        meetingLink:
          response.data.conferenceData?.entryPoints?.[0]?.uri || null,
      };
    } catch (error) {
      console.error('❌ Google Calendar API error:', error);
      throw error;
    }
  }

  private async scheduleTeamsEvent(details: CalendarEventDetails) {
    const authProvider = new MicrosoftAuthProvider(
      details.microsoftAccount!.access_token,
    );
    const graphClient = Client.initWithMiddleware({ authProvider });

    const userTimeZone = details.timeZone || 'UTC';
    console.log(
      '📅 Creating Microsoft Teams event with timezone:',
      userTimeZone,
    );

    // Parse datetime strings
    let startDateTime = details.startTime;
    let endDateTime = details.endTime;

    // Convert to ISO format if needed
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    const eventDetails = {
      subject: details.title,
      body: {
        contentType: 'HTML',
        content: details.description || '',
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: userTimeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: userTimeZone,
      },
      location: {
        displayName: details.location || 'Microsoft Teams Meeting',
      },
      attendees: details.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.displayName || attendee.email,
        },
        type: 'required',
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    };

    console.log(
      '📅 Creating Microsoft Teams event:',
      JSON.stringify(eventDetails, null, 2),
    );

    try {
      const response = await graphClient.api('/me/events').post(eventDetails);

      console.log('✅ Microsoft Teams event created:', response.id);
      return {
        ...response,
        provider: 'microsoft',
        meetingLink: response.onlineMeeting?.joinUrl || null,
        conferenceData: {
          entryPoints: [
            {
              uri: response.onlineMeeting?.joinUrl,
              entryPointType: 'video',
            },
          ],
        },
      };
    } catch (error) {
      console.error('❌ Microsoft Graph API error:', error);
      throw error;
    }
  }

  // Helper method to refresh Microsoft token
  async refreshMicrosoftToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ) {
    const tokenEndpoint =
      'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope:
        'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite',
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to refresh Microsoft token: ${response.status} ${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error refreshing Microsoft token:', error);
      throw error;
    }
  }
}
