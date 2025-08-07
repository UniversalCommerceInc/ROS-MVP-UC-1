import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  createEmailRFC2822,
  refreshGoogleToken,
} from '~/home/[account]/emails/_lib/utils';

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { accountId, to, subject, body, cc, bcc } = await request.json();

    if (!accountId || !to || !body) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Get Gmail tokens
    const { data: gmailTokens, error: authError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (authError || !gmailTokens) {
      console.error('Gmail tokens lookup error:', authError);
      return NextResponse.json(
        { error: 'Gmail account not connected' },
        { status: 404 },
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = gmailTokens.access_token;
    let tokenExpiry = new Date(gmailTokens.expires_at);

    if (tokenExpiry < new Date()) {
      try {
        const { access_token, expires_at } = await refreshGoogleToken(
          gmailTokens.refresh_token,
        );
        accessToken = access_token;
        tokenExpiry = new Date(expires_at);

        // Update token in database
        await supabase
          .from('gmail_tokens')
          .update({
            access_token,
            expires_at: expires_at,
          })
          .eq('id', gmailTokens.id);
      } catch (error) {
        console.error('Error refreshing token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh token' },
          { status: 401 },
        );
      }
    }

    // Create email in RFC 2822 format
    const email = createEmailRFC2822(
      gmailTokens.email_address,
      to,
      subject || '',
      body,
      cc,
      bcc,
    );

    // Encode the email in base64url format
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email using Gmail API
    const response = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending email:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: response.status },
      );
    }

    const responseData = await response.json();

    // Store sent email in database
    await supabase.from('emails').insert({
      account_id: accountId,
      gmail_message_id: responseData.id,
      thread_id: responseData.threadId,
      from_email: gmailTokens.email_address,
      from_name: '',
      to_email: to,
      to_name: '',
      cc_emails: cc ? [cc] : [],
      bcc_emails: bcc ? [bcc] : [],
      subject: subject || '',
      body_text: '',
      body_html: body,
      received_at: new Date().toISOString(),
      labels: ['SENT'],
      is_read: true,
      is_starred: false,
      attachments: {},
      raw_headers: {},
    });

    return NextResponse.json({
      success: true,
      messageId: responseData.id,
      threadId: responseData.threadId,
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
