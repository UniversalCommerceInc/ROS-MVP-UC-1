import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

export async function POST(request: NextRequest) {
  const logger = await getLogger();
  
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Microsoft token for this account
    const { data: tokenData, error: tokenError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) {
      logger.error('Error checking Microsoft tokens:', tokenError);
      return NextResponse.json({ 
        isConnected: false,
        error: 'Database error' 
      }, { status: 500 });
    }

    if (!tokenData) {
      return NextResponse.json({
        isConnected: false,
        emailAddress: null,
        hasCalendarAccess: false,
        lastSyncAt: null
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      return NextResponse.json({
        isConnected: false,
        emailAddress: tokenData.email_address,
        hasCalendarAccess: false,
        lastSyncAt: tokenData.updated_at,
        expired: true
      });
    }

    // Token is valid
    return NextResponse.json({
      isConnected: true,
      emailAddress: tokenData.email_address,
      hasCalendarAccess: true, // Assuming calendar access if token exists
      lastSyncAt: tokenData.updated_at
    });

  } catch (error) {
    logger.error('Error in outlook status check:', error);
    return NextResponse.json(
      { 
        isConnected: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}