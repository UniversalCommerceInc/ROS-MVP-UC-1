import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

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

    const { dealId, meetgeekMeetingId } = await request.json();

    if (!dealId || !meetgeekMeetingId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: dealId and meetgeekMeetingId',
        },
        { status: 400 },
      );
    }

    // Verify the deal belongs to the account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // Check if there's a scheduled meeting for this deal that we can link
    const { data: scheduledMeeting, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select('id, meeting_title')
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .eq('status', 'scheduled')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    let linkedScheduledMeeting = null;
    if (!scheduledError && scheduledMeeting) {
      // Update the scheduled meeting with MeetGeek ID
      const { error: updateError } = await supabase
        .from('scheduled_meetings')
        .update({
          meetgeek_meeting_id: meetgeekMeetingId,
          status: 'completed',
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', scheduledMeeting.id);

      if (!updateError) {
        linkedScheduledMeeting = scheduledMeeting.id;
      }
    }

    // Create a meeting record if it doesn't exist
    const { data: existingMeeting, error: existingError } = await supabase
      .from('meetings')
      .select('id')
      .eq('meeting_id', meetgeekMeetingId)
      .eq('account_id', accountId)
      .single();

    if (existingError && existingError.code === 'PGRST116') {
      // Meeting doesn't exist, create it
      const { error: insertError } = await supabase.from('meetings').insert({
        account_id: accountId,
        deal_id: dealId,
        meeting_id: meetgeekMeetingId,
        title: `Meeting with ${deal.company_name}`,
        created_by: user.id,
        updated_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Error creating meeting record:', insertError);
      }
    }

    // Update deal with meeting info
    const { error: dealUpdateError } = await supabase
      .from('deals')
      .update({
        last_meeting_date: new Date().toISOString(),
        last_meeting_type: 'completed',
        last_updated: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .eq('account_id', accountId);

    if (dealUpdateError) {
      console.error('Error updating deal:', dealUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: 'MeetGeek meeting linked successfully',
      dealId,
      meetgeekMeetingId,
      linkedScheduledMeeting,
      companyName: deal.company_name,
    });
  } catch (error) {
    console.error('Error linking MeetGeek meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
