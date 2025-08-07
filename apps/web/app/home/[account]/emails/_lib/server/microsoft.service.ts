'use server';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface TokenData {
  account_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  tenant_id?: string | null; // Optional for Microsoft
}

interface ParsedEmailData {
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string };
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  isRead: boolean;
  headers: Record<string, string>;
  messageId: string;
}

export type EmailFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'received_at' | 'subject';
  sortDirection?: 'asc' | 'desc';
};

/**
 * Check if account has Microsoft integration
 */
export async function hasMicrosoftIntegration(
  accountId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('microsoft_tokens')
      .select('id')
      .eq('account_id', accountId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get Microsoft integration status for account
 */
export async function getMicrosoftIntegrationStatus(accountId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data: tokens } = await supabase
      .from('microsoft_tokens')
      .select('email_address, created_at, is_active, sync_status')
      .eq('account_id', accountId)
      .single();

    return {
      isConnected: !!tokens,
      emailAddress: tokens?.email_address,
      connectedAt: tokens?.created_at,
      syncStatus: tokens?.sync_status || 'not_started',
      isActive: tokens?.is_active || false,
    };
  } catch (error) {
    const logger = await getLogger();
    logger.error('Failed to get Microsoft integration status', {
      error,
      accountId,
    });
    return {
      isConnected: false,
      emailAddress: null,
      connectedAt: null,
      syncStatus: 'not_started',
      isActive: false,
    };
  }
}

/**
 * Sync emails from Microsoft Graph API for an account
 */
export async function syncMicrosoftEmails(accountId: string): Promise<{
  success: boolean;
  emailsSynced?: number;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    logger.info('Fetching Microsoft tokens', { accountId });

    const { data: tokenData, error: tokenError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      logger.error('No Microsoft tokens found', { tokenError, accountId });
      return {
        success: false,
        error: 'Microsoft account not connected',
      };
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    let accessToken = tokenData.access_token;

    if (now >= expiresAt) {
      const refreshResult = await refreshMicrosoftToken(tokenData);
      if (!refreshResult.success) {
        return {
          success: false,
          error: 'Failed to refresh Microsoft token',
        };
      }
      accessToken = refreshResult.accessToken!;
    }

    logger.info('Microsoft token validated, fetching emails');

    // Get existing emails to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('emails')
      .select('gmail_id') // Using same column for consistency
      .eq('account_id', accountId);

    const existingMessageIds = new Set(
      existingEmails?.map((email) => email.gmail_id) || [],
    );

    // Fetch emails from Microsoft Graph API
    const messagesResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!messagesResponse.ok) {
      throw new Error(`Microsoft Graph API error: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.value || [];

    logger.info('Microsoft Graph API response received', {
      messageCount: messages.length,
    });

    const emailsToInsert = [];
    let emailsSynced = 0;

    // Process each message
    for (const message of messages) {
      if (!message.id || existingMessageIds.has(message.id)) {
        continue; // Skip if already exists
      }

      try {
        const emailData = parseMicrosoftMessage(message);

        if (emailData) {
          emailsToInsert.push({
            account_id: accountId,
            gmail_id: message.id, // Using same column for consistency
            thread_id: message.conversationId || message.id,
            subject: emailData.subject,
            from_email: emailData.from.email,
            from_name: emailData.from.name,
            to_email: [emailData.to.email], // Array format
            body_text: emailData.bodyText,
            body_html: emailData.bodyHtml,
            received_at: emailData.receivedAt.toISOString(),
            labels: ['INBOX'], // Default label for consistency
            is_read: emailData.isRead,
            is_starred: false, // Microsoft doesn't have starred concept by default
            has_attachments: message.hasAttachments || false,
          });
          emailsSynced++;
        }
      } catch (msgError) {
        logger.error('Failed to process Microsoft message', {
          messageId: message.id,
          error: msgError,
        });
      }
    }

    // Insert emails in batches
    if (emailsToInsert.length > 0) {
      logger.info('Inserting emails into database', {
        emailCount: emailsToInsert.length,
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
    }

    // Update sync status
    await supabase
      .from('microsoft_tokens')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: 'completed',
      })
      .eq('account_id', accountId);

    logger.info('Microsoft sync completed', { accountId, emailsSynced });

    return {
      success: true,
      emailsSynced,
    };
  } catch (error) {
    logger.error('Microsoft sync failed', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Update sync status to failed
    await supabase
      .from('microsoft_tokens')
      .update({
        sync_status: 'failed',
        last_sync: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    return {
      success: false,
      error: 'Failed to sync emails from Microsoft',
    };
  }
}

/**
 * Refresh Microsoft OAuth token
 */
async function refreshMicrosoftToken(tokenData: TokenData): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    const refreshResponse = await fetch(
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
            'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read',
        }),
      },
    );

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const refreshData = await refreshResponse.json();

    // Update token in database
    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

    const { error: updateError } = await supabase
      .from('microsoft_tokens')
      .update({
        access_token: refreshData.access_token,
        expires_at: expiresAt.toISOString(),
      })
      .eq('account_id', tokenData.account_id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      accessToken: refreshData.access_token,
    };
  } catch (error) {
    logger.error('Failed to refresh Microsoft token', { error });
    return {
      success: false,
      error: 'Failed to refresh token',
    };
  }
}

/**
 * Parse Microsoft Graph message data
 */
function parseMicrosoftMessage(message: any): ParsedEmailData | null {
  try {
    const subject = message.subject || '(No Subject)';

    const from = {
      email: message.from?.emailAddress?.address || '',
      name: message.from?.emailAddress?.name,
    };

    const to = {
      email: message.toRecipients?.[0]?.emailAddress?.address || '',
      name: message.toRecipients?.[0]?.emailAddress?.name,
    };

    // Extract body content
    const bodyText =
      message.body?.contentType === 'text'
        ? message.body.content
        : stripHtml(message.body?.content || '');

    const bodyHtml =
      message.body?.contentType === 'html'
        ? message.body.content
        : message.body?.content || '';

    const receivedAt = new Date(message.receivedDateTime);
    const isRead = message.isRead || false;

    return {
      subject,
      from,
      to,
      bodyText: bodyText.substring(0, 10000), // Limit length
      bodyHtml: bodyHtml.substring(0, 10000), // Limit length
      receivedAt,
      isRead,
      headers: {},
      messageId: message.id,
    };
  } catch {
    return null;
  }
}

/**
 * Simple HTML strip function
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Send email via Microsoft Graph API
 */
export async function sendMicrosoftEmail(
  accountId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      return {
        success: false,
        error: 'Microsoft account not connected',
      };
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    let accessToken = tokenData.access_token;

    if (now >= expiresAt) {
      const refreshResult = await refreshMicrosoftToken(tokenData);
      if (!refreshResult.success) {
        return {
          success: false,
          error: 'Failed to refresh Microsoft token',
        };
      }
      accessToken = refreshResult.accessToken!;
    }

    // Prepare email message
    const message = {
      subject,
      body: {
        contentType: 'HTML',
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
      ccRecipients: cc
        ? [
            {
              emailAddress: {
                address: cc,
              },
            },
          ]
        : [],
      bccRecipients: bcc
        ? [
            {
              emailAddress: {
                address: bcc,
              },
            },
          ]
        : [],
    };

    // Send email via Microsoft Graph API
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Microsoft Graph API error: ${response.status} - ${errorData}`,
      );
    }

    logger.info('Email sent successfully via Microsoft', { accountId, to });

    return {
      success: true,
      messageId: 'sent', // Microsoft doesn't return message ID for sent emails
    };
  } catch (error) {
    logger.error('Failed to send email via Microsoft', { error, accountId });
    return {
      success: false,
      error: 'Failed to send email',
    };
  }
}
