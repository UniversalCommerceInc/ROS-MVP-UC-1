// File: app/api/crm/folk/fetch-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    // For Folk, we need the accountId to find the correct Folk connection
    const body = await request.json().catch(() => ({}));
    const { accountId } = body;

    console.log(`🔐 Fetching Folk data for account: ${accountId}`);

    // Get authenticated user from session
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ Authenticated user from session: ${user.id}`);

    if (!accountId) {
      console.error('❌ Account ID is required for Folk data fetch');
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    // Verify user has access to this account
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      console.error('❌ User does not have access to this account');
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Get Folk tokens for this user AND account
    const { data: folkToken, error: tokenError } = await supabase
      .from('folk_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .single();

    if (tokenError || !folkToken) {
      console.error('❌ Folk token not found:', tokenError);
      return NextResponse.json(
        {
          error:
            'Folk CRM connection not found for this account. Please reconnect your account.',
        },
        { status: 404 },
      );
    }

    console.log(`✅ Found Folk token for account: ${folkToken.account_id}`);

    // Construct Folk API URL
    const folkApiBaseUrl = folkToken.api_domain || 'https://api.folk.app';
    const folkApiVersion = process.env.FOLK_API_VERSION || 'v1';
    const apiUrl = `${folkApiBaseUrl}/${folkApiVersion}/people`;

    console.log(`📡 Fetching Folk people from: ${apiUrl}`);

    // Fetch people data from Folk API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${folkToken.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Folk API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Folk API error response:', errorText);

      let errorMessage = 'Failed to fetch data from Folk API.';

      switch (response.status) {
        case 401:
          errorMessage =
            'Folk API key is invalid or expired. Please reconnect your account.';
          break;
        case 403:
          errorMessage =
            'Access forbidden. Please check your Folk API key permissions.';
          break;
        case 404:
          errorMessage = 'Folk API endpoint not found. Please contact support.';
          break;
        case 429:
          errorMessage =
            'Too many requests to Folk API. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage =
            'Folk API is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Folk API error (${response.status}). Please try again later.`;
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const folkData = await response.json();
    console.log(`✅ Successfully fetched Folk data:`, {
      totalPeople: folkData.data?.items?.length || 0,
      hasData: !!folkData.data,
    });

    // Extract people from Folk response structure
    const people = folkData.data?.items || [];

    if (people.length === 0) {
      console.log('📝 No people found in Folk CRM');
      return NextResponse.json({
        success: true,
        data: [],
        accountId: folkToken.account_id,
        message: 'No people found in your Folk CRM account',
      });
    }

    console.log(`🎉 Found ${people.length} people in Folk CRM`);

    // Log sample data structure for debugging
    if (people.length > 0) {
      console.log('🔍 Sample Folk person structure:', {
        id: people[0].id,
        fullName: people[0].fullName,
        hasCustomFields: !!people[0].customFieldValues,
        groupsCount: people[0].groups?.length || 0,
        companiesCount: people[0].companies?.length || 0,
        emailsCount: people[0].emails?.length || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: people,
      accountId: folkToken.account_id,
      message: `Successfully fetched ${people.length} people from Folk CRM`,
    });
  } catch (error) {
    console.error('💥 Folk fetch-data error:', error);
    return NextResponse.json(
      {
        error: 'A server-side error occurred while fetching Folk data.',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      },
      { status: 500 },
    );
  }
}
