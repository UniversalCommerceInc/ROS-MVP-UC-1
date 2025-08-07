import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

const MEETGEEK_API_BASE =
  process.env.MEETGEEK_API_URL || 'https://api.meetgeek.ai';
const MEETGEEK_API_KEY = process.env.MEETGEEK_API_KEY;

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    const { meetingId } = await request.json();

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 },
      );
    }

    if (!MEETGEEK_API_KEY) {
      return NextResponse.json(
        {
          error: 'MeetGeek API key not configured',
          message: 'Please add MEETGEEK_API_KEY to your environment variables',
        },
        { status: 500 },
      );
    }

    console.log('🔄 Fetching highlights for meeting:', meetingId);

    // Handle API key that may already include "Bearer" prefix
    const authHeader = MEETGEEK_API_KEY.startsWith('Bearer ')
      ? MEETGEEK_API_KEY
      : `Bearer ${MEETGEEK_API_KEY}`;

    // 1. Fetch meeting details from MeetGeek
    console.log('📥 Fetching meeting details from MeetGeek...');
    const meetingResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      console.error('MeetGeek API error:', {
        status: meetingResponse.status,
        statusText: meetingResponse.statusText,
        error: errorText,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch meeting from MeetGeek',
          details: errorText,
          status: meetingResponse.status,
        },
        { status: meetingResponse.status },
      );
    }

    const meetingData = await meetingResponse.json();
    console.log('✅ Fetched meeting:', meetingData.title);

    // 2. Fetch summary from MeetGeek
    console.log('📥 Fetching summary from MeetGeek...');
    const summaryResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}/summary`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    let summaryData = null;
    if (summaryResponse.ok) {
      summaryData = await summaryResponse.json();
      console.log(
        '✅ Fetched meeting summary:',
        summaryData.summary?.substring(0, 100),
      );
    } else {
      console.warn('⚠️ Summary not available:', summaryResponse.status);
    }

    // 3. Fetch highlights from MeetGeek
    console.log('📥 Fetching highlights from MeetGeek...');
    const highlightsResponse = await fetch(
      `${MEETGEEK_API_BASE}/v1/meetings/${meetingId}/highlights`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    );

    let highlightsData = [];
    if (highlightsResponse.ok) {
      const highlightsResult = await highlightsResponse.json();
      // Handle different possible response formats
      highlightsData = Array.isArray(highlightsResult)
        ? highlightsResult
        : highlightsResult.highlights || [];
      console.log(
        `✅ Fetched ${highlightsData.length} highlights:`,
        highlightsData,
      );
    } else {
      console.warn('⚠️ Highlights not available:', highlightsResponse.status);
    }

    // 4. Find the scheduled meeting in Supabase
    const { data: scheduledMeeting, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('meetgeek_meeting_id', meetingId)
      .eq('account_id', accountId)
      .single();

    if (scheduledError || !scheduledMeeting) {
      console.error(
        '❌ No scheduled meeting found for MeetGeek ID:',
        meetingId,
      );
      return NextResponse.json(
        {
          error: 'No scheduled meeting found',
          meetingId,
          details: 'This meeting was not scheduled through the system',
          debugInfo: {
            summary: summaryData?.summary || null,
            highlights: highlightsData,
            meetingTitle: meetingData.title,
          },
        },
        { status: 404 },
      );
    }

    // 5. Update deal with meeting insights
    console.log('💾 Updating deal with meeting insights...');
    const dealUpdate = {
      last_meeting_summary:
        summaryData?.summary || 'Meeting completed - processing insights',
      last_meeting_date:
        meetingData.timestamp_start_utc || new Date().toISOString(),
      meeting_highlights: highlightsData || [],
      meeting_action_items: [], // TODO: Extract action items from MeetGeek API
      last_updated: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error: dealError } = await supabase
      .from('deals')
      .update(dealUpdate)
      .eq('id', scheduledMeeting.deal_id)
      .eq('account_id', accountId);

    if (dealError) {
      console.error('Error updating deal:', dealError);
      return NextResponse.json(
        {
          error: 'Failed to update deal with highlights',
          details: dealError,
          debugInfo: {
            summary: summaryData?.summary || null,
            highlights: highlightsData,
            meetingTitle: meetingData.title,
          },
        },
        { status: 500 },
      );
    }

    console.log('✅ Updated deal with meeting insights');

    return NextResponse.json({
      success: true,
      message: 'Successfully synced meeting highlights',
      data: {
        meetingId,
        title: meetingData.title,
        summary: summaryData?.summary || null,
        highlights: highlightsData,
        highlightsCount: highlightsData.length,
        dealId: scheduledMeeting.deal_id,
      },
    });
  } catch (error) {
    console.error('Error syncing meeting highlights:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync meeting highlights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
