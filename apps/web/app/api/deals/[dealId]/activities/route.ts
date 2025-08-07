import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Verify the deal belongs to the account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name, primary_email')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get deal contacts to filter emails
    const { data: dealContacts, error: contactError } = await supabase
      .from('deal_contacts')
      .select(
        `
        contacts!inner(
          id,
          name,
          email,
          role,
          is_decision_maker
        )
      `,
      )
      .eq('deal_id', dealId);

    // Extract contact emails (including primary deal email)
    const contactEmails = [
      deal.primary_email,
      ...(dealContacts?.map((dc) => (dc.contacts as any)?.email) || []),
    ].filter(Boolean);

    let activities = [];

    // 1. Fetch deal-related emails from the account
    if (contactEmails.length > 0) {
      const { data: emails, error: emailError } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', accountId)
        .or(
          `from_email.in.(${contactEmails.join(',')}),to_email.cs.{${contactEmails.join(',')}}`,
        )
        .order('received_at', { ascending: false });

      if (!emailError && emails) {
        // Get user's email from Gmail tokens to determine if email is from user
        const { data: gmailToken } = await supabase
          .from('gmail_tokens')
          .select('email_address')
          .eq('account_id', accountId)
          .eq('user_id', user.id)
          .single();

        const userEmail = gmailToken?.email_address;

        const emailActivities = emails.map((email) => ({
          id: email.id,
          type: 'email',
          title:
            email.from_email === userEmail
              ? 'Email by You'
              : 'Email from Contact',
          description: email.subject || 'No subject',
          date: email.received_at,
          metadata: {
            from: email.from_email,
            to: email.to_email,
            subject: email.subject,
            body: email.body_text?.substring(0, 200) + '...' || '',
            isRead: email.is_read,
            isFromUser: email.from_email === userEmail,
          },
        }));
        activities.push(...emailActivities);
      }
    }

    // 2. Fetch deal-related meetings
    const { data: meetings, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('timestamp_start_utc', { ascending: false });

    if (!meetingError && meetings) {
      const meetingActivities = meetings.map((meeting) => ({
        id: meeting.id,
        type: 'meeting',
        title: 'Meeting',
        description: meeting.title || `Meeting with ${deal.company_name}`,
        date: meeting.timestamp_start_utc || meeting.created_at,
        metadata: {
          duration: meeting.duration,
          participant_count: meeting.participant_emails?.length || 0,
          has_recording: !!meeting.recording_url,
          meeting_id: meeting.meeting_id,
          start_time: meeting.start_time,
          end_time: meeting.end_time,
        },
      }));
      activities.push(...meetingActivities);
    }

    // 3. Fetch scheduled meetings
    const { data: scheduledMeetings, error: scheduledError } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: false });

    if (!scheduledError && scheduledMeetings) {
      const scheduledActivities = scheduledMeetings.map((meeting) => ({
        id: meeting.id,
        type: 'scheduled_meeting',
        title:
          meeting.status === 'completed'
            ? 'Meeting Completed'
            : 'Meeting Scheduled',
        description:
          meeting.meeting_title || `Meeting with ${deal.company_name}`,
        date: meeting.start_time || meeting.created_at,
        metadata: {
          status: meeting.status,
          attendees: meeting.attendees,
          meetgeek_id: meeting.meetgeek_meeting_id,
          end_time: meeting.end_time,
          meeting_link: meeting.meeting_link,
        },
      }));
      activities.push(...scheduledActivities);
    }

    // 4. Fetch activities from deal_activities table (updated table name)
    const { data: dbActivities, error: activitiesError } = await supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (!activitiesError && dbActivities) {
      const dbActivityItems = dbActivities.map((activity) => ({
        id: activity.id,
        type: activity.activity_type,
        title: activity.title,
        description: activity.description,
        date: activity.created_at,
        metadata: {
          source: 'database',
          completed: activity.completed,
          due_date: activity.due_date,
        },
      }));
      activities.push(...dbActivityItems);
    }

    // Sort all activities by date (most recent first)
    activities.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
      deal: {
        id: deal.id,
        company_name: deal.company_name,
      },
    });
  } catch (error) {
    console.error('Error fetching deal activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
