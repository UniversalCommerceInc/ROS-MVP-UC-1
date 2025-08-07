// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getMailer } from '@kit/mailers';

// Define the email payload interface
interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  cc?: string;
  bcc?: string;
}

// Define the request body interface
interface EmailRequestBody {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { to, cc, bcc, subject, body, userId }: EmailRequestBody =
      await request.json();

    console.log('📧 Sending email to:', to);
    console.log('📧 From:', process.env.EMAIL_SENDER);

    if (!to || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: to and body' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const mailer = await getMailer();
    console.log('📧 Mailer instance created');

    // Convert line breaks to HTML
    const htmlBody = body.replace(/\n/g, '<br>');

    // Main email payload with proper typing
    const emailPayload: EmailPayload = {
      to: to as string,
      from:
        process.env.EMAIL_SENDER ||
        process.env.EMAIL_USER ||
        'noreply@example.com',
      subject: (subject || 'No Subject') as string,
      html: htmlBody as string,
      text: body as string, // Include plain text version
    };

    // Add CC if provided
    if (cc && cc.trim()) {
      const ccEmails = cc.split(',').map((email: string) => email.trim());
      const validCcEmails = ccEmails.filter((email: string) =>
        emailRegex.test(email),
      );
      if (validCcEmails.length > 0) {
        emailPayload.cc = validCcEmails.join(', ');
      }
    }

    // Add BCC if provided
    if (bcc && bcc.trim()) {
      const bccEmails = bcc.split(',').map((email: string) => email.trim());
      const validBccEmails = bccEmails.filter((email: string) =>
        emailRegex.test(email),
      );
      if (validBccEmails.length > 0) {
        emailPayload.bcc = validBccEmails.join(', ');
      }
    }

    console.log('📧 Sending email with payload:', {
      ...emailPayload,
      html: '[HTML CONTENT]',
      text: '[TEXT CONTENT]',
    });

    // Send the email
    const result = await mailer.sendEmail(emailPayload);
    console.log('✅ Email sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);

    // More detailed error information
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
    });

    // Check for specific SSL/TLS errors and provide helpful messages
    if (
      errorMessage.includes('SSL') ||
      errorMessage.includes('TLS') ||
      errorMessage.includes('wrong version number') ||
      errorMessage.includes('ECONNECTION') ||
      errorMessage.includes('ETIMEDOUT')
    ) {
      return NextResponse.json(
        {
          error: 'Email connection error',
          details: 'There was an issue connecting to Gmail SMTP server.',
          suggestions: [
            'Verify your Gmail App Password is correct',
            "Ensure 2FA is enabled and you're using an App Password",
            'Check if Gmail SMTP access is enabled for your account',
          ],
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    // Check for authentication errors
    if (
      errorMessage.includes('Invalid login') ||
      errorMessage.includes('Username and Password not accepted') ||
      errorMessage.includes('535')
    ) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: 'Gmail username or password is incorrect.',
          suggestions: [
            'Use a Gmail App Password instead of your regular password',
            'Enable 2-Factor Authentication on your Google account',
            'Generate a new App Password in Google Account settings',
          ],
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
