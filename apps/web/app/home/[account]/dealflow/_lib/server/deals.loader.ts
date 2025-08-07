import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Deal } from '../types';
import { transformDealFromDb } from './deals.service';

export async function loadDeals(accountId: string): Promise<Deal[]> {
  const supabase = getSupabaseServerClient();

  try {
    const { data: dealsWithContacts, error } = await supabase
      .from('deals')
      .select(
        `
        id,
        account_id,
        company_name,
        industry,
        value_amount,
        value_currency,
        stage,
        probability,
        company_size,
        website,
        deal_title,
        next_action,
        relationship_insights,
        last_meeting_summary,
        momentum,
        momentum_trend,
        last_momentum_change,
        close_date,
        pain_points,
        next_steps,
        blockers,
        opportunities,
        tags,
        source,
        created_at,
        updated_at,
        created_by,
        updated_by,
        assigned_to,
        green_flags,
        red_flags,
        organizational_context,
        competitor_mentions,
        sentiment_engagement,
        last_analysis_date,
        ai_analysis_raw,
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
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading deals with contacts:', error);
      throw new Error(`Failed to load deals: ${error.message}`);
    }

    // Transform database fields to match our Deal interface using shared function
    return (dealsWithContacts || []).map((deal) => transformDealFromDb(deal));
  } catch (error) {
    console.error('Error in loadDeals:', error);
    return [];
  }
}

export async function loadDeal(dealId: string): Promise<Deal | null> {
  const supabase = getSupabaseServerClient();

  try {
    const { data: dealWithContacts, error } = await supabase
      .from('deals')
      .select(
        `
        id,
        account_id,
        company_name,
        industry,
        value_amount,
        value_currency,
        stage,
        probability,
        company_size,
        website,
        deal_title,
        next_action,
        relationship_insights,
        last_meeting_summary,
        momentum,
        momentum_trend,
        last_momentum_change,
        close_date,
        pain_points,
        next_steps,
        blockers,
        opportunities,
        tags,
        source,
        created_at,
        updated_at,
        created_by,
        updated_by,
        assigned_to,
        green_flags,
        red_flags,
        organizational_context,
        competitor_mentions,
        sentiment_engagement,
        last_analysis_date,
        ai_analysis_raw,
        deal_contacts (
          id,
          name,
          email,
          phone,
          role,
          is_primary,
          is_decision_maker,
          last_contacted,
          notes
        )
      `,
      )
      .eq('id', dealId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading deal with contacts:', error);
      throw new Error(`Failed to load deal: ${error.message}`);
    }

    if (!dealWithContacts) return null;

    return transformDealFromDb(dealWithContacts);
  } catch (error) {
    console.error('Error in loadDeal:', error);
    return null;
  }
}
