import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const accountId = searchParams.get('accountId');

    if (!dealId || !accountId) {
      return NextResponse.json(
        { error: 'dealId and accountId are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify account access
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

    // Verify deal belongs to account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found in this account' },
        { status: 404 }
      );
    }

    // Fetch meetings for the deal
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        start_time,
        end_time,
        timestamp_start_utc,
        timestamp_end_utc,
        deal_id,
        account_id,
        created_at,
        updated_at
      `)
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: false });

    if (meetingsError) {
      console.error('❌ Error fetching meetings:', meetingsError);
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    // For each meeting, check if it has transcripts
    const meetingsWithTranscripts = await Promise.all(
      (meetings || []).map(async (meeting) => {
        const { data: transcripts, error: transcriptError } = await supabase
          .from('transcripts')
          .select('id')
          .eq('meeting_id', meeting.id)
          .eq('account_id', accountId)
          .limit(1);

        return {
          ...meeting,
          hasTranscripts: !transcriptError && transcripts && transcripts.length > 0
        };
      })
    );

    console.log(`✅ Found ${meetingsWithTranscripts.length} meetings for deal ${deal.company_name}`);

    return NextResponse.json({
      success: true,
      meetings: meetingsWithTranscripts,
      deal: {
        id: deal.id,
        companyName: deal.company_name
      }
    });

  } catch (error) {
    console.error('❌ Error in meetings API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 