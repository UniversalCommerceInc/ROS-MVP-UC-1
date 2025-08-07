'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface CreateDealFromMeetingData {
  meetingId: string;
  accountId: string;
  accountName: string;
  companyName: string;
  contactEmail?: string;
  dealValue?: number;
  industry?: string;
  description?: string;
}

export async function createDealFromMeetingAction(
  data: CreateDealFromMeetingData,
) {
  try {
    const supabase = getSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get the meeting details to extract information
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', data.meetingId)
      .eq('account_id', data.accountId)
      .single();

    if (meetingError || !meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    // Check if meeting is already associated with a deal
    if (meeting.deal_id) {
      return {
        success: false,
        error: 'Meeting is already associated with a deal',
      };
    }

    // Generate a unique deal ID
    const generateDealId = () => {
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString(36);
      const accountHash = data.accountId.replace(/-/g, '').substring(0, 6);
      const randomPart = Math.random().toString(36).substring(2, 6);
      const companyHash = data.companyName
        ? data.companyName
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 3)
            .toUpperCase()
        : 'UNK';

      return `DEAL-${year}-${companyHash}-${accountHash}-${randomPart}`;
    };

    let dealId = generateDealId();
    let retryCount = 0;
    const maxRetries = 5;

    // Ensure unique deal ID
    while (retryCount < maxRetries) {
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('deal_id')
        .eq('deal_id', dealId)
        .single();

      if (!existingDeal) break;

      retryCount++;
      dealId = generateDealId();
    }

    if (retryCount >= maxRetries) {
      return { success: false, error: 'Failed to generate unique deal ID' };
    }

    // Extract primary contact from meeting participants
    const primaryContact =
      data.contactEmail ||
      (meeting.participant_emails && meeting.participant_emails.length > 0
        ? meeting.participant_emails.find(
            (email: string) => email !== meeting.host_email,
          ) || meeting.participant_emails[0]
        : null);

    // Create the deal
    const dealInsertData = {
      deal_id: dealId,
      account_id: data.accountId,
      company_name: data.companyName,
      industry: data.industry || 'Software & Technology',
      value_amount: data.dealValue || 10000, // Default value
      primary_contact: primaryContact?.split('@')[0] || 'Contact',
      primary_email: primaryContact || undefined,
      stage: 'interested' as const,
      probability: 25, // Higher than cold outreach since we had a meeting
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        .toISOString()
        .split('T')[0],
      momentum: 25, // Some momentum since meeting happened
      momentum_trend: 'up' as const,
      next_action: 'Follow up on meeting discussion',
      relationship_insights:
        data.description ||
        `Deal created from meeting: ${meeting.title}. Meeting held on ${new Date(meeting.start_time || meeting.created_at).toLocaleDateString()}.`,
      last_meeting_summary: meeting.title,
      next_steps: [
        'Follow up with decision maker',
        'Send proposal',
        'Schedule next meeting',
      ],
      pain_points: [],
      blockers: [],
      opportunities: [],
      tags: ['from-meeting'],
      created_by: user.id,
      updated_by: user.id,
    };

    console.log('🔄 Creating deal from meeting:', {
      meetingTitle: meeting.title,
      companyName: data.companyName,
      primaryContact,
      dealId,
    });

    // Insert the deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert(dealInsertData)
      .select()
      .single();

    if (dealError) {
      console.error('❌ Error creating deal:', dealError);
      return {
        success: false,
        error: `Failed to create deal: ${dealError.message}`,
      };
    }

    console.log('✅ Deal created successfully:', deal.id);

    // Update the meeting to associate it with the new deal
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        deal_id: deal.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.meetingId);

    if (updateError) {
      console.error('❌ Error associating meeting with deal:', updateError);
      // Don't fail the whole operation, just log the error
    } else {
      console.log('✅ Meeting associated with deal successfully');
    }

    // Revalidate relevant pages
    revalidatePath(`/home/${data.accountName}/meetings`);
    revalidatePath(`/home/${data.accountName}/dealflow`);

    return {
      success: true,
      deal,
      message: `Deal "${data.companyName}" created successfully and linked to meeting`,
    };
  } catch (error) {
    console.error('❌ Error in createDealFromMeetingAction:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create deal from meeting',
    };
  }
}
