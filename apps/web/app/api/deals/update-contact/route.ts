import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function PATCH(request: Request) {
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

    const { dealId, contactId, name, email, phone, role, isDecisionMaker, isPrimary, contactRoleType } =
      await request.json();

    if (!dealId || !contactId) {
      return NextResponse.json(
        { error: 'Deal ID and Contact ID are required' },
        { status: 400 },
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

    // Check if the contactId is a deal_contacts.id (UUID) or contact_id reference
    // First try to find by deal_contacts.id (this is what we use in the Key People section)
    let dealContact = await supabase
      .from('deal_contacts')
      .select('id, contact_id')
      .eq('id', contactId)
      .eq('deal_id', dealId)
      .single();

    // If not found, try to find by contact_id (for legacy compatibility)
    if (dealContact.error) {
      dealContact = await supabase
        .from('deal_contacts')
        .select('id, contact_id')
        .eq('deal_id', dealId)
        .eq('contact_id', contactId)
        .single();
    }

    if (dealContact.error || !dealContact.data) {
      return NextResponse.json(
        { error: 'Contact not linked to this deal' },
        { status: 404 },
      );
    }

    // Update the contact
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isDecisionMaker !== undefined) updateData.is_decision_maker = isDecisionMaker;
    if (isPrimary !== undefined) updateData.is_primary = isPrimary;
    if (contactRoleType !== undefined) updateData.contact_role_type = contactRoleType;

    const { data: updatedContact, error: updateError } = await supabase
      .from('deal_contacts')
      .update(updateData)
      .eq('id', dealContact.data.id)
      .eq('deal_id', dealId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating contact:', updateError);
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      contact: updatedContact,
      message: 'Contact updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/deals/update-contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
