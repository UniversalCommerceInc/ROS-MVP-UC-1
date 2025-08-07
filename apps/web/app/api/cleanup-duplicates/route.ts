import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { deduplicatePainPoints, deduplicateNextSteps } from '~/lib/utils/deduplication';

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get current user to verify they have access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🧹 Starting duplicate cleanup for deals...');

    // Get all deals that have pain points or next steps
    const { data: deals, error: fetchError } = await supabase
      .from('deals')
      .select('id, pain_points, next_steps, account_id')
      .or('pain_points.not.is.null,next_steps.not.is.null');

    if (fetchError) {
      console.error('❌ Error fetching deals:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      );
    }

    if (!deals || deals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No deals found with pain points or next steps',
        processed: 0,
        updated: 0,
      });
    }

    console.log(`📊 Found ${deals.length} deals to process`);

    let processed = 0;
    let updated = 0;
    const batchSize = 10;

    // Process deals in batches
    for (let i = 0; i < deals.length; i += batchSize) {
      const batch = deals.slice(i, i + batchSize);
      
      for (const deal of batch) {
        processed++;
        
        // Check if deduplication is needed
        const originalPainPoints = deal.pain_points || [];
        const originalNextSteps = deal.next_steps || [];
        
        const deduplicatedPainPoints = deduplicatePainPoints(originalPainPoints);
        const deduplicatedNextSteps = deduplicateNextSteps(originalNextSteps);
        
        // Only update if there are actual changes
        const painPointsChanged = JSON.stringify(originalPainPoints) !== JSON.stringify(deduplicatedPainPoints);
        const nextStepsChanged = JSON.stringify(originalNextSteps) !== JSON.stringify(deduplicatedNextSteps);
        
        if (painPointsChanged || nextStepsChanged) {
          console.log(`🔄 Deduplicating deal ${deal.id}:`);
          
          if (painPointsChanged) {
            console.log(`  - Pain points: ${originalPainPoints.length} → ${deduplicatedPainPoints.length}`);
          }
          
          if (nextStepsChanged) {
            console.log(`  - Next steps: ${originalNextSteps.length} → ${deduplicatedNextSteps.length}`);
          }
          
          const { error: updateError } = await supabase
            .from('deals')
            .update({
              pain_points: deduplicatedPainPoints,
              next_steps: deduplicatedNextSteps,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deal.id);

          if (updateError) {
            console.error(`❌ Error updating deal ${deal.id}:`, updateError);
          } else {
            updated++;
          }
        }
      }
      
      // Log progress
      console.log(`📈 Progress: ${Math.min(i + batchSize, deals.length)}/${deals.length} deals processed`);
      
      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Cleanup complete: ${processed} processed, ${updated} updated`);

    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed successfully',
      processed,
      updated,
      summary: {
        totalDeals: deals.length,
        dealsWithDuplicates: updated,
        duplicatesRemoved: processed - updated,
      },
    });

  } catch (error) {
    console.error('❌ Error in cleanup:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during cleanup',
        message: 'An unexpected error occurred. Please check logs and try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
    message: 'Use POST method to run the duplicate cleanup script',
    info: 'This endpoint will deduplicate pain points and next steps across all deals',
    warning: 'This is a one-time operation that modifies data. Use with caution.',
  });
} 