import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Lazy initialize OpenAI client to avoid build issues
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found. Deal analysis will be skipped.');
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Function to remove markdown formatting from text
function removeMarkdownFormatting(text: any): string {
  // Ensure we have a string to work with
  if (!text || typeof text !== 'string') {
    console.warn('⚠️ removeMarkdownFormatting received non-string input:', typeof text, text);
    return String(text || '');
  }

  return text
    // Remove headers (### #### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text**)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic (*text*)
    .replace(/\*(.*?)\*/g, '$1')
    // Remove bullet points (- or *)
    .replace(/^[\*\-]\s+/gm, '• ')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dealId = url.searchParams.get('dealId');
    const accountId = url.searchParams.get('accountId');

    if (!dealId || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get stored analysis from database
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, ai_analysis_raw, last_analysis_date')
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({
        success: false,
        error: 'Deal not found'
      }, { status: 404 });
    }

    if (!deal.ai_analysis_raw) {
      return NextResponse.json({
        success: false,
        error: 'No analysis available',
        message: 'Analysis has not been generated for this deal yet.'
      }, { status: 404 });
    }

    console.log('📊 Returning stored analysis for deal:', dealId);

    return NextResponse.json({
      success: true,
      response: deal.ai_analysis_raw,
      requestType: 'analysis',
      fromCache: true,
      metadata: {
        dealId,
        accountId,
        analysisDate: deal.last_analysis_date,
        fromStorage: true
      }
    });

  } catch (error) {
    console.error('❌ Error getting stored analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const { dealId } = await request.json();

    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
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

    console.log('\n=== 🔍 COMPREHENSIVE DEAL ANALYSIS START ===');
    console.log('📊 Deal ID:', dealId);
    console.log('🏢 Account ID:', accountId);

    // 1. Fetch comprehensive deal information
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        deal_contacts (
          id,
          name,
          email,
          role,
          is_primary,
          is_decision_maker
        )
      `)
      .eq('id', dealId)
      .eq('account_id', accountId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found or access denied' },
        { status: 404 },
      );
    }

    // 2. Fetch the most recent meeting transcript
    const { data: recentMeeting } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        start_time,
        end_time,
        summaries (
          summary,
          ai_insights
        ),
        highlights (
          highlight
        )
      `)
      .eq('deal_id', dealId)
      .eq('account_id', accountId)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    // 3. Fetch recent deal-related emails (last 10)
    const dealContactEmails = deal.deal_contacts?.map(c => c.email).filter(Boolean) || [];
    let recentEmails: any[] = [];

    if (dealContactEmails.length > 0) {
      const { data: emails } = await supabase
        .from('emails')
        .select(`
          subject,
          body_text,
          body_html,
          from_email,
          to_email,
          received_at,
          sent_at
        `)
        .eq('account_id', accountId)
        .or(
          dealContactEmails
            .map(email => `from_email.eq.${email},to_email.cs.{${email}}`)
            .join(',')
        )
        .order('received_at', { ascending: false })
        .limit(10);

      recentEmails = emails || [];
    }

    console.log('📋 Gathered data:', {
      dealInfo: !!deal,
      meetingTranscript: !!recentMeeting,
      emailsCount: recentEmails.length,
      contactsCount: deal.deal_contacts?.length || 0,
    });

    // 4. Prepare input data for OpenAI analysis
    let inputData = '';

    // Add analysis context
    inputData += `ANALYSIS CONTEXT:\n`;
    inputData += `This is a ${deal.stage} stage deal`;
    if (!recentMeeting && recentEmails.length === 0) {
      inputData += ` in early stages without meeting transcripts or email history`;
    }
    inputData += `. Please provide strategic analysis based on available information.\n\n`;

    // Add deal information
    inputData += `DEAL INFORMATION:\n`;
    inputData += `Company: ${deal.company_name}\n`;
    inputData += `Industry: ${deal.industry}\n`;
    inputData += `Stage: ${deal.stage}\n`;
    inputData += `Value: ${deal.value_amount ? `$${deal.value_amount.toLocaleString()} ${deal.value_currency || 'USD'}` : 'Not specified'}\n`;
    inputData += `Close Date: ${deal.close_date || 'Not set'}\n`;
    inputData += `Primary Contact: ${deal.primary_contact} (${deal.primary_email})\n`;
    inputData += `Next Action: ${deal.next_action || 'None specified'}\n`;

    // Add current deal insights
    if (deal.deal_title) {
      inputData += `\nCOMPANY SUMMARY:\n${deal.deal_title}\n`;
    }

    if (deal.relationship_insights) {
      inputData += `\nRELATIONSHIP INSIGHTS:\n${deal.relationship_insights}\n`;
    }

    // Add pain points
    if (deal.pain_points && deal.pain_points.length > 0) {
      inputData += `\nIDENTIFIED PAIN POINTS:\n`;
      deal.pain_points.forEach((point: string, index: number) => {
        inputData += `${index + 1}. ${point}\n`;
      });
    }

    // Add next steps
    if (deal.next_steps && deal.next_steps.length > 0) {
      inputData += `\nNEXT STEPS:\n`;
      deal.next_steps.forEach((step: string, index: number) => {
        inputData += `${index + 1}. ${step}\n`;
      });
    }

    // Add flags
    if (deal.green_flags && deal.green_flags.length > 0) {
      inputData += `\nPOSITIVE SIGNALS:\n`;
      deal.green_flags.forEach((flag: string, index: number) => {
        inputData += `${index + 1}. ${flag}\n`;
      });
    }

    if (deal.red_flags && deal.red_flags.length > 0) {
      inputData += `\nRISK FACTORS:\n`;
      deal.red_flags.forEach((flag: string, index: number) => {
        inputData += `${index + 1}. ${flag}\n`;
      });
    }

    // Add contacts information
    if (deal.deal_contacts && deal.deal_contacts.length > 0) {
      inputData += `\nKEY CONTACTS:\n`;
      deal.deal_contacts.forEach((contact: any) => {
        inputData += `- ${contact.name} (${contact.email}) - ${contact.role}`;
        if (contact.is_decision_maker) inputData += ' [Decision Maker]';
        if (contact.is_primary) inputData += ' [Primary Contact]';
        inputData += '\n';
      });
    }

    // Add momentum and engagement data
    if (deal.momentum_trend) {
      inputData += `\nMOMENTUM TREND: ${deal.momentum_trend}\n`;
    }

    // Add most recent meeting data
    if (recentMeeting) {
      inputData += `\n=== MOST RECENT MEETING ===\n`;
      inputData += `Meeting: ${recentMeeting.title || 'Untitled Meeting'}\n`;
      inputData += `Date: ${recentMeeting.start_time ? new Date(recentMeeting.start_time).toLocaleDateString() : 'Date not available'}\n`;
      
      if (recentMeeting.summaries?.[0]?.summary) {
        inputData += `\nMeeting Summary:\n${recentMeeting.summaries[0].summary}\n`;
      }

      if (recentMeeting.summaries?.[0]?.ai_insights) {
        inputData += `\nAI Insights:\n${recentMeeting.summaries[0].ai_insights}\n`;
      }

      if (recentMeeting.highlights && recentMeeting.highlights.length > 0) {
        inputData += `\nKey Highlights:\n`;
        recentMeeting.highlights.forEach((highlight: any, index: number) => {
          inputData += `${index + 1}. ${highlight.highlight}\n`;
        });
      }
    }

    // Add recent emails
    if (recentEmails.length > 0) {
      inputData += `\n=== RECENT EMAILS (Last ${recentEmails.length}) ===\n`;
      recentEmails.forEach((email: any, index: number) => {
        const emailDate = new Date(email.received_at || email.sent_at).toLocaleDateString();
        inputData += `\nEmail ${index + 1} (${emailDate}):\n`;
        inputData += `From: ${email.from_email}\n`;
        inputData += `To: ${Array.isArray(email.to_email) ? email.to_email.join(', ') : email.to_email}\n`;
        inputData += `Subject: ${email.subject}\n`;
        inputData += `Content: ${email.body_text || email.body_html || 'No content available'}\n`;
        inputData += `---\n`;
      });
    }

    console.log('📝 Input data prepared, length:', inputData.length);
    console.log('📋 Data summary:', {
      hasBasicDealInfo: !!deal.company_name,
      hasPainPoints: deal.pain_points && deal.pain_points.length > 0,
      hasNextSteps: deal.next_steps && deal.next_steps.length > 0,
      hasContacts: deal.deal_contacts && deal.deal_contacts.length > 0,
      hasCompanySummary: !!deal.deal_title,
      hasMeetingData: !!recentMeeting,
      emailCount: recentEmails.length,
    });

    // Always provide some analysis if we have basic deal information
    if (!deal.company_name) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient deal data',
        response: 'Unable to analyze deal: missing basic company information.'
      }, { status: 400 });
    }

    // 5. Call OpenAI for comprehensive analysis
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API not available',
          response: 'Deal analysis is currently unavailable. Please try again later.'
        },
        { status: 500 }
      );
    }

    try {
      console.log('🤖 Calling OpenAI for deal analysis...');

      // Use standard chat completions API for reliability
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a sales analyst AI that helps analyze deals and provides strategic insights. 
            
Your role is to:
1. Analyze deal information, meeting data, and communication history
2. Identify key insights, risks, and opportunities
3. Provide actionable next steps and recommendations
4. Highlight positive signals and potential concerns
5. Assess deal momentum and likelihood of closing

Please provide a comprehensive analysis that includes:
- Current deal status and momentum assessment
- Key insights from available data
- Identified opportunities and risks
- Strategic recommendations for next steps
- Communication and relationship insights

Keep your response focused, actionable, and professional. Use clear headings and bullet points for readability.`
          },
          {
            role: "user",
            content: inputData
          }
        ],
        max_tokens: 2048,
        temperature: 0.3
      });

      const analysisResult = response.choices[0]?.message?.content || '';
      
      console.log('✅ OpenAI analysis completed, length:', analysisResult?.length || 0);
      console.log('📝 Analysis result type:', typeof analysisResult);

      // 6. Format response by removing markdown
      const cleanedResponse = removeMarkdownFormatting(analysisResult);

      console.log('🧹 Response cleaned of markdown formatting');

      // 7. Store analysis results in database
      const analysisDate = new Date().toISOString();
      try {
        const { error: updateError } = await supabase
          .from('deals')
          .update({
            ai_analysis_raw: cleanedResponse,
            last_analysis_date: analysisDate,
            updated_at: analysisDate,
          })
          .eq('id', dealId)
          .eq('account_id', accountId);

        if (updateError) {
          console.error('❌ Error storing analysis in database:', updateError);
        } else {
          console.log('✅ Analysis stored in database successfully');
        }
      } catch (dbError) {
        console.error('❌ Database error storing analysis:', dbError);
        // Continue with response even if storage fails
      }

      console.log('=== 📊 COMPREHENSIVE DEAL ANALYSIS COMPLETE ===\n');

      return NextResponse.json({
        success: true,
        response: cleanedResponse,
        requestType: 'analysis',
        metadata: {
          dealId,
          accountId,
          analysisDate,
          dataIncluded: {
            dealInfo: true,
            meetingTranscript: !!recentMeeting,
            emailsCount: recentEmails.length,
            contactsCount: deal.deal_contacts?.length || 0,
          }
        }
      });

    } catch (openaiError) {
      console.error('❌ OpenAI API error:', openaiError);
      
      return NextResponse.json({
        success: false,
        error: 'AI analysis failed',
        response: 'I encountered an issue while analyzing this deal. Please try again or contact support if the problem persists.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in deal analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        response: 'An unexpected error occurred while analyzing the deal. Please try again later.'
      },
      { status: 500 }
    );
  }
} 