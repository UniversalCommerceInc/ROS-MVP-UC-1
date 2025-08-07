import { NextResponse } from 'next/server';

import OpenAI from 'openai';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIAssistantRequest {
  dealId: string;
  companyName: string;
  dealValue: string;
  stage: string;
  painPoints?: string[];
  nextSteps?: string[];
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  meetingProvider?: 'google' | 'microsoft';
  emailProvider?: 'gmail' | 'outlook';
  requestType:
    | 'email'
    | 'call'
    | 'analysis'
    | 'next_steps'
    | 'general'
    | 'meeting_schedule';
  userMessage: string;
  startTime?: string;
  endTime?: string;
  // Enhanced deal context fields
  greenFlags?: string[];
  redFlags?: string[];
  organizationalContext?: string[];
  sentimentEngagement?: string[];
  competitorMentions?: string[];
  lastMeetingSummary?: string;
  emailSummary?: string;
  dealTitle?: string;
  relationshipInsights?: string;
  primaryContact?: string;
  primaryEmail?: string;
  lastMeetingDate?: string;
  totalMeetings?: number;
  momentum?: string;
  momentumTrend?: string;
}

// ADD: Provider availability checking function
const checkEmailProviderAvailability = async (
  supabase: any,
  accountId: string,
  userId: string,
): Promise<{
  gmail: boolean;
  outlook: boolean;
  availableProviders: ('gmail' | 'outlook')[];
}> => {
  try {
    console.log(
      '🔍 Checking email provider availability for account:',
      accountId,
      'user:',
      userId,
    );

    // Check Google/Gmail connection directly
    const { data: gmailToken, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('access_token, expires_at, is_active, email_address')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();

    const googleConnected =
      !gmailError &&
      gmailToken &&
      gmailToken.access_token &&
      gmailToken.is_active !== false &&
      (!gmailToken.expires_at || new Date(gmailToken.expires_at) > new Date());

    console.log('📧 Gmail check:', {
      hasToken: !!gmailToken?.access_token,
      isActive: gmailToken?.is_active,
      isExpired: gmailToken?.expires_at
        ? new Date(gmailToken.expires_at) <= new Date()
        : 'no expiry',
      connected: googleConnected,
      error: gmailError?.message,
    });

    // Check Microsoft connection directly
    const { data: microsoftToken, error: microsoftError } = await supabase
      .from('microsoft_tokens')
      .select('access_token, expires_at, is_active, email_address')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();

    const microsoftConnected =
      !microsoftError &&
      microsoftToken &&
      microsoftToken.access_token &&
      microsoftToken.is_active !== false &&
      (!microsoftToken.expires_at ||
        new Date(microsoftToken.expires_at) > new Date());

    console.log('📧 Microsoft check:', {
      hasToken: !!microsoftToken?.access_token,
      isActive: microsoftToken?.is_active,
      isExpired: microsoftToken?.expires_at
        ? new Date(microsoftToken.expires_at) <= new Date()
        : 'no expiry',
      connected: microsoftConnected,
      error: microsoftError?.message,
    });

    const availableProviders: ('gmail' | 'outlook')[] = [];
    if (googleConnected) availableProviders.push('gmail');
    if (microsoftConnected) availableProviders.push('outlook');

    console.log('📊 Final provider availability:', {
      gmail: googleConnected,
      outlook: microsoftConnected,
      availableProviders,
    });

    return {
      gmail: googleConnected,
      outlook: microsoftConnected,
      availableProviders,
    };
  } catch (error) {
    console.error('Error checking email provider availability:', error);
    return {
      gmail: false,
      outlook: false,
      availableProviders: [],
    };
  }
};

const getAvailableMeetingProvider = async (
  supabase: any,
  accountId: string,
  userId: string,
): Promise<'google' | 'microsoft' | null> => {
  try {
    // Check Google Calendar access
    const { data: gmailToken, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('access_token, expires_at, is_active')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();

    const googleAvailable =
      !gmailError &&
      gmailToken &&
      gmailToken.access_token &&
      gmailToken.is_active !== false &&
      (!gmailToken.expires_at || new Date(gmailToken.expires_at) > new Date());

    // Check Microsoft Calendar access
    const { data: microsoftToken, error: microsoftError } = await supabase
      .from('microsoft_tokens')
      .select('access_token, expires_at, is_active')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();

    const microsoftAvailable =
      !microsoftError &&
      microsoftToken &&
      microsoftToken.access_token &&
      microsoftToken.is_active !== false &&
      (!microsoftToken.expires_at ||
        new Date(microsoftToken.expires_at) > new Date());

    console.log('📅 Meeting provider availability:', {
      google: googleAvailable,
      microsoft: microsoftAvailable,
    });

    // Return the first available provider, preferring Google
    if (googleAvailable) return 'google';
    if (microsoftAvailable) return 'microsoft';
    return null;
  } catch (error) {
    console.error('Error checking meeting provider availability:', error);
    return null;
  }
};

const getSystemPrompt = (requestType: string) => {
  const basePrompt = `You are an expert B2B sales assistant integrated into a Revenue Operating System. You help sales professionals with their deals by providing specific, actionable advice.

Always provide practical, actionable responses that the salesperson can immediately use. Be concise but thorough. Format your responses with clear structure using markdown when helpful.`;

  switch (requestType) {
    case 'email':
      return `${basePrompt}

Your specialty is drafting professional, personalized sales emails. When asked to draft an email:

CRITICAL FORMATTING RULES:
- Output ONLY the email content - no introductory text like "Here's a draft email" or "I'll help you draft..."
- Start IMMEDIATELY with "Subject: [subject line]" on its own line
- Follow with exactly ONE blank line, then the email body
- Use PLAIN TEXT only - absolutely NO markdown, asterisks, bold, or special formatting
- Write naturally as if you're personally writing to the contact
- Keep it conversational yet professional
- End cleanly without signatures, disclaimers, or additional commentary

Content Guidelines:
1. Craft a compelling, specific subject line that references the deal context
2. Personalize the greeting using the contact's name
3. Reference specific pain points, positive signals, or recent conversations
4. Incorporate deal momentum and relationship insights
5. Address any risk factors or competitive mentions if relevant
6. Include a clear, actionable next step or call-to-action
7. Keep the email concise but value-packed
8. Use the company name and industry context naturally

REMEMBER: Your response should contain ONLY the email - no explanations, no additional text before or after.`;

    case 'call':
      return `${basePrompt}

Your specialty is helping schedule and prepare for sales calls. When asked about calls:
1. Suggest optimal times based on best practices
2. Provide a structured agenda
3. Include discovery questions to ask
4. Reference the deal's pain points and stage
5. Suggest preparation steps`;

    case 'analysis':
      return `${basePrompt}

Your specialty is analyzing B2B deals and providing strategic insights. When asked to analyze:
1. Assess the deal's current state and momentum
2. Identify specific pain points and challenges the customer is facing
3. Suggest strategies to address each pain point
4. Recommend specific next steps based on the analysis
5. Highlight risks and opportunities
6. When identifying pain points, format them clearly as a numbered or bulleted list

When specifically asked about pain points or challenges, focus on:
- Current inefficiencies in their processes
- Technology gaps or limitations  
- Resource constraints (time, money, people)
- Competitive pressures
- Compliance or regulatory challenges
- Scalability issues
- Integration problems
- Manual processes that could be automated`;

    case 'next_steps':
      return `${basePrompt}

Your specialty is providing specific, actionable next steps for sales deals. When asked about next steps:
1. Prioritize the most impactful actions
2. Consider the current deal stage and context
3. Suggest specific timeframes
4. Include both short-term and longer-term actions
5. Reference pain points and opportunities`;

    case 'meeting_schedule':
      return `${basePrompt}

Your specialty is helping schedule meetings conversationally. When the user wants to schedule a meeting:
1. If they're asking to schedule a meeting, show available times from their calendar
2. If they're specifying a time (like "next Tuesday at 2:30"), confirm the details and indicate the meeting will be scheduled
3. Be conversational and helpful
4. Always mention that the meeting will include Google Meet and MeetGeek bot for automatic transcription

Format available times in a clear, easy-to-read way. When showing available times, use this format:
• Monday, [Date] - 10:00 AM, 2:00 PM, 4:00 PM
• Tuesday, [Date] - 9:00 AM, 11:00 AM, 3:00 PM
etc.

When confirming a scheduled meeting, use this format:
✅ **Meeting Scheduled**
📅 **Date:** [Day], [Date] at [Time]
🎯 **Purpose:** [Meeting purpose]
📧 **Attendees:** [Contact name and email]
🎥 **Platform:** Google Meet (with MeetGeek bot for transcription)`;

    default:
      return `${basePrompt}

You can help with:
- Drafting emails and follow-ups
- Scheduling and preparing for calls
- Analyzing deals and identifying opportunities
- Suggesting next steps and strategies
- General sales advice and best practices

Respond helpfully to the user's request with specific, actionable guidance.`;
  }
};

// Helper function to refresh Google OAuth token
const refreshGoogleToken = async (
  supabase: any,
  refreshToken: string,
  accountId: string,
) => {
  try {
    console.log('🔄 Refreshing Google OAuth token for account:', accountId);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Missing Google OAuth environment variables');
      return null;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔄 Token refresh failed:', response.status, errorText);

      if (response.status === 400) {
        console.error('🔄 Refresh token may be expired or invalid');
      }

      return null;
    }

    const tokenData = await response.json();
    console.log(
      '✅ Successfully refreshed Google token, expires in:',
      tokenData.expires_in,
      'seconds',
    );

    // Update the access token and expiry time in the database
    const expiryTime = new Date(
      Date.now() + tokenData.expires_in * 1000,
    ).toISOString();

    const { error: updateError } = await supabase
      .from('gmail_tokens')
      .update({
        access_token: tokenData.access_token,
        expires_at: expiryTime,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    if (updateError) {
      console.error(
        '❌ Failed to update access token in database:',
        updateError,
      );
      return null;
    }

    console.log('✅ Updated access token in database, expires at:', expiryTime);
    return tokenData.access_token;
  } catch (error) {
    console.error('🔄 Error refreshing token:', error);
    return null;
  }
};
// Helper function to refresh Microsoft OAuth token
const refreshMicrosoftToken = async (
  supabase: any,
  refreshToken: string,
  accountId: string,
) => {
  try {
    console.log('🔄 Refreshing Microsoft OAuth token for account:', accountId);

    if (
      !process.env.MICROSOFT_CLIENT_ID ||
      !process.env.MICROSOFT_CLIENT_SECRET
    ) {
      console.error('❌ Missing Microsoft OAuth environment variables');
      return null;
    }

    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope:
            'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite',
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '🔄 Microsoft token refresh failed:',
        response.status,
        errorText,
      );
      return null;
    }

    const tokenData = await response.json();
    console.log('✅ Successfully refreshed Microsoft token');

    // Update the access token and expiry time in the database
    const expiryTime = new Date(
      Date.now() + tokenData.expires_in * 1000,
    ).toISOString();

    const { error: updateError } = await supabase
      .from('microsoft_tokens')
      .update({
        access_token: tokenData.access_token,
        expires_at: expiryTime,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    if (updateError) {
      console.error(
        '❌ Failed to update Microsoft access token in database:',
        updateError,
      );
      return null;
    }

    console.log('✅ Updated Microsoft access token in database');
    return tokenData.access_token;
  } catch (error) {
    console.error('🔄 Error refreshing Microsoft token:', error);
    return null;
  }
};

const fetchAvailableTimes = async (
  supabase: any,
  accountId: string,
  userMessage: string = '',
  meetingProvider: 'google' | 'microsoft' = 'google',
) => {
  try {
    // Determine timeframe based on user message
    const message = userMessage.toLowerCase();
    let timeframe: 'next5days' | 'nextweek' | 'thisweek' = 'next5days';
    let daysToLookAhead = 14;

    if (message.includes('next week')) {
      timeframe = 'nextweek';
      daysToLookAhead = 21; // Look ahead 3 weeks to capture next week
    } else if (message.includes('this week')) {
      timeframe = 'thisweek';
      daysToLookAhead = 7;
    } else {
      timeframe = 'next5days';
      daysToLookAhead = 14; // Look ahead 2 weeks to ensure we get 5 business days
    }

    console.log(
      '📅 Timeframe detected:',
      timeframe,
      'Provider:',
      meetingProvider,
    );

    // Get tokens based on meeting provider
    let tokenData = null;
    let tokenError = null;

    if (meetingProvider === 'microsoft') {
      // Check for Microsoft tokens
      const { data: microsoftToken, error: msError } = await supabase
        .from('microsoft_tokens')
        .select('access_token, refresh_token')
        .eq('account_id', accountId)
        .single();

      tokenData = microsoftToken;
      tokenError = msError;

      if (tokenError) {
        console.log('📅 No Microsoft token found for account:', accountId);
        return 'No Microsoft Calendar access available. Please connect Microsoft Outlook & Calendar first. Go to Emails → Connect Microsoft';
      }
    } else {
      // Check for Gmail tokens
      const { data: gmailToken, error: gmailError } = await supabase
        .from('gmail_tokens')
        .select('access_token, refresh_token')
        .eq('account_id', accountId)
        .single();

      tokenData = gmailToken;
      tokenError = gmailError;

      if (tokenError) {
        console.log('📅 No Gmail token found for account:', accountId);
        return 'No Google Calendar access available. Please connect Gmail & Calendar first. Go to Emails → Connect Gmail';
      }
    }

    if (!tokenData?.access_token) {
      const providerName =
        meetingProvider === 'microsoft' ? 'Microsoft' : 'Google';
      console.log(
        `📅 No ${providerName} access token available for account:`,
        accountId,
      );
      return `${providerName} Calendar access expired. Please reconnect ${providerName} Calendar. Go to Emails → Connect ${providerName}`;
    }

    // Set up time range for calendar query
    const now = new Date();
    const future = new Date(
      now.getTime() + daysToLookAhead * 24 * 60 * 60 * 1000,
    );
    let accessToken = tokenData.access_token;
    let events = [];

    if (meetingProvider === 'microsoft') {
      // Microsoft Graph API for calendar events
      console.log('📅 Fetching calendar events from Microsoft Graph API');

      const startTime = now.toISOString();
      const endTime = future.toISOString();

      let response = await fetch(
        `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${startTime}' and start/dateTime le '${endTime}'&$select=start,end,subject&$top=100&$orderby=start/dateTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // If token expired (401), try to refresh it
      if (response.status === 401 && tokenData.refresh_token) {
        console.log(
          '🔄 Microsoft access token expired, attempting to refresh...',
        );

        const newAccessToken = await refreshMicrosoftToken(
          supabase,
          tokenData.refresh_token,
          accountId,
        );

        if (newAccessToken) {
          console.log(
            '✅ Microsoft token refreshed successfully, retrying calendar request',
          );
          accessToken = newAccessToken;

          // Retry the request with new token
          response = await fetch(
            `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${startTime}' and start/dateTime le '${endTime}'&$select=start,end,subject&$top=100&$orderby=start/dateTime`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );
        } else {
          console.error('❌ Microsoft token refresh failed');
          return 'Microsoft Calendar access has expired and refresh failed. Please reconnect your Microsoft Calendar in Settings > Integrations.';
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          '📅 Microsoft Graph API error:',
          response.status,
          errorText,
        );

        if (response.status === 401) {
          return 'Microsoft Calendar access cannot be refreshed. Please reconnect your Microsoft Calendar in Settings > Integrations.';
        }

        return `Unable to fetch Microsoft Calendar availability (${response.status}). Please try again or reconnect your Microsoft Calendar.`;
      }

      const data = await response.json();
      console.log(
        '📅 Successfully fetched Microsoft calendar events:',
        data.value?.length || 0,
        'events',
      );

      events = (data.value || [])
        .filter((item: any) => item.start?.dateTime && item.end?.dateTime)
        .map((item: any) => ({
          start: item.start.dateTime,
          end: item.end.dateTime,
        }));
    } else {
      // Google Calendar API
      console.log('📅 Fetching calendar events from Google Calendar API');

      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: '100',
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      let response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // If token expired (401), try to refresh it
      if (response.status === 401 && tokenData.refresh_token) {
        console.log('🔄 Google access token expired, attempting to refresh...');

        const newAccessToken = await refreshGoogleToken(
          supabase,
          tokenData.refresh_token,
          accountId,
        );

        if (newAccessToken) {
          console.log(
            '✅ Google token refreshed successfully, retrying calendar request',
          );
          accessToken = newAccessToken;

          // Retry the request with new token
          response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );
        } else {
          console.error('❌ Google token refresh failed');
          return 'Google Calendar access has expired and refresh failed. Please reconnect your Google Calendar in Settings > Integrations.';
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          '📅 Google Calendar API error:',
          response.status,
          errorText,
        );

        if (response.status === 401) {
          return 'Google Calendar access cannot be refreshed. Please reconnect your Google Calendar in Settings > Integrations.';
        }

        return `Unable to fetch Google Calendar availability (${response.status}). Please try again or reconnect your Google Calendar.`;
      }

      const data = await response.json();
      console.log(
        '📅 Successfully fetched Google calendar events:',
        data.items?.length || 0,
        'events',
      );

      events = (data.items || [])
        .filter((item: any) => item.start?.dateTime && item.end?.dateTime)
        .map((item: any) => ({
          start: item.start.dateTime,
          end: item.end.dateTime,
        }));
    }

    // Generate available time slots with the specified timeframe
    const availableSlots = generateAvailableSlots(events, timeframe);
    console.log(
      '📅 Generated available slots for',
      availableSlots.length,
      'days',
    );

    return formatAvailableSlots(availableSlots);
  } catch (error) {
    console.error('📅 Error fetching calendar:', error);
    const providerName =
      meetingProvider === 'microsoft' ? 'Microsoft' : 'Google';
    return `Unable to fetch ${providerName} Calendar availability. Please check your ${providerName} Calendar connection in Settings > Integrations.`;
  }
};

// Helper function to generate available time slots
const generateAvailableSlots = (
  busyEvents: any[],
  timeframe: 'next5days' | 'nextweek' | 'thisweek' = 'next5days',
) => {
  const slots = [];
  const now = new Date();

  let startDay = 1;
  let maxDays = 7;
  let businessDaysToShow = 5;

  if (timeframe === 'nextweek') {
    // Find the start of next week (Monday)
    const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
    startDay = daysUntilNextMonday;
    maxDays = startDay + 7;
    businessDaysToShow = 5;
  } else if (timeframe === 'thisweek') {
    // Rest of this week
    startDay = 1;
    const daysLeftInWeek = 7 - now.getDay();
    maxDays = daysLeftInWeek;
    businessDaysToShow = 5;
  } else {
    // Default: next 5 business days
    startDay = 1;
    maxDays = 14; // Look ahead 2 weeks to ensure we get 5 business days
    businessDaysToShow = 5;
  }

  let businessDaysFound = 0;

  for (
    let i = startDay;
    i <= maxDays && businessDaysFound < businessDaysToShow;
    i++
  ) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split('T')[0];
    const daySlots = [];

    // Business hours: 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if slot conflicts with busy events
      const hasConflict = busyEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      if (!hasConflict) {
        daySlots.push(formatTime(slotStart));
      }
    }

    if (daySlots.length > 0) {
      slots.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dateFormatted: date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
        }),
        slots: daySlots,
      });
      businessDaysFound++;
    }
  }

  return slots;
};

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Helper function to format available slots for AI response
const formatAvailableSlots = (slots: any[]) => {
  if (slots.length === 0) {
    return 'No available time slots found in the next week.';
  }

  let formatted = '';
  slots.forEach((day) => {
    formatted += `${day.dayName}, ${day.dateFormatted}\n${day.slots.join('\n')}\n`;
  });

  return formatted;
};

// Helper function to parse natural language dates
const parseNaturalDate = (userMessage: string) => {
  const message = userMessage.toLowerCase();

  // Simple patterns for date/time parsing
  const patterns = [
    /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
    /(\d{1,2}):(\d{2})\s*(am|pm)/,
    /(\d{1,2})\s*(am|pm)/,
  ];

  const dateMatch =
    (patterns[0] && message.match(patterns[0])) ||
    (patterns[1] && message.match(patterns[1]));
  const timeMatch =
    (patterns[2] && message.match(patterns[2])) ||
    (patterns[3] && message.match(patterns[3]));

  if (dateMatch && timeMatch && dateMatch[1] && timeMatch[0]) {
    const dayName = dateMatch[1];
    const timeStr = timeMatch[0];

    // Find the next occurrence of this day
    const today = new Date();
    const targetDay = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ].indexOf(dayName.toLowerCase());

    if (targetDay === -1) return null; // Invalid day name

    const daysUntilTarget = (targetDay - today.getDay() + 7) % 7 || 7;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);

    // Parse time
    const hourStr = timeMatch[1];
    if (!hourStr) return null;

    let hour = parseInt(hourStr);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] || timeMatch[2];

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    targetDate.setHours(hour, minute, 0, 0);

    return {
      date: targetDate,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      timeStr: timeStr.toUpperCase(),
    };
  }

  return null;
};

export async function POST(request: Request) {
  console.log('🤖 AI Assistant API called');

  try {
    // Check critical environment variables first
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error:
            'OpenAI API not configured. Please check environment variables.',
          details: 'OPENAI_API_KEY missing',
        },
        { status: 500 },
      );
    }

    // Get account ID from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      console.error('❌ No account ID provided');
      return NextResponse.json(
        {
          success: false,
          error: 'Account ID is required',
        },
        { status: 400 },
      );
    }

    const body: AIAssistantRequest = await request.json();
    console.log('📝 Request details:', {
      requestType: body.requestType,
      dealId: body.dealId,
      companyName: body.companyName,
      accountId,
    });

    console.log(
      '🤖 Processing AI assistant request:',
      body.requestType,
      'for:',
      body.companyName,
      'account:',
      accountId,
    );

    const supabase = getSupabaseServerClient();

    // Verify account access
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    // Check if user has access to this account and get user details
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied to this account',
        },
        { status: 403 },
      );
    }

    if (body.requestType === 'email' && !body.emailProvider) {
      console.log(
        '📧 Email request without provider specified, checking availability...',
      );

      // Check if this is a follow-up request after provider selection
      const isProviderSelectionFollowup =
        body.userMessage.toLowerCase().includes('using gmail') ||
        body.userMessage.toLowerCase().includes('using outlook') ||
        body.userMessage
          .toLowerCase()
          .includes('draft a follow-up email using');

      if (isProviderSelectionFollowup) {
        // Extract provider from the message
        if (body.userMessage.toLowerCase().includes('gmail')) {
          body.emailProvider = 'gmail';
          console.log('📧 Auto-detected Gmail from follow-up message');
        } else if (body.userMessage.toLowerCase().includes('outlook')) {
          body.emailProvider = 'outlook';
          console.log('📧 Auto-detected Outlook from follow-up message');
        }
      } else {
        const providerAvailability = await checkEmailProviderAvailability(
          supabase,
          accountId,
          user.id,
        );

        if (providerAvailability.availableProviders.length === 0) {
          return NextResponse.json({
            success: false,
            response: `❌ **No Email Providers Connected**\n\nTo send emails, you need to connect at least one email provider:\n\n📧 **Gmail**: Connect your Gmail account\n📧 **Outlook**: Connect your Microsoft account\n\nGo to **Settings → Integrations** to connect your preferred email provider.`,
            requestType: body.requestType,
            requiresEmailProvider: true,
            availableProviders: [],
          });
        } else if (providerAvailability.availableProviders.length === 1) {
          const selectedProvider = providerAvailability.availableProviders[0];
          console.log(
            `📧 Auto-selecting ${selectedProvider} as only available provider`,
          );
          body.emailProvider = selectedProvider;
        } else {
          const providerNames = {
            gmail: 'Gmail',
            outlook: 'Outlook',
          };

          const availableNames = providerAvailability.availableProviders
            .map((p) => providerNames[p])
            .join(' and ');

          return NextResponse.json({
            success: true,
            response: `📧 **Choose Email Provider**\n\nYou have ${availableNames} connected. Which email provider would you like to use to send this email?`,
            requestType: body.requestType,
            requiresEmailProvider: true,
            availableProviders: providerAvailability.availableProviders,
            showEmailProviderSelector: true,
            dealInfo: {
              dealId: body.dealId,
              companyName: body.companyName,
              contactName: body.contactName || 'Contact',
              contactEmail: body.contactEmail || '',
            },
          });
        }
      }
    }

    // Get user's actual name for email signatures
    const { data: userAccount } = await supabase
      .from('accounts')
      .select('name, public_data')
      .eq('id', user.id)
      .single();

    const userName =
      userAccount?.name ||
      (userAccount?.public_data as any)?.name ||
      user.email?.split('@')[0] ||
      'Team Member';

    // Special handling for meeting scheduling
    if (body.requestType === 'meeting_schedule') {
      console.log('📅 Processing meeting scheduling request');

      // Check if user is asking to schedule a meeting or specifying a time
      const userMessage = body.userMessage.toLowerCase();
      const isSchedulingRequest =
        userMessage.includes('schedule') || userMessage.includes('meeting');
      const parsedDateTime = parseNaturalDate(body.userMessage);

      // Check if this is a general scheduling help request
      const isHelpRequest =
        userMessage.includes('help me schedule') ||
        (userMessage.includes('schedule') &&
          userMessage.includes('meeting') &&
          !parsedDateTime);

      if (isHelpRequest) {
        // User is asking for help scheduling - show available times
        console.log(
          '🎯 User requesting scheduling help, showing available times',
        );

        try {
          console.log('📅 Fetching available times...');

          // AUTO-DETECT AVAILABLE MEETING PROVIDER
          const availableMeetingProvider = await getAvailableMeetingProvider(
            supabase,
            accountId,
            user.id,
          );

          if (!availableMeetingProvider) {
            return NextResponse.json({
              success: true,
              response: `❌ **No Calendar Access Available**\n\nTo schedule meetings, you need to connect at least one calendar provider:\n\n📅 **Google Calendar**: Connect your Gmail account\n📅 **Microsoft Calendar**: Connect your Microsoft account\n\nGo to **Settings → Integrations** to connect your preferred calendar provider.`,
              isSchedulingResponse: true,
              dealInfo: {
                dealId: body.dealId,
                companyName: body.companyName,
                contactName: body.contactName || 'Contact',
                contactEmail: body.contactEmail || '',
              },
            });
          }

          console.log('📅 Using meeting provider:', availableMeetingProvider);

          const availableTimes = (await Promise.race([
            fetchAvailableTimes(
              supabase,
              accountId,
              body.userMessage,
              availableMeetingProvider,
            ),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error('Calendar fetch timeout after 15 seconds')),
                15000,
              ),
            ),
          ])) as string;

          console.log('✅ Available times fetched successfully');
          const response = `${availableTimes}`;

          return NextResponse.json({
            success: true,
            response,
            isSchedulingResponse: true,
            dealInfo: {
              dealId: body.dealId,
              companyName: body.companyName,
              contactName: body.contactName || 'Contact',
              contactEmail: body.contactEmail || '',
            },
            meetingProvider: availableMeetingProvider,
          });
        } catch (error) {
          console.error('❌ Error fetching available times:', error);
          console.error('❌ Calendar error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
          });
          return NextResponse.json({
            success: true,
            response: `I'd be happy to help you schedule a meeting with ${body.companyName}! 

Unfortunately, I couldn't fetch your calendar availability right now. Please tell me which day and time works best, like "schedule a meeting for next Tuesday at 2:30 PM" and I'll set it up with Google Meet and Vellora bot integration.`,
            isSchedulingResponse: true,
            dealInfo: {
              dealId: body.dealId,
              companyName: body.companyName,
              contactName: body.contactName || 'Contact',
              contactEmail: body.contactEmail || '',
            },
          });
        }
      } else if (parsedDateTime) {
        // User is specifying a time - create the meeting
        console.log(
          '🎯 User specified time, creating meeting:',
          parsedDateTime,
        );

        try {
          // For time slot scheduling, the body should contain startTime and endTime
          let startTime, endTime;

          if (body.startTime && body.endTime) {
            // Direct time slot scheduling - times are in local format
            startTime = body.startTime;
            endTime = body.endTime;
            console.log('📅 Using direct time slot times:', {
              startTime,
              endTime,
            });
          } else {
            // Fallback to parsed natural language
            startTime = parsedDateTime.date.toISOString();
            endTime = new Date(
              parsedDateTime.date.getTime() + 60 * 60 * 1000,
            ).toISOString();
            console.log('📅 Using parsed natural language times:', {
              startTime,
              endTime,
            });
          }

          // const meetingData = {
          //   dealId: body.dealId,
          //   title: `Meeting with ${body.companyName}`,
          //   description: `Meeting with ${body.contactName || 'Contact'} from ${body.companyName}`,
          //   startTime,
          //   endTime,
          //   location: 'Google Meet',
          //   attendees: body.contactEmail ? [body.contactEmail] : [],
          // };
          // Determine platform and location based on meetingProvider
          const platformName =
            body.meetingProvider === 'microsoft'
              ? 'Microsoft Teams'
              : 'Google Meet';
          const botName =
            body.meetingProvider === 'microsoft'
              ? 'Vellora bot'
              : 'Vellora bot';

          const meetingData = {
            dealId: body.dealId,
            title: `Meeting with ${body.companyName}`,
            description: `Meeting with ${body.contactName || 'Contact'} from ${body.companyName}`,
            startTime,
            endTime,
            location: platformName,
            attendees: body.contactEmail ? [body.contactEmail] : [],
            meetingProvider: body.meetingProvider || 'google', // Add this line
          };

          // Call the create-event API internally
          const createEventResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/create-event?accountId=${accountId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: request.headers.get('Cookie') || '', // Pass cookies for authentication
              },
              body: JSON.stringify(meetingData),
            },
          );

          if (!createEventResponse.ok) {
            throw new Error('Failed to create calendar event via API');
          }

          const eventData = await createEventResponse.json();

          // Also create a scheduled meeting record in our database
          const { data: scheduledMeeting, error: scheduledError } =
            await supabase
              .from('scheduled_meetings')
              .insert({
                account_id: accountId,
                deal_id: body.dealId,
                calendar_event_id:
                  eventData.eventId || eventData.calendar_event_id,
                meeting_title: `Meeting with ${body.companyName}`,
                meeting_description: `Meeting with ${body.contactName || 'Contact'} from ${body.companyName}`,
                start_time: startTime,
                end_time: endTime,
                attendees: body.contactEmail
                  ? [
                      {
                        email: body.contactEmail,
                        name: body.contactName || 'Contact',
                      },
                    ]
                  : [],
                created_by: user.id,
                updated_by: user.id,
              })
              .select()
              .single();

          if (scheduledError) {
            console.warn(
              '⚠️ Could not create scheduled meeting record:',
              scheduledError,
            );
            // Don't throw error here since the calendar event was created successfully
          }

          //           return NextResponse.json({
          //             success: true,
          //             response: `✅ Meeting Scheduled Successfully!

          // 📅 Date: ${parsedDateTime.dayName}, ${parsedDateTime.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${parsedDateTime.timeStr}
          // 🎯 Purpose: Meeting with ${body.companyName}
          // 📧 Attendees: ${body.contactName || 'Contact'} (${body.contactEmail || 'No email'})
          // 🎥 Platform: Google Meet (with Vellora bot for automatic transcription)

          // The meeting has been added to your calendar and the attendee will receive an invitation. The Vellora bot will automatically join to provide transcription and insights.
          // Don't forget to admit our bot :)`,
          //             requestType: body.requestType,
          //             dealId: body.dealId,
          //             meetingScheduled: true,
          //             meetingDetails: {
          //               date: parsedDateTime.date,
          //               eventId: eventData.eventId || eventData.calendar_event_id,
          //               meetLink: eventData.meetLink || eventData.meeting_link,
          //               meetgeekMeetingId: eventData.meetgeekMeetingId,
          //             },
          //           });

          return NextResponse.json({
            success: true,
            response: `✅ Meeting Scheduled Successfully!

📅 Date: ${parsedDateTime.dayName}, ${parsedDateTime.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${parsedDateTime.timeStr}
🎯 Purpose: Meeting with ${body.companyName}
📧 Attendees: ${body.contactName || 'Contact'} (${body.contactEmail || 'No email'})
🎥 Platform: ${platformName} (with ${botName} for automatic transcription)

The meeting has been added to your calendar and the attendee will receive an invitation. The ${botName} will automatically join to provide transcription and insights.
Don't forget to admit our bot :)`,
            requestType: body.requestType,
            dealId: body.dealId,
            meetingScheduled: true,
            meetingDetails: {
              date: parsedDateTime.date,
              eventId: eventData.eventId || eventData.calendar_event_id,
              meetLink: eventData.meetLink || eventData.meeting_link,
              meetgeekMeetingId: eventData.meetgeekMeetingId,
            },
          });
        } catch (error) {
          console.error('Error creating meeting:', error);
          return NextResponse.json({
            success: false,
            response: `❌ I encountered an error while scheduling the meeting. Please try again or use the calendar interface to schedule manually.`,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Fetch comprehensive deal information for rich context
    let meetingInsights = '';
    let emailSummaries = '';
    let keyInformation = '';

    try {
      // Get deal from database for latest info
      const { data: dealData } = await supabase
        .from('deals')
        .select('*')
        .eq('id', body.dealId)
        .eq('account_id', accountId)
        .single();

      if (dealData) {
        // Extract meeting insights
        if (
          dealData.last_meeting_summary ||
          (Array.isArray(dealData.meeting_highlights) &&
            dealData.meeting_highlights.length > 0)
        ) {
          meetingInsights = `
Meeting Insights:
${dealData.last_meeting_summary ? `- Last Meeting Summary: ${dealData.last_meeting_summary}` : ''}
${Array.isArray(dealData.meeting_highlights) && dealData.meeting_highlights.length > 0 ? `- Meeting Highlights: ${JSON.stringify(dealData.meeting_highlights)}` : ''}
${Array.isArray(dealData.green_flags) && dealData.green_flags.length > 0 ? `- Positive Signals: ${dealData.green_flags.join(', ')}` : ''}
${Array.isArray(dealData.red_flags) && dealData.red_flags.length > 0 ? `- Concerns/Risks: ${dealData.red_flags.join(', ')}` : ''}
${Array.isArray(dealData.organizational_context) && dealData.organizational_context.length > 0 ? `- Organizational Context: ${dealData.organizational_context.join(', ')}` : ''}
${Array.isArray(dealData.competitor_mentions) && dealData.competitor_mentions.length > 0 ? `- Competitors Mentioned: ${dealData.competitor_mentions.join(', ')}` : ''}
${Array.isArray(dealData.sentiment_engagement) && dealData.sentiment_engagement.length > 0 ? `- Sentiment & Engagement: ${dealData.sentiment_engagement.join(', ')}` : ''}`;
        }

        // Get key information (relationship insights)
        if (dealData.relationship_insights) {
          keyInformation = `
Key Information:
- Relationship Context: ${dealData.relationship_insights}`;
        }
      }

      // Get recent deal activities for context
      const { data: recentActivities } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('deal_id', body.dealId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentActivities?.length) {
        emailSummaries = `
Recent Activities:
${recentActivities.map((activity) => `- ${activity.title}: ${activity.description || 'No description'}`).join('\n')}`;
      }
    } catch (error) {
      console.log('⚠️ Could not fetch extended deal context:', error);
    }

    // Build comprehensive deal context for intelligent email drafting
    const positiveSignals =
      body.greenFlags && body.greenFlags.length > 0
        ? `\n- Positive Signals: ${body.greenFlags.join(', ')}`
        : '';

    const riskFactors =
      body.redFlags && body.redFlags.length > 0
        ? `\n- Risk Factors: ${body.redFlags.join(', ')}`
        : '';

    const organizationalInsights =
      body.organizationalContext && body.organizationalContext.length > 0
        ? `\n- Organizational Context: ${body.organizationalContext.join(', ')}`
        : '';

    const sentimentInfo =
      body.sentimentEngagement && body.sentimentEngagement.length > 0
        ? `\n- Communication Sentiment: ${body.sentimentEngagement.join(', ')}`
        : '';

    const competitorInfo =
      body.competitorMentions && body.competitorMentions.length > 0
        ? `\n- Competitor Mentions: ${body.competitorMentions.join(', ')}`
        : '';

    const meetingSummary = body.lastMeetingSummary
      ? `\n- Last Meeting Summary: ${body.lastMeetingSummary}`
      : '';

    const emailContext = body.emailSummary
      ? `\n- Recent Email Summary: ${body.emailSummary}`
      : '';

    const relationshipContext = body.relationshipInsights
      ? `\n- Relationship Insights: ${body.relationshipInsights}`
      : '';

    const dealMomentum =
      body.momentum !== undefined
        ? `\n- Deal Momentum: ${body.momentum}/100 (${body.momentumTrend || 'steady'})`
        : '';

    const meetingHistory =
      body.totalMeetings && body.totalMeetings > 0
        ? `\n- Meeting History: ${body.totalMeetings} meetings held`
        : '';

    const dealContext = `
Deal Context:
- Company: ${body.companyName}
- Industry: ${body.industry || 'Not specified'}
- Deal Value: ${body.dealValue}
- Stage: ${body.stage}
- Primary Contact: ${body.contactName || body.primaryContact || 'Not specified'} (${body.contactEmail || body.primaryEmail || 'No email'})
- Pain Points: ${body.painPoints?.length ? body.painPoints.join(', ') : 'Not specified'}
- Current Next Steps: ${body.nextSteps?.length ? body.nextSteps.join(', ') : 'Not specified'}${positiveSignals}${riskFactors}${organizationalInsights}${sentimentInfo}${competitorInfo}${meetingSummary}${emailContext}${relationshipContext}${dealMomentum}${meetingHistory}
${meetingInsights}
${keyInformation}
${emailSummaries}

User Request: ${body.userMessage}
`;

    // Use different AI approaches based on request type
    let completion: any;

    if (body.requestType === 'email') {
      // Use traditional chat completion for email drafting with specific email prompt
      console.log('📧 Using email drafting prompt...');
      completion = (await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert sales email writer. Create professional, personalized follow-up emails based on deal context. Always include:

RESPONSE FORMAT:
Subject: [Your subject line here]

[Email body here]

GUIDELINES:
- Keep emails concise (2-3 short paragraphs max)
- Reference specific deal context and pain points
- Include a clear call-to-action
- Use professional but warm tone
- Avoid pushy sales language
- Make it personal and relevant

The email should be ready to send as-is, with proper formatting.`,
            },
            {
              role: 'user',
              content: dealContext,
            },
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('OpenAI API timeout after 25 seconds')),
            25000,
          ),
        ),
      ])) as any;
    } else {
      // Use prompt ID for analysis and other requests
      console.log('🤖 Calling OpenAI API using prompt ID...');
      completion = (await Promise.race([
        (openai as any).responses.create({
          prompt: {
            id: 'pmpt_68534c5646e881949e3ed1797c84719a072e6b5ae9009e2e',
            version: '3',
          },
          input: [],
          text: {
            format: {
              type: 'text',
            },
          },
          reasoning: {},
          max_output_tokens: 1000,
          store: true,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('OpenAI API timeout after 25 seconds')),
            25000,
          ),
        ),
      ])) as any;
    }

    // Extract text content based on response type
    let aiResponse =
      'I apologize, but I encountered an issue generating a response. Please try again.';

    if (completion) {
      try {
        if (body.requestType === 'email') {
          // Handle traditional chat completion response for emails
          if (completion?.choices && completion.choices[0]?.message?.content) {
            aiResponse = completion.choices[0].message.content;
          }
        } else {
          // Handle prompt response format for analysis
          if (typeof completion === 'string') {
            aiResponse = completion;
          } else if (completion?.text && typeof completion.text === 'string') {
            aiResponse = completion.text;
          } else if (
            completion?.content &&
            typeof completion.content === 'string'
          ) {
            aiResponse = completion.content;
          } else if (
            completion?.output &&
            Array.isArray(completion.output) &&
            completion.output.length > 0
          ) {
            // New prompt format: extract from output array
            const output = completion.output[0];
            if (
              output &&
              output.content &&
              Array.isArray(output.content) &&
              output.content.length > 0
            ) {
              const contentItem = output.content[0];
              if (
                contentItem &&
                contentItem.text &&
                typeof contentItem.text === 'string'
              ) {
                aiResponse = contentItem.text;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error extracting AI response text:', error);
        aiResponse = 'Error processing AI response. Please try again.';
      }
    }

    console.log(
      '🤖 Extracted AI response:',
      aiResponse.substring(0, 100) + '...',
    );

    console.log('✅ AI response generated successfully');

    // Log the AI interaction to database for tracking
    try {
      await supabase.from('deal_activities').insert({
        deal_id: body.dealId,
        activity_type: 'ai_assistant',
        title: `AI ${body.requestType} assistance`,
        description: `Generated ${body.requestType} advice for ${body.companyName}`,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.log('⚠️ Could not log AI activity to database:', dbError);
      // Continue anyway - this is not critical
    }

    // Parse email components if this is an email request
    let emailComponents = null;
    if (body.requestType === 'email') {
      console.log('📧 Processing email request, full AI response:');
      console.log(aiResponse);

      try {
        // Look for subject line
        const subjectMatch = aiResponse.match(/Subject:\s*(.+?)(?:\n|$)/i);
        let extractedSubject = subjectMatch
          ? subjectMatch[1].trim()
          : `Following up on ${body.companyName}`;

        // Extract body - everything after the subject line
        let extractedBody = '';
        if (subjectMatch) {
          // Split on the subject line and take everything after it
          const parts = aiResponse.split(subjectMatch[0]);
          if (parts.length > 1) {
            extractedBody = parts[1].trim();
          }
        } else {
          // No subject found, use the whole response but clean it up
          extractedBody = aiResponse;
        }

        // Enhanced email body cleaning for better formatting
        extractedBody = extractedBody
          .replace(
            /^(Certainly!?|Sure!?|Here's.*?|I'll help.*?|I can help.*?|Here is.*?|Let me draft.*?)[\.\!\:]?\s*(\n\n?|\n)/i,
            '',
          ) // Remove AI preambles
          .replace(/^---+.*?\n\n?/i, '') // Remove separator lines
          .replace(/^\*\*Email Body:\*\*\s*\n/i, '') // Remove "Email Body:" headers
          .replace(/^\*\*Subject.*?\*\*\s*\n/i, '') // Remove "Subject:" headers with markdown
          .replace(/^\*\*(.+?)\*\*(\n|$)/gm, '$1$2') // Remove bold markdown headers
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove inline bold
          .replace(/\*(.+?)\*/g, '$1') // Remove italic markdown
          .replace(/`(.+?)`/g, '$1') // Remove code backticks
          .replace(/^\s*[\-\*\+]\s*/gm, '') // Remove list markers
          .replace(/^#+\s*/gm, '') // Remove markdown headers
          .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Convert markdown links to plain text
          .replace(/\n\s*\n\s*\n+/g, '\n\n') // Normalize excessive line breaks
          .replace(/^(\s*\n)+/, '') // Remove leading empty lines
          .replace(/(\n\s*)+$/, '') // Remove trailing empty lines
          // Replace placeholder with actual user name
          .replace(/\[Your [Nn]ame\]/g, userName)
          .replace(/\[Your name\]/g, userName)
          .replace(/\[YOUR NAME\]/g, userName)
          .trim();

        emailComponents = {
          subject: extractedSubject,
          body: extractedBody,
          to: body.contactEmail || '',
          cc: '',
          bcc: '',
        };

        console.log('📧 Extracted email components:');
        console.log('Subject:', extractedSubject);
        console.log('Body preview:', extractedBody.substring(0, 100) + '...');
        console.log('To:', body.contactEmail || '');
      } catch (error) {
        console.log('⚠️ Could not parse email components:', error);
        emailComponents = {
          subject: `Following up on ${body.companyName}`,
          body: aiResponse,
          to: body.contactEmail || '',
          cc: '',
          bcc: '',
        };
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      requestType: body.requestType,
      dealId: body.dealId,
      accountId: accountId,
      timestamp: new Date().toISOString(),
      emailComponents, // Include parsed email components for editor
      emailProvider: body.emailProvider,
    });
  } catch (error: unknown) {
    console.error('❌ Error in AI assistant:', error);
    console.error(
      '❌ Error stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    );
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    });

    // Return actual error details for debugging in production
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : String(error),
        requestType: 'unknown',
      },
      { status: 500 },
    );

    // Return a helpful fallback response based on request type
    const fallbackResponses = {
      email: `I can help you draft an email, but I'm experiencing technical difficulties. Here's a basic template:

**Subject:** Following up on our discussion

**Email:**
Hi [Contact Name],

I hope this email finds you well. I wanted to follow up on our recent conversation about [specific topic].

Based on our discussion about [pain point], I believe our solution could help by [benefit].

Would you be available for a brief call this week to discuss next steps?

Best regards,
[Your name]`,

      call: `I can help you prepare for a call. Here are some general best practices:

📅 **Scheduling:**
- Tuesday-Thursday, 10 AM - 4 PM typically work best
- Avoid Mondays and Fridays when possible

📝 **Call Agenda:**
1. Brief introduction and rapport building
2. Discovery questions about their current challenges
3. Present relevant solutions
4. Discuss implementation and next steps

🎯 **Key Questions to Ask:**
- What's driving this initiative?
- What's your timeline for making a decision?
- Who else is involved in the decision-making process?`,

      analysis: `I'd be happy to analyze this deal, but I'm experiencing technical difficulties. Here are some general analysis points to consider:

🔍 **Deal Health Check:**
- Is the decision-maker engaged?
- Do you understand their budget and timeline?
- Have you identified all stakeholders?
- Are there any red flags or concerns?

💡 **Recommendations:**
- Schedule regular check-ins
- Provide value-driven follow-ups
- Address any objections proactively
- Keep the momentum going with clear next steps`,

      next_steps: `I can suggest some general next steps:

🎯 **Immediate Actions (This Week):**
- Send follow-up email within 24 hours
- Schedule the next meeting or call
- Prepare any requested materials

📅 **Short-term Actions (Next 2 weeks):**
- Conduct product demo if needed
- Connect with additional stakeholders
- Address any outstanding questions

🚀 **Medium-term Actions (Next month):**
- Prepare proposal or pricing
- Plan implementation timeline
- Establish success metrics`,

      meeting_schedule: `I'd be happy to help you schedule a meeting, but I'm experiencing technical difficulties. Here are some general guidelines:

📅 **Best Meeting Times:**
- Tuesday-Thursday, 10 AM - 4 PM typically work best
- Avoid Monday mornings and Friday afternoons
- Consider the prospect's time zone

📞 **Meeting Preparation:**
- Send a calendar invite with agenda
- Include Google Meet link for convenience
- Prepare talking points and questions
- Allow 30-60 minutes depending on the meeting type

Please try saying "help me schedule a meeting" again and I'll show you available times from your calendar.`,

      general: `I'm here to help with your sales process, but I'm experiencing technical difficulties. I can assist with:

📧 Email drafting and follow-ups
📞 Call preparation and scheduling
📊 Deal analysis and strategy
🎯 Next steps and action planning

Please try your request again, or let me know specifically what you'd like help with.`,
    };

    // Get request type from body if available, otherwise default to 'general'
    let requestType = 'general';
    try {
      const body = await request.json();
      requestType = body.requestType || 'general';
    } catch {
      // If we can't parse the body, use 'general'
    }

    return NextResponse.json({
      success: false,
      response:
        fallbackResponses[requestType as keyof typeof fallbackResponses] ||
        fallbackResponses.general,
      error:
        error instanceof Error
          ? error.message
          : String(error as any) || 'Unknown error',
      fallback: true,
      requestType,
    });
  }
}
