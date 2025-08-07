import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountSlug = searchParams.get('accountSlug');

    if (!accountSlug) {
      return NextResponse.json(
        { error: 'Account slug is required' },
        { status: 400 }
      );
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const accountId = account.id;

    // Verify user has access to this account
    const { data: userMembership, error: userMembershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (userMembershipError || !userMembership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    // Get team members with their account details
    const { data: members, error: membersError } = await supabase
      .from('accounts_memberships')
      .select(`
        user_id,
        account_role,
        accounts!inner(id, email, name)
      `)
      .eq('account_id', accountId);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    // Transform the data to a more frontend-friendly format
    const teamMembers = (members || []).map((member: any) => ({
      userId: member.user_id,
      email: member.accounts.email,
      name: member.accounts.name,
      role: member.account_role,
    }));

    return NextResponse.json({
      success: true,
      members: teamMembers,
      count: teamMembers.length,
    });

  } catch (error) {
    console.error('Team members API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 