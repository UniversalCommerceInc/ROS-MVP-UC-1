// lib/services/hubspotSyncService.ts

type DealStage =
  | 'interested'
  | 'contacted'
  | 'demo'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

type Deal = {
  deal_id?: string | null;
  source?: string | null;
  company_name: string;
  value_amount?: number | null;
  value_currency?: string | null;
  stage: DealStage;
  close_date?: string | null;
  relationship_insights?: string | null;
  next_steps?: string | null;
  pain_points?: string | null;
  probability?: number | null;
  website?: string | null;
};

// Map our internal stages to the actual HubSpot pipeline stage IDs
// Based on the valid options from your HubSpot account
const stageMapping: Record<DealStage, string> = {
  interested: '163841039',         // First stage in your pipeline
  contacted: '162574188',          // Second stage 
  demo: 'presentationscheduled',   // This one is valid
  proposal: '162574189',           // Another numeric stage
  negotiation: '181958793',        // Another numeric stage
  won: '162574192',                // Won stage (numeric ID)
  lost: 'closedlost',             // This one is valid
};

export async function updateHubSpotDeal(
  deal: Deal,
  accountId: string,
  supabase: any,
) {
  if (!deal.deal_id || deal.source !== 'hubspot') {
    return { success: true, skipped: true };
  }

  try {
    // Get HubSpot token from your tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('hubspot_tokens')
      .select('access_token, expires_at')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      console.error('No HubSpot token found for account:', accountId);
      return { success: false, error: 'No HubSpot token found' };
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) <= new Date()) {
      console.error('HubSpot token expired for account:', accountId);
      return { success: false, error: 'HubSpot token expired' };
    }

    // Get the mapped stage, with fallback to first stage if unknown
    const mappedStage = stageMapping[deal.stage] || '163841039';
    
    console.log(`🔄 Syncing deal to HubSpot: ${deal.company_name}`);
    console.log(`📊 Stage mapping: ${deal.stage} -> ${mappedStage}`);
    
    // Convert arrays to strings for HubSpot API
    const formatArrayField = (field: any): string => {
      if (Array.isArray(field)) {
        return field.length > 0 ? field.join('; ') : '';
      }
      return field || '';
    };

    const payload = {
      properties: {
        dealname: deal.company_name,
        amount: deal.value_amount || 0,
        dealstage: mappedStage,
        closedate: deal.close_date,
        description: deal.relationship_insights || '',
        // Additional fields that are commonly edited (converted to strings)
        ...(deal.next_steps && { hs_next_step: formatArrayField(deal.next_steps) }),
        ...(deal.pain_points && { pain_points: formatArrayField(deal.pain_points) }),
        ...(deal.probability !== null && deal.probability !== undefined && { 
          hs_deal_probability: deal.probability 
        }),
        ...(deal.website && { website_url: deal.website }),
      },
    };
    
    console.log(`📋 HubSpot payload:`, payload);

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${deal.deal_id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ HubSpot sync failed:', error);
      console.error(`💥 Failed to sync deal ${deal.deal_id} (${deal.company_name}) to HubSpot`);
      
      // Check for specific stage-related errors
      if (error.message?.includes('not a valid pipeline stage ID')) {
        console.error('🏗️ Stage mapping issue detected. Current valid stages are:', error.message);
        console.error('🔧 Consider updating the stageMapping in hubspotSyncService.ts');
      }
      
      return { success: false, error: error.message || 'HubSpot API error' };
    }

    console.log(`✅ Synced ${deal.company_name} to HubSpot`);
    return { success: true };
  } catch (error: unknown) {
    console.error('HubSpot sync error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
