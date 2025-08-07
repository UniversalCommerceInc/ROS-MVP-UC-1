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
  stage: DealStage;
  close_date?: string | null;
  relationship_insights?: string | null;
};

const stageMapping: Record<DealStage, string> = {
  interested: 'appointmentscheduled',
  contacted: 'qualifiedtobuy',
  demo: 'presentationscheduled',
  proposal: 'contractsent',
  negotiation: 'decisionmakerbroughtin',
  won: 'closedwon',
  lost: 'closedlost',
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

    const payload = {
      properties: {
        dealname: deal.company_name,
        amount: deal.value_amount || 0,
        dealstage: stageMapping[deal.stage] || 'appointmentscheduled',
        closedate: deal.close_date,
        description: deal.relationship_insights || '',
      },
    };

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
      console.error('HubSpot sync failed:', error);
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
