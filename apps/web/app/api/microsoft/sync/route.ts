// app/api/microsoft/sync/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerAdminClient();
    const { accountId, email } = await request.json();

    if (!accountId || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Create sync status entry
    const { data: syncStatus, error: syncStatusError } = await supabase
      .from('email_sync_status')
      .insert({
        account_id: accountId,
        email,
        status: 'in_progress',
        emails_synced: 0,
      })
      .select()
      .single();

    if (syncStatusError) {
      console.error('Error creating sync status:', syncStatusError);
      return NextResponse.json(
        { error: 'Failed to create sync status' },
        { status: 500 },
      );
    }

    // Get Microsoft token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .eq('email_address', email)
      .single();

    if (tokenError || !tokenData) {
      await supabase
        .from('email_sync_status')
        .update({
          status: 'failed',
          error_message: 'Microsoft token not found',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncStatus.id);

      return NextResponse.json(
        { error: 'Microsoft token not found' },
        { status: 404 },
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    let expiresAt = new Date(tokenData.expires_at);

    if (expiresAt < new Date()) {
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
                'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite offline_access',
            }),
          },
        );

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh Microsoft token');
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

        // Update token in database
        await supabase
          .from('microsoft_tokens')
          .update({
            access_token: accessToken,
            expires_at: expiresAt.toISOString(),
            sync_status: 'syncing',
          })
          .eq('id', tokenData.id);
      } catch (error) {
        console.error('Error refreshing Microsoft token:', error);

        // Update both tables on token refresh failure
        await supabase
          .from('email_sync_status')
          .update({
            status: 'failed',
            error_message: 'Failed to refresh Microsoft token',
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncStatus.id);

        await supabase
          .from('microsoft_tokens')
          .update({
            sync_status: 'failed',
          })
          .eq('id', tokenData.id);

        return NextResponse.json(
          { error: 'Failed to refresh Microsoft token' },
          { status: 401 },
        );
      }
    } else {
      // Token is valid, just update sync status to syncing
      await supabase
        .from('microsoft_tokens')
        .update({
          sync_status: 'syncing',
        })
        .eq('id', tokenData.id);
    }

    // Determine query based on last sync time - SIMPLE LOGIC LIKE GMAIL
    let filter = '';
    let emailsProcessed = 0;

    if (tokenData.last_sync) {
      // Convert to Microsoft Graph filter format (ISO 8601)
      const lastSyncDate = new Date(tokenData.last_sync);
      filter = `receivedDateTime ge ${lastSyncDate.toISOString()}`;
    } else {
      // First sync - limit to last 30 days to avoid overwhelming the system
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter = `receivedDateTime ge ${thirtyDaysAgo.toISOString()}`;
    }

    // Fetch emails with pagination (Microsoft Graph API)
    let nextLink = null;
    let hasMorePages = true;
    const baseUrl = `https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc`;
    const url = filter
      ? `${baseUrl}&$filter=${encodeURIComponent(filter)}`
      : baseUrl;

    while (hasMorePages) {
      const currentUrl: string = nextLink || url;

      const messagesResponse: Response = await fetch(currentUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        throw new Error(
          `Microsoft Graph API error: ${messagesResponse.status} - ${errorText}`,
        );
      }

      const messagesData: any = await messagesResponse.json();
      const messages = messagesData.value || [];

      // Process each email
      for (const message of messages) {
        try {
          const parsedEmail = parseMicrosoftMessage(message);

          if (parsedEmail) {
            // Store email in database using upsert (like Gmail)
            await supabase.from('emails').upsert({
              account_id: accountId,
              ...parsedEmail,
            });

            emailsProcessed++;
          }
        } catch (error) {
          console.error(
            `Error processing Microsoft message ${message.id}:`,
            error,
          );
          // Continue with next email
        }
      }

      // Check if there are more pages
      nextLink = messagesData['@odata.nextLink'];
      hasMorePages = !!nextLink;

      // Limit to 500 emails per sync to avoid timeouts
      if (emailsProcessed >= 500) {
        hasMorePages = false;
      }
    }

    // Update sync status and last_sync timestamp - LIKE GMAIL
    const now = new Date().toISOString();
    await supabase
      .from('microsoft_tokens')
      .update({
        last_sync: now,
        sync_status: 'completed',
      })
      .eq('id', tokenData.id);

    // Update sync status
    await supabase
      .from('email_sync_status')
      .update({
        status: 'completed',
        emails_synced: emailsProcessed,
        completed_at: now,
      })
      .eq('id', syncStatus.id);

    return NextResponse.json({
      success: true,
      emailsProcessed,
    });
  } catch (error) {
    console.error('Microsoft sync error:', error);

    // Try to update sync status if possible
    try {
      const supabase = getSupabaseServerAdminClient();
      const { accountId, email } = await request.json();

      const { data: syncStatuses } = await supabase
        .from('email_sync_status')
        .select('id')
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      if (syncStatuses && syncStatuses.length > 0) {
        await supabase
          .from('email_sync_status')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncStatuses[0]!.id);
      }

      // Also update microsoft_tokens sync_status to failed in main error
      try {
        await supabase
          .from('microsoft_tokens')
          .update({
            sync_status: 'failed',
          })
          .eq('account_id', accountId)
          .eq('email_address', email);
      } catch (tokenError) {
        console.error(
          'Failed to update microsoft_tokens sync_status:',
          tokenError,
        );
      }
    } catch (logError) {
      console.error('Failed to update sync status:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Parse Microsoft Graph message data to match Gmail format
 */
function parseMicrosoftMessage(message: any): any | null {
  try {
    const subject = message.subject || '(No Subject)';

    const fromEmail = message.from?.emailAddress?.address || '';
    const fromName = message.from?.emailAddress?.name || null;

    // Handle multiple recipients - take first one for consistency with Gmail
    const toEmail = message.toRecipients?.[0]?.emailAddress?.address || '';
    const toName = message.toRecipients?.[0]?.emailAddress?.name || null;

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

    // Convert to Gmail-compatible format for database storage
    return {
      gmail_id: message.id, // Using same column for consistency
      thread_id: message.conversationId || message.id,
      from_email: fromEmail,
      from_name: fromName,
      to_email: [toEmail], // Array format like Gmail
      cc_email: null, // Could be extended to parse CC recipients
      bcc_email: null, // Could be extended to parse BCC recipients
      subject,
      body_text: bodyText.substring(0, 10000), // Limit length like Gmail
      body_html: bodyHtml.substring(0, 10000), // Limit length like Gmail
      received_at: receivedAt.toISOString(),
      labels: ['INBOX'], // Default label for consistency
      is_read: isRead,
      is_starred: false, // Microsoft doesn't have starred concept by default
      has_attachments: message.hasAttachments || false,
      attachment_data: null, // Could be extended to parse attachments
      created_by: null,
      updated_by: null,
    };
  } catch (error) {
    console.error('Error parsing Microsoft message:', error);
    return null;
  }
}

/**
 * Simple HTML strip function
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}
