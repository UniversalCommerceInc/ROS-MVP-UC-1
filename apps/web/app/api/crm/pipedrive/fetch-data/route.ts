// app/api/crm/pipedrive/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    console.log('🔍 Fetching Pipedrive data for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Get stored tokens from database
    const supabase = getSupabaseServerClient();

    const { data: tokenData, error } = await supabase
      .from('pipedrive_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Get most recent token
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
            'No Pipedrive connection found. Please reconnect your account.',
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
      console.error('❌ Token expired:', {
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return NextResponse.json(
        {
          error:
            'Your Pipedrive connection has expired. Please reconnect your account.',
          needsReconnect: true,
        },
        { status: 401 },
      );
    }

    // Step 1: Fetch deals from Pipedrive API (following N8N workflow)
    console.log('📊 Fetching deals from Pipedrive API...');

    const dealsResponse = await fetch(
      'https://api.pipedrive.com/v1/deals?limit=500',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!dealsResponse.ok) {
      const errorText = await dealsResponse.text();
      console.error('❌ Pipedrive API error:', {
        status: dealsResponse.status,
        statusText: dealsResponse.statusText,
        error: errorText,
      });

      if (dealsResponse.status === 401) {
        return NextResponse.json(
          {
            error:
              'Pipedrive authentication failed. Please reconnect your account.',
            needsReconnect: true,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch deals from Pipedrive',
          details: errorText,
        },
        { status: 400 },
      );
    }

    const dealsData = await dealsResponse.json();
    const deals = dealsData.data || [];
    console.log(`✅ Successfully fetched ${deals.length} deals from Pipedrive`);

    // Step 2: Get unique person IDs from deals (following N8N pattern)
    const personIds: number[] = [];
    for (const deal of deals) {
      if (deal.person_id?.value && !personIds.includes(deal.person_id.value)) {
        personIds.push(deal.person_id.value);
      }
    }

    console.log(`📞 Found ${personIds.length} unique persons to fetch`);

    // Step 3: Fetch person details if we have person IDs
    let personsData: any[] = [];
    if (personIds.length > 0) {
      // Pipedrive doesn't have batch API, so we'll fetch persons individually
      // For better performance, we could implement pagination or batch processing
      const personPromises = personIds.slice(0, 100).map(async (personId) => {
        // Limit to 100 to avoid rate limits
        try {
          const personResponse = await fetch(
            `https://api.pipedrive.com/v1/persons/${personId}`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (personResponse.ok) {
            const personData = await personResponse.json();
            return personData.data;
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch person ${personId}:`, error);
          return null;
        }
      });

      const personResults = await Promise.allSettled(personPromises);
      personsData = personResults
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled' && result.value !== null,
        )
        .map((result) => result.value);

      console.log(
        `✅ Successfully fetched ${personsData.length} persons from Pipedrive`,
      );
    }

    // Step 4: Enhance deals with person data (similar to N8N workflow)
    const personMap: { [key: number]: any } = {};
    for (const person of personsData) {
      personMap[person.id] = person;
    }

    const enhancedDeals = deals.map((deal: any) => {
      const personId = deal.person_id?.value;
      const person = personId ? personMap[personId] : null;

      // Enhance the deal with person data while keeping original structure
      return {
        ...deal,
        person_id: person
          ? {
              ...deal.person_id,
              name: person.name,
              email: person.email,
              phone: person.phone,
              // Add person details for easier access
              details: person,
            }
          : deal.person_id,
      };
    });

    console.log(
      `🎉 Successfully processed ${enhancedDeals.length} deals with person data`,
    );

    // Log sample deal structure for debugging (only in development)
    if (enhancedDeals.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📋 Sample enhanced deal structure:', {
        id: enhancedDeals[0].id,
        title: enhancedDeals[0].title,
        value: enhancedDeals[0].value,
        currency: enhancedDeals[0].currency,
        stage_id: enhancedDeals[0].stage_id,
        person_name: enhancedDeals[0].person_id?.name,
        person_email: enhancedDeals[0].person_id?.email,
      });
    }

    return NextResponse.json({
      success: true,
      data: enhancedDeals, // Return enhanced deals with person data
      platform: 'pipedrive',
      accountId: tokenData.account_id,
      totalCount: enhancedDeals.length,
      personCount: personsData.length,
      userEmail: tokenData.email_address,
      apiDomain: tokenData.api_domain,
    });
  } catch (error) {
    console.error('💥 Unexpected error in Pipedrive fetch-data:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
