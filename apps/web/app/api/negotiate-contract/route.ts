import { NextResponse } from 'next/server';

import OpenAI from 'openai';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContractNegotiationRequest {
  dealId: string;
  companyName: string;
  dealValue: string;
  stage: string;
  painPoints?: string[];
  nextSteps?: string[];
  industry?: string;
  contactName?: string;
  specificRequest?: string; // The specific contract term they want help with
}

export async function POST(request: Request) {
  try {
    const body: ContractNegotiationRequest = await request.json();

    console.log(
      '🤝 Processing contract negotiation request for:',
      body.companyName,
    );

    // Use the specific prompt ID provided by the user
    const response = await openai.responses.create({
      prompt: {
        id: 'pmpt_68534c5646e881949e3ed1797c84719a072e6b5ae9009e2e',
        version: '1',
      },
    });

    console.log('✅ OpenAI response received for contract negotiation');

    // Save the contract negotiation advice to database if needed
    const supabase = getSupabaseServerClient();

    try {
      // Optional: Log the contract negotiation activity
      await supabase.from('deal_activities').insert({
        deal_id: body.dealId,
        activity_type: 'ai_contract_negotiation',
        title: 'AI Contract Negotiation Advice',
        description: `Generated contract negotiation strategy for ${body.companyName}`,
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.log('⚠️ Could not log activity to database:', dbError);
      // Continue anyway - this is not critical
    }

    // Handle the response structure safely
    const responseData = response as any; // Type assertion to handle unknown response structure
    const advice =
      responseData.data ||
      responseData.content ||
      responseData.message ||
      responseData.text ||
      'Contract negotiation advice generated successfully. The AI prompt has been executed.';

    return NextResponse.json({
      success: true,
      advice: advice,
      dealId: body.dealId,
      timestamp: new Date().toISOString(),
      responseData: responseData, // Include full response for debugging
    });
  } catch (error) {
    console.error('❌ Error in contract negotiation:', error);

    // Get request body for fallback (safely)
    let companyName = 'this company';
    let dealValue = 'your deal';

    try {
      const bodyClone = await request.json();
      companyName = bodyClone.companyName || 'this company';
      dealValue = bodyClone.dealValue || 'your deal';
    } catch {
      // Ignore parsing errors for fallback
    }

    // Return a fallback response if OpenAI fails
    const fallbackAdvice = `🤝 **Contract Negotiation Strategy for ${companyName}**

## 📋 Preparation Steps
• Review their stated pain points and urgency drivers
• Understand their decision-making process and timeline
• Prepare value justification tied to their specific needs
• Research their company's recent financial performance and priorities

## 💰 Pricing Strategy
• Lead with value, not price - emphasize ROI and business impact
• Consider flexible payment terms for this ${dealValue} deal
• Offer pilot or phased implementation to reduce risk
• Prepare bundle options and tiered pricing structures

## 🔧 Implementation Terms
• Clearly define scope and deliverables with specific milestones
• Set realistic timelines with buffer for contingencies
• Include success metrics and KPIs that align with their goals
• Define support levels and response times

## ⚖️ Risk Mitigation
• Address their specific concerns upfront with concrete solutions
• Offer guarantees or service level agreements where appropriate
• Provide references from similar companies in their industry
• Include termination clauses that are fair to both parties

## 🤝 Closing Tactics
• Create urgency with limited-time incentives or bonuses
• Start with smaller scope to build trust and demonstrate value
• Get agreement on next steps and decision timeline
• Prepare for common objections with data-driven responses

## 📝 Key Contract Terms to Negotiate
• Payment schedules that align with value delivery
• Intellectual property rights and data ownership
• Liability limitations and indemnification clauses
• Change management and scope adjustment procedures

*This is a strategic framework. For specific contract terms and legal language, consult with your legal team.*`;

    return NextResponse.json({
      success: false,
      advice: fallbackAdvice,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    });
  }
}
