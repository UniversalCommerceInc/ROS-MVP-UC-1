// File: app/api/auth/folk/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, email, accountId } = await request.json();

    if (!apiKey || !email || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Basic API key validation - just check it's not empty after trimming
    if (!apiKey.trim()) {
      return NextResponse.json(
        { error: 'API key cannot be empty' },
        { status: 400 },
      );
    }

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

    console.log(`🔐 Authenticated user: ${user.id}`);

    // Verify user has access to this account
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      console.error(
        '❌ Access denied for user:',
        user.id,
        'account:',
        accountId,
      );
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('✅ User has access to account');

    // Check if Folk integration already exists for this account
    const { data: existingConnection } = await supabase
      .from('folk_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    const folkApiBaseUrl =
      process.env.FOLK_API_BASE_URL || 'https://api.folk.app';
    const folkApiVersion = process.env.FOLK_API_VERSION || 'v1';
    const testEndpoint = `${folkApiBaseUrl}/${folkApiVersion}/users/me`;

    console.log(`📡 Testing Folk API Endpoint: ${testEndpoint}`);

    const testResponse = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Folk API response status: ${testResponse.status}`);

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('❌ Folk API error response:', errorText);

      let errorMessage = 'Failed to connect to Folk API.';

      switch (testResponse.status) {
        case 401:
          errorMessage =
            'Invalid API key. Please check your Folk API key and try again.';
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
            'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage =
            'Folk API is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Folk API error (${testResponse.status}). Please verify your API key.`;
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const userInfo = await testResponse.json();
    console.log('✅ Successfully connected to Folk API');

    // The user data is nested in a `data` object according to the docs
    const userEmail = userInfo?.data?.email;
    const userName = userInfo?.data?.fullName;

    // Verify email matches (optional but recommended)
    if (userEmail && userEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        {
          error:
            'Email does not match your Folk account. Please verify and try again.',
        },
        { status: 400 },
      );
    }

    // Store the API key in the database - using user.id from session
    // Consider encrypting the API key in production for enhanced security
    const { error: dbError } = await supabase.from('folk_tokens').upsert({
      account_id: accountId,
      user_id: user.id, // Use authenticated user ID from session
      api_key: apiKey.trim(), // Consider encrypting this key at rest
      email_address: email.toLowerCase().trim(),
      api_domain: folkApiBaseUrl,
      user_info: userInfo.data || {}, // Store the nested data object
      scope: 'read_write',
    });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save connection. Please try again.' },
        { status: 500 },
      );
    }

    console.log('✅ Folk API key stored successfully in database');

    const actionMessage = existingConnection
      ? 'Successfully updated Folk CRM connection'
      : 'Successfully connected to Folk CRM';

    return NextResponse.json({
      success: true,
      message: actionMessage,
      userInfo: {
        id: user.id,
        email: userEmail,
        name: userName,
      },
      isUpdate: !!existingConnection,
    });
  } catch (error) {
    console.error('💥 Folk verification error:', error);
    return NextResponse.json(
      {
        error: 'A server-side error occurred while connecting to Folk API.',
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
