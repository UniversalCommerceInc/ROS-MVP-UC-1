// /api/integrations/[platform]/status/route.ts
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: Request,
  { params }: { params: { platform: string } },
) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const platform = params.platform;

  try {
    const { data, error } = await supabase
      .from(`${platform}_tokens`)
      .select('access_token, expires_at')
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      return NextResponse.json({ isConnected: false });
    }

    // Check if token is still valid
    const isExpired = new Date(data.expires_at) <= new Date();

    return NextResponse.json({
      isConnected: !isExpired,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('Error checking integration status:', error);
    return NextResponse.json({ isConnected: false });
  }
}
