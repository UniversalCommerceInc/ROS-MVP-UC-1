// /api/meetings/delete/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const source = searchParams.get('source'); // 'meetings' or 'scheduled_meetings'

    if (!meetingId) {
      return NextResponse.json(
        {
          error: 'Meeting ID is required',
          success: false,
        },
        { status: 400 },
      );
    }

    // Get authenticated user
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          success: false,
        },
        { status: 401 },
      );
    }

    // Get user's account memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_id')
      .eq('user_id', user.id);

    if (membershipError || !memberships?.length) {
      return NextResponse.json(
        {
          error: 'Access denied',
          success: false,
        },
        { status: 403 },
      );
    }

    const accountIds = memberships.map((m) => m.account_id);

    console.log(
      `🗑️ Deleting meeting ${meetingId} from ${source || 'meetings'} table`,
    );

    // If source is specified, delete from that specific table
    if (source === 'scheduled_meetings') {
      // Delete from scheduled_meetings table
      const { error: scheduledDeleteError } = await supabase
        .from('scheduled_meetings')
        .delete()
        .eq('id', meetingId)
        .in('account_id', accountIds);

      if (scheduledDeleteError) {
        console.error(
          'Error deleting scheduled meeting:',
          scheduledDeleteError,
        );
        return NextResponse.json(
          {
            error: 'Failed to delete scheduled meeting',
            details: scheduledDeleteError.message,
            success: false,
          },
          { status: 500 },
        );
      }

      console.log('✅ Scheduled meeting deleted successfully');
    } else {
      // Delete from meetings table and associated data
      const { data: meetingData, error: fetchError } = await supabase
        .from('meetings')
        .select('id, meeting_id, deal_id, account_id')
        .eq('id', meetingId)
        .in('account_id', accountIds)
        .single();

      if (fetchError) {
        console.error('Error fetching meeting data:', fetchError);
        return NextResponse.json(
          {
            error: 'Meeting not found or access denied',
            success: false,
          },
          { status: 404 },
        );
      }

      // Delete associated transcript data first
      if (meetingData.id) {
        const { error: transcriptDeleteError } = await supabase
          .from('transcripts')
          .delete()
          .eq('meeting_id', meetingData.id)
          .eq('account_id', meetingData.account_id);

        if (transcriptDeleteError) {
          console.warn(
            'Error deleting transcript data:',
            transcriptDeleteError,
          );
          // Continue with meeting deletion even if transcript deletion fails
        } else {
          console.log('✅ Transcript data deleted');
        }
      }

      // Delete the meeting record
      const { error: meetingDeleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .in('account_id', accountIds);

      if (meetingDeleteError) {
        console.error('Error deleting meeting:', meetingDeleteError);
        return NextResponse.json(
          {
            error: 'Failed to delete meeting',
            details: meetingDeleteError.message,
            success: false,
          },
          { status: 500 },
        );
      }

      console.log('✅ Meeting deleted successfully');
    }

    return NextResponse.json({
      success: true,
      message: `Meeting deleted successfully from ${source || 'meetings'} table`,
      meetingId,
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 },
    );
  }
}
