// app/api/crm/hubspot/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { accountId, userId } = await request.json();

    console.log('🔍 Fetching HubSpot data for account:', accountId);

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify user authentication and account access
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
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    // Get HubSpot tokens for this account (not user)
    const { data: tokenData, error } = await supabase
      .from('hubspot_tokens')
      .select('*')
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
      console.error('❌ No stored tokens found for account:', accountId);
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
    
    // Debug: Check if deals have contact associations
    const dealsWithContacts = deals.filter(deal => deal.associations?.contacts?.results?.length > 0);
    console.log(`📞 Deals with contact associations: ${dealsWithContacts.length} out of ${deals.length}`);
    
    if (dealsWithContacts.length > 0) {
      console.log(`📋 Sample deal with contacts:`, {
        dealId: dealsWithContacts[0].id,
        dealName: dealsWithContacts[0].properties?.dealname,
        contactIds: dealsWithContacts[0].associations.contacts.results.map(c => c.id)
      });
    } else {
      console.log(`⚠️ No deals have contact associations. Sample deal structure:`, {
        dealId: deals[0]?.id,
        dealName: deals[0]?.properties?.dealname,
        hasAssociations: !!deals[0]?.associations,
        associationKeys: deals[0]?.associations ? Object.keys(deals[0].associations) : 'none'
      });
    }

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
    
    if (contactIds.length > 0) {
      console.log(`📋 Contact IDs to fetch: ${contactIds.slice(0, 5).join(', ')}${contactIds.length > 5 ? ` ... and ${contactIds.length - 5} more` : ''}`);
    }

    let contactsData: any[] = [];

    // Step 3: Fetch contact details if we have contact IDs (in batches)
    if (contactIds.length > 0) {
      // HubSpot batch API has a limit of 100 records per request
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < contactIds.length; i += batchSize) {
        batches.push(contactIds.slice(i, i + batchSize));
      }
      
      console.log(`🔗 Making ${batches.length} contact batch API calls for ${contactIds.length} total contacts`);
      
      // Process batches sequentially to avoid rate limiting
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const contactRequest = {
          properties: [
            'email',
            'firstname',
            'lastname',
            'phone',
            'company',
          ],
          inputs: batch.map((id) => ({ id })),
        };
        
        console.log(`📋 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} contacts`);
        
        const contactsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactRequest),
          },
        );

        if (contactsResponse.ok) {
          const contactsResult = await contactsResponse.json();
          const batchContactsData = contactsResult.results || [];
          contactsData.push(...batchContactsData);
          console.log(`✅ Batch ${batchIndex + 1}: Successfully fetched ${batchContactsData.length} contacts`);
        } else {
          const errorText = await contactsResponse.text();
          console.warn(`⚠️ Contact batch ${batchIndex + 1} API failed (${contactsResponse.status}): ${errorText}`);
          
          // Try to parse the error for more details
          try {
            const errorData = JSON.parse(errorText);
            console.warn(`📋 Error details for batch ${batchIndex + 1}:`, errorData);
            
            if (errorData.message?.includes('PROPERTY_DOESNT_EXIST')) {
              console.warn(`🔧 Suggestion: Some contact properties may not exist in your HubSpot account`);
            } else if (errorData.message?.includes('PERMISSION')) {
              console.warn(`🔐 Suggestion: Check HubSpot token permissions for contact access`);
            } else if (errorData.message?.includes('INVALID_CONTACT_ID')) {
              console.warn(`🆔 Some contact IDs in this batch may be invalid or deleted`);
            }
          } catch (parseError) {
            // Error response wasn't JSON
          }
          
          // Continue with next batch even if this one fails
          console.warn(`📄 Batch ${batchIndex + 1} failed, continuing with remaining batches...`);
        }
        
        // Add small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`🎉 Total contacts fetched from all batches: ${contactsData.length}`);
      
      if (contactsData.length > 0) {
        console.log(`📋 Sample contact data:`, {
          contactId: contactsData[0].id,
          properties: Object.keys(contactsData[0].properties || {}),
          email: contactsData[0].properties?.email,
          firstName: contactsData[0].properties?.firstname,
          lastName: contactsData[0].properties?.lastname
        });
      } else {
        console.warn(`📄 No contact data retrieved - deals will be imported with basic info only`);
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

      const mergedDeal = {
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

      // Debug logging for each deal merge
      console.log(`🔄 Merging deal: ${props.dealname || deal.id}`, {
        hasContactAssociation: !!contactId,
        contactId: contactId,
        contactFound: !!contact,
        finalContactData: mergedDeal.contacts ? 'YES' : 'NO'
      });

      return mergedDeal;
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
