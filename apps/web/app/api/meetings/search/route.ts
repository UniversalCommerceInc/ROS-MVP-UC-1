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
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify account access
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
        { status: 404 }
      );
    }

    // Search for meetings where this email was involved
    console.log(`🔍 Searching for meetings with contact: ${email} in account: ${accountId}`);
    
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('id, title, start_time, end_time, account_id, created_at, participant_emails, host_email')
      .eq('account_id', accountId)
      .or(`participant_emails.cs.{"${email}"},host_email.eq.${email}`)
      .order('start_time', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error searching meetings:', error);
      return NextResponse.json(
        { error: 'Failed to search meetings' },
        { status: 500 }
      );
    }

    console.log(`🤝 Found ${meetings?.length || 0} meetings for contact ${email}`);
    if (meetings && meetings.length > 0 && meetings[0]) {
      console.log('🤝 Sample meeting:', {
        title: meetings[0].title,
        host: meetings[0].host_email,
        participants: meetings[0].participant_emails,
        date: meetings[0].start_time
      });
    }

    return NextResponse.json({
      success: true,
      data: meetings || []
    });

  } catch (error) {
    console.error('Error searching meetings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 