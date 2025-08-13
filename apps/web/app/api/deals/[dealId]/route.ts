import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { updateHubSpotDeal } from '~/lib/services/hubspotSyncService';
import { updateSalesforceDeal } from '~/lib/services/salesforceSyncService';

// Helper function to format currency with symbols
const formatCurrencyWithSymbol = (amount: number, currency: string = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toLocaleString()}`;
  }
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
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

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Fetch the deal from the database
    const { data: deal, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (error) {
      console.error('Error fetching deal:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deal' },
        { status: 500 },
      );
    }

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Transform database fields to match frontend interface
    const transformedDeal = {
      id: deal.id,
      companyName: deal.company_name,
      industry: deal.industry,
      value: formatCurrencyWithSymbol(
        deal.value_amount || 0,
        deal.value_currency || 'USD',
      ),
      // contact: deal.primary_contact || 'Contact',
      contact: {
        name: deal.primary_contact || 'Contact',
        email: deal.primary_email || '',
        role: 'Primary Contact',
        isDecisionMaker: false, // Only set to true when confirmed through conversations/analysis
      },
      email: deal.primary_email,
      stage: deal.stage,
      source: deal.source || 'Unknown',
      createdAt: deal.created_at,
      closeDate: deal.close_date,
      probability: deal.probability,
      painPoints: deal.pain_points,
      nextSteps: deal.next_steps,
      companySize: deal.company_size,
      website: deal.website,
      dealTitle: deal.deal_title,
      nextAction: deal.next_action,
      relationshipInsights: deal.relationship_insights,
      description: deal.relationship_insights,
      last_meeting_summary: deal.last_meeting_summary,
      momentum: deal.momentum || 0,
      momentumTrend: deal.momentum_trend || 'steady',
      // momentumMarkers: deal.momentum_markers || [],
      lastMomentumChange: deal.last_momentum_change,
      blockers: deal.blockers,
      opportunities: deal.opportunities,
      // AI analysis fields
      greenFlags: deal.green_flags,
      redFlags: deal.red_flags,
      organizationalContext: deal.organizational_context,
      competitorMentions: deal.competitor_mentions,
      sentimentEngagement: deal.sentiment_engagement,
      lastAnalysisDate: deal.last_analysis_date,
      aiAnalysisRaw: deal.ai_analysis_raw,
    };

    return NextResponse.json(transformedDeal);
  } catch (error) {
    console.error('Error in GET /api/deals/[dealId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
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

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Get the update data from the request
    const updateData = await request.json();

    // Build the update object dynamically based on your schema
    const updateFields: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    // Add fields if they exist in updateData (map frontend fields to database fields)
    if (updateData.stage !== undefined) updateFields.stage = updateData.stage;
    if (updateData.probability !== undefined)
      updateFields.probability = updateData.probability;
    if (updateData.next_steps !== undefined)
      updateFields.next_steps = updateData.next_steps;
    if (updateData.nextSteps !== undefined)
      updateFields.next_steps = updateData.nextSteps;
    if (updateData.pain_points !== undefined)
      updateFields.pain_points = updateData.pain_points;
    if (updateData.painPoints !== undefined)
      updateFields.pain_points = updateData.painPoints;
    if (updateData.description !== undefined)
      updateFields.relationship_insights = updateData.description;
    if (updateData.company_name !== undefined)
      updateFields.company_name = updateData.company_name;
    if (updateData.companyName !== undefined)
      updateFields.company_name = updateData.companyName;
    if (updateData.deal_title !== undefined)
      updateFields.deal_title = updateData.deal_title;
    if (updateData.dealTitle !== undefined)
      updateFields.deal_title = updateData.dealTitle;
    if (updateData.value !== undefined) {
      // Handle value updates (might need to parse currency and amount)
      if (typeof updateData.value === 'string') {
        const match = updateData.value.match(/^([A-Z]{3})\s+(.+)$/);
        if (match) {
          updateFields.value_currency = match[1];
          updateFields.value_amount = parseFloat(match[2].replace(/,/g, ''));
        }
      } else if (typeof updateData.value === 'number') {
        updateFields.value_amount = updateData.value;
      }
    }
    if (updateData.close_date !== undefined)
      updateFields.close_date = updateData.close_date;
    if (updateData.closeDate !== undefined)
      updateFields.close_date = updateData.closeDate;
    if (updateData.industry !== undefined)
      updateFields.industry = updateData.industry;
    if (updateData.blockers !== undefined)
      updateFields.blockers = updateData.blockers;
    if (updateData.opportunities !== undefined)
      updateFields.opportunities = updateData.opportunities;
    if (updateData.momentum !== undefined)
      updateFields.momentum = updateData.momentum;
    if (updateData.momentumTrend !== undefined)
      updateFields.momentum_trend = updateData.momentumTrend;

    // Update the deal in the database
    const { data: deal, error } = await supabase
      .from('deals')
      .update(updateFields)
      .eq('id', dealId)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      return NextResponse.json(
        { error: 'Failed to update deal' },
        { status: 500 },
      );
    }

    // Transform the updated deal back to frontend format
    const transformedDeal = {
      id: deal.id,
      companyName: deal.company_name,
      industry: deal.industry,
      value: formatCurrencyWithSymbol(
        deal.value_amount || 0,
        deal.value_currency || 'USD',
      ),
      // contact: deal.primary_contact || 'Contact',
      contact: {
        name: deal.primary_contact || 'Contact',
        email: deal.primary_email || '',
        role: 'Primary Contact',
        isDecisionMaker: false, // Only set to true when confirmed through conversations/analysis
      },
      email: deal.primary_email,
      stage: deal.stage,
      source: deal.source || 'Unknown',
      createdAt: deal.created_at,
      closeDate: deal.close_date,
      probability: deal.probability,
      painPoints: deal.pain_points,
      nextSteps: deal.next_steps,
      companySize: deal.company_size,
      website: deal.website,
      dealTitle: deal.deal_title,
      dealId: deal.id, // Ensure dealId is included
      nextAction: deal.next_action,
      relationshipInsights: deal.relationship_insights,
      description: deal.relationship_insights,
      last_meeting_summary: deal.last_meeting_summary,
      momentum: deal.momentum || 0,
      momentumTrend: deal.momentum_trend || 'steady',
      // momentumMarkers: deal.momentum_markers || [],
      lastMomentumChange: deal.last_momentum_change,
      blockers: deal.blockers,
      opportunities: deal.opportunities,
      // AI analysis fields
      greenFlags: deal.green_flags,
      redFlags: deal.red_flags,
      organizationalContext: deal.organizational_context,
      competitorMentions: deal.competitor_mentions,
      sentimentEngagement: deal.sentiment_engagement,
      lastAnalysisDate: deal.last_analysis_date,
      aiAnalysisRaw: deal.ai_analysis_raw,
    };

    console.log(`✅ Deal updated: ${transformedDeal.companyName}`);

    // Debug sync conditions
    console.log('🔍 Sync conditions:', {
      deal_id: deal.deal_id,
      source: deal.source,
      shouldSync: !!(deal.deal_id && deal.source)
    });

    if (deal.deal_id && deal.source) {
      try {
        console.log(`🔄 Syncing ${deal.source} deal with ID: ${deal.deal_id}...`);

        if (deal.source === 'hubspot') {
          const syncResult = await updateHubSpotDeal(deal, accountId, supabase);
          if (!syncResult.success && !syncResult.skipped) {
            console.error('❌ HubSpot sync failed:', syncResult.error);
          } else if (syncResult.success) {
            console.log('✅ HubSpot sync completed successfully');
          } else if (syncResult.skipped) {
            console.log('⏭️ HubSpot sync skipped');
          }
        } else if (deal.source === 'salesforce') {
          const syncResult = await updateSalesforceDeal(
            deal,
            accountId,
            supabase,
          );
          if (!syncResult.success && !syncResult.skipped) {
            console.error('❌ Salesforce sync failed:', syncResult.error);
          } else if (syncResult.success) {
            console.log('✅ Salesforce sync completed successfully');
          }
        }
      } catch (syncError) {
        // Don't fail the update if sync fails - just log it
        console.error(
          '❌ Sync failed but deal was updated locally:',
          syncError,
        );
      }
    } else {
      console.log('⏭️ Skipping sync: No deal_id or source found');
      console.log('📋 Deal data for sync check:', {
        id: deal.id,
        deal_id: deal.deal_id,
        source: deal.source,
        company_name: deal.company_name
      });
    }

    // Trigger momentum scoring in the background (don't wait for it)
    if (dealId && accountId) {
      // Get the current URL to determine the correct port
      const currentUrl = new URL(request.url);
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

      fetch(`${baseUrl}/api/momentum-scoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('Cookie') || '',
        },
        body: JSON.stringify({ dealId, accountId }),
      }).catch((error) => {
        console.error('❌ Background momentum scoring failed:', error);
        console.error('❌ Attempted URL:', `${baseUrl}/api/momentum-scoring`);
      });
      console.log(
        '🎯 Background momentum scoring triggered for:',
        transformedDeal.companyName,
      );
      console.log('🎯 Using URL:', `${baseUrl}/api/momentum-scoring`);
    }

    // Trigger comprehensive analysis for the updated deal
    try {
      console.log('🔍 Triggering comprehensive analysis for updated deal...');
      
      // Import the DealAnalysisService dynamically
      const { DealAnalysisService } = await import('~/lib/services/dealAnalysisService');
      
      // Trigger analysis in background (don't await to avoid blocking response)
      DealAnalysisService.analyzeDeal(dealId, accountId, {
        includeCompanyAnalysis: false, // Skip company analysis on updates unless needed
        includeEmailAnalysis: true,    // Update email context
        includeMeetingAnalysis: true,  // Update meeting context
        includeMomentumUpdate: true,   // Update momentum
        trigger: 'update'
      }).catch(error => {
        console.error('❌ Background analysis failed for updated deal:', error);
      });
      
    } catch (analysisError) {
      console.error('❌ Failed to trigger deal analysis:', analysisError);
      // Don't fail the deal update if analysis fails
    }

    return NextResponse.json(transformedDeal);
  } catch (error) {
    console.error('Error in PATCH /api/deals/[dealId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const { dealId } = await params;

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
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

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // First, check if the deal exists and is in the correct account
    const { data: deal, error: fetchError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (fetchError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // Delete related data first (to maintain referential integrity)
    // Note: Using Promise.all for better performance, but be careful with foreign key constraints

    try {
      // Delete deal contacts
      const { error: contactsError } = await supabase
        .from('deal_contacts')
        .delete()
        .eq('deal_id', dealId);

      // Delete scheduled meetings
      const { error: scheduledMeetingsError } = await supabase
        .from('scheduled_meetings')
        .delete()
        .eq('deal_id', dealId);

      // Delete transcripts first (they reference meetings)
      const { data: meetingsToDelete } = await supabase
        .from('meetings')
        .select('id')
        .eq('deal_id', dealId);

      let transcriptsError = null;
      if (meetingsToDelete && meetingsToDelete.length > 0) {
        const meetingIds = meetingsToDelete.map((m) => m.id);
        const { error } = await supabase
          .from('transcripts')
          .delete()
          .in('meeting_id', meetingIds);
        transcriptsError = error;
      }

      // Delete meetings (and their related data will cascade)
      const { error: meetingsError } = await supabase
        .from('meetings')
        .delete()
        .eq('deal_id', dealId);

      // Delete deal activities
      const { error: activitiesError } = await supabase
        .from('deal_activities')
        .delete()
        .eq('deal_id', dealId);

      // Delete momentum markers
      const { error: momentumError } = await supabase
        .from('deal_momentum_markers')
        .delete()
        .eq('deal_id', dealId);

      // Delete webhook logs related to this deal
      const { error: webhookError } = await supabase
        .from('webhook_logs')
        .delete()
        .eq('deal_id', dealId);

      // Check for any errors from the related table deletions
      if (
        contactsError ||
        scheduledMeetingsError ||
        transcriptsError ||
        meetingsError ||
        activitiesError ||
        momentumError ||
        webhookError
      ) {
        console.error('Error deleting related data:', {
          contactsError,
          scheduledMeetingsError,
          transcriptsError,
          meetingsError,
          activitiesError,
          momentumError,
          webhookError,
        });

        // Return early if there are errors with related data deletion
        return NextResponse.json(
          {
            error: 'Failed to delete related data',
            details: {
              contactsError: contactsError?.message,
              scheduledMeetingsError: scheduledMeetingsError?.message,
              transcriptsError: transcriptsError?.message,
              meetingsError: meetingsError?.message,
              activitiesError: activitiesError?.message,
              momentumError: momentumError?.message,
              webhookError: webhookError?.message,
            },
          },
          { status: 500 },
        );
      }

      // Finally, delete the deal itself
      const { error: deleteError } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)
        .eq('account_id', accountId);

      if (deleteError) {
        console.error('Error deleting deal:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete deal' },
          { status: 500 },
        );
      }

      console.log(`✅ Deal deleted: ${deal.company_name} (ID: ${dealId})`);

      return NextResponse.json({
        success: true,
        message: `Deal "${deal.company_name}" has been deleted successfully`,
      });
    } catch (cascadeError) {
      console.error('Error during cascade deletion:', cascadeError);
      return NextResponse.json(
        { error: 'Failed to delete deal and related data' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/deals/[dealId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
