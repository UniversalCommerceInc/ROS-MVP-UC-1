import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const dealId = searchParams.get('dealId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Checking for new transcripts:', { accountId, dealId, userId: user.id });

    // Build query for transcripts
    let query = supabase
      .from('transcripts')
      .select('meeting_id, created_at')
      .eq('account_id', accountId);

    // Add deal filter if specified
    if (dealId) {
      // First get meetings for this deal
      const { data: meetings, error: meetingError } = await supabase
        .from('meetings')
        .select('id')
        .eq('deal_id', dealId)
        .eq('account_id', accountId);

      if (meetingError) {
        console.error('Error fetching meetings for deal:', meetingError);
        return NextResponse.json(
          { error: 'Failed to fetch meetings' },
          { status: 500 }
        );
      }

      if (meetings && meetings.length > 0) {
        const meetingIds = meetings.map(m => m.id);
        query = query.in('meeting_id', meetingIds);
      } else {
        // No meetings for this deal, so no transcripts
        return NextResponse.json({
          hasNewTranscripts: false,
          transcriptCount: 0,
          lastChecked: new Date().toISOString(),
        });
      }
    }

    // Check for transcripts from the last 30 minutes (recently added)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentTranscripts, error: transcriptError } = await query
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (transcriptError) {
      console.error('Error checking for new transcripts:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to check transcripts' },
        { status: 500 }
      );
    }

    // Group by meeting_id to get unique meetings with recent transcripts
    const uniqueMeetingsWithTranscripts = new Set(
      recentTranscripts?.map(t => t.meeting_id).filter(Boolean) || []
    );

    const hasNewTranscripts = uniqueMeetingsWithTranscripts.size > 0;

    console.log('📊 Transcript check results:', {
      hasNewTranscripts,
      uniqueMeetings: uniqueMeetingsWithTranscripts.size,
      totalRecentTranscripts: recentTranscripts?.length || 0,
      timeWindow: '30 minutes',
    });

    // If we found new transcripts, get meeting details for better reporting
    let meetingDetails: any[] = [];
    if (hasNewTranscripts && uniqueMeetingsWithTranscripts.size > 0) {
      const meetingIds = Array.from(uniqueMeetingsWithTranscripts).filter(id => id !== null) as string[];
      
      const { data: meetings, error: meetingDetailsError } = await supabase
        .from('meetings')
        .select('id, title, deal_id, start_time')
        .in('id', meetingIds)
        .eq('account_id', accountId);

      if (!meetingDetailsError && meetings) {
        meetingDetails = meetings;
      }
    }

    return NextResponse.json({
      hasNewTranscripts,
      transcriptCount: recentTranscripts?.length || 0,
      uniqueMeetingsCount: uniqueMeetingsWithTranscripts.size,
      meetingDetails,
      lastChecked: new Date().toISOString(),
      timeWindow: '30 minutes',
    });

  } catch (error) {
    console.error('Error in transcript check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 