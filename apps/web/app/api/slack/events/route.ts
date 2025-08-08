// // /api/slack/event/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import crypto from 'crypto';
// import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
// const supabase = getSupabaseServerAdminClient();
// async function getBotTokenForTeam(team_id: string) {
//   const { data, error } = await supabase
//     .from('slack_tokens')
//     .select('access_token, account_id')
//     .eq('team_id', team_id)
//     .single();
//   if (error || !data) {
//     console.error('Failed to get bot token:', error);
//     return null;
//   }
//   return data;
// }
// async function getDealsForAccount(account_id: string) {
//   const { data, error } = await supabase
//     .from('deals')
//     .select('*')
//     .eq('account_id', account_id)
//     .order('value_amount', { ascending: false });
//   if (error) {
//     console.error('Failed to get deals:', error);
//     return [];
//   }
//   return data || [];
// }
// async function getAccountName(account_id: string) {
//   const { data, error } = await supabase
//     .from('accounts')
//     .select('name')
//     .eq('id', account_id)
//     .single();
//   if (error || !data) {
//     console.error('Failed to get account name:', error);
//     return 'your company';
//   }
//   return data.name;
// }
// function formatCurrency(amount: number, currency: string = 'USD'): string {
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: currency,
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 0,
//   }).format(amount);
// }
// function formatStage(stage: string): string {
//   return stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ');
// }
// function createDealsTable(deals: any[]): string {
//   if (deals.length === 0) return '';
//   const maxDeals = 8; // Limit for better readability
//   const displayDeals = deals.slice(0, maxDeals);
//   // Calculate column widths based on content
//   const companyWidth = Math.max(
//     7,
//     Math.max(...displayDeals.map((d) => d.company_name.length)),
//   );
//   const valueWidth = Math.max(
//     8,
//     Math.max(
//       ...displayDeals.map(
//         (d) => formatCurrency(d.value_amount, d.value_currency).length,
//       ),
//     ),
//   );
//   const stageWidth = Math.max(
//     9,
//     Math.max(...displayDeals.map((d) => formatStage(d.stage).length)),
//   );
//   // Create table header
//   const header = `| ${'Company'.padEnd(companyWidth)} | ${'Value'.padEnd(valueWidth)} | ${'Stage'.padEnd(stageWidth)} |`;
//   const separator = `|${'-'.repeat(companyWidth + 2)}|${'-'.repeat(valueWidth + 2)}|${'-'.repeat(stageWidth + 2)}|`;
//   // Create table rows
//   const rows = displayDeals.map((deal) => {
//     const company = deal.company_name.padEnd(companyWidth);
//     const value = formatCurrency(deal.value_amount, deal.value_currency).padEnd(
//       valueWidth,
//     );
//     const stage = formatStage(deal.stage).padEnd(stageWidth);
//     return `| ${company} | ${value} | ${stage} |`;
//   });
//   return `\`\`\`\n${header}\n${separator}\n${rows.join('\n')}\n\`\`\``;
// }
// function handleSlackCommand(
//   eventText: string,
//   deals: any[],
//   accountName?: string,
// ): string {
//   const lowerText = eventText.toLowerCase().trim();
//   // Detect greetings
//   if (
//     [
//       'hi',
//       'hello',
//       'hey',
//       'greetings',
//       'good morning',
//       'good afternoon',
//       'good evening',
//     ].some((greet) => lowerText.startsWith(greet))
//   ) {
//     return `🤖 I’m your dedicated sales assistant for *${accountName || 'your sales workspace'}*.\n\nHow can I support your sales success today?\n\n_Type \`help\` to explore available commands and insights._`;
//   }
//   // If empty text (just a mention), show help
//   if (!lowerText || lowerText === '') {
//     return `🤖 *Vellora AI*\n\n_Your intelligent sales assistant_\n\n*Core Analytics:*\n• \`deals\` - Complete portfolio analysis\n• \`pipeline\` - Stage distribution & forecasting\n• \`top\` - High-value opportunity ranking\n\n*Quick Actions:*\n• \`help\` - Command reference & documentation\n\n_Real-time data synchronization • Enterprise-grade security_`;
//   }
//   // Handle pipeline/summary commands
//   if (lowerText.includes('pipeline') || lowerText.includes('summary')) {
//     if (deals.length === 0) {
//       return '📊 *Pipeline Intelligence Dashboard*\n\n_No active pipeline data_\n\nYour sales pipeline is currently empty. Import existing opportunities or create new deals to begin advanced pipeline analytics and stage progression tracking.';
//     }
//     const stages = deals.reduce((acc: any, deal: any) => {
//       acc[deal.stage] = (acc[deal.stage] || 0) + 1;
//       return acc;
//     }, {});
//     const totalValue = deals.reduce(
//       (sum: number, deal: any) => sum + Number(deal.value_amount),
//       0,
//     );
//     const stageSummary = Object.entries(stages)
//       .map(([stage, count]) => {
//         const percentage = (((count as number) / deals.length) * 100).toFixed(
//           1,
//         );
//         const stageDisplay = formatStage(stage);
//         return `• *${stageDisplay}*: ${count} deals (${percentage}%)`;
//       })
//       .join('\n');
//     const formattedValue = formatCurrency(totalValue, deals[0]?.value_currency);
//     return `📊 *Pipeline Intelligence Dashboard*\n\n*Portfolio Overview:*\n${stageSummary}\n\n*Pipeline Metrics:*\n• *Total Value*: ${formattedValue}\n• *Active Opportunities*: ${deals.length}`;
//   }
//   // Handle deals commands
//   if (lowerText.includes('deals') || lowerText === 'deals') {
//     if (
//       lowerText.includes('all deals') ||
//       lowerText.includes('show me deals') ||
//       lowerText === 'deals'
//     ) {
//       if (deals.length === 0) {
//         return '💼 *Deal Portfolio Management*\n\n_Portfolio currently empty_\n\nEstablish your sales pipeline by importing existing opportunities from your CRM or creating new deals. Portfolio analytics and insights will be available once deals are added to the system.';
//       }
//       const summary = deals
//         .slice(0, 8) // Show up to 8 deals
//         .map((d: any, index: number) => {
//           const formattedValue = formatCurrency(
//             d.value_amount,
//             d.value_currency,
//           );
//           const stageDisplay = formatStage(d.stage);
//           const momentum = d.momentum ? ` • Momentum: ${d.momentum}/100` : '';
//           return `*${index + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}
//           `;
//         })
//         .join('\n\n');
//       const totalValue = deals.reduce(
//         (sum: number, deal: any) => sum + Number(deal.value_amount),
//         0,
//       );
//       const avgDealSize = totalValue / deals.length;
//       const formattedTotal = formatCurrency(
//         totalValue,
//         deals[0]?.value_currency,
//       );
//       const formattedAvg = formatCurrency(
//         avgDealSize,
//         deals[0]?.value_currency,
//       );
//       return `💼 *Enterprise Deal Portfolio*\n\n${summary}${deals.length > 8 ? `\n\n_...plus ${deals.length - 8} additional opportunities_` : ''}\n\n*Portfolio Analytics:*\n• *Total Value*: ${formattedTotal}\n• *Average Deal Size*: ${formattedAvg}\n• *Active Opportunities*: ${deals.length}\n• *Portfolio Diversification*: ${Object.keys(deals.reduce((acc: any, d) => ({ ...acc, [d.stage]: true }), {})).length} stages\n\n_Use \`pipeline\` for stage analysis • \`top\` for highest values_`;
//     }
//     if (lowerText.includes('top') || lowerText.includes('highest')) {
//       if (deals.length === 0) {
//         return '🏆 *High-Value Opportunity Analysis*\n\n_No opportunities available for ranking_\n\nHigh-value opportunity tracking requires active deals. Create premium prospects to unlock advanced opportunity management and prioritization features.';
//       }
//       const topDeals = deals
//         .slice(0, 5)
//         .map((d: any, i) => {
//           const formattedValue = formatCurrency(
//             d.value_amount,
//             d.value_currency,
//           );
//           const stageDisplay = formatStage(d.stage);
//           const probability = d.probability
//             ? ` • ${d.probability}% probability`
//             : '';
//           return `*${i + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}_${probability}`;
//         })
//         .join('\n\n');
//       const topDealsValue = deals
//         .slice(0, 5)
//         .reduce((sum: number, deal: any) => sum + Number(deal.value_amount), 0);
//       const topPercent = (
//         (topDealsValue /
//           deals.reduce(
//             (sum: number, deal: any) => sum + Number(deal.value_amount),
//             0,
//           )) *
//         100
//       ).toFixed(1);
//       return `🏆 *Strategic Opportunity Ranking*\n\n${topDeals}\n\n• Top 5 represent ${topPercent}% of total pipeline value\n• Concentrate efforts on these high-impact opportunities\n• Consider executive engagement for enterprise deals\n\n_Rankings based on deal value • Updated in real-time_`;
//     }
//     return `💡 *Deal Analytics Available:*\n\n*Core Analytics:*\n• \`deals\` - Complete portfolio overview\n• \`top\` - High-value opportunity ranking\n• \`pipeline\` - Stage distribution analysis\n\n_All analytics feature real-time data synchronization_`;
//   }
//   // Handle top deals command (even without "deals" in the text)
//   if (lowerText.includes('top') && !lowerText.includes('deals')) {
//     const activeDeals = deals.filter(
//       (d: any) => d.stage.toLowerCase() !== 'lost',
//     );
//     if (activeDeals.length === 0) {
//       return '🏆 *High-Value Opportunity Analysis*\n\n_No opportunities available for ranking_\n\nHigh-value opportunity tracking requires active deals. Create premium prospects to unlock advanced opportunity management and prioritization features.';
//     }
//     const topDeals = activeDeals
//       .slice(0, 5)
//       .map((d: any, i) => {
//         const formattedValue = formatCurrency(d.value_amount, d.value_currency);
//         const stageDisplay = formatStage(d.stage);
//         const probability = d.probability
//           ? ` • ${d.probability}% probability`
//           : '';
//         return `*${i + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}_${probability}`;
//       })
//       .join('\n\n');
//     const topDealsValue = activeDeals
//       .slice(0, 5)
//       .reduce((sum: number, deal: any) => sum + Number(deal.value_amount), 0);
//     const totalValue = activeDeals.reduce(
//       (sum: number, deal: any) => sum + Number(deal.value_amount),
//       0,
//     );
//     const topPercent = ((topDealsValue / totalValue) * 100).toFixed(1);
//     return `🏆 *Strategic Opportunity Ranking*\n\n${topDeals}\n\n• Top 5 represent ${topPercent}% of total pipeline value\n• Concentrate efforts on these high-impact opportunities\n• Consider executive engagement for enterprise deals\n\n_Rankings based on deal value • Updated in real-time_`;
//   }
//   // Handle help command
//   if (lowerText.includes('help') || lowerText.includes('commands')) {
//     return `🤖 *Vellora AI*\n_Intelligent Sales Assistant_\n\n*Core Analytics Commands:*\n\`deals\` - Portfolio overview with diversification metrics\n\`pipeline\` - Stage intelligence & velocity analysis\n\`top\` - Strategic opportunity ranking system\n\n*System Commands:*\n\`help\` - Display this comprehensive guide\n`;
//   }
//   return `🤖 *Vellora AI*\n\n_Welcome to your intelligent sales assistant_\n\n*Quick Start Commands:*\n• \`deals\` - Portfolio analytics\n• \`pipeline\` - Stage intelligence\n• \`top\` - Opportunity ranking\n• \`help\` - Full documentation\n`;
// }
// export async function POST(req: NextRequest) {
//   const body = await req.text();
//   const slackSignature = req.headers.get('x-slack-signature') || '';
//   const timestamp = req.headers.get('x-slack-request-timestamp') || '';
//   // Verify Slack signature
//   const sigBasestring = `v0:${timestamp}:${body}`;
//   const mySignature =
//     'v0=' +
//     crypto
//       .createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
//       .update(sigBasestring)
//       .digest('hex');
//   if (
//     !crypto.timingSafeEqual(
//       Buffer.from(mySignature, 'utf-8'),
//       Buffer.from(slackSignature, 'utf-8'),
//     )
//   ) {
//     console.warn('Signature mismatch');
//     return new NextResponse('Invalid signature', { status: 400 });
//   }
//   const payload = JSON.parse(body);
//   console.log('🔍 Incoming Slack Event:', JSON.stringify(payload, null, 2));
//   // Slack URL verification
//   if (payload.type === 'url_verification') {
//     return NextResponse.json({ challenge: payload.challenge });
//   }
//   // Handle app_mention
//   if (payload.event?.type === 'app_mention') {
//     const team_id = payload.team_id;
//     const tokenData = await getBotTokenForTeam(team_id);
//     if (!tokenData) {
//       console.error(`No token for workspace: ${team_id}`);
//       return NextResponse.json(
//         { ok: false, error: 'Bot token not found' },
//         { status: 500 },
//       );
//     }
//     // Get deals for this account
//     const deals = await getDealsForAccount(tokenData.account_id);
//     // Get the account name
//     const accountName = await getAccountName(tokenData.account_id);
//     // Extract text (excluding bot mention)
//     const fullText = payload.event.text;
//     const botId = payload.authorizations?.[0]?.user_id || '';
//     const cleanedText = fullText.replace(`<@${botId}>`, '').trim();
//     console.log('🤖 Processing mention:', cleanedText);
//     // Handle command
//     const commandReply = handleSlackCommand(cleanedText, deals, accountName);
//     const channel = payload.event.channel;
//     try {
//       const reply = await fetch('https://slack.com/api/chat.postMessage', {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${tokenData.access_token}`,
//           'Content-Type': 'application/json; charset=utf-8',
//         },
//         body: JSON.stringify({
//           channel,
//           text: commandReply,
//         }),
//       });
//       const replyData = await reply.json();
//       if (!replyData.ok) {
//         console.error('Reply failed:', replyData);
//       } else {
//         console.log('Replied successfully to Slack');
//       }
//     } catch (error) {
//       console.error('Error sending Slack message:', error);
//     }
//   }
//   // Handle direct messages to the bot
//   if (
//     payload.event?.type === 'message' &&
//     payload.event?.channel_type === 'im' &&
//     !payload.event?.bot_id
//   ) {
//     console.log('📩 Direct message to bot:', payload.event.text);
//     const team_id = payload.team_id;
//     const tokenData = await getBotTokenForTeam(team_id);
//     if (!tokenData) {
//       console.error(`No token for workspace: ${team_id}`);
//       return NextResponse.json(
//         { ok: false, error: 'Bot token not found' },
//         { status: 500 },
//       );
//     }
//     // Get deals for this account
//     const deals = await getDealsForAccount(tokenData.account_id);
//     // Get the account name
//     const accountName = await getAccountName(tokenData.account_id);
//     // Handle command
//     const commandReply = handleSlackCommand(
//       payload.event.text,
//       deals,
//       accountName,
//     );
//     const channel = payload.event.channel;
//     try {
//       const reply = await fetch('https://slack.com/api/chat.postMessage', {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${tokenData.access_token}`,
//           'Content-Type': 'application/json; charset=utf-8',
//         },
//         body: JSON.stringify({
//           channel,
//           text: commandReply,
//         }),
//       });
//       const replyData = await reply.json();
//       if (!replyData.ok) {
//         console.error('DM Reply failed:', replyData);
//       } else {
//         console.log('Replied successfully to DM');
//       }
//     } catch (error) {
//       console.error('Error sending DM reply:', error);
//     }
//   }
//   return NextResponse.json({ ok: true });
// }
// /api/slack/event/route.ts
import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import OpenAI from 'openai';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const supabase = getSupabaseServerAdminClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Types
interface Deal {
  id: string;
  company_name: string;
  value_amount: number;
  value_currency: string;
  stage: string;
  probability?: number | null;
  momentum?: number | null;
  next_steps?: string[] | null;
  green_flags?: string[] | null;
  website?: string | null;
  industry?: string | null;
  company_size?: string | null;
  last_meeting_summary?: string | null;
  meeting_highlights?: any;
  pain_points?: string[] | null;
}

interface BotTokenData {
  access_token: string;
  account_id: string;
}

// Database functions
async function getBotTokenForTeam(
  team_id: string,
): Promise<BotTokenData | null> {
  const { data, error } = await supabase
    .from('slack_tokens')
    .select('access_token, account_id')
    .eq('team_id', team_id)
    .single();

  if (error || !data) {
    console.error('Failed to get bot token:', error);
    return null;
  }
  return data;
}

async function getDealsForAccount(account_id: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('account_id', account_id)
    .order('value_amount', { ascending: false });

  if (error) {
    console.error('Failed to get deals:', error);
    return [];
  }
  return data || [];
}

async function getAccountName(account_id: string): Promise<string> {
  const { data, error } = await supabase
    .from('accounts')
    .select('name')
    .eq('id', account_id)
    .single();

  if (error || !data) {
    console.error('Failed to get account name:', error);
    return 'your organization';
  }
  return data.name;
}

// Utility functions
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatStage(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ');
}

// Enhanced function to detect intent and extract company names
function detectIntent(message: string): {
  intent:
    | 'greeting'
    | 'deals'
    | 'pipeline'
    | 'top'
    | 'next_steps'
    | 'help'
    | 'company_details'
    | 'general';
  confidence: number;
  companySearch?: string;
} {
  const lowerText = message.toLowerCase().trim();

  // Greeting patterns
  const greetings = [
    'hi',
    'hello',
    'hey',
    'good morning',
    'good afternoon',
    'good evening',
    'howdy',
  ];
  if (greetings.some((greeting) => lowerText.startsWith(greeting))) {
    return { intent: 'greeting', confidence: 0.9 };
  }

  // Help patterns
  if (
    lowerText.includes('help') ||
    lowerText.includes('command') ||
    lowerText.includes('what can you do')
  ) {
    return { intent: 'help', confidence: 0.9 };
  }

  // Company details patterns
  if (
    (lowerText.includes('full details') ||
      lowerText.includes('complete details') ||
      lowerText.includes('all details') ||
      lowerText.includes('details for') ||
      lowerText.includes('info for') ||
      lowerText.includes('information for') ||
      lowerText.includes('show me') ||
      lowerText.includes('tell me about') ||
      lowerText.includes('full company information') ||
      lowerText.includes('company information') ||
      lowerText.includes('company details') ||
      lowerText.includes('deal information') ||
      lowerText.includes('deal details')) &&
    (lowerText.includes(' for ') ||
      lowerText.includes(' about ') ||
      lowerText.includes(' of '))
  ) {
    // Extract company name after "for", "about", or "of"
    const patterns = [' for ', ' about ', ' of '];
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        const afterPattern = lowerText.split(pattern)[1];
        if (afterPattern) {
          const companySearch = afterPattern.trim().replace(/['"*]/g, '');
          return { intent: 'company_details', confidence: 0.9, companySearch };
        }
      }
    }
  }

  // Next steps patterns with company extraction (only for specific companies)
  if (
    (lowerText.includes('next step') || lowerText.includes('action')) &&
    lowerText.includes(' for ')
  ) {
    const afterFor = lowerText.split(' for ')[1];
    if (afterFor) {
      const companySearch = afterFor.trim().replace(/['"]/g, '');
      return { intent: 'next_steps', confidence: 0.9, companySearch };
    }
  }

  // Deal patterns
  if (
    lowerText.includes('deal') ||
    lowerText.includes('portfolio') ||
    lowerText.includes('opportunities')
  ) {
    return { intent: 'deals', confidence: 0.8 };
  }

  // Pipeline patterns
  if (
    lowerText.includes('pipeline') ||
    lowerText.includes('summary') ||
    lowerText.includes('overview')
  ) {
    return { intent: 'pipeline', confidence: 0.8 };
  }

  // Top deals patterns
  if (
    lowerText.includes('top') ||
    lowerText.includes('highest') ||
    lowerText.includes('best') ||
    lowerText.includes('biggest')
  ) {
    return { intent: 'top', confidence: 0.8 };
  }

  return { intent: 'general', confidence: 0.5 };
}

// Professional response generators with AI enhancement
class ResponseGenerator {
  constructor(
    private accountName: string,
    private deals: Deal[],
  ) {}

  async greeting(): Promise<string> {
    const hasDeals = this.deals.length > 0;
    const totalValue = hasDeals
      ? this.deals.reduce((sum, deal) => sum + deal.value_amount, 0)
      : 0;

    if (hasDeals) {
      return `Hello! I'm your AI sales assistant for *${this.accountName}*.

*Current pipeline:* ${this.deals.length} active deals worth ${formatCurrency(totalValue, this.deals[0]?.value_currency || 'USD')}

*Available commands:*
• \`deals\` - Portfolio overview
• \`pipeline\` - Stage analysis  
• \`top\` - Best opportunities

*You can also chat naturally - I understand conversational requests.*

How can I help you today?`;
    }

    return `Hello! I'm your AI-powered sales assistant for *${this.accountName}*.

*Available commands:*
• \`deals\` - Portfolio overview
• \`pipeline\` - Stage analysis  
• \`top\` - Best opportunities
• \`help\` - Show all commands

You can also chat naturally - I understand conversational requests.

How can I help you today?`;
  }

  help(): string {
    return `*AI-Powered Sales Assistant Commands:*

• \`deals\` - View your deal portfolio with AI insights
• \`pipeline\` - Pipeline stage analysis with recommendations
• \`top\` - Highest value opportunities with AI prioritization
• \`next steps for [company]\` - Get AI-enhanced action items
• \`full details for [company]\` - Complete deal information
• \`help\` - Show this menu

You can also chat naturally - I understand conversational requests and provide intelligent sales insights.`;
  }

  async dealsPortfolio(): Promise<string> {
    if (this.deals.length === 0) {
      return `*Deal Portfolio*

No active deals in your pipeline.

Get started by adding deals to track your opportunities and pipeline performance.

_Try: \`deals\` | \`pipeline\` | \`top\` | \`help\`_`;
    }

    const totalValue = this.deals.reduce(
      (sum, deal) => sum + deal.value_amount,
      0,
    );
    const avgValue = totalValue / this.deals.length;

    const topDeals = this.deals
      .slice(0, 5)
      .map(
        (deal, index) =>
          `${(index + 1).toString().padEnd(2)} *${deal.company_name.padEnd(15)}* ${formatCurrency(deal.value_amount, deal.value_currency).padEnd(12)} ${formatStage(deal.stage)}`,
      )
      .join('\n');

    const additionalCount =
      this.deals.length > 5
        ? `\n_...and ${this.deals.length - 5} more deals_`
        : '';

    // Add AI insights
    try {
      const context = `Deals: ${this.deals.length}, Total value: ${formatCurrency(totalValue)}, Average: ${formatCurrency(avgValue)}. Stages: ${this.deals.map((d) => d.stage).join(', ')}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Provide 1-2 brief AI insights about this sales portfolio in 1-2 sentences. Focus on opportunities, risks, or recommendations. Use Slack emoji codes like :bulb: for insights, :dart: for targets, :warning: for risks, :rocket: for opportunities, :moneybag: for money-related insights.`,
          },
          { role: 'user', content: context },
        ],
        temperature: 0.3,
        max_tokens: 60,
      });

      const aiInsight = response.choices?.[0]?.message?.content || '';

      return `*Deal Portfolio Overview*

\`\`\`
#  Company Name       Deal Value  Stage
${topDeals}
\`\`\`${additionalCount}

*Summary:*
• Total Value: ${formatCurrency(totalValue, this.deals?.[0]?.value_currency || 'USD')}
• Average Deal: ${formatCurrency(avgValue, this.deals?.[0]?.value_currency || 'USD')}  
• Active Deals: ${this.deals.length}

*AI Insight:* ${aiInsight}

_Want details? Try:_ \`pipeline\` | \`top\` | \`next steps for [company]\` | \`full details for [company]\``;
    } catch (error) {
      console.error('AI portfolio insight error:', error);
      return `*Deal Portfolio Overview*

\`\`\`
#  Company Name       Deal Value  Stage
${topDeals}
\`\`\`${additionalCount}

*Summary:*
• Total Value: ${formatCurrency(totalValue, this.deals?.[0]?.value_currency || 'USD')}
• Average Deal: ${formatCurrency(avgValue, this.deals?.[0]?.value_currency || 'USD')}  
• Active Deals: ${this.deals.length}

_Want details? Try:_ \`pipeline\` | \`top\` | \`next steps for [company]\` | \`full details for [company]\``;
    }
  }

  async pipeline(): Promise<string> {
    if (this.deals.length === 0) {
      return `*Pipeline Analysis*

No deals to analyze.

Add deals to your pipeline to see stage distribution and performance metrics.`;
    }

    const stages = this.deals.reduce((acc: Record<string, number>, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {});

    const totalValue = this.deals.reduce(
      (sum, deal) => sum + deal.value_amount,
      0,
    );

    const stageBreakdown = Object.entries(stages)
      .map(([stage, count]) => {
        const percentage = ((count / this.deals.length) * 100).toFixed(0);
        return `• ${formatStage(stage)}: ${count} deals (${percentage}%)`;
      })
      .join('\n');

    // Add AI pipeline analysis
    try {
      const stageData = Object.entries(stages)
        .map(([stage, count]) => `${stage}: ${count}`)
        .join(', ');
      const context = `Pipeline stages: ${stageData}. Total deals: ${this.deals.length}, Total value: ${formatCurrency(totalValue)}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze this sales pipeline and provide 1-2 brief recommendations for improving conversion or identifying bottlenecks. Keep it under 100 words. Use Slack emoji codes like :chart_with_upwards_trend: for growth, :warning: for warnings, :dart: for focus areas, :arrows_counterclockwise: for process improvements.`,
          },
          { role: 'user', content: context },
        ],
        temperature: 0.3,
        max_tokens: 80,
      });

      const aiAnalysis = response.choices?.[0]?.message?.content || '';

      return `*Pipeline Analysis*

*Stage Distribution:*
${stageBreakdown}

*Key Metrics:*
• Total Pipeline: ${formatCurrency(totalValue, this.deals?.[0]?.value_currency || 'USD')}
• Active Deals: ${this.deals.length} opportunities
• Stage Diversity: ${Object.keys(stages).length} different stages

*AI Analysis:* ${aiAnalysis}`;
    } catch (error) {
      console.error('AI pipeline analysis error:', error);
      return `*Pipeline Analysis*

*Stage Distribution:*
${stageBreakdown}

*Key Metrics:*
• Total Pipeline: ${formatCurrency(totalValue, this.deals?.[0]?.value_currency || 'USD')}
• Active Deals: ${this.deals.length} opportunities
• Stage Diversity: ${Object.keys(stages).length} different stages`;
    }
  }

  async topDeals(): Promise<string> {
    if (this.deals.length === 0) {
      return `*Top Opportunities*

No deals available for ranking.

Add high-value opportunities to see your top prospects here.`;
    }

    const topCount = Math.min(5, this.deals.length);
    const topDeals = this.deals.slice(0, topCount);

    const dealList = topDeals
      .map((deal, index) => {
        const probability = deal.probability ? ` • ${deal.probability}%` : '';
        const company = deal.company_name.padEnd(18);
        const value = formatCurrency(
          deal.value_amount,
          deal.value_currency,
        ).padStart(10);
        const stage = formatStage(deal.stage).padEnd(15);
        return `${index + 1}  ${company}${value}  ${stage}${probability}`;
      })
      .join('\n');

    const topValue = topDeals.reduce((sum, deal) => sum + deal.value_amount, 0);
    const totalValue = this.deals.reduce(
      (sum, deal) => sum + deal.value_amount,
      0,
    );
    const topPercentage = ((topValue / totalValue) * 100).toFixed(0);

    // Add AI prioritization insights
    try {
      const dealContext = topDeals
        .map(
          (d) =>
            `${d.company_name}: ${d.stage}, ${formatCurrency(d.value_amount)}, ${d.probability || 'no'}% probability`,
        )
        .join('; ');

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze these top deals and suggest which one to prioritize and why. Be specific and actionable in 1-2 sentences. Use Slack emoji codes like :first_place_medal: for top priority, :moneybag: for high value, :zap: for urgency, :dart: for focus.`,
          },
          { role: 'user', content: dealContext },
        ],
        temperature: 0.3,
        max_tokens: 60,
      });

      const aiPriority = response.choices?.[0]?.message?.content || '';

      return `*Top ${topCount} Opportunities*

\`\`\`
#  Company Name       Deal Value  Stage           Probability
${dealList}
\`\`\`

These represent ${topPercentage}% of your total pipeline value.

*AI Priority:* ${aiPriority}

_Get action items:_ \`deals\` | \`pipeline\` | \`next steps for [company]\``;
    } catch (error) {
      console.error('AI priority insight error:', error);
      return `*Top ${topCount} Opportunities*

\`\`\`
#  Company Name       Deal Value  Stage           Probability
${dealList}
\`\`\`

These represent ${topPercentage}% of your total pipeline value.

_Get action items:_ \`deals\` | \`pipeline\` | \`next steps for [company]\``;
    }
  }

  // Helper method to find the best matching deal by company name
  private findBestDealMatch(searchTerm: string): Deal | null {
    const search = searchTerm.toLowerCase().trim();

    // First try exact match
    let exactMatch = this.deals.find(
      (deal) => deal.company_name.toLowerCase() === search,
    );
    if (exactMatch) return exactMatch;

    // Then try exact word match
    let wordMatch = this.deals.find(
      (deal) =>
        deal.company_name.toLowerCase().includes(search) ||
        search.includes(deal.company_name.toLowerCase()),
    );
    if (wordMatch) return wordMatch;

    // Finally try partial match (for abbreviations like "UC")
    let partialMatch = this.deals.find((deal) => {
      const companyWords = deal.company_name.toLowerCase().split(/\s+/);
      return companyWords.some(
        (word) =>
          word.startsWith(search) ||
          search.startsWith(word) ||
          word.includes(search),
      );
    });

    return partialMatch || null;
  }

  // New method to show complete company details
  async companyDetails(searchTerm: string): Promise<string> {
    const deal = this.findBestDealMatch(searchTerm);

    if (!deal) {
      const availableCompanies = this.deals
        .slice(0, 5)
        .map((d) => `• ${d.company_name}`)
        .join('\n');

      return `*Company Not Found*

Could not find "${searchTerm}" in your pipeline.

*Available companies:*
${availableCompanies}
${this.deals.length > 5 ? `_...and ${this.deals.length - 5} more_` : ''}

_Try: \`deals\` | \`pipeline\` | \`top\` | \`full details for [exact company name]\`_`;
    }

    // Build comprehensive company details
    const sections = [];

    // Basic Information
    sections.push(`*${deal.company_name}* - Complete Details

*Basic Information:*
• Value: ${formatCurrency(deal.value_amount, deal.value_currency)}
• Stage: ${formatStage(deal.stage)}
• Deal ID: ${deal.id}`);

    // Probability and momentum if available
    if (deal.probability !== null || deal.momentum !== null) {
      const probabilityInfo = [];
      if (deal.probability !== null)
        probabilityInfo.push(`Close Probability: ${deal.probability}%`);
      if (deal.momentum !== null)
        probabilityInfo.push(`Momentum: ${deal.momentum}/10`);

      sections.push(`*Deal Metrics:*
• ${probabilityInfo.join('\n• ')}`);
    }

    // Company Information
    if (deal.industry || deal.company_size || deal.website) {
      const companyInfo = [];
      if (deal.industry) companyInfo.push(`Industry: ${deal.industry}`);
      if (deal.company_size)
        companyInfo.push(`Company Size: ${deal.company_size}`);
      if (deal.website) companyInfo.push(`Website: ${deal.website}`);

      sections.push(`*Company Information:*
• ${companyInfo.join('\n• ')}`);
    }

    // Pain Points
    if (deal.pain_points && deal.pain_points.length > 0) {
      sections.push(`*Pain Points:*
• ${deal.pain_points.join('\n• ')}`);
    }

    // Green Flags
    if (deal.green_flags && deal.green_flags.length > 0) {
      sections.push(`*Green Flags:*
• ${deal.green_flags.join('\n• ')}`);
    }

    // Last Meeting Summary
    if (deal.last_meeting_summary) {
      sections.push(`*Last Meeting Summary:*
${deal.last_meeting_summary}`);
    }

    // Meeting Highlights
    if (deal.meeting_highlights) {
      try {
        const highlights =
          typeof deal.meeting_highlights === 'string'
            ? JSON.parse(deal.meeting_highlights)
            : deal.meeting_highlights;

        if (Array.isArray(highlights) && highlights.length > 0) {
          sections.push(`*Meeting Highlights:*
• ${highlights.join('\n• ')}`);
        } else if (typeof highlights === 'object') {
          const highlightEntries = Object.entries(highlights)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n• ');
          if (highlightEntries) {
            sections.push(`*Meeting Highlights:*
• ${highlightEntries}`);
          }
        }
      } catch (error) {
        // If parsing fails, show as string
        sections.push(`*Meeting Highlights:*
${deal.meeting_highlights}`);
      }
    }

    // Next Steps
    if (deal.next_steps && deal.next_steps.length > 0) {
      sections.push(`*Current Next Steps:*
${deal.next_steps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}`);
    } else {
      sections.push(`*Next Steps:*
No next steps currently defined.`);
    }

    // Add AI analysis of the deal
    try {
      const contextParts = [
        `Company: ${deal.company_name}`,
        `Stage: ${formatStage(deal.stage)}`,
        `Value: ${formatCurrency(deal.value_amount, deal.value_currency)}`,
      ];

      if (deal.probability)
        contextParts.push(`Probability: ${deal.probability}%`);
      if (deal.pain_points?.length)
        contextParts.push(`Pain Points: ${deal.pain_points.join(', ')}`);
      if (deal.green_flags?.length)
        contextParts.push(`Green Flags: ${deal.green_flags.join(', ')}`);
      if (deal.industry) contextParts.push(`Industry: ${deal.industry}`);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze this deal and provide 2-3 key insights including risks, opportunities, and specific recommendations. Be concise but actionable. Focus on what the sales person should do next to advance this deal.`,
          },
          { role: 'user', content: contextParts.join('\n') },
        ],
        temperature: 0.3,
        max_tokens: 120,
      });

      const aiAnalysis = response.choices[0]!.message.content || '';

      if (aiAnalysis) {
        sections.push(`*AI Analysis:*
${aiAnalysis}`);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }

    sections.push(
      `_Commands: \`deals\` | \`pipeline\` | \`top\` | \`next steps for ${deal.company_name}\`_`,
    );

    return sections.join('\n\n');
  }

  // Enhanced next steps method with AI integration
  async nextSteps(searchTerm?: string): Promise<string> {
    if (this.deals.length === 0) {
      return `*Next Steps & Action Items*

No active deals to show action items for.

Add deals to your pipeline to track next steps and action items.`;
    }

    // If searchTerm provided, find specific deal
    if (searchTerm) {
      const deal = this.findBestDealMatch(searchTerm);

      if (!deal) {
        const availableCompanies = this.deals
          .slice(0, 5)
          .map((d) => `• ${d.company_name}`)
          .join('\n');

        return `*Company Not Found*

Could not find "${searchTerm}" in your pipeline.

*Available companies:*
${availableCompanies}
${this.deals.length > 5 ? `_...and ${this.deals.length - 5} more_` : ''}

_Try: \`deals\` | \`pipeline\` | \`top\` | \`next steps for [exact company name]\`_`;
      }

      // Generate AI-enhanced next steps for specific company
      return await this.generateEnhancedNextSteps(deal);
    }

    // Original logic for all deals (when no searchTerm)
    const dealsWithSteps = this.deals.filter(
      (deal) =>
        deal.next_steps &&
        Array.isArray(deal.next_steps) &&
        deal.next_steps.length > 0,
    );

    if (dealsWithSteps.length === 0) {
      return `*Next Steps & Action Items*

No action items defined for current deals.

Consider adding next steps to your ${this.deals.length} active deal${this.deals.length > 1 ? 's' : ''} to track progress.`;
    }

    // Group action items by deal
    const actionsByDeal = dealsWithSteps.map((deal) => {
      const steps = deal
        .next_steps!.slice(0, 3)
        .map((step: string, index: number) => `   ${index + 1}. ${step}`)
        .join('\n');

      const additionalCount =
        deal.next_steps!.length > 3
          ? `\n   _...and ${deal.next_steps!.length - 3} more action${deal.next_steps!.length - 3 > 1 ? 's' : ''}_`
          : '';

      return `*${deal.company_name}* (${formatCurrency(deal.value_amount, deal.value_currency)})\n${steps}${additionalCount}`;
    });

    const totalActions = dealsWithSteps.reduce(
      (sum: number, deal: Deal) => sum + (deal.next_steps?.length || 0),
      0,
    );
    const summary = `*Summary:* ${totalActions} total action items across ${dealsWithSteps.length} deal${dealsWithSteps.length > 1 ? 's' : ''}`;

    return `*Next Steps & Action Items*

${actionsByDeal.slice(0, 5).join('\n\n')}

${dealsWithSteps.length > 5 ? `_...and ${dealsWithSteps.length - 5} more deals with action items_\n\n` : ''}${summary}`;
  }

  // New method for AI-enhanced next steps generation
  private async generateEnhancedNextSteps(deal: Deal): Promise<string> {
    try {
      // Check if next steps are missing, generic, or too short
      const hasGenericSteps = deal.next_steps?.some(
        (step: string) =>
          step.toLowerCase().includes('schedule a meeting') ||
          step.toLowerCase().includes('schedule meeting') ||
          step.toLowerCase().includes('follow up'),
      );

      const hasShortSteps = deal.next_steps?.some(
        (step: string) => step.length < 25, // Less than 25 characters is considered too short
      );

      const hasVagueSteps = deal.next_steps?.some(
        (step: string) =>
          step.toLowerCase().includes('call') ||
          step.toLowerCase().includes('email') ||
          step.toLowerCase().includes('contact') ||
          step.toLowerCase().includes('reach out'),
      );

      let sections = [];

      // Always show deal header
      sections.push(
        `*${deal.company_name}* (${formatCurrency(deal.value_amount, deal.value_currency)})`,
      );

      // Show existing next steps from database if available
      if (deal.next_steps && deal.next_steps.length > 0) {
        const existingSteps = deal.next_steps
          .slice(0, 3)
          .map((step: string, index: number) => `${index + 1}. ${step}`)
          .join('\n');

        sections.push(`*Current Next Steps:*
${existingSteps}`);
      }

      // Show green flags if available
      if (deal.green_flags && deal.green_flags.length > 0) {
        sections.push(`*Green Flags:*
• ${deal.green_flags.join('\n• ')}`);
      }

      // Add AI insights if steps need enhancement
      if (
        !deal.next_steps?.length ||
        hasGenericSteps ||
        hasShortSteps ||
        hasVagueSteps
      ) {
        const contextParts = [
          `Company: ${deal.company_name}`,
          `Industry: ${deal.industry || 'Unknown'}`,
          `Stage: ${formatStage(deal.stage)}`,
          `Value: ${formatCurrency(deal.value_amount, deal.value_currency)}`,
        ];

        if (deal.pain_points?.length)
          contextParts.push(`Pain Points: ${deal.pain_points.join(', ')}`);
        if (deal.green_flags?.length)
          contextParts.push(`Green Flags: ${deal.green_flags.join(', ')}`);
        if (deal.last_meeting_summary)
          contextParts.push(
            `Last Meeting: ${deal.last_meeting_summary.substring(0, 150)}`,
          );
        if (deal.company_size)
          contextParts.push(`Company Size: ${deal.company_size}`);

        // Create stage-specific system prompt
        const stagePrompts = {
          interested: `Generate 3 specific next steps for a deal in INTERESTED stage. Focus on:
- Discovery calls to understand business challenges
- Pain point identification and qualification
- Building initial rapport and trust
- Understanding decision-making process
Each step should be concrete and move toward scheduling a proper demo.`,

          contacted: `Generate 3 specific next steps for a deal in CONTACTED stage. Focus on:
- Setting up formal discovery meetings
- Researching the company's specific needs
- Building relationships with key stakeholders
- Understanding their current solutions and gaps
Each step should move toward identifying if this is a qualified opportunity.`,

          demo: `Generate 3 specific next steps for a deal in DEMO stage. Focus on:
- Technical validation and proof of concept
- Addressing specific technical concerns or objections
- Showcasing ROI and business benefits
- Getting feedback from technical decision makers
Each step should move toward proposal readiness.`,

          proposal: `Generate 3 specific next steps for a deal in PROPOSAL stage. Focus on:
- Pricing negotiations and contract discussions
- Addressing proposal feedback and concerns
- Timeline and implementation planning
- Getting internal approvals and stakeholder buy-in
Each step should move toward finalizing the deal terms.`,

          negotiation: `Generate 3 specific next steps for a deal in NEGOTIATION stage. Focus on:
- Final pricing and contract term negotiations
- Getting C-level or decision maker sign-off
- Addressing last-minute objections or concerns
- Setting up implementation and onboarding plans
Each step should be closing-focused and urgency-driven.`,

          won: `Generate 3 specific next steps for a deal in WON stage. Focus on:
- Onboarding and implementation planning
- Setting up success metrics and milestones
- Identifying expansion and upsell opportunities
- Building long-term relationship for renewals
Each step should ensure successful delivery and future growth.`,

          lost: `Generate 3 specific next steps for a deal in LOST stage. Focus on:
- Conducting post-mortem feedback sessions
- Understanding why the deal was lost
- Maintaining relationship for future opportunities
- Learning lessons to improve future sales
Each step should preserve the relationship and gather insights.`,
        };

        const systemPrompt =
          stagePrompts[deal.stage.toLowerCase() as keyof typeof stagePrompts] ||
          `Generate 3 specific next steps for this sales deal based on the current stage and context.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}

Format as:
1. [specific detailed action]
2. [specific detailed action] 
3. [specific detailed action]

Make each action specific to the stage, company, and context provided. Avoid generic advice.`,
            },
            {
              role: 'user',
              content: contextParts.join('\n'),
            },
          ],
          temperature: 0.2, // Lower temperature for more consistent, focused responses
          max_tokens: 150,
        });

        const aiSteps = response.choices?.[0]?.message?.content || '';

        sections.push(`*AI Strategic Next Steps:*
${aiSteps}`);
      }

      sections.push(
        `_Try: \`deals\` | \`pipeline\` | \`top\` | \`full details for ${deal.company_name}\`_`,
      );

      return sections.join('\n\n');
    } catch (error) {
      console.error('Error generating enhanced next steps:', error);

      let sections = [
        `*${deal.company_name}* (${formatCurrency(deal.value_amount, deal.value_currency)})`,
      ];

      if (deal.next_steps && deal.next_steps.length > 0) {
        const steps = deal.next_steps
          .slice(0, 3)
          .map((step: string, index: number) => `${index + 1}. ${step}`)
          .join('\n');
        sections.push(`*Current Next Steps:*\n${steps}`);
      } else {
        sections.push(`*Next Steps:*\nNo next steps currently defined.`);
      }

      if (deal.green_flags && deal.green_flags.length > 0) {
        sections.push(`*Green Flags:*\n• ${deal.green_flags.join('\n• ')}`);
      }

      sections.push(
        `_Try: \`deals\` | \`pipeline\` | \`top\` | \`full details for ${deal.company_name}\`_`,
      );

      return sections.join('\n\n');
    }
  }

  general(originalMessage: string): string {
    return `I understand you're asking about: "${originalMessage}"

I'm your AI-powered sales assistant and can help with pipeline insights, deal analysis, and strategic recommendations.

_Try: \`deals\` | \`pipeline\` | \`top\` | \`next steps for [company]\` | \`help\`_`;
  }

  async conversational(message: string): Promise<string> {
    try {
      const dealContext =
        this.deals.length > 0
          ? `Current pipeline: ${this.deals.length} deals, total value ${formatCurrency(
              this.deals.reduce((sum, deal) => sum + deal.value_amount, 0),
              this.deals[0]?.value_currency || 'USD',
            )}. Top deals: ${this.deals
              .slice(0, 3)
              .map((d) => `${d.company_name} (${formatStage(d.stage)})`)
              .join(', ')}`
          : 'No active deals in pipeline';

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI-powered sales assistant for ${this.accountName}. 
            
Context: ${dealContext}

Respond professionally and helpfully to sales-related questions. Keep responses concise (under 250 words). Use markdown formatting with single asterisks. Provide actionable insights and suggestions.

If asked about specific data, mention they can use commands like 'deals', 'pipeline', 'top', or 'next steps for [company]' for detailed information.

You can analyze trends, suggest priorities, identify risks, and provide strategic sales advice based on the pipeline context.

Do not make up specific numbers or deal details - only use general context provided.`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.4,
        max_tokens: 250,
      });

      return response.choices?.[0]?.message?.content || this.general(message);
    } catch (error) {
      console.error('AI response error:', error);
      return this.general(message);
    }
  }
}

// In-memory cache to prevent duplicate processing
const processedEvents = new Set<string>();

// Main handler with enhanced async support
async function handleSlackCommand(
  eventText: string,
  deals: Deal[],
  accountName: string,
): Promise<string> {
  const message = eventText.trim();

  if (!message) {
    return `*Vellora AI Sales Assistant*

Hi! I'm your AI-powered sales assistant for *${accountName}*.

Try: \`deals\`, \`pipeline\`, \`top\`, or ask me anything about your sales pipeline.`;
  }

  const responseGen = new ResponseGenerator(accountName, deals);
  const { intent, confidence, companySearch } = detectIntent(message);

  // High confidence keyword matches
  if (confidence > 0.7) {
    switch (intent) {
      case 'greeting':
        return await responseGen.greeting();
      case 'help':
        return responseGen.help();
      case 'deals':
        return await responseGen.dealsPortfolio();
      case 'pipeline':
        return await responseGen.pipeline();
      case 'top':
        return await responseGen.topDeals();
      case 'next_steps':
        return await responseGen.nextSteps(companySearch);
      case 'company_details':
        return await responseGen.companyDetails(companySearch!);
      default:
        return responseGen.general(message);
    }
  }

  // Lower confidence - use AI for conversational response
  return await responseGen.conversational(message);
}

// Slack API functions
async function sendSlackMessage(
  token: string,
  channel: string,
  text: string,
): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, text }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('Slack API error:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const slackSignature = req.headers.get('x-slack-signature') || '';
  const timestamp = req.headers.get('x-slack-request-timestamp') || '';

  // Verify Slack signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
      .update(sigBasestring)
      .digest('hex');

  if (
    !crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf-8'),
      Buffer.from(slackSignature, 'utf-8'),
    )
  ) {
    console.warn('Invalid Slack signature');
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const payload = JSON.parse(body);

  // Handle URL verification
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle app mentions and direct messages (avoid duplicates)
  const isAppMention = payload.event?.type === 'app_mention';
  const isDirectMessage =
    payload.event?.type === 'message' &&
    payload.event?.channel_type === 'im' &&
    !payload.event?.bot_id;

  if (isAppMention || isDirectMessage) {
    // Create unique event identifier
    const eventId = payload.event?.client_msg_id || payload.event?.ts;
    const uniqueEventKey = `${payload.team_id}-${payload.event?.channel}-${eventId}`;

    if (!eventId) {
      console.warn('No event ID found, skipping');
      return NextResponse.json({ ok: true });
    }

    // Check if we've already processed this event
    if (processedEvents.has(uniqueEventKey)) {
      console.log('Event already processed, skipping duplicate');
      return NextResponse.json({ ok: true });
    }

    // Mark event as processed
    processedEvents.add(uniqueEventKey);

    // Clean up old events (keep only last 1000 to prevent memory issues)
    if (processedEvents.size > 1000) {
      const eventsArray = Array.from(processedEvents);
      processedEvents.clear();
      eventsArray.slice(-500).forEach((event) => processedEvents.add(event));
    }

    const team_id = payload.team_id;
    const tokenData = await getBotTokenForTeam(team_id);

    if (!tokenData) {
      console.error(`No token found for workspace: ${team_id}`);
      return NextResponse.json(
        { ok: false, error: 'Bot token not found' },
        { status: 500 },
      );
    }

    const [deals, accountName] = await Promise.all([
      getDealsForAccount(tokenData.account_id),
      getAccountName(tokenData.account_id),
    ]);

    // Clean text for app mentions
    let messageText = payload.event.text;
    if (isAppMention) {
      const botId = payload.authorizations?.[0]?.user_id;
      if (botId) {
        messageText = messageText.replace(`<@${botId}>`, '').trim();
      }
    }

    const response = await handleSlackCommand(messageText, deals, accountName);
    const success = await sendSlackMessage(
      tokenData.access_token,
      payload.event.channel,
      response,
    );

    if (!success) {
      return NextResponse.json(
        { ok: false, error: 'Failed to send message' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
