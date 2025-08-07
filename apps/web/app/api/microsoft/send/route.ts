// app/api/microsoft/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  const logger = await getLogger();

  try {
    const { accountId, to, subject, body, cc, bcc } = await request.json();

    logger.info('Microsoft send email API called', {
      accountId,
      to,
      subject: subject?.substring(0, 50) + '...',
      hasCc: !!cc,
      hasBcc: !!bcc,
    });

    if (!accountId || !to || !body) {
      return NextResponse.json(
        { error: 'Account ID, recipient, and body are required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this account
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Get Microsoft tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      logger.error('Microsoft tokens not found', { tokenError, accountId });
      return NextResponse.json(
        { error: 'Microsoft account not connected' },
        { status: 404 },
      );
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    let accessToken = tokenData.access_token;

    if (now >= expiresAt) {
      logger.info('Microsoft token expired, refreshing', { accountId });

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
        const refreshError = await refreshResponse.text();
        logger.error('Failed to refresh Microsoft token', {
          status: refreshResponse.status,
          error: refreshError,
          accountId,
        });
        return NextResponse.json(
          { error: 'Failed to refresh Microsoft token' },
          { status: 401 },
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
      await supabase
        .from('microsoft_tokens')
        .update({
          access_token: refreshData.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('account_id', accountId);

      logger.info('Microsoft token refreshed successfully', { accountId });
    }

    // Prepare email message for Microsoft Graph API
    const message = {
      subject: subject || '(No Subject)',
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

    logger.info('Sending email via Microsoft Graph API', { accountId, to });

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
      logger.error('Microsoft Graph API send error', {
        status: response.status,
        error: errorData,
        accountId,
        to,
      });

      return NextResponse.json(
        {
          error: `Failed to send email via Microsoft: ${response.status} - ${errorData}`,
        },
        { status: response.status },
      );
    }

    logger.info('Email sent successfully via Microsoft', {
      accountId,
      to,
      subject: subject?.substring(0, 50) + '...',
    });

    return NextResponse.json({
      success: true,
      messageId: 'sent', // Microsoft doesn't return message ID for sent emails
      message: 'Email sent successfully via Microsoft',
    });
  } catch (error) {
    logger.error('Microsoft send email failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
