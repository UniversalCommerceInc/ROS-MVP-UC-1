// app/api/crm/hubspot/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    console.log('🔍 Fetching HubSpot data for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: tokenData, error } = await supabase
      .from('hubspot_tokens')
      .select('*')
      .eq('user_id', userId)
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
      console.error('❌ No stored tokens found for user:', userId);
      return NextResponse.json(
        {
          error: 'No HubSpot connection found. Please reconnect your account.',
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
            'Your HubSpot connection has expired. Please reconnect your account.',
          needsReconnect: true,
        },
        { status: 401 },
      );
    }

    // Step 1: Fetch deals with associations (matching N8N workflow)
    console.log('📊 Fetching deals from HubSpot API...');

    const dealsResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/deals?associations=contacts,companies&properties=dealname,description,amount,currency,hs_deal_stage_probability,closedate,hs_actual_closed_date,dealstage&limit=100',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!dealsResponse.ok) {
      const errorText = await dealsResponse.text();
      console.error('❌ HubSpot API error:', errorText);

      if (dealsResponse.status === 401) {
        return NextResponse.json(
          {
            error:
              'HubSpot authentication failed. Please reconnect your account.',
            needsReconnect: true,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch deals from HubSpot', details: errorText },
        { status: 400 },
      );
    }

    const dealsData = await dealsResponse.json();
    const deals = dealsData.results || [];
    console.log(`✅ Successfully fetched ${deals.length} deals from HubSpot`);

    // Step 2: Extract contact IDs from deals (following N8N workflow)
    const contactIds: string[] = [];
    for (const deal of deals) {
      const contacts = deal.associations?.contacts?.results || [];
      for (const contact of contacts) {
        if (!contactIds.includes(contact.id)) {
          contactIds.push(contact.id);
        }
      }
    }

    console.log(`📞 Found ${contactIds.length} unique contacts to fetch`);

    let contactsData: any[] = [];

    // Step 3: Fetch contact details if we have contact IDs
    if (contactIds.length > 0) {
      const contactsResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: [
              'email',
              'firstname',
              'lastname',
              'phone',
              'company',
              'address',
            ],
            inputs: contactIds.map((id) => ({ id })),
          }),
        },
      );

      if (contactsResponse.ok) {
        const contactsResult = await contactsResponse.json();
        contactsData = contactsResult.results || [];
        console.log(`✅ Successfully fetched ${contactsData.length} contacts`);
      } else {
        console.warn(
          '⚠️ Failed to fetch contact details, continuing without them',
        );
      }
    }

    // Step 4: Merge deals with contact data (following N8N workflow logic)
    const contactMap: { [key: string]: any } = {};
    for (const contact of contactsData) {
      contactMap[contact.id] = contact.properties;
    }

    const mergedData = deals.map((deal: any) => {
      const props = deal.properties || {};
      const contactId = deal.associations?.contacts?.results?.[0]?.id;
      const contact = contactMap[contactId];

      return {
        id: deal.id,
        name: props.dealname,
        description: props.description || null,
        value: props.amount || null,
        probability: props.hs_deal_stage_probability || null,
        closeDate: props.closedate || null,
        stage: props.dealstage || null,
        created_at: deal.createdAt,
        updated_at: deal.updatedAt,
        contacts: contact
          ? {
              id: contactId,
              first_name: contact.firstname || null,
              last_name: contact.lastname || null,
              email: contact.email || null,
              phone: contact.phone || null,
              address: contact.address || null,
              company: contact.company || null,
              created_at: contact.createdate,
            }
          : null,
      };
    });

    console.log(
      `🎉 Successfully processed ${mergedData.length} deals with contact data`,
    );

    return NextResponse.json({
      success: true,
      data: mergedData,
      platform: 'hubspot',
      accountId: tokenData.account_id,
      totalCount: mergedData.length,
      contactCount: contactsData.length,
    });
  } catch (error) {
    console.error('💥 Unexpected error in HubSpot fetch-data:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
