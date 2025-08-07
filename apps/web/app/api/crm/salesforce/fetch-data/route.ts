// app/api/crm/salesforce/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    console.log('🔍 Fetching Salesforce data for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: tokenData, error } = await supabase
      .from('salesforce_tokens')
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
          error:
            'No Salesforce connection found. Please reconnect your account.',
          needsReconnect: true,
        },
        { status: 404 },
      );
    }

    console.log('✅ Found stored tokens for account:', tokenData.account_id);

    // Step 1: Fetch Opportunities (following N8N workflow)
    console.log('📊 Fetching opportunities from Salesforce API...');

    const opportunitiesQuery =
      'SELECT+Id,Name,Amount,CloseDate,StageName,Description,Probability,CreatedDate,LastModifiedDate+FROM+Opportunity+LIMIT+200';
    const opportunitiesResponse = await fetch(
      `${tokenData.api_domain}/services/data/v59.0/query/?q=${opportunitiesQuery}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(
      '📊 Opportunities response status:',
      opportunitiesResponse.status,
    );

    if (!opportunitiesResponse.ok) {
      const errorText = await opportunitiesResponse.text();
      console.error('❌ Salesforce API error:', {
        status: opportunitiesResponse.status,
        statusText: opportunitiesResponse.statusText,
        error: errorText,
      });

      if (opportunitiesResponse.status === 401) {
        return NextResponse.json(
          {
            error:
              'Salesforce authentication failed. Please reconnect your account.',
            needsReconnect: true,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch opportunities from Salesforce',
          details: errorText,
          status: opportunitiesResponse.status,
        },
        { status: 400 },
      );
    }

    const opportunitiesData = await opportunitiesResponse.json();
    const opportunities = opportunitiesData.records || [];
    console.log(
      `✅ Successfully fetched ${opportunities.length} opportunities from Salesforce`,
    );

    // Step 2: Get associated contacts (following N8N workflow)
    console.log('📞 Fetching opportunity contact roles...');

    const contactRolesQuery =
      'SELECT+OpportunityId,+ContactId+FROM+OpportunityContactRole';
    const contactRolesResponse = await fetch(
      `${tokenData.api_domain}/services/data/v59.0/query/?q=${contactRolesQuery}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    let contactRoles: any[] = [];
    if (contactRolesResponse.ok) {
      const contactRolesData = await contactRolesResponse.json();
      contactRoles = contactRolesData.records || [];
      console.log(
        `✅ Successfully fetched ${contactRoles.length} contact roles`,
      );
    } else {
      console.warn('⚠️ Failed to fetch contact roles, continuing without them');
    }

    // Step 3: Merge deals with contact IDs (following N8N workflow)
    const contactMap: { [key: string]: string } = {};
    for (const role of contactRoles) {
      contactMap[role.OpportunityId] = role.ContactId;
    }

    const dealsWithContacts = opportunities.map((op: any) => ({
      id: op.Id,
      name: op.Name,
      description: op.Description,
      value: op.Amount,
      probability: op.Probability,
      closeDate: op.CloseDate,
      stage: op.StageName,
      createdAt: op.CreatedDate,
      updatedAt: op.LastModifiedDate,
      contactId: contactMap[op.Id] || null,
    }));

    // Step 4: Extract unique contact IDs
    const contactIds: string[] = [];
    for (const deal of dealsWithContacts) {
      if (deal.contactId && !contactIds.includes(deal.contactId)) {
        contactIds.push(deal.contactId);
      }
    }

    console.log(`📞 Found ${contactIds.length} unique contacts to fetch`);

    let contactsData: any[] = [];

    // Step 5: Fetch contact details if we have contact IDs
    if (contactIds.length > 0) {
      const contactQuery = `SELECT Id, FirstName, LastName, Email, Phone, MailingStreet, Account.Name FROM Contact WHERE Id IN ('${contactIds.join("','")}')`;
      const contactsResponse = await fetch(
        `${tokenData.api_domain}/services/data/v59.0/query?q=${encodeURIComponent(contactQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (contactsResponse.ok) {
        const contactsResult = await contactsResponse.json();
        contactsData = contactsResult.records || [];
        console.log(`✅ Successfully fetched ${contactsData.length} contacts`);
      } else {
        console.warn(
          '⚠️ Failed to fetch contact details, continuing without them',
        );
      }
    }

    // Step 6: Final merge with contact data (following N8N workflow)
    const contactDetailsMap: { [key: string]: any } = {};
    for (const contact of contactsData) {
      contactDetailsMap[contact.Id] = {
        id: contact.Id,
        first_name: contact.FirstName || null,
        last_name: contact.LastName || null,
        email: contact.Email || null,
        phone: contact.Phone || null,
        address: contact.MailingStreet || null,
        company: contact.Account?.Name || null,
      };
    }

    const finalMergedData = dealsWithContacts.map((deal: any) => {
      const contactDetails = deal.contactId
        ? contactDetailsMap[deal.contactId] || null
        : null;

      return {
        id: deal.id,
        name: deal.name,
        description: deal.description,
        value: deal.value,
        probability: deal.probability,
        stage: deal.stage,
        closeDate: deal.closeDate,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        contacts: contactDetails,
      };
    });

    console.log(
      `🎉 Successfully processed ${finalMergedData.length} deals with contact data`,
    );

    // Log sample opportunity for debugging
    if (finalMergedData.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📋 Sample merged deal structure:', {
        id: finalMergedData[0].id,
        name: finalMergedData[0].name,
        value: finalMergedData[0].value,
        stage: finalMergedData[0].stage,
        hasContact: !!finalMergedData[0].contacts,
      });
    }

    return NextResponse.json({
      success: true,
      data: finalMergedData,
      platform: 'salesforce',
      accountId: tokenData.account_id,
      totalCount: finalMergedData.length,
      contactCount: contactsData.length,
      apiDomain: tokenData.api_domain, // Changed from instanceUrl
    });
  } catch (error) {
    console.error('💥 Unexpected error in Salesforce fetch-data:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
