import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const { meetingId } = await params;

    // Get account ID from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    console.log(
      '🎯 Fetching transcript for meeting ID:',
      meetingId,
      'in account:',
      accountId,
    );

    // Verify account exists and user has access
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Account not found or inaccessible:', accountError);
      return NextResponse.json(
        { error: 'Account not found or inaccessible' },
        { status: 404 },
      );
    }

    console.log('✅ Account verified:', account.name);

    // First, get the meeting to verify ownership within the account
    console.log(
      '🔍 DEBUG: Looking for meeting with MeetGeek ID:',
      meetingId,
      'in account:',
      accountId,
    );
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, deal_id, meeting_id, title, account_id')
      .eq('meeting_id', meetingId)
      .eq('account_id', accountId)
      .single();

    console.log('🔍 Meeting lookup result:', {
      found: !!meeting,
      error: meetingError?.message,
      meeting: meeting
        ? {
            id: meeting.id,
            deal_id: meeting.deal_id,
            meeting_id: meeting.meeting_id,
            title: meeting.title,
            account_id: meeting.account_id,
          }
        : null,
    });

    if (meetingError || !meeting) {
      console.error('❌ Meeting not found in database:', meetingError);

      // Let's also check what meetings do exist for debugging (within this account)
      console.log('🔍 DEBUG: Checking meetings in account:', accountId);
      const { data: allMeetings, error: allMeetingsError } = await supabase
        .from('meetings')
        .select('id, meeting_id, title, created_at, account_id')
        .eq('account_id', accountId)
        .limit(10)
        .order('created_at', { ascending: false });

      if (allMeetingsError) {
        console.log(
          '❌ Could not fetch meetings for debugging:',
          allMeetingsError,
        );
      } else {
        console.log(
          '📊 Recent meetings in account:',
          allMeetings?.map((m) => ({
            id: m.id,
            meeting_id: m.meeting_id,
            title: m.title,
            created_at: m.created_at,
            account_id: m.account_id,
          })),
        );
      }

      return NextResponse.json(
        {
          error: 'Meeting not found',
          details: 'Meeting not found in database for this account',
          accountId,
        },
        { status: 404 },
      );
    }

    // Verify the meeting belongs to a deal within the same account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name, account_id')
      .eq('id', meeting.deal_id)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      console.error('Deal not found or not in same account:', dealError);
      return NextResponse.json(
        {
          error: 'Meeting not found',
          details: 'Meeting not found or you do not have access to it',
          accountId,
        },
        { status: 404 },
      );
    }

    console.log(
      '✅ Meeting ownership verified for deal:',
      deal.company_name,
      'in account:',
      accountId,
    );

    // Fetch transcript data using the database meeting ID and account ID
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('meeting_id', meeting.id) // Use the database ID, not MeetGeek ID
      .eq('account_id', accountId) // Ensure account-level filtering
      .order('sentence_id', { ascending: true });

    if (transcriptError) {
      console.error('Transcript fetch error:', transcriptError);
      return NextResponse.json(
        {
          error: 'Failed to fetch transcript',
          details: transcriptError.message,
          accountId,
        },
        { status: 500 },
      );
    }

    if (!transcriptData || transcriptData.length === 0) {
      console.log(
        'No transcript data found for meeting:',
        meetingId,
        'in account:',
        accountId,
      );
      return NextResponse.json(
        {
          error: 'No transcript found for this meeting',
          meetingId,
          accountId,
          success: false,
        },
        { status: 404 },
      );
    }

    // Remove duplicates based on sentence_id and timestamp
    const uniqueTranscripts = transcriptData.filter(
      (segment, index, array) =>
        index ===
        array.findIndex(
          (s) =>
            s.sentence_id === segment.sentence_id &&
            s.timestamp === segment.timestamp,
        ),
    );

    console.log(
      `✅ Found ${transcriptData.length} segments, ${uniqueTranscripts.length} unique for account ${accountId}`,
    );

    // Also fetch meeting summary and highlights for complete context
    const [summaryResult, highlightsResult] = await Promise.allSettled([
      supabase
        .from('summaries')
        .select('summary, ai_insights')
        .eq('meeting_id', meeting.id)
        .eq('account_id', accountId)
        .single(),
      supabase
        .from('highlights')
        .select('highlight')
        .eq('meeting_id', meeting.id)
        .eq('account_id', accountId)
        .order('created_at', { ascending: true }),
    ]);

    const summary =
      summaryResult.status === 'fulfilled' ? summaryResult.value.data : null;
    const highlights =
      highlightsResult.status === 'fulfilled'
        ? highlightsResult.value.data
        : [];

    return NextResponse.json({
      success: true,
      accountId,
      meetingId,
      transcript: uniqueTranscripts,
      meeting: {
        ...meeting,
        company_name: deal.company_name,
      },
      summary: summary?.summary || null,
      ai_insights: summary?.ai_insights || null,
      highlights: highlights?.map((h) => h.highlight) || [],
      stats: {
        totalSegments: transcriptData.length,
        uniqueSegments: uniqueTranscripts.length,
        accountName: account.name,
        companyName: deal.company_name,
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        accountId: new URL(request.url).searchParams.get('accountId'),
      },
      { status: 500 },
    );
  }
}
