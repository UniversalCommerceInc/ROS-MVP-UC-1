import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: Request) {
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

    const { dealId, assignedTo, accountSlug } = await request.json();

    if (!dealId || !accountSlug) {
      return NextResponse.json(
        { error: 'Deal ID and account slug are required' },
        { status: 400 }
      );
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
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    // Verify the deal exists and belongs to this account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 }
      );
    }

    // If assigning to someone (not unassigning), verify the target user is a team member
    if (assignedTo) {
      const { data: targetMembership, error: targetMembershipError } = await supabase
        .from('accounts_memberships')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('user_id', assignedTo)
        .single();

      if (targetMembershipError || !targetMembership) {
        return NextResponse.json(
          { error: 'Cannot assign deal to the specified user - not a team member' },
          { status: 400 }
        );
      }
    }

    // Update the deal assignment
    const { error: updateError } = await supabase
      .from('deals')
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', dealId)
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Deal assignment update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update deal assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: assignedTo ? 'Deal assigned successfully' : 'Deal unassigned successfully',
      dealId,
      assignedTo,
    });

  } catch (error) {
    console.error('Deal assignment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 