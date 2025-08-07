// lib/services/salesforceSyncService.ts

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
  interested: 'Prospecting',
  contacted: 'Qualification',
  demo: 'Needs Analysis',
  proposal: 'Proposal/Price Quote',
  negotiation: 'Negotiation/Review',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

export async function updateSalesforceDeal(
  deal: Deal,
  accountId: string,
  supabase: any,
) {
  if (!deal.deal_id || deal.source !== 'salesforce') {
    return { success: true, skipped: true };
  }

  try {
    // Get Salesforce token from your tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('salesforce_tokens')
      .select('access_token, expires_at, api_domain')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      console.error('No Salesforce token found for account:', accountId);
      return { success: false, error: 'No Salesforce token found' };
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) <= new Date()) {
      console.error('Salesforce token expired for account:', accountId);
      return { success: false, error: 'Salesforce token expired' };
    }

    const payload = {
      Name: deal.company_name,
      StageName: stageMapping[deal.stage] || 'Prospecting',
      Amount: deal.value_amount || 0,
      CloseDate: deal.close_date,
      Description: deal.relationship_insights || '',
    };

    const response = await fetch(
      `${tokenData.api_domain}/services/data/v59.0/sobjects/Opportunity/${deal.deal_id}`,
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
      console.error('Salesforce sync failed:', error);
      return { success: false, error: error.message || 'Salesforce API error' };
    }

    console.log(`✅ Synced ${deal.company_name} to Salesforce`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Salesforce sync error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
