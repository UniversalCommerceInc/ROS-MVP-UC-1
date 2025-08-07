import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Lazy initialize OpenAI client to avoid build issues
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found. Momentum scoring will be skipped.');
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface MomentumScoreResult {
  momentum: number; // -100 to 100 scale
  trend: 'up' | 'steady' | 'down';
  category: 'accelerating' | 'decelerating' | 'stalled' | 'steady';
  opportunities: string[];
  blockers: string[];
  reasoning: string;
}

// Helper function to map AI trend categories to database enum values
function mapTrendToDbEnum(aiTrend: string): 'up' | 'steady' | 'down' {
  const trend = aiTrend.toLowerCase();
  if (trend.includes('accelerating') || trend.includes('up')) return 'up';
  if (trend.includes('decelerating') || trend.includes('stalled') || trend.includes('down')) return 'down';
  return 'steady';
}

export async function POST(request: Request) {
  try {
    const { dealId, accountId } = await request.json();

    if (!dealId || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Account access error:', membershipError);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this account'
      }, { status: 403 });
    }

    // Get deal data for momentum scoring
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        id,
        company_name,
        industry,
        stage,
        value_amount,
        value_currency,
        close_date,
        created_at,
        updated_at,
        momentum,
        momentum_trend,
        pain_points,
        next_steps,
        green_flags,
        red_flags,
        blockers,
        opportunities,
        last_meeting_date,
        total_meetings,
        ai_analysis_raw,
        deal_contacts (
          name,
          email,
          role
        )
      `)
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({
        success: false,
        error: 'Deal not found'
      }, { status: 404 });
    }

    // Get recent meeting data
    const { data: recentMeetings } = await supabase
      .from('meetings')
      .select('id, title, start_time')
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: false })
      .limit(3);

    // Get recent email data  
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('id, subject, received_at, from_email, body_text')
      .eq('account_id', accountId)
      .order('received_at', { ascending: false })
      .limit(5);

    // Prepare comprehensive deal data for momentum analysis
    const dealData = {
      company: deal.company_name,
      industry: deal.industry,
      stage: deal.stage,
      value: `${deal.value_currency} ${deal.value_amount}`,
      daysInPipeline: Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      daysToClose: deal.close_date ? Math.floor((new Date(deal.close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      totalMeetings: deal.total_meetings || 0,
      daysSinceLastMeeting: deal.last_meeting_date ? Math.floor((Date.now() - new Date(deal.last_meeting_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
      contacts: deal.deal_contacts || [],
      painPoints: deal.pain_points || [],
      nextSteps: deal.next_steps || [],
      greenFlags: deal.green_flags || [],
      redFlags: deal.red_flags || [],
      currentBlockers: deal.blockers || [],
      currentOpportunities: deal.opportunities || [],
      recentMeetings: recentMeetings || [],
      recentEmails: recentEmails || [],
      currentMomentum: deal.momentum,
      currentTrend: deal.momentum_trend
    };

    const inputData = `
DEAL MOMENTUM ANALYSIS REQUEST

Company: ${dealData.company}
Industry: ${dealData.industry}
Stage: ${dealData.stage}
Value: ${dealData.value}
Days in Pipeline: ${dealData.daysInPipeline}
${dealData.daysToClose ? `Days to Close: ${dealData.daysToClose}` : 'No close date set'}
Total Meetings: ${dealData.totalMeetings}
${dealData.daysSinceLastMeeting ? `Days Since Last Meeting: ${dealData.daysSinceLastMeeting}` : 'No meetings yet'}

CONTACTS:
${dealData.contacts.map(c => `- ${c.name} (${c.role}) - ${c.email}`).join('\n')}

PAIN POINTS:
${dealData.painPoints.map(p => `- ${p}`).join('\n')}

NEXT STEPS:
${dealData.nextSteps.map(s => `- ${s}`).join('\n')}

GREEN FLAGS:
${dealData.greenFlags.map(f => `- ${f}`).join('\n')}

RED FLAGS:
${dealData.redFlags.map(f => `- ${f}`).join('\n')}

CURRENT BLOCKERS:
${dealData.currentBlockers.map(b => `- ${b}`).join('\n')}

CURRENT OPPORTUNITIES:
${dealData.currentOpportunities.map(o => `- ${o}`).join('\n')}

RECENT MEETINGS:
${dealData.recentMeetings.map(m => `- ${m.title || 'Untitled'} (${m.start_time ? new Date(m.start_time).toLocaleDateString() : 'No date'})`).join('\n')}

RECENT EMAILS:
${dealData.recentEmails.map(e => `- From: ${e.from_email}, Subject: ${e.subject} (${new Date(e.received_at).toLocaleDateString()})`).join('\n')}

Current Momentum Score: ${dealData.currentMomentum}
Current Trend: ${dealData.currentTrend}
`;

    console.log('🎯 Scoring deal momentum for:', dealData.company);

    // Call OpenAI with momentum scoring prompt
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI not available'
      }, { status: 500 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a sales momentum analyzer. Analyze the provided deal data and return ONLY a structured response in this exact format:

MOMENTUM_SCORE: [number between -100 and 100]
TREND: [accelerating/decelerating/stalled/steady]
OPPORTUNITIES: [list each on new line with - prefix]
BLOCKERS: [list each on new line with - prefix]
REASONING: [brief explanation]`
        },
        {
          role: "user",
          content: inputData
        }
      ],
      max_tokens: 2048,
      temperature: 0.3
    });

    console.log('🔍 Full OpenAI Response Structure:', JSON.stringify(response, null, 2));
    
    const momentumAnalysis = response.choices[0]?.message?.content || '';
    console.log('✅ Momentum analysis completed');
    console.log('📊 Analysis response type:', typeof momentumAnalysis);
    console.log('📊 Analysis response content:', JSON.stringify(momentumAnalysis, null, 2));
    console.log('📊 Analysis response preview:', String(momentumAnalysis).substring(0, 200));

    // Parse the AI response to extract momentum data
    // Note: The prompt should return structured data, but we'll parse it as needed
    const parsedResult = parseMomentumAnalysis(momentumAnalysis);

    console.log('💾 Updating deal with momentum data:', {
      momentum: parsedResult.momentum,
      momentum_trend: parsedResult.trend,
      blockers: parsedResult.blockers,
      opportunities: parsedResult.opportunities,
      dealId,
      accountId
    });

    // Update deal with new momentum score
    const { error: updateError } = await supabase
      .from('deals')
      .update({
        momentum: parsedResult.momentum,
        momentum_trend: parsedResult.trend,
        blockers: parsedResult.blockers,
        opportunities: parsedResult.opportunities,
        last_momentum_change: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .eq('account_id', accountId);

    if (updateError) {
      console.error('❌ Error updating deal momentum:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update momentum'
      }, { status: 500 });
    }

    console.log('✅ Deal momentum updated successfully');

    return NextResponse.json({
      success: true,
      momentum: parsedResult.momentum,
      trend: parsedResult.trend,
      category: parsedResult.category,
      opportunities: parsedResult.opportunities,
      blockers: parsedResult.blockers,
      reasoning: parsedResult.reasoning,
      dealId,
      accountId
    });

  } catch (error) {
    console.error('❌ Error in momentum scoring:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Helper function to parse momentum analysis from AI response
function parseMomentumAnalysis(analysisText: any): MomentumScoreResult {
  console.log('🔍 Parsing momentum analysis...');
  console.log('🔍 Input type:', typeof analysisText);
  console.log('🔍 Input value:', analysisText);
  
  // Ensure analysisText is a string
  const textToAnalyze = typeof analysisText === 'string' ? analysisText : String(analysisText || '');
  console.log('🔍 Text to analyze:', textToAnalyze.substring(0, 200));
  
  // This will need to be adjusted based on your prompt's output format
  // For now, providing a basic parser that can be refined
  
  const defaultResult: MomentumScoreResult = {
    momentum: 0,
    trend: 'steady',
    category: 'steady',
    opportunities: [],
    blockers: [],
    reasoning: textToAnalyze
  };

  try {
    // Look for MOMENTUM_SCORE: format
    const momentumMatch = textToAnalyze.match(/MOMENTUM_SCORE:\s*(-?\d+)/i);
    if (momentumMatch && momentumMatch[1]) {
      defaultResult.momentum = parseInt(momentumMatch[1]);
    }

    // Look for TREND: format
    const trendMatch = textToAnalyze.match(/TREND:\s*(accelerating|decelerating|stalled|steady)/i);
    if (trendMatch && trendMatch[1]) {
      defaultResult.trend = mapTrendToDbEnum(trendMatch[1]);
      defaultResult.category = trendMatch[1].toLowerCase() as any;
    }

    // Look for OPPORTUNITIES: section
    const opportunitiesSection = textToAnalyze.match(/OPPORTUNITIES:([\s\S]*?)(?:BLOCKERS:|REASONING:|$)/i);
    if (opportunitiesSection && opportunitiesSection[1]) {
      const opportunities = opportunitiesSection[1]
        .split(/\n/)
        .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((item: string) => item.length > 3);
      defaultResult.opportunities = opportunities;
    }

    // Look for BLOCKERS: section
    const blockersSection = textToAnalyze.match(/BLOCKERS:([\s\S]*?)(?:REASONING:|$)/i);
    if (blockersSection && blockersSection[1]) {
      const blockers = blockersSection[1]
        .split(/\n/)
        .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((item: string) => item.length > 3);
      defaultResult.blockers = blockers;
    }

    return defaultResult;
  } catch (error) {
    console.error('❌ Error parsing momentum analysis:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Failed to parse text:', textToAnalyze);
    return defaultResult;
  }
}

// Endpoint to score all deals for an account
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID required'
      }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    // Verify account access
    const { data: membership, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Account access error:', membershipError);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this account'
      }, { status: 403 });
    }

    // Get all active deals for the account
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, company_name')
      .eq('account_id', accountId)
      .not('stage', 'in', '("won","lost")');

    if (dealsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch deals'
      }, { status: 500 });
    }

    console.log(`🎯 Starting momentum scoring for ${deals.length} deals`);

    // Score each deal (in production, consider batching or queue processing)
    const results = [];
    for (const deal of deals) {
      try {
        const baseUrl = new URL(request.url).origin;
        const response = await fetch(`${baseUrl}/api/momentum-scoring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealId: deal.id,
            accountId: accountId
          })
        });

        if (response.ok) {
          const result = await response.json();
          results.push({
            dealId: deal.id,
            company: deal.company_name,
            success: true,
            momentum: result.momentum,
            trend: result.trend
          });
        } else {
          results.push({
            dealId: deal.id,
            company: deal.company_name,
            success: false,
            error: 'Failed to score'
          });
        }
      } catch (error) {
        results.push({
          dealId: deal.id,
          company: deal.company_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scored ${results.filter(r => r.success).length} of ${deals.length} deals`,
      results
    });

  } catch (error) {
    console.error('❌ Error in bulk momentum scoring:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
