import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
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

    const { dealId, email, name, phone, role } = await request.json();

    if (!dealId || !email) {
      return NextResponse.json(
        { error: 'dealId and email are required' },
        { status: 400 },
      );
    }

    // Verify the deal belongs to this account
    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !dealData) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // Check if contact already exists in contacts table for this account
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('email', email)
      .single();

    let contactId: string;

    if (existingContact) {
      // Contact exists, use existing contact ID
      contactId = existingContact.id;

      // Update the contact with new fields if provided
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;

      if (Object.keys(updateData).length > 0) {
        updateData.updated_by = user.id;

        await supabase.from('contacts').update(updateData).eq('id', contactId);
      }
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          account_id: accountId,
          email,
          name: name || email,
          phone: phone || null,
          role: role || null,
          created_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
        return NextResponse.json(
          { error: 'Failed to create contact' },
          { status: 500 },
        );
      }

      contactId = newContact.id;
    }

    // Check if the contact is already linked to this deal
    const { data: existingDealContact, error: dealContactError } =
      await supabase
        .from('deal_contacts')
        .select('id')
        .eq('deal_id', dealId)
        .eq('contact_id', contactId)
        .single();

    if (!existingDealContact) {
      // Create the deal-contact relationship
      const { error: linkError } = await supabase.from('deal_contacts').insert({
        deal_id: dealId,
        contact_id: contactId,
        name: name || email,
        email: email,
        phone: phone || null,
        role: role || null,
        is_primary: false,
      });

      if (linkError) {
        console.error('Error linking contact to deal:', linkError);
        return NextResponse.json(
          { error: 'Failed to link contact to deal' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      contactId,
      message: 'Contact added to deal successfully',
    });
  } catch (error) {
    console.error('Error adding contact to deal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
