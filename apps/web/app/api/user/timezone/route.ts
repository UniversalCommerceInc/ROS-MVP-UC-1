import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { timezone } = await request.json();

    if (!timezone) {
      return NextResponse.json(
        { error: 'Timezone is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the current public_data to merge with existing data
    const { data: currentAccount } = await supabase
      .from('accounts')
      .select('public_data')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true)
      .single();

    const currentPublicData = (currentAccount?.public_data as any) || {};

    // Update the user's personal account with timezone in public_data (merge with existing data)
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        public_data: {
          ...currentPublicData,
          timezone: timezone,
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true);

    if (updateError) {
      console.error('Error updating user timezone:', updateError);
      return NextResponse.json(
        { error: 'Failed to update timezone' },
        { status: 500 },
      );
    }

    console.log('✅ User timezone updated successfully:', {
      userId: user.id,
      timezone: timezone,
    });

    return NextResponse.json({
      success: true,
      message: 'Timezone updated successfully',
    });
  } catch (error) {
    console.error('Error in timezone update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's personal account timezone
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('public_data')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true)
      .single();

    if (accountError) {
      console.error('Error fetching user account:', accountError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 },
      );
    }

    const timezone = (account?.public_data as any)?.timezone || null;

    console.log('📅 GET timezone API result:', {
      userId: user.id,
      timezone,
      hasTimezone: !!timezone,
      publicData: account?.public_data,
    });

    return NextResponse.json({
      timezone: timezone,
      hasTimezone: !!timezone,
    });
  } catch (error) {
    console.error('Error fetching user timezone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
} 