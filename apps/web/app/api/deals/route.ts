import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import OpenAI from 'openai';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { deduplicatePainPoints, deduplicateNextSteps } from '~/lib/utils/deduplication';

// Lazy initialize OpenAI client to avoid build issues
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found. AI analysis will be skipped.');
    return null;
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    // Get the current user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the deal data from the request
    const dealData = await request.json();

    console.log('Creating deal with data:', dealData);

    console.log('\n=== 🔍 DEAL CREATION DEBUG ===');
    console.log('👤 Account ID:', accountId);
    console.log('📧 Email:', dealData.email);
    console.log('🏢 Company:', dealData.companyName);

    // Generate a highly unique deal_id for scale
    const generateScalableDealId = () => {
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString(36);
      const accountHash = accountId.replace(/-/g, '').substring(0, 6);
      const randomPart1 = Math.random().toString(36).substring(2, 6);
      const randomPart2 = Math.random().toString(36).substring(2, 6);
      const companyHash = dealData.companyName
        ? dealData.companyName
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 3)
            .toUpperCase()
        : 'UNK';

      return `DEAL-${year}-${companyHash}-${accountHash}-${randomPart1}-${randomPart2}`;
    };

    let dealId = generateScalableDealId();
    let retryCount = 0;
    const maxRetries = 5;

    console.log('\n=== 🎯 SCALABLE DEAL ID GENERATION ===');
    console.log('🆔 Generated deal_id:', dealId);
    console.log('📏 Length:', dealId.length);

    // Check for uniqueness and retry if needed
    while (retryCount < maxRetries) {
      const { data: existingDeal, error: checkError } = await supabase
        .from('deals')
        .select('deal_id')
        .eq('deal_id', dealId)
        .single();

      if (!existingDeal) {
        console.log('✅ Deal ID is unique!');
        break;
      }

      retryCount++;
      dealId = generateScalableDealId();
      console.log(`🔄 Retry ${retryCount}: Generated new deal_id:`, dealId);
    }

    if (retryCount >= maxRetries) {
      console.error(
        '❌ Failed to generate unique deal_id after',
        maxRetries,
        'attempts',
      );
      return NextResponse.json(
        { error: 'Failed to generate unique deal ID' },
        { status: 500 },
      );
    }

    const dealInsertData = {
      deal_id: dealId,
      account_id: accountId,
      company_name: dealData.companyName,
      industry: dealData.industry || 'Software & Technology',
      value_amount: dealData.dealValue || 0,
      primary_contact: dealData.email?.split('@')[0] || 'Contact',
      primary_email: dealData.email,
      stage: 'interested' as const,
      pain_points: dealData.painPoints ? deduplicatePainPoints(dealData.painPoints) : undefined,
      next_steps: deduplicateNextSteps(dealData.nextSteps || ['Schedule a meeting']),
      company_size: dealData.companySize,
      website: dealData.website,
      next_action: 'Initial outreach to establish contact',
      probability: 10,
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      momentum: 0,
      momentum_trend: 'steady' as const,
      relationship_insights: dealData.description || null, // Deal-specific description from user
      created_by: user.id,
      updated_by: user.id,
    };

    console.log('\n=== 💾 DEAL INSERT DEBUG ===');
    console.log(
      '📝 Deal data to insert:',
      JSON.stringify(dealInsertData, null, 2),
    );

    // Insert deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert(dealInsertData)
      .select()
      .single();

    if (dealError) {
      console.error('\n=== ❌ DEAL INSERT ERROR ===');
      console.error('Error code:', dealError.code);
      console.error('Error message:', dealError.message);
      console.error('Error details:', dealError.details);
      console.error('Error hint:', dealError.hint);

      return NextResponse.json(
        { error: 'Failed to create deal', details: dealError },
        { status: 500 },
      );
    }

    console.log('\n=== ✅ DEAL CREATED SUCCESSFULLY ===');
    console.log('🎉 Created deal ID:', deal.id);
    console.log('🆔 Auto-generated deal_id:', deal.deal_id);
    console.log('🏢 Company:', deal.company_name);

    // Create the primary contact in deal_contacts table (this is what the contacts API reads)
    const contactName = dealData.contactName || dealData.email?.split('@')[0] || 'Contact';
    const isDecisionMaker = dealData.contact?.isDecisionMaker || false; // Default to false, only true when explicitly confirmed
    const { data: dealContact, error: dealContactError } = await supabase
      .from('deal_contacts')
      .insert({
        deal_id: deal.id,
        name: contactName,
        email: dealData.email,
        role: 'Primary Contact',
        is_primary: true,
        is_decision_maker: isDecisionMaker,
      })
      .select()
      .single();

    if (dealContactError) {
      console.error('❌ Error creating deal contact:', dealContactError);
    } else {
      console.log('✅ Successfully created deal contact:', dealContact);
    }

    // Also create in the general contacts table for future reference
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        name: contactName,
        email: dealData.email,
        role: 'Primary Contact',
        is_decision_maker: isDecisionMaker,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (contactError) {
      console.error('⚠️ Warning: Error creating general contact:', contactError);
      // This is not critical - the deal_contacts entry is what matters for the UI
    } else {
      console.log('✅ Successfully created general contact:', contact);
    }

    // Generate company description from domain/website
    console.log('\n=== 🌐 GENERATING COMPANY DESCRIPTION FROM DOMAIN ===');
    let companySummary = null;

    try {
      // Determine the website URL to use
      let websiteUrl = dealData.website;
      
      // If no website provided, try to extract domain from email
      if (!websiteUrl && dealData.email) {
        const emailDomain = dealData.email.split('@')[1];
        if (emailDomain && !emailDomain.includes('gmail.com') && !emailDomain.includes('yahoo.com') && !emailDomain.includes('outlook.com') && !emailDomain.includes('hotmail.com')) {
          websiteUrl = `https://${emailDomain}`;
          console.log('📧 Extracted domain from email:', websiteUrl);
        }
      }

      if (websiteUrl && dealData.companyName) {
        console.log('🌐 Fetching company info from domain:', websiteUrl);
        
        // Import CompanyInfoService dynamically to avoid import issues
        const { CompanyInfoService } = await import('~/lib/services/companyInfoService');
        
        // Use the CompanyInfoService to get detailed company information
        const companyInfo = await CompanyInfoService.fetchCompanyInfo(websiteUrl);
        
        if (companyInfo && companyInfo.summary) {
          companySummary = companyInfo.summary;
          console.log('✅ Company description generated from domain:', companySummary.substring(0, 100) + '...');
          
          // Update deal with company description in the dedicated field
          const { error: updateError } = await supabase
            .from('deals')
            .update({ 
              company_description: companySummary
            })
            .eq('id', deal.id);

          if (updateError) {
            console.error('❌ Error updating deal with company description:', updateError);
          } else {
            console.log('✅ Updated deal with AI-generated company description');
          }
        }
      } else {
        console.log('⚠️ No website/domain available or company name missing, skipping company description');
      }
    } catch (error) {
      console.error('❌ Error generating company description:', error);
      console.log('🔄 Falling back to basic company summary generation...');
      
      // Fallback to basic company summary if domain lookup fails
      try {
        const openai = getOpenAIClient();
        if (openai && dealData.companyName) {
          console.log('🤖 Generating basic company summary for:', dealData.companyName);

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a business intelligence analyst. Generate a brief, professional summary about a company for sales context. Focus on their business model, industry position, and potential pain points that a sales team should know. Keep it concise (2-3 sentences) and professional.',
              },
              {
                role: 'user',
                content: `Generate a brief business summary for a company called "${dealData.companyName}"${dealData.industry ? ` in the ${dealData.industry} industry` : ''}. Focus on what a sales team should know about this company - their business model, market position, and potential needs.`,
              },
            ],
            temperature: 0.3,
            max_tokens: 200,
          });

          companySummary = completion.choices[0]?.message?.content || '';
          
          if (companySummary) {
            console.log('✅ Fallback company summary generated:', companySummary.substring(0, 100) + '...');
            
            // Update deal with company summary in the dedicated field
            const { error: updateError } = await supabase
              .from('deals')
              .update({ 
                company_description: companySummary
              })
              .eq('id', deal.id);

            if (updateError) {
              console.error('❌ Error updating deal with fallback company summary:', updateError);
            } else {
              console.log('✅ Updated deal with fallback AI-generated company summary');
            }
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback company summary generation also failed:', fallbackError);
      }
    }

    // Enhanced Feature: Process previous emails and meetings from modal + fetch additional from DB
    console.log('\n=== 📧 PROCESSING PREVIOUS INTERACTIONS ===');
    let emailAnalysisResult = null;
    let meetingAnalysisResult = null;

    // First, process the previous emails and meetings collected from the modal
    const previousEmails = dealData.previousEmails || [];
    const previousMeetings = dealData.previousMeetings || [];
    let allEmails: any[] = previousEmails; // Initialize with modal data
    
    console.log(`📬 Found ${previousEmails.length} previous emails from modal`);
    console.log(`🤝 Found ${previousMeetings.length} previous meetings from modal`);

    if (dealData.email) {
      try {
        // Also fetch additional emails from the database to ensure we have complete data
        console.log(`🔍 [DEALS API] Searching for emails with contact: ${dealData.email} in account: ${accountId}`);
        
        const { data: contactEmails, error: emailError } = await supabase
          .from('emails')
          .select('*')
          .eq('account_id', accountId)
          .or(`from_email.eq.${dealData.email},to_email.cs.{"${dealData.email}"}`)
          .order('received_at', { ascending: false })
          .limit(10);

        console.log(`📧 [DEALS API] Found ${contactEmails?.length || 0} emails from database`);
        console.log(`📬 [DEALS API] Previous emails from modal: ${previousEmails.length}`);

        // Merge the email data (modal data takes precedence, but add any additional from DB)
        allEmails = previousEmails.length > 0 ? previousEmails : (contactEmails || []);
        
        console.log(`📧 [DEALS API] Using ${allEmails.length} total emails for analysis`);

        if (emailError) {
          console.log('⚠️ Error fetching emails:', emailError.message);
        }
        
        if (allEmails && allEmails.length > 0) {
          console.log(
            `✅ Processing ${allEmails.length} emails with contact: ${dealData.email}`,
          );

          // Add emails as activities
          const emailActivities = allEmails.map((email: any) => ({
            deal_id: deal.id,
            activity_type: 'email',
            title: `Email: ${email.subject || 'No Subject'}`,
            description: `${email.from_email === dealData.email ? 'Received' : 'Sent'} email from ${email.from_email} - ${email.subject || 'No Subject'}. ${email.body_text ? email.body_text.substring(0, 200) + '...' : ''}`,
            created_by: user.id,
            created_at: email.received_at,
          }));

          // Insert email activities
          const { error: activityError } = await supabase
            .from('deal_activities')
            .insert(emailActivities);

          if (activityError) {
            console.log(
              '⚠️ Error adding email activities:',
              activityError.message,
            );
          } else {
            console.log(
              `✅ Added ${emailActivities.length} email activities to deal`,
            );
          }

          // Analyze the latest email with OpenAI
          const latestEmail = allEmails[0];
          if (
            latestEmail &&
            latestEmail.body_text &&
            process.env.OPENAI_API_KEY
          ) {
                console.log('🤖 Analyzing latest email with OpenAI...');

    try {
      const openai = getOpenAIClient();
      if (!openai) {
        console.log('🤖 OpenAI not available, skipping AI analysis');
        return NextResponse.json(deal, { status: 201 });
      }

      // Prepare email data for analysis
      const emailData = `From: ${latestEmail.from_email}
To: ${latestEmail.to_email}
Subject: ${latestEmail.subject || 'No Subject'}
Date: ${latestEmail.received_at}

Email Content:
${latestEmail.body_text.substring(0, 2000)} ${latestEmail.body_text.length > 2000 ? '...' : ''}`;

      const response = await (openai as any).responses.create({
        prompt: {
          id: "pmpt_68534c5646e881949e3ed1797c84719a072e6b5ae9009e2e",
          version: "3"
        },
        input: [],
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        max_output_tokens: 500,
        store: true
      });

      const analysis = response.text || '';

              if (analysis) {
                console.log('✅ Email analysis complete');

                // Update deal with email analysis in relationship_insights
                const { error: updateError } = await supabase
                  .from('deals')
                  .update({
                    relationship_insights: analysis,
                    last_analysis_date: new Date().toISOString(),
                    updated_by: user.id,
                  })
                  .eq('id', deal.id);

                if (updateError) {
                  console.log(
                    '⚠️ Error storing email analysis:',
                    updateError.message,
                  );
                } else {
                  console.log(
                    '✅ Email analysis stored in deal relationship_insights',
                  );
                  emailAnalysisResult = analysis;
                }
              }
            } catch (aiError) {
              console.log(
                '⚠️ Error analyzing email with OpenAI:',
                aiError instanceof Error ? aiError.message : 'Unknown error',
              );
            }
          }
        } else {
          console.log('📭 No emails found for contact:', dealData.email);
        }
      } catch (error) {
        console.log(
          '⚠️ Error in email processing:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    // Enhanced Analysis: Generate dedicated email and meeting summaries
    console.log('\n=== 🤖 GENERATING ENHANCED SUMMARIES ===');
    
    try {
      const openai = getOpenAIClient();
      if (openai) {
        // Generate email summary if we have previous emails
        if (allEmails && allEmails.length > 0) {
          console.log(`📧 Generating email summary from ${allEmails.length} emails...`);
          
          const emailContent = allEmails.slice(0, 5).map((email: any) => 
            `From: ${email.from_email || 'Unknown'}
Subject: ${email.subject || 'No Subject'}
Date: ${email.received_at || email.created_at || 'Unknown'}
Content: ${(email.body_text || '').substring(0, 500)}...`
          ).join('\n\n---\n\n');

          try {
            const emailSummaryResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a sales analyst. Generate a brief, actionable summary of email communications with a prospect. Focus on: relationship progression, key discussion points, next steps mentioned, pain points revealed, and overall sentiment. Keep it under 200 words and professional.',
                },
                {
                  role: 'user',
                  content: `Analyze these email communications with prospect ${dealData.email} and provide a concise summary:\n\n${emailContent}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 250,
            });

            const emailSummary = emailSummaryResponse.choices[0]?.message?.content || '';
            
            if (emailSummary) {
              // Update deal with email summary
              const { error: emailUpdateError } = await supabase
                .from('deals')
                .update({
                  email_summary: emailSummary,
                  email_summary_updated_at: new Date().toISOString(),
                })
                .eq('id', deal.id);

              if (emailUpdateError) {
                console.log('⚠️ Error storing email summary:', emailUpdateError.message);
              } else {
                console.log('✅ Email summary generated and stored');
                emailAnalysisResult = emailSummary;
              }
            }
          } catch (emailSummaryError) {
            console.log('⚠️ Error generating email summary:', emailSummaryError instanceof Error ? emailSummaryError.message : 'Unknown error');
          }
        }

        // Generate meeting summary if we have previous meetings
        if (previousMeetings && previousMeetings.length > 0) {
          console.log(`🤝 Generating meeting summary from ${previousMeetings.length} meetings...`);
          
          const meetingContent = previousMeetings.slice(0, 3).map((meeting: any) => 
            `Title: ${meeting.title || 'Meeting'}
Date: ${meeting.start_time || meeting.created_at || 'Unknown'}
Host: ${meeting.host_email || 'Unknown'}
Participants: ${meeting.participant_emails ? meeting.participant_emails.join(', ') : 'Unknown'}
Duration: ${meeting.end_time ? 'Full meeting' : 'Scheduled'}`
          ).join('\n\n---\n\n');

          try {
            const meetingSummaryResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a sales analyst. Generate a brief summary of meeting history with a prospect. Focus on: meeting frequency, topics discussed, relationship building progress, and any patterns that indicate sales readiness. Keep it under 150 words and actionable.',
                },
                {
                  role: 'user',
                  content: `Analyze these meeting records with prospect ${dealData.email} and provide a concise summary:\n\n${meetingContent}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 200,
            });

            const meetingSummary = meetingSummaryResponse.choices[0]?.message?.content || '';
            
            if (meetingSummary) {
              // Get the most recent meeting details
              const latestMeeting = previousMeetings[0];
              
              // Update deal with meeting summary
              const { error: meetingUpdateError } = await supabase
                .from('deals')
                .update({
                  last_meeting_summary: meetingSummary,
                  last_meeting_date: latestMeeting.start_time || latestMeeting.created_at || new Date().toISOString(),
                  last_meeting_type: latestMeeting.title?.toLowerCase().includes('demo') ? 'demo' : 
                                    latestMeeting.title?.toLowerCase().includes('call') ? 'call' : 'meeting',
                  last_meeting_notes: `Meeting with ${dealData.contactName || 'prospect'}. ${meetingSummary.substring(0, 200)}`,
                })
                .eq('id', deal.id);

              if (meetingUpdateError) {
                console.log('⚠️ Error storing meeting summary:', meetingUpdateError.message);
              } else {
                console.log('✅ Meeting summary generated and stored');
                meetingAnalysisResult = meetingSummary;
              }
            }
          } catch (meetingSummaryError) {
            console.log('⚠️ Error generating meeting summary:', meetingSummaryError instanceof Error ? meetingSummaryError.message : 'Unknown error');
          }
        }
      }
    } catch (enhancedAnalysisError) {
      console.log('⚠️ Error in enhanced analysis:', enhancedAnalysisError instanceof Error ? enhancedAnalysisError.message : 'Unknown error');
    }

    // Trigger momentum scoring in the background for new deals (don't wait for it)
    if (deal?.id && accountId) {
      // Get the current URL to determine the correct port
      const currentUrl = new URL(request.url);
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
      
      fetch(`${baseUrl}/api/momentum-scoring`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '',
        },
        body: JSON.stringify({ dealId: deal.id, accountId })
      }).catch(error => {
        console.error('❌ Background momentum scoring failed for new deal:', error);
        console.error('❌ Attempted URL:', `${baseUrl}/api/momentum-scoring`);
      });
      console.log('🎯 Background momentum scoring triggered for new deal:', deal.company_name);
      console.log('🎯 Using URL:', `${baseUrl}/api/momentum-scoring`);
    }

    // Trigger comprehensive analysis for the newly created deal
    try {
      console.log('🔍 Triggering comprehensive analysis for new deal...');
      
      // Import the DealAnalysisService dynamically
      const { DealAnalysisService } = await import('~/lib/services/dealAnalysisService');
      
      // Trigger analysis in background (don't await to avoid blocking response)
      DealAnalysisService.analyzeDeal(deal.id, deal.account_id, {
        includeCompanyAnalysis: true,
        includeEmailAnalysis: false, // Will be analyzed later when emails are connected
        includeMeetingAnalysis: false, // Will be analyzed when meetings are added
        includeMomentumUpdate: true,
        trigger: 'creation'
      }).catch(error => {
        console.error('❌ Background analysis failed for new deal:', error);
      });
      
    } catch (analysisError) {
      console.error('❌ Failed to trigger deal analysis:', analysisError);
      // Don't fail the deal creation if analysis fails
    }

    return NextResponse.json({
      success: true,
      deal,
      contact,
      emailAnalysis: emailAnalysisResult,
      meetingAnalysis: meetingAnalysisResult,
    });
  } catch (error) {
    console.error('Error in POST /api/deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // Get accountId from query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    console.log('🔍 GET /api/deals - Starting...');

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.email, 'Account ID:', accountId);

    // Fetch deals for the current account
    console.log('🔍 Fetching deals for account_id:', accountId);

    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching deals:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch deals',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    // Transform database fields to match frontend interface
    const transformedDeals =
      deals?.map((deal) => ({
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
        companyDescription: deal.company_description,
        last_meeting_summary: deal.last_meeting_summary,
        momentum: deal.momentum || 0,
        momentumTrend: deal.momentum_trend || 'steady',
        momentumMarkers: [],
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
      })) || [];

    return NextResponse.json(transformedDeals);
  } catch (error) {
    console.error('Error in GET /api/deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
