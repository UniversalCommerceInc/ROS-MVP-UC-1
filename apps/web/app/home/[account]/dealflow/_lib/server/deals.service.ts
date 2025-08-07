import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { DB_STAGE_TO_UI, STAGE_CONFIG } from '../constants';
import { Deal, DealStage } from '../types';

export async function updateDealStage(
  dealId: string,
  newStage: DealStage,
): Promise<Deal | null> {
  const supabase = getSupabaseServerClient();

  try {
    // Get the exact database enum value for this UI stage
    const dbStageValue = STAGE_CONFIG[newStage]?.dbValue;

    if (!dbStageValue) {
      throw new Error(`No database mapping found for stage: ${newStage}`);
    }

    console.log(
      `Updating deal ${dealId} from UI stage "${newStage}" to DB stage "${dbStageValue}"`,
    );

    const { data: deal, error } = await supabase
      .from('deals')
      .update({
        stage: dbStageValue, // Use the exact mapped database value
        probability: STAGE_CONFIG[newStage]?.probability || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select(
        `
        *,
        deal_contacts (
          id,
          name,
          email,
          phone,
          role,
          is_primary,
          is_decision_maker
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating deal stage:', error);
      console.error('Attempted to set stage to:', dbStageValue);
      console.error(
        'Available enum values should be: interested, contacted, demo, proposal, negotiation, won, lost',
      );
      throw new Error(`Failed to update deal stage: ${error.message}`);
    }

    if (!deal) return null;

    return transformDealFromDb(deal);
  } catch (error) {
    console.error('Error in updateDealStage:', error);
    return null;
  }
}

export async function createDeal(
  accountId: string,
  dealData: Partial<Deal> & { contact?: any },
): Promise<Deal> {
  const supabase = getSupabaseServerClient();

  try {
    // Parse value if it's a string with currency symbol
    const parseValue = (
      value: string | number,
    ): { amount: number; currency: string } => {
      if (typeof value === 'number') {
        return { amount: value, currency: 'USD' };
      }

      if (typeof value === 'string') {
        // Remove currency symbols and parse
        const cleanValue = value.replace(/[\$,€£¥]/g, '');
        const amount = parseFloat(cleanValue) || 0;

        // Detect currency from symbol
        let currency = 'USD';
        if (value.includes('€')) currency = 'EUR';
        else if (value.includes('£')) currency = 'GBP';
        else if (value.includes('¥')) currency = 'JPY';

        return { amount, currency };
      }

      return { amount: 0, currency: 'USD' };
    };

    const { amount, currency } = parseValue(
      dealData.value || dealData.valueAmount || 0,
    );

    // Map the stage to database enum value
    const dbStageValue = dealData.stage
      ? STAGE_CONFIG[dealData.stage]?.dbValue
      : 'interested';

    if (!dbStageValue) {
      throw new Error(`No database mapping found for stage: ${dealData.stage}`);
    }

    const dealInsert = {
      account_id: accountId,
      company_name: dealData.companyName || '',
      industry: dealData.industry || '',
      value_amount: amount,
      value_currency: currency,
      stage: dbStageValue, // Use exact mapped database value
      probability:
        dealData.probability ||
        STAGE_CONFIG[dealData.stage || 'interested'].probability,
      company_size: dealData.companySize,
      website: dealData.website,
      deal_title: dealData.dealTitle,
      next_action: dealData.nextAction,
      relationship_insights: dealData.relationshipInsights,
      last_meeting_summary: dealData.last_meeting_summary,
      momentum: dealData.momentum || 50,
      momentum_trend: dealData.momentumTrend || 'steady',
      close_date: dealData.closeDate,
      pain_points: dealData.painPoints,
      next_steps: dealData.nextSteps,
      blockers: dealData.blockers,
      opportunities: dealData.opportunities,
      tags: dealData.tags,
      assigned_to: dealData.assignedTo || null, // Auto-assign to creator if not specified
      // Initialize AI analysis fields as empty
      green_flags: dealData.greenFlags || [],
      red_flags: dealData.redFlags || [],
      organizational_context: dealData.organizationalContext || [],
      competitor_mentions: dealData.competitorMentions || [],
      sentiment_engagement: dealData.sentimentEngagement || [],
      last_analysis_date: dealData.lastAnalysisDate || null,
      ai_analysis_raw: dealData.aiAnalysisRaw || null,
    };

    console.log('Creating deal with stage:', dbStageValue);

    // Start a transaction to create both deal and contact
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert(dealInsert)
      .select()
      .single();

    if (dealError) {
      console.error('Error creating deal:', dealError);
      throw new Error(`Failed to create deal: ${dealError.message}`);
    }

    console.log('✅ Deal created successfully:', deal.id);

    // Create the contact if provided
    let dealContact = null;
    if (dealData.contact && (dealData.contact.name || dealData.contact.email)) {
      const contactInsert = {
        deal_id: deal.id,
        name: dealData.contact.name || 'Unknown Contact',
        email: dealData.contact.email || '',
        phone: dealData.contact.phone || null,
        role: dealData.contact.role || null,
        contact_role_type: null, // You can map this if needed
        is_primary: dealData.contact.is_primary ?? true,
        is_decision_maker: dealData.contact.is_decision_maker ?? false,
        last_contacted: null,
        notes: null,
      };

      const { data: contact, error: contactError } = await supabase
        .from('deal_contacts')
        .insert(contactInsert)
        .select()
        .single();

      if (contactError) {
        console.error('Error creating contact:', contactError);
        // Don't fail the entire operation if contact creation fails
        console.warn('Deal created but contact creation failed');
      } else {
        dealContact = contact;
        console.log('✅ Contact created successfully:', contact.id);
      }
    }

    // Fetch the complete deal with contacts for return
    const { data: completeaDeal, error: fetchError } = await supabase
      .from('deals')
      .select(
        `
        *,
        deal_contacts (
          id,
          name,
          email,
          phone,
          role,
          is_primary,
          is_decision_maker
        )
      `,
      )
      .eq('id', deal.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete deal:', fetchError);
      // Return the basic deal if we can't fetch the complete one
      return transformDealFromDb({
        ...deal,
        deal_contacts: dealContact ? [dealContact] : [],
      });
    }

    return transformDealFromDb(completeaDeal);
  } catch (error) {
    console.error('Error in createDeal:', error);
    throw error;
  }
}

export async function updateDeal(
  dealId: string,
  dealData: Partial<Deal>,
): Promise<Deal | null> {
  const supabase = getSupabaseServerClient();

  try {
    const dealUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (dealData.companyName !== undefined)
      dealUpdate.company_name = dealData.companyName;
    if (dealData.industry !== undefined)
      dealUpdate.industry = dealData.industry;
    if (dealData.valueAmount !== undefined)
      dealUpdate.value_amount = dealData.valueAmount;
    if (dealData.valueCurrency !== undefined)
      dealUpdate.value_currency = dealData.valueCurrency;
    if (dealData.stage !== undefined) {
      const dbStageValue = STAGE_CONFIG[dealData.stage]?.dbValue;
      if (dbStageValue) {
        dealUpdate.stage = dbStageValue;
      }
    }
    if (dealData.probability !== undefined)
      dealUpdate.probability = dealData.probability;
    if (dealData.companySize !== undefined)
      dealUpdate.company_size = dealData.companySize;
    if (dealData.website !== undefined) dealUpdate.website = dealData.website;
    if (dealData.dealTitle !== undefined)
      dealUpdate.deal_title = dealData.dealTitle;
    if (dealData.nextAction !== undefined)
      dealUpdate.next_action = dealData.nextAction;
    if (dealData.relationshipInsights !== undefined)
      dealUpdate.relationship_insights = dealData.relationshipInsights;
    if (dealData.last_meeting_summary !== undefined)
      dealUpdate.last_meeting_summary = dealData.last_meeting_summary;
    if (dealData.momentum !== undefined)
      dealUpdate.momentum = dealData.momentum;
    if (dealData.momentumTrend !== undefined)
      dealUpdate.momentum_trend = dealData.momentumTrend;
    if (dealData.closeDate !== undefined)
      dealUpdate.close_date = dealData.closeDate;
    if (dealData.painPoints !== undefined)
      dealUpdate.pain_points = dealData.painPoints;
    if (dealData.nextSteps !== undefined)
      dealUpdate.next_steps = dealData.nextSteps;
    if (dealData.blockers !== undefined)
      dealUpdate.blockers = dealData.blockers;
    if (dealData.opportunities !== undefined)
      dealUpdate.opportunities = dealData.opportunities;
    if (dealData.tags !== undefined) dealUpdate.tags = dealData.tags;

    // Add AI analysis fields
    if (dealData.greenFlags !== undefined)
      dealUpdate.green_flags = dealData.greenFlags;
    if (dealData.redFlags !== undefined)
      dealUpdate.red_flags = dealData.redFlags;
    if (dealData.organizationalContext !== undefined)
      dealUpdate.organizational_context = dealData.organizationalContext;
    if (dealData.competitorMentions !== undefined)
      dealUpdate.competitor_mentions = dealData.competitorMentions;
    if (dealData.sentimentEngagement !== undefined)
      dealUpdate.sentiment_engagement = dealData.sentimentEngagement;
    if (dealData.lastAnalysisDate !== undefined)
      dealUpdate.last_analysis_date = dealData.lastAnalysisDate;
    if (dealData.aiAnalysisRaw !== undefined)
      dealUpdate.ai_analysis_raw = dealData.aiAnalysisRaw;
    if (dealData.assigned_to !== undefined)
      dealUpdate.assigned_to = dealData.assigned_to;

    const { data: deal, error } = await supabase
      .from('deals')
      .update(dealUpdate)
      .eq('id', dealId)
      .select(
        `
        *,
        deal_contacts (
          id,
          name,
          email,
          phone,
          role,
          is_primary,
          is_decision_maker
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      throw new Error(`Failed to update deal: ${error.message}`);
    }

    if (!deal) return null;

    return transformDealFromDb(deal);
  } catch (error) {
    console.error('Error in updateDeal:', error);
    return null;
  }
}

export async function deleteDeal(dealId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();

  try {
    console.log('🗑️ Starting deal deletion process for:', dealId);

    // First, verify the deal exists (simple query)
    const { data: dealInfo, error: checkError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', dealId)
      .single();

    if (checkError || !dealInfo) {
      console.error('❌ Deal not found:', dealId, checkError);
      throw new Error('Deal not found or already deleted');
    }

    console.log('✅ Deal found:', dealInfo.company_name);

    // Delete in specific order with proper error handling

    // 1. Delete transcripts that reference meetings for this deal
    console.log('🔄 Deleting transcripts...');

    // First get meeting IDs for this deal
    const { data: meetingIds, error: meetingIdsError } = await supabase
      .from('meetings')
      .select('id')
      .eq('deal_id', dealId);

    if (meetingIdsError) {
      console.error('⚠️ Error getting meeting IDs:', meetingIdsError);
    } else if (meetingIds && meetingIds.length > 0) {
      // Delete transcripts for these meetings
      const meetingIdList = meetingIds.map((m) => m.id);
      const { error: transcriptsError } = await supabase
        .from('transcripts')
        .delete()
        .in('meeting_id', meetingIdList);

      if (transcriptsError) {
        console.error('⚠️ Error deleting transcripts:', transcriptsError);
      } else {
        console.log('✅ Transcripts deleted successfully');
      }
    }

    // 2. Delete deal_activities
    console.log('🔄 Deleting deal activities...');
    const { error: activitiesError } = await supabase
      .from('deal_activities')
      .delete()
      .eq('deal_id', dealId);

    if (activitiesError) {
      console.error('❌ FAILED to delete deal activities:', activitiesError);
      throw new Error(
        `Failed to delete deal activities: ${activitiesError.message}`,
      );
    } else {
      console.log('✅ Deal activities deleted successfully');
    }

    // 3. Delete deal_contacts
    console.log('🔄 Deleting deal contacts...');
    const { error: contactsError } = await supabase
      .from('deal_contacts')
      .delete()
      .eq('deal_id', dealId);

    if (contactsError) {
      console.error('❌ FAILED to delete deal contacts:', contactsError);
      throw new Error(
        `Failed to delete deal contacts: ${contactsError.message}`,
      );
    } else {
      console.log('✅ Deal contacts deleted successfully');
    }

    // 4. Delete deal_momentum_markers
    console.log('🔄 Deleting momentum markers...');
    const { error: momentumError } = await supabase
      .from('deal_momentum_markers')
      .delete()
      .eq('deal_id', dealId);

    if (momentumError) {
      console.error('❌ FAILED to delete momentum markers:', momentumError);
      throw new Error(
        `Failed to delete momentum markers: ${momentumError.message}`,
      );
    } else {
      console.log('✅ Momentum markers deleted successfully');
    }

    // 5. Delete scheduled_meetings
    console.log('🔄 Deleting scheduled meetings...');
    const { error: scheduledMeetingsError } = await supabase
      .from('scheduled_meetings')
      .delete()
      .eq('deal_id', dealId);

    if (scheduledMeetingsError) {
      console.error(
        '❌ FAILED to delete scheduled meetings:',
        scheduledMeetingsError,
      );
      throw new Error(
        `Failed to delete scheduled meetings: ${scheduledMeetingsError.message}`,
      );
    } else {
      console.log('✅ Scheduled meetings deleted successfully');
    }

    // 6. Delete webhook_logs
    console.log('🔄 Deleting webhook logs...');
    const { error: webhookLogsError } = await supabase
      .from('webhook_logs')
      .delete()
      .eq('deal_id', dealId);

    if (webhookLogsError) {
      console.error('❌ FAILED to delete webhook logs:', webhookLogsError);
      throw new Error(
        `Failed to delete webhook logs: ${webhookLogsError.message}`,
      );
    } else {
      console.log('✅ Webhook logs deleted successfully');
    }

    // 7. Delete meetings (CRITICAL - this was causing the constraint error)
    console.log('🔄 Deleting meetings...');
    const { error: meetingsError } = await supabase
      .from('meetings')
      .delete()
      .eq('deal_id', dealId);

    if (meetingsError) {
      console.error('❌ FAILED to delete meetings:', meetingsError);
      throw new Error(`Failed to delete meetings: ${meetingsError.message}`);
    } else {
      console.log('✅ Meetings deleted successfully');
    }

    // 8. Verify no meetings remain (simple check)
    const { data: remainingMeetings, error: checkMeetingsError } =
      await supabase.from('meetings').select('id').eq('deal_id', dealId);

    if (checkMeetingsError) {
      console.error(
        '❌ Error checking remaining meetings:',
        checkMeetingsError,
      );
    } else if (remainingMeetings && remainingMeetings.length > 0) {
      console.error(
        '❌ Still have meetings remaining:',
        remainingMeetings.length,
      );
      throw new Error(
        `Still have ${remainingMeetings.length} meetings remaining that prevent deal deletion`,
      );
    } else {
      console.log('✅ Verified no meetings remain');
    }

    // 9. Finally, delete the deal itself
    console.log('🔄 Deleting the deal...');
    const { error: dealError } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId);

    if (dealError) {
      console.error('❌ FAILED to delete deal:', dealError);
      throw new Error(`Failed to delete deal: ${dealError.message}`);
    }

    console.log('✅ Deal deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in deleteDeal:', error);
    throw error;
  }
}

// Transform function to convert database records to UI format
function transformDealFromDb(deal: any): Deal {
  const formatValue = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount || 0);
  };

  // Map database stage back to UI stage using our mapping
  const uiStage = DB_STAGE_TO_UI[deal.stage] || 'interested';

  // Get primary contact information
  const primaryContact = Array.isArray(deal.deal_contacts)
    ? deal.deal_contacts.find((contact: any) => contact.is_primary) ||
      deal.deal_contacts[0]
    : deal.deal_contacts;

  const contactName = primaryContact?.name || '';
  const contactEmail = primaryContact?.email || '';

  return {
    id: deal.id,
    companyName: deal.company_name,
    industry: deal.industry || '',
    valueAmount: deal.value_amount || 0,
    valueCurrency: deal.value_currency || 'USD',
    value: formatValue(deal.value_amount, deal.value_currency),
    contact: contactName, // Now populated from deal_contacts
    email: contactEmail, // Now populated from deal_contacts
    stage: uiStage, // Use mapped UI stage
    createdAt: deal.created_at,
    updatedAt: deal.updated_at,
    closeDate: deal.close_date,
    probability: deal.probability || 0,
    painPoints: deal.pain_points || [],
    nextSteps: deal.next_steps || [],
    companySize: deal.company_size,
    website: deal.website,
    dealTitle: deal.deal_title,
    nextAction: deal.next_action,
    relationshipInsights: deal.relationship_insights,
    last_meeting_summary: deal.last_meeting_summary,
    momentum: deal.momentum || 0,
    momentumTrend: deal.momentum_trend || 'steady',
    lastMomentumChange: deal.last_momentum_change,
    blockers: deal.blockers || [],
    opportunities: deal.opportunities || [],
    tags: deal.tags || [],
    source: deal.source,
    createdBy: deal.created_by,
    updatedBy: deal.updated_by,
    // Add AI analysis fields to the transform
    greenFlags: deal.green_flags || [],
    redFlags: deal.red_flags || [],
    organizationalContext: deal.organizational_context || [],
    competitorMentions: deal.competitor_mentions || [],
    sentimentEngagement: deal.sentiment_engagement || [],
    lastAnalysisDate: deal.last_analysis_date,
    aiAnalysisRaw: deal.ai_analysis_raw,
  };
}

// Export the transform function for use in loader
export { transformDealFromDb };
