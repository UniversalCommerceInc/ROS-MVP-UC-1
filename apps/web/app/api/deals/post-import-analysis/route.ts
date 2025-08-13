import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { DealAnalysisService } from '~/lib/services/dealAnalysisService';

export async function POST(request: NextRequest) {
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

    const { dealIds, accountId } = await request.json();

    if (!dealIds || !Array.isArray(dealIds) || dealIds.length === 0) {
      return NextResponse.json(
        { error: 'Deal IDs array is required' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this account
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 }
      );
    }

    console.log(`🔍 Starting post-import analysis for ${dealIds.length} deals`);

    // Analyze deals in parallel (but limit concurrency to avoid overwhelming the system)
    const batchSize = 3; // Process 3 deals at a time
    const results = [];

    for (let i = 0; i < dealIds.length; i += batchSize) {
      const batch = dealIds.slice(i, i + batchSize);
      
      const analysisPromises = batch.map(dealId => 
        DealAnalysisService.analyzeDeal(dealId, accountId, {
          includeCompanyAnalysis: true,
          includeEmailAnalysis: false, // Skip email analysis for imports
          includeMeetingAnalysis: false, // Skip meeting analysis for imports
          includeMomentumUpdate: true,
          trigger: 'import'
        })
      );
      
      const batchResults = await Promise.allSettled(analysisPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid overwhelming the system
      if (i + batchSize < dealIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Post-import analysis completed: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      analyzed: dealIds.length,
      successful,
      failed,
      message: `Analysis completed for ${successful}/${dealIds.length} deals`
    });

  } catch (error) {
    console.error('❌ Post-import analysis API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}