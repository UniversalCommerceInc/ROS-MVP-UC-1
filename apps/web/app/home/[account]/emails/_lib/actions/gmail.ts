'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  GmailAccountsResponse,
  GmailEmail,
  GmailEmailsResponse,
  SendEmailResponse,
  SyncResponse,
} from '../types';

export async function triggerGmailSync(
  accountId: string,
  email: string,
): Promise<SyncResponse> {
  console.log('🔍 triggerGmailSync called with:', { accountId, email });

  try {
    const supabase = getSupabaseServerClient();
    console.log('✅ Supabase client created');

    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('id, email_address, expires_at')
      .eq('account_id', accountId)
      .eq('email_address', email)
      .single();

    console.log('📊 Gmail token query result:', { tokenData, tokenError });

    if (tokenError || !tokenData) {
      console.log(
        '❌ Gmail token not found:',
        tokenError?.message || 'No data',
      );
      return {
        success: false,
        error: `Gmail account not connected: ${tokenError?.message || 'Token not found'}`,
      };
    }

    console.log('✅ Gmail token found:', {
      id: tokenData.id,
      email_address: tokenData.email_address,
      expires_at: tokenData.expires_at,
    });

    // Trigger sync via API - use NEXT_PUBLIC_SITE_URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const syncUrl = `${baseUrl}/api/gmail/sync`;
    console.log('🚀 Calling sync API:', syncUrl, 'baseUrl:', baseUrl);

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        email,
      }),
    });

    console.log('📥 Sync API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Sync API failed:', errorText);
      return {
        success: false,
        error: `Failed to trigger sync: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    console.log('✅ Sync API success:', result);

    return {
      success: true,
    };
  } catch (error) {
    console.error('💥 Error triggering Gmail sync:', error);
    return {
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function disconnectGmailAccount(
  accountId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServerClient();

    // Delete token data
    const { error } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('account_id', accountId)
      .eq('email_address', email);

    if (error) {
      return {
        success: false,
        error: 'Failed to disconnect account',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error disconnecting Gmail account:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function sendEmail(
  accountId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
): Promise<SendEmailResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/gmail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        to,
        subject,
        body,
        cc,
        bcc,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send email',
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messageId,
      threadId: data.threadId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getGmailAccounts(
  accountId: string,
): Promise<GmailAccountsResponse> {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('email_address, expires_at')
      .eq('account_id', accountId);

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch Gmail accounts',
      };
    }

    return {
      success: true,
      accounts: data,
    };
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getGmailEmails(
  accountId: string,
  options: {
    limit?: number;
    offset?: number;
    threadId?: string;
    search?: string;
    labels?: string[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  },
): Promise<GmailEmailsResponse> {
  try {
    const supabase = getSupabaseServerClient();
    const {
      limit = 50,
      offset = 0,
      threadId,
      search,
      labels,
      sortBy = 'received_at',
      sortDirection = 'desc',
    } = options;

    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId);

    // Apply filters
    if (threadId) {
      query = query.eq('thread_id', threadId);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%, body_text.ilike.%${search}%`,
      );
    }

    if (labels && labels.length > 0) {
      // Filter for emails that have at least one of the specified labels
      query = query.overlaps('labels', labels);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch emails',
      };
    }

    // Convert emails to proper GmailEmail format, handling null values
    const typedEmails = (data || []).map(email => ({
      ...email,
      to_email: email.to_email || [],
      cc_email: email.cc_email || [],
      bcc_email: email.bcc_email || [],
      labels: email.labels || []
    })) as GmailEmail[];

    return {
      success: true,
      emails: typedEmails,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching Gmail emails:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getDealRelatedEmails(
  accountId: string,
  options: {
    limit?: number;
    offset?: number;
    dealId?: string;
    search?: string;
  } = {},
): Promise<GmailEmailsResponse> {
  const { limit = 20, offset = 0, dealId, search } = options;

  try {
    const supabase = getSupabaseServerClient();

    // Calculate 6 weeks ago for performance filtering
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42); // 6 weeks = 42 days
    const sixWeeksAgoISO = sixWeeksAgo.toISOString();

    console.log('🕐 Filtering emails from the last 6 weeks:', {
      cutoffDate: sixWeeksAgoISO,
      accountId
    });

    // Get all relevant business contact emails efficiently
    const businessEmails = new Set<string>();

    // 1. Get emails from deal contacts (recent deals only)
    const { data: dealContactsData } = await supabase
      .from('deal_contacts')
      .select('email, deals!inner(created_at)')
      .not('email', 'is', null)
      .gte('deals.created_at', sixWeeksAgoISO);

    if (dealContactsData) {
      dealContactsData.forEach(contact => {
        if (contact.email) {
          businessEmails.add(contact.email.toLowerCase());
        }
      });
    }

    // 2. Get emails from recent meeting participants
    const { data: meetingsData } = await supabase
      .from('meetings')
      .select('participant_emails')
      .eq('account_id', accountId)
      .gte('created_at', sixWeeksAgoISO)
      .not('participant_emails', 'is', null);

    if (meetingsData) {
      meetingsData.forEach(meeting => {
        if (meeting.participant_emails && Array.isArray(meeting.participant_emails)) {
          meeting.participant_emails.forEach(email => {
            if (email) {
              businessEmails.add(email.toLowerCase());
            }
          });
        }
      });
    }

    // 3. Get emails from recent scheduled meeting attendees
    const { data: scheduledMeetingsData } = await supabase
      .from('scheduled_meetings')
      .select('attendees')
      .eq('account_id', accountId)
      .gte('created_at', sixWeeksAgoISO)
      .not('attendees', 'is', null);

    if (scheduledMeetingsData) {
      scheduledMeetingsData.forEach(meeting => {
        if (meeting.attendees && Array.isArray(meeting.attendees)) {
          meeting.attendees.forEach((attendee: any) => {
            if (attendee && attendee.email) {
              businessEmails.add(attendee.email.toLowerCase());
            }
          });
        }
      });
    }

    // 4. Get emails from recent calendar event attendees  
    const { data: calendarEventsData } = await supabase
      .from('calendar_events')
      .select('attendees, organizer_email')
      .eq('account_id', accountId)
      .gte('created_at', sixWeeksAgoISO)
      .not('attendees', 'is', null);

    if (calendarEventsData) {
      calendarEventsData.forEach(event => {
        // Add organizer email
        if (event.organizer_email) {
          businessEmails.add(event.organizer_email.toLowerCase());
        }
        
        // Add attendee emails
        if (event.attendees && Array.isArray(event.attendees)) {
          event.attendees.forEach((attendee: any) => {
            if (attendee && attendee.email) {
              businessEmails.add(attendee.email.toLowerCase());
            }
          });
        }
      });
    }

    console.log('🎯 Business emails found (last 6 weeks):', {
      totalBusinessEmails: businessEmails.size,
      sources: {
        dealContacts: dealContactsData?.length || 0,
        meetings: meetingsData?.length || 0,
        scheduledMeetings: scheduledMeetingsData?.length || 0,
        calendarEvents: calendarEventsData?.length || 0,
      }
    });

    // If no business contacts found, return empty results with guidance
    if (businessEmails.size === 0) {
      console.log('📭 No business contacts found - returning empty email list');
      return {
        success: true,
        emails: [],
        total: 0,
        debug: {
          message: 'No business contacts found. Add contacts to deals or schedule meetings to see relevant emails.'
        }
      };
    }

    // Build optimized email query with date filter
    let emailQuery = supabase
      .from('emails')
      .select('*')
      .eq('account_id', accountId)
      .gte('received_at', sixWeeksAgoISO); // Only get emails from last 6 weeks

    // Convert business emails to an array for the query
    const businessEmailsArray = Array.from(businessEmails);
    
    // Filter emails that are from OR to any business contact
    const emailFilters = businessEmailsArray
      .map(email => `from_email.eq.${email},to_email.cs.{"${email}"}`)
      .join(',');

    if (emailFilters) {
      emailQuery = emailQuery.or(emailFilters);
    }

    // Filter by specific deal if provided
    if (dealId) {
      const { data: dealContacts } = await supabase
        .from('deal_contacts')
        .select('email')
        .eq('deal_id', dealId)
        .not('email', 'is', null);

      if (dealContacts && dealContacts.length > 0) {
        const dealEmailsArray = dealContacts.map(dc => dc.email).filter(Boolean);
        const dealEmailFilters = dealEmailsArray
          .map(email => `from_email.eq.${email},to_email.cs.{"${email}"}`)
          .join(',');
        
        if (dealEmailFilters) {
          emailQuery = emailQuery.or(dealEmailFilters);
        }
      }
    }

    // Add search functionality
    if (search) {
      emailQuery = emailQuery.or(
        `subject.ilike.%${search}%,body_text.ilike.%${search}%`,
      );
    }

    // Apply sorting and pagination
    const { data: filteredEmails, error: emailsError } = await emailQuery
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (emailsError) {
      console.error('❌ Error fetching filtered emails:', emailsError);
      return {
        success: false,
        error: 'Failed to fetch emails',
        emails: [],
        total: 0,
      };
    }

    console.log('📧 Filtered emails result (last 6 weeks):', {
      found: filteredEmails?.length || 0,
      businessContactsCount: businessEmails.size,
      dateRange: `${sixWeeksAgoISO} to now`,
      offset,
      limit
    });

    // Convert emails to proper GmailEmail format, handling null to_email
    const typedEmails = (filteredEmails || []).map(email => ({
      ...email,
      to_email: email.to_email || [],
      cc_email: email.cc_email || [],
      bcc_email: email.bcc_email || [],
      labels: email.labels || []
    })) as GmailEmail[];

    return {
      success: true,
      emails: typedEmails,
      total: typedEmails.length,
    };
  } catch (error) {
    console.error('❌ Error in getDealRelatedEmails:', error);
    return {
      success: false,
      error: 'Internal server error',
      emails: [],
      total: 0,
    };
  }
}
