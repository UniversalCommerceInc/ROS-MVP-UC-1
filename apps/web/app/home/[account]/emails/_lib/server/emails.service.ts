'use server';

import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Gmail API types using the actual googleapis types
type GmailMessage = gmail_v1.Schema$Message;
type GmailHeader = gmail_v1.Schema$MessagePartHeader;

interface TokenData {
  account_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface ParsedEmailData {
  threadId: string;
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string };
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  headers: Record<string, string>;
}

export type EmailFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  labels?: string[];
  sortBy?: 'received_at' | 'subject';
  sortDirection?: 'asc' | 'desc';
};

export type Email = {
  id: string;
  gmail_message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_email: string;
  to_name?: string;
  body_text?: string;
  is_read: boolean;
  is_starred: boolean;
  received_at: string;
  labels: string[];
};

/**
 * Get emails for an account with filtering and pagination
 */
export async function getAccountEmails(
  accountId: string,
  filters: EmailFilters = {},
) {
  try {
    const supabase = getSupabaseServerClient();

    const {
      limit = 20,
      offset = 0,
      search = '',
      labels = ['INBOX'],
      sortBy = 'received_at',
      sortDirection = 'desc',
    } = filters;

    const { data, error } = await supabase.rpc('get_gmail_emails', {
      p_account_id: accountId,
      p_limit: limit,
      p_offset: offset,
      p_search: search,
      p_labels: labels,
      p_sort_by: sortBy,
      p_sort_direction: sortDirection,
    });

    if (error) {
      const logger = await getLogger();
      logger.error('Failed to get emails', { error, accountId });
      return { success: false, emails: [], error: error.message };
    }

    return {
      success: true,
      emails: (data as Email[]) || [],
      error: null,
    };
  } catch (error) {
    const logger = await getLogger();
    logger.error('Failed to get emails', { error, accountId });
    return {
      success: false,
      emails: [],
      error: 'Failed to fetch emails',
    };
  }
}

/**
 * Check if account has Gmail integration
 */
export async function hasGmailIntegration(accountId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('gmail_tokens')
      .select('id')
      .eq('account_id', accountId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get Gmail integration status for account
 */
export async function getGmailIntegrationStatus(accountId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data: tokens } = await supabase
      .from('gmail_tokens')
      .select('email_address, created_at')
      .eq('account_id', accountId)
      .single();

    const { data: syncStatus } = await supabase
      .from('email_sync_status')
      .select('*')
      .eq('account_id', accountId)
      .single();

    return {
      isConnected: !!tokens,
      emailAddress: tokens?.email_address,
      connectedAt: tokens?.created_at,
      syncStatus: syncStatus?.sync_status || 'not_started',
      lastSyncAt: syncStatus?.last_sync_at,
      totalEmailsSynced: syncStatus?.total_emails_synced || 0,
      errorMessage: syncStatus?.error_message,
    };
  } catch (error) {
    const logger = await getLogger();
    logger.error('Failed to get Gmail integration status', {
      error,
      accountId,
    });
    return {
      isConnected: false,
      emailAddress: null,
      connectedAt: null,
      syncStatus: 'not_started',
      lastSyncAt: null,
      totalEmailsSynced: 0,
      errorMessage: null,
    };
  }
}

/**
 * Sync emails from Gmail for an account
 */
export async function syncGmailEmails(accountId: string): Promise<{
  success: boolean;
  emailsSynced?: number;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    // Get Gmail tokens for this account
    logger.info('Fetching Gmail tokens', { accountId });

    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    logger.info('Token fetch result', {
      hasTokenData: !!tokenData,
      tokenError: tokenError?.message,
      accountId,
    });

    if (tokenError || !tokenData) {
      logger.error('No Gmail tokens found', { tokenError, accountId });
      return {
        success: false,
        error: 'Gmail account not connected',
      };
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    let accessToken = tokenData.access_token;

    if (now >= expiresAt) {
      // Token is expired, refresh it
      const refreshResult = await refreshGmailToken(tokenData);
      if (!refreshResult.success) {
        return {
          success: false,
          error: 'Failed to refresh Gmail token',
        };
      }
      accessToken = refreshResult.accessToken!;
    }

    // Initialize Gmail API
    logger.info('Initializing Gmail API', { hasAccessToken: !!accessToken });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    logger.info('Gmail API initialized successfully');

    // Get existing emails to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('emails')
      .select('gmail_message_id')
      .eq('account_id', accountId);

    const existingMessageIds = new Set(
      existingEmails?.map((email) => email.gmail_message_id) || [],
    );

    // Fetch emails from Gmail (last 50 emails from inbox)
    logger.info('Fetching emails from Gmail API');

    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 50,
    });

    logger.info('Gmail API response received', {
      messageCount: messagesResponse.data.messages?.length || 0,
    });

    const messages = messagesResponse.data.messages || [];
    const emailsToInsert = [];
    let emailsSynced = 0;

    // Process each message
    for (const message of messages) {
      if (!message.id || existingMessageIds.has(message.id)) {
        continue; // Skip if already exists
      }

      try {
        const messageDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const emailData = parseGmailMessage(messageDetail.data);

        if (emailData) {
          emailsToInsert.push({
            account_id: accountId,
            gmail_message_id: message.id,
            thread_id: emailData.threadId,
            subject: emailData.subject,
            from_email: emailData.from.email,
            from_name: emailData.from.name,
            to_email: emailData.to.email,
            to_name: emailData.to.name,
            body_text: emailData.bodyText,
            body_html: emailData.bodyHtml,
            received_at: emailData.receivedAt.toISOString(),
            labels: emailData.labels,
            is_read: emailData.isRead,
            is_starred: emailData.isStarred,
            raw_headers: emailData.headers,
          });
          emailsSynced++;
        }
      } catch (msgError) {
        logger.error('Failed to process Gmail message', {
          messageId: message.id,
          error: msgError,
        });
      }
    }

    // Insert emails in batches
    if (emailsToInsert.length > 0) {
      logger.info('Inserting emails into database', {
        emailCount: emailsToInsert.length,
        sampleEmail: emailsToInsert[0],
      });

      const { error: insertError } = await supabase
        .from('emails')
        .insert(emailsToInsert);

      if (insertError) {
        logger.error('Database insert failed', {
          insertError: insertError.message,
          emailCount: emailsToInsert.length,
        });
        throw insertError;
      }

      logger.info('Successfully inserted emails', {
        emailCount: emailsToInsert.length,
      });
    } else {
      logger.info('No new emails to insert');
    }

    // Update sync status
    await supabase.from('email_sync_status').upsert({
      account_id: accountId,
      last_sync_at: new Date().toISOString(),
      sync_status: 'completed',
      total_emails_synced: emailsSynced,
    });

    logger.info('Gmail sync completed', { accountId, emailsSynced });

    return {
      success: true,
      emailsSynced,
    };
  } catch (error) {
    logger.error('Gmail sync failed', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    // Update sync status to failed
    await supabase.from('email_sync_status').upsert({
      account_id: accountId,
      sync_status: 'failed',
      last_sync_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: 'Failed to sync emails from Gmail',
    };
  }
}

/**
 * Refresh Gmail OAuth token
 */
async function refreshGmailToken(tokenData: TokenData): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('No access token returned');
    }

    // Update token in database
    const { error: updateError } = await supabase
      .from('gmail_tokens')
      .update({
        access_token: credentials.access_token,
        expires_at: new Date(
          Date.now() + (credentials.expiry_date || 3600000),
        ).toISOString(),
      })
      .eq('account_id', tokenData.account_id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      accessToken: credentials.access_token,
    };
  } catch (error) {
    logger.error('Failed to refresh Gmail token', { error });
    return {
      success: false,
      error: 'Failed to refresh token',
    };
  }
}

/**
 * Parse Gmail message data
 */
function parseGmailMessage(message: GmailMessage): ParsedEmailData | null {
  try {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(
        (h: GmailHeader) => h.name?.toLowerCase() === name.toLowerCase(),
      )?.value || '';

    const subject = getHeader('Subject');
    const from = parseEmailAddress(getHeader('From'));
    const to = parseEmailAddress(getHeader('To'));
    const dateStr = getHeader('Date');

    let bodyText = '';
    let bodyHtml = '';

    // Extract body from payload
    if (message.payload?.body?.data) {
      bodyText = Buffer.from(message.payload.body.data, 'base64').toString(
        'utf-8',
      );
    } else if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    const labelIds = message.labelIds || [];

    return {
      threadId: message.threadId || '',
      subject: subject || '(No Subject)',
      from,
      to,
      bodyText: bodyText.substring(0, 10000), // Limit length
      bodyHtml: bodyHtml.substring(0, 10000), // Limit length
      receivedAt: dateStr ? new Date(dateStr) : new Date(),
      labels: labelIds,
      isRead: !labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      headers: headers.reduce((acc: Record<string, string>, h: GmailHeader) => {
        if (h.name && h.value) {
          acc[h.name] = h.value;
        }
        return acc;
      }, {}),
    };
  } catch {
    return null;
  }
}

/**
 * Parse email address string like "John Doe <john@example.com>" or "john@example.com"
 */
function parseEmailAddress(addressStr: string): {
  email: string;
  name?: string;
} {
  if (!addressStr) return { email: '' };

  const match = addressStr.match(/^(.+?)\s*<(.+)>$/);
  if (match && match[1] && match[2]) {
    return {
      name: match[1].replace(/"/g, '').trim(),
      email: match[2].trim(),
    };
  }

  return { email: addressStr.trim() };
}
