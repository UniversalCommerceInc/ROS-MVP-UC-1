import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export async function POST(request: Request) {
  try {
    // Get the current user
    const user = await requireUserInServerComponent();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId, accountId } = await request.json();

    if (!dealId || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if user has access to this account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get the deal and check if analysis already exists and is recent
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, last_analysis_date, ai_analysis_raw')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({
        success: false,
        error: 'Deal not found'
      }, { status: 404 });
    }

    // Check if analysis is recent (less than 24 hours old)
    const analysisAge = deal.last_analysis_date 
      ? Date.now() - new Date(deal.last_analysis_date).getTime()
      : Infinity;
    
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (deal.ai_analysis_raw && analysisAge < twentyFourHours) {
      console.log('📊 Recent analysis found, skipping background analysis');
      return NextResponse.json({
        success: true,
        message: 'Recent analysis already exists',
        hasAnalysis: true,
        analysisAge: Math.floor(analysisAge / (60 * 1000)) // age in minutes
      });
    }

    console.log('🔄 Triggering background analysis for deal:', dealId);

    // Trigger analysis in the background (don't wait for completion)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/deal-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        dealId,
        accountId
      })
    }).catch(error => {
      console.error('❌ Background analysis failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Background analysis triggered',
      hasAnalysis: false
    });

  } catch (error) {
    console.error('❌ Error in background analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
