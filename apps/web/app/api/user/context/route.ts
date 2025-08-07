import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
  try {
    const { context } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
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

    // Update the user's personal account with context in public_data (merge with existing data)
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        public_data: {
          ...currentPublicData,
          context: context,
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', true);

    if (updateError) {
      console.error('Error updating user context:', updateError);
      return NextResponse.json(
        { error: 'Failed to update context' },
        { status: 500 },
      );
    }

    console.log('✅ User context updated successfully:', {
      userId: user.id,
      context: context,
    });

    return NextResponse.json({
      success: true,
      message: 'Context updated successfully',
    });
  } catch (error) {
    console.error('Error in context update:', error);
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

    // Get the user's personal account context
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

    const context = (account?.public_data as any)?.context || null;

    console.log('📝 GET context API result:', {
      userId: user.id,
      context,
      hasContext: !!context,
      publicData: account?.public_data,
    });

    return NextResponse.json({
      context: context,
      hasContext: !!context,
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
