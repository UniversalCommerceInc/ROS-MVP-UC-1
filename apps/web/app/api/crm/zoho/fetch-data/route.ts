// app/api/crm/zoho/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, accountId } = await request.json();

    // console.log('🔍 Fetching Zoho data for user:', userId);

    // if (!userId) {
    //   return NextResponse.json(
    //     { error: 'User ID is required' },
    //     { status: 400 },
    //   );
    // }

    const supabase = getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tokenData, error } = await supabase
      .from('zoho_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 },
      );
    }

    if (!tokenData) {
      console.error('❌ No stored tokens found for user:', user.id);
      return NextResponse.json(
        {
          error: 'No Zoho connection found. Please reconnect your account.',
          needsReconnect: true,
        },
        { status: 404 },
      );
    }

    console.log('✅ Found stored tokens for account:', tokenData.account_id);

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now >= expiresAt) {
      console.error('❌ Token expired');
      return NextResponse.json(
        {
          error:
            'Your Zoho connection has expired. Please reconnect your account.',
          needsReconnect: true,
        },
        { status: 401 },
      );
    }

    // Step 1: Fetch deals from Zoho CRM (following N8N workflow)
    console.log('📊 Fetching deals from Zoho API...');

    const dealsResponse = await fetch(
      `${tokenData.api_domain}/crm/v2/Deals?per_page=200`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${tokenData.access_token}`, // Note: Zoho uses different auth format
          'Content-Type': 'application/json',
        },
      },
    );

    if (!dealsResponse.ok) {
      const errorText = await dealsResponse.text();
      console.error('❌ Zoho Deals API error:', errorText);

      if (dealsResponse.status === 401) {
        return NextResponse.json(
          {
            error: 'Zoho authentication failed. Please reconnect your account.',
            needsReconnect: true,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch deals from Zoho', details: errorText },
        { status: 400 },
      );
    }

    const dealsData = await dealsResponse.json();
    const deals = dealsData.data || [];
    console.log(`✅ Successfully fetched ${deals.length} deals from Zoho`);

    // Step 2: Fetch contacts from Zoho CRM (following N8N workflow)
    console.log('📞 Fetching contacts from Zoho API...');

    const contactsResponse = await fetch(
      `${tokenData.api_domain}/crm/v2/Contacts?per_page=200`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    let contactsData: any[] = [];
    if (contactsResponse.ok) {
      const contactsResult = await contactsResponse.json();
      contactsData = contactsResult.data || [];
      console.log(
        `✅ Successfully fetched ${contactsData.length} contacts from Zoho`,
      );
    } else {
      console.warn(
        '⚠️ Failed to fetch contacts from Zoho, continuing without them',
      );
    }

    // Step 3: Merge deals with contacts (following N8N workflow structure)
    // The N8N workflow merges these as separate data arrays
    const mergedData = [
      { data: deals }, // Deals data
      { data: contactsData }, // Contacts data
    ];

    console.log(
      `🎉 Successfully processed Zoho data: ${deals.length} deals, ${contactsData.length} contacts`,
    );

    // Log sample deal structure for debugging
    if (deals.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📋 Sample Zoho deal structure:', {
        Deal_Name: deals[0].Deal_Name,
        Amount: deals[0].Amount,
        Stage: deals[0].Stage,
        Account_Name: deals[0].Account_Name?.name,
        Contact_Name: deals[0].Contact_Name?.name,
      });
    }

    return NextResponse.json({
      success: true,
      data: mergedData, // Return in N8N merge format
      platform: 'zoho',
      accountId: tokenData.account_id,
      totalCount: deals.length,
      contactCount: contactsData.length,
      apiDomain: tokenData.api_domain,
    });
  } catch (error) {
    console.error('💥 Unexpected error in Zoho fetch-data:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
