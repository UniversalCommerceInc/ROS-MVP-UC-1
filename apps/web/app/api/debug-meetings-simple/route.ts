import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Just get raw meetings data without any joins or transformations
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    console.log('Raw meetings from database:', {
      count: meetings?.length || 0,
      meetings: meetings || []
    });

    return NextResponse.json({
      success: true,
      accountId,
      userId: user.id,
      userEmail: user.email,
      rawMeetingsCount: meetings?.length || 0,
      rawMeetings: meetings || [],
      error: meetingsError?.message || null
    });

  } catch (error) {
    console.error('Simple debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 