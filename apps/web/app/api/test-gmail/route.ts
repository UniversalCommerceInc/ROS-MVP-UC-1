import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Check if account exists
    const { data: accountData } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (!accountData) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 2. Get Gmail tokens
    const { data: tokenData } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!tokenData) {
      return NextResponse.json({ error: 'No Gmail tokens found' }, { status: 404 });
    }

    // 3. Test Gmail API connection
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Simple test - get user profile
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return NextResponse.json({
      success: true,
      account: accountData,
      hasTokens: true,
      profile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
      }
    });

  } catch (error) {
    console.error('Gmail test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 