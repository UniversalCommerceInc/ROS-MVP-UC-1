import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check account access
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    // Check meetings in database
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId);

    // Check calendar events
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('account_id', accountId);

    // Check Gmail tokens
    const { data: gmailTokens, error: tokensError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId);

    return NextResponse.json({
      debug: {
        accountId,
        userId: user.id,
        userEmail: user.email,
        hasMembership: !!membership,
        membershipRole: membership?.account_role || null,
        
        meetings: {
          count: meetings?.length || 0,
          error: meetingsError?.message || null,
          sample: meetings?.[0] || null
        },
        
        calendarEvents: {
          count: calendarEvents?.length || 0,
          error: calendarError?.message || null,
          sample: calendarEvents?.[0] || null
        },
        
        gmailConnection: {
          hasTokens: (gmailTokens?.length || 0) > 0,
          tokensData: gmailTokens || [],
          error: tokensError?.message || null
        },
      }
    });

  } catch (error) {
    console.error('Debug meetings error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 