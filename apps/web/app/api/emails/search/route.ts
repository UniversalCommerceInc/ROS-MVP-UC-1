import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const accountId = searchParams.get('accountId');

    if (!email || !accountId) {
      return NextResponse.json(
        { error: 'email and accountId are required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify account access
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or inaccessible' },
        { status: 404 },
      );
    }

    // Search for emails containing this email address
    console.log(
      `🔍 Searching for emails with contact: ${email} in account: ${accountId}`,
    );

    const { data: emails, error } = await supabase
      .from('emails')
      .select('id, subject, from_email, to_email, received_at, body_text')
      .eq('account_id', accountId)
      .or(`from_email.eq.${email},to_email.cs.{"${email}"}`)
      .order('received_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error searching emails:', error);
      return NextResponse.json(
        { error: 'Failed to search emails' },
        { status: 500 },
      );
    }

    console.log(`📧 Found ${emails?.length || 0} emails for contact ${email}`);
    if (emails && emails.length > 0 && emails[0]) {
      console.log('📧 Sample email:', {
        subject: emails[0].subject,
        from: emails[0].from_email,
        to: emails[0].to_email,
        date: emails[0].received_at,
      });
    }

    return NextResponse.json({
      success: true,
      data: emails || [],
    });
  } catch (error) {
    console.error('Error searching emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
