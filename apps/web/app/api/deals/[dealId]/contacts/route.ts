import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    // Get account ID from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify account access
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // First verify the deal belongs to this account
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // Fetch contacts for the deal directly from deal_contacts table
    const { data: dealContacts, error: contactsError } = await supabase
      .from('deal_contacts')
      .select(`
        id,
        contact_id,
        name,
        email,
        phone,
        role,
        is_primary,
        is_decision_maker,
        last_contacted,
        notes
      `)
      .eq('deal_id', dealId);

    if (contactsError) {
      console.error('Error fetching deal contacts:', contactsError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 },
      );
    }

    console.log('📞 Successfully fetched deal contacts:', {
      dealId,
      accountId,
      contactsCount: dealContacts?.length || 0,
      contacts: dealContacts
    });

    // Transform the data to match the expected Contact interface
    const contacts =
      dealContacts?.map((dc) => ({
        id: dc.id,
        name: dc.name,
        email: dc.email,
        role: dc.role || 'Contact',
        phone: dc.phone || '',
        isDecisionMaker: dc.is_decision_maker,
        lastContacted: dc.last_contacted,
        isPrimary: dc.is_primary,
      })) || [];

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error in GET /api/deals/[dealId]/contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
