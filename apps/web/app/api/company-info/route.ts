// import { NextResponse } from 'next/server';
// import { CompanyInfoService } from '~/lib/services/companyInfoService';
// export async function POST(req: Request) {
//   try {
//     const { website } = await req.json();
//     if (!website) {
//       return NextResponse.json(
//         { error: 'Website URL is required' },
//         { status: 400 },
//       );
//     }
//     const companyInfo = await CompanyInfoService.fetchCompanyInfo(website);
//     return NextResponse.json(companyInfo);
//   } catch (error) {
//     console.error('Error in company-info endpoint:', error);
//     const errorMessage =
//       error instanceof Error ? error.message : 'An unknown error occurred';
//     return NextResponse.json(
//       { error: 'Failed to fetch company info', details: errorMessage },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from 'next/server';

import { CompanyInfoService } from '~/lib/services/companyInfoService';

export async function POST(req: Request) {
  try {
    const { website } = await req.json();

    if (!website) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 },
      );
    }

    const companyInfo = await CompanyInfoService.fetchCompanyInfo(website);

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error('Error in company-info endpoint:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch company info', details: errorMessage },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const company = url.searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 },
      );
    }

    console.log('🏢 Generating AI-powered company summary for:', company);

    // Use OpenAI to generate intelligent company summary
    let summary: string | null = null;

    try {
      // Check if OpenAI is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not found. Using fallback method.');
        throw new Error('OpenAI not configured');
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log('🤖 Calling OpenAI for company summary...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a business intelligence analyst helping sales teams. Generate a brief, professional company summary for sales context. 

CRITICAL REQUIREMENTS:
- Keep it concise (2-3 sentences maximum)
- Focus on business model, industry position, and potential sales opportunities
- Identify likely pain points or needs this company might have
- Be factual and professional - avoid speculation if you don't know specifics
- If you don't have specific information, provide industry-typical insights

Format: Just return the summary text, no extra formatting or explanations.`,
          },
          {
            role: 'user',
            content: `Generate a brief business summary for "${company}" that would help a sales team understand their business model, market position, and potential needs. Focus on actionable insights for sales outreach.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      summary = completion.choices[0]?.message?.content?.trim() || null;

      if (summary) {
        console.log(
          '✅ AI-generated company summary:',
          summary.substring(0, 100) + '...',
        );
      }
    } catch (openaiError) {
      console.log(
        '⚠️ OpenAI failed, falling back to pattern-based generation:',
        openaiError instanceof Error ? openaiError.message : 'Unknown error',
      );

      // Fallback to pattern-based generation
      const generateFallbackSummary = (companyName: string): string => {
        const name = companyName.toLowerCase().trim();

        // Industry-based patterns with more intelligence
        if (
          name.includes('bank') ||
          name.includes('financial') ||
          name.includes('capital') ||
          name.includes('credit')
        ) {
          return `Financial services organization likely offering banking, lending, or investment services. Potential needs include digital transformation, customer acquisition technology, and regulatory compliance solutions.`;
        }

        if (
          name.includes('health') ||
          name.includes('medical') ||
          name.includes('pharma') ||
          name.includes('clinic')
        ) {
          return `Healthcare organization focused on medical services or pharmaceutical products. Common pain points include patient management systems, compliance documentation, and operational efficiency tools.`;
        }

        if (
          name.includes('tech') ||
          name.includes('software') ||
          name.includes('digital') ||
          name.includes('ai') ||
          name.includes('cloud')
        ) {
          return `Technology company likely developing software solutions or digital services. Potential needs include scaling infrastructure, customer acquisition, and competitive market positioning.`;
        }

        if (
          name.includes('consulting') ||
          name.includes('advisory') ||
          name.includes('services')
        ) {
          return `Professional services firm providing specialized expertise to clients. Common challenges include resource management, client acquisition, and project delivery optimization.`;
        }

        if (
          name.includes('retail') ||
          name.includes('store') ||
          name.includes('shop') ||
          name.includes('ecommerce')
        ) {
          return `Retail business focused on product sales to consumers. Likely needs include inventory management, customer experience enhancement, and omnichannel sales optimization.`;
        }

        if (
          name.includes('manufacturing') ||
          name.includes('industrial') ||
          name.includes('factory')
        ) {
          return `Manufacturing company involved in production and distribution. Common pain points include supply chain optimization, quality control systems, and operational efficiency improvements.`;
        }

        if (
          name.includes('education') ||
          name.includes('university') ||
          name.includes('school') ||
          name.includes('learning')
        ) {
          return `Educational institution providing learning services. Potential needs include student management systems, digital learning platforms, and administrative efficiency tools.`;
        }

        if (
          name.includes('real estate') ||
          name.includes('property') ||
          name.includes('construction')
        ) {
          return `Real estate or construction business involved in property development or management. Common needs include project management tools, client relationship systems, and market analysis solutions.`;
        }

        // Generic business fallback with actionable insights
        return `Business organization in the ${companyName} sector. Recommend researching their specific industry challenges, growth initiatives, and technology needs for targeted sales approach.`;
      };

      summary = generateFallbackSummary(company);
    }

    return NextResponse.json({
      company: company,
      summary: summary,
      source: summary?.includes('AI-generated') ? 'openai' : 'pattern_based',
    });
  } catch (error) {
    console.error('Error in company info API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company information' },
      { status: 500 },
    );
  }
}
