import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface DisconnectParams {
  params: Promise<{ platform: string }>;
}

// Define the valid table names with proper typing - Added Folk and Slack
const TOKEN_TABLES = {
  pipedrive: 'pipedrive_tokens',
  hubspot: 'hubspot_tokens',
  zoho: 'zoho_tokens',
  salesforce: 'salesforce_tokens',
  folk: 'folk_tokens',
  slack: 'slack_tokens', // ✅ Added Slack support
} as const;

export async function POST(request: NextRequest, { params }: DisconnectParams) {
  try {
    const { platform } = await params;
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    // Updated to include folk and slack in valid platforms
    if (
      !['pipedrive', 'hubspot', 'zoho', 'salesforce', 'folk', 'slack'].includes(
        platform,
      )
    ) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Verify user is authenticated and has access to the account
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this account
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the token from the appropriate table
    const tableName = TOKEN_TABLES[platform as keyof typeof TOKEN_TABLES];

    console.log(
      `🗑️ Disconnecting ${platform} from table: ${tableName} for account: ${accountId}`,
    );

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error(`❌ Error disconnecting ${platform}:`, deleteError);
      return NextResponse.json(
        { error: `Failed to disconnect ${platform} integration` },
        { status: 500 },
      );
    }

    console.log(
      `✅ Successfully disconnected ${platform} for account ${accountId}`,
    );

    // Customize the success message based on platform type
    const platformDisplayName =
      platform === 'slack'
        ? 'Slack'
        : `${platform.charAt(0).toUpperCase() + platform.slice(1)} CRM`;

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${platformDisplayName}`,
      platform,
    });
  } catch (error) {
    console.error('💥 Disconnect integration error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
