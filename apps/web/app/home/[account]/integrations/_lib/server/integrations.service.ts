import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface IntegrationStatus {
  isConnected: boolean;
  lastSync?: string | null;
  emailAddress?: string;
  totalRecordsSynced?: number;
  connectionDetails?: Record<string, any>;
}

export interface AllIntegrationStatus {
  pipedrive: IntegrationStatus;
  hubspot: IntegrationStatus;
  zoho: IntegrationStatus;
  salesforce: IntegrationStatus;
  folk: IntegrationStatus;
  slack: IntegrationStatus;
}

export async function getIntegrationStatus(
  accountId: string,
): Promise<AllIntegrationStatus> {
  const supabase = getSupabaseServerClient();

  try {
    // Check for CRM integration tokens using Promise.allSettled to handle missing tables gracefully
    const tokenChecks = await Promise.allSettled([
      supabase
        .from('pipedrive_tokens')
        .select('*')
        .eq('account_id', accountId)
        .limit(1),
      supabase
        .from('hubspot_tokens')
        .select('*')
        .eq('account_id', accountId)
        .limit(1),
      supabase
        .from('zoho_tokens')
        .select('*')
        .eq('account_id', accountId)
        .limit(1),
      supabase
        .from('salesforce_tokens')
        .select('*')
        .eq('account_id', accountId)
        .limit(1),
      supabase
        .from('folk_tokens')
        .select('*')
        .eq('account_id', accountId)
        .limit(1),
      supabase
        .from('slack_tokens')
        .select('*')
        .eq('account_id', accountId)
        .single(),
    ]);

    // Get deal counts to show how much data has been synced
    const { data: deals } = await supabase
      .from('deals')
      .select('id, created_at')
      .eq('account_id', accountId);

    const totalDeals = deals?.length || 0;

    // Helper function to safely extract token data
    const extractTokenData = (result: any, index: number) => {
      if (
        result.status === 'fulfilled' &&
        result.value.data &&
        (Array.isArray(result.value.data)
          ? result.value.data.length > 0
          : result.value.data)
      ) {
        return Array.isArray(result.value.data)
          ? result.value.data[0]
          : result.value.data;
      }
      return null;
    };

    const [
      pipedriveToken,
      hubspotToken,
      zohoToken,
      salesforceToken,
      folkToken,
      slackToken,
    ] = tokenChecks.map(extractTokenData);

    const status: AllIntegrationStatus = {
      pipedrive: {
        isConnected: !!pipedriveToken,
        lastSync: pipedriveToken?.updated_at || null,
        emailAddress: pipedriveToken?.email_address || null,
        totalRecordsSynced: totalDeals,
      },
      hubspot: {
        isConnected: !!hubspotToken,
        lastSync: hubspotToken?.updated_at || null,
        emailAddress: hubspotToken?.email_address || null,
        totalRecordsSynced: totalDeals,
      },
      zoho: {
        isConnected: !!zohoToken,
        lastSync: zohoToken?.updated_at || null,
        emailAddress: zohoToken?.email_address || null,
        totalRecordsSynced: totalDeals,
      },
      salesforce: {
        isConnected: !!salesforceToken,
        lastSync: salesforceToken?.updated_at || null,
        emailAddress: salesforceToken?.email_address || null,
        totalRecordsSynced: totalDeals,
      },
      folk: {
        isConnected: !!folkToken,
        lastSync: folkToken?.updated_at || null,
        emailAddress: folkToken?.email_address || null,
        totalRecordsSynced: totalDeals,
      },
      slack: {
        isConnected: !!slackToken,
        lastSync: slackToken?.updated_at || null,
        emailAddress: slackToken?.authed_user_id || null, // Slack uses user ID instead of email
        totalRecordsSynced: 0, // Slack doesn't sync deals, could track notifications sent
      },
    };

    return status;
  } catch (error) {
    console.error('Error in getIntegrationStatus:', error);

    // Return default status on error
    return {
      pipedrive: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
      hubspot: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
      zoho: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
      salesforce: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
      folk: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
      slack: { isConnected: false, lastSync: null, totalRecordsSynced: 0 },
    };
  }
}

export async function updateIntegrationStatus(
  accountId: string,
  platform: string,
  status: Partial<IntegrationStatus>,
) {
  const supabase = getSupabaseServerClient();

  try {
    // This would update the respective platform token table
    console.log(
      `Would update ${platform} tokens for account ${accountId}:`,
      status,
    );

    // Since you're storing tokens in the callback, this function can be used
    // for updating sync status or other metadata if needed
    return { success: true };
  } catch (error) {
    console.error('Error in updateIntegrationStatus:', error);
    return { success: false, error: 'Failed to update integration status' };
  }
}

// Helper function to get deal sync statistics
export async function getDealSyncStats(accountId: string) {
  const supabase = getSupabaseServerClient();

  try {
    const { data: deals } = await supabase
      .from('deals')
      .select('id, company_name, stage, value_amount, created_at')
      .eq('account_id', accountId);

    const { data: contacts } = await supabase
      .from('deal_contacts')
      .select('id, deal_id')
      .in('deal_id', deals?.map((d) => d.id) || []);

    return {
      totalDeals: deals?.length || 0,
      totalContacts: contacts?.length || 0,
      totalValue:
        deals?.reduce((sum, deal) => sum + (deal.value_amount || 0), 0) || 0,
      lastUpdated: deals?.[0]?.created_at || null,
    };
  } catch (error) {
    console.error('Error getting deal sync stats:', error);
    return {
      totalDeals: 0,
      totalContacts: 0,
      totalValue: 0,
      lastUpdated: null,
    };
  }
}

// Function to disconnect an integration
// export async function disconnectIntegration(
//   accountId: string,
//   platform: string,
// ) {
//   const supabase = getSupabaseServerClient();

//   try {
//     const tableName = `${platform}_tokens`;

//     const { error } = await supabase
//       .from(tableName)
//       .delete()
//       .eq('account_id', accountId);

//     if (error) {
//       console.error(`Error disconnecting ${platform}:`, error);
//       return { success: false, error: error.message };
//     }

//     console.log(
//       `Successfully disconnected ${platform} for account ${accountId}`,
//     );
//     return { success: true };
//   } catch (error) {
//     console.error(`Error disconnecting ${platform}:`, error);
//     return { success: false, error: 'Failed to disconnect integration' };
//   }
// }
