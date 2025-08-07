// // /api/slack/event/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import crypto from 'crypto';
// import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
// // import { getSupabaseServerClient } from '@kit/supabase/server-client';
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
// function handleSlackCommand(eventText: string, deals: any[]): string {
//   const lowerText = eventText.toLowerCase().trim();
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
//     return `🤖 *Vellora AI*\n_Intelligent Sales Assistant_\n\n*Core Analytics Commands:*\n\`deals\` - Portfolio overview with diversification metrics\n\`pipeline\` - Stage intelligence & velocity analysis\n\`top\` - Strategic opportunity ranking system\n\n*System Commands:*\n\`help\` - Display this comprehensive guide\n
//     `;
//   }
//   return `🤖 *Vellora AI*\n\n_Welcome to your intelligent sales assistant_\n\n*Quick Start Commands:*\n• \`deals\` - Portfolio analytics\n• \`pipeline\` - Stage intelligence\n• \`top\` - Opportunity ranking\n• \`help\` - Full documentation\n
//   `;
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
//     // Extract text (excluding bot mention)
//     const fullText = payload.event.text;
//     const botId = payload.authorizations?.[0]?.user_id || '';
//     const cleanedText = fullText.replace(`<@${botId}>`, '').trim();
//     console.log('🤖 Processing mention:', cleanedText);
//     // Handle command
//     const commandReply = handleSlackCommand(cleanedText, deals);
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
//     // Handle command
//     const commandReply = handleSlackCommand(payload.event.text, deals);
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

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const supabase = getSupabaseServerAdminClient();

async function getBotTokenForTeam(team_id: string) {
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

async function getDealsForAccount(account_id: string) {
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

async function getAccountName(account_id: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('name')
    .eq('id', account_id)
    .single();

  if (error || !data) {
    console.error('Failed to get account name:', error);
    return 'your company';
  }
  return data.name;
}

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

function createDealsTable(deals: any[]): string {
  if (deals.length === 0) return '';

  const maxDeals = 8; // Limit for better readability
  const displayDeals = deals.slice(0, maxDeals);

  // Calculate column widths based on content
  const companyWidth = Math.max(
    7,
    Math.max(...displayDeals.map((d) => d.company_name.length)),
  );
  const valueWidth = Math.max(
    8,
    Math.max(
      ...displayDeals.map(
        (d) => formatCurrency(d.value_amount, d.value_currency).length,
      ),
    ),
  );
  const stageWidth = Math.max(
    9,
    Math.max(...displayDeals.map((d) => formatStage(d.stage).length)),
  );

  // Create table header
  const header = `| ${'Company'.padEnd(companyWidth)} | ${'Value'.padEnd(valueWidth)} | ${'Stage'.padEnd(stageWidth)} |`;
  const separator = `|${'-'.repeat(companyWidth + 2)}|${'-'.repeat(valueWidth + 2)}|${'-'.repeat(stageWidth + 2)}|`;

  // Create table rows
  const rows = displayDeals.map((deal) => {
    const company = deal.company_name.padEnd(companyWidth);
    const value = formatCurrency(deal.value_amount, deal.value_currency).padEnd(
      valueWidth,
    );
    const stage = formatStage(deal.stage).padEnd(stageWidth);
    return `| ${company} | ${value} | ${stage} |`;
  });

  return `\`\`\`\n${header}\n${separator}\n${rows.join('\n')}\n\`\`\``;
}

function handleSlackCommand(
  eventText: string,
  deals: any[],
  accountName?: string,
): string {
  const lowerText = eventText.toLowerCase().trim();

  // Detect greetings
  if (
    [
      'hi',
      'hello',
      'hey',
      'greetings',
      'good morning',
      'good afternoon',
      'good evening',
    ].some((greet) => lowerText.startsWith(greet))
  ) {
    return `🤖 I’m your dedicated sales assistant for *${accountName || 'your sales workspace'}*.\n\nHow can I support your sales success today?\n\n_Type \`help\` to explore available commands and insights._`;
  }

  // If empty text (just a mention), show help
  if (!lowerText || lowerText === '') {
    return `🤖 *Vellora AI*\n\n_Your intelligent sales assistant_\n\n*Core Analytics:*\n• \`deals\` - Complete portfolio analysis\n• \`pipeline\` - Stage distribution & forecasting\n• \`top\` - High-value opportunity ranking\n\n*Quick Actions:*\n• \`help\` - Command reference & documentation\n\n_Real-time data synchronization • Enterprise-grade security_`;
  }

  // Handle pipeline/summary commands
  if (lowerText.includes('pipeline') || lowerText.includes('summary')) {
    if (deals.length === 0) {
      return '📊 *Pipeline Intelligence Dashboard*\n\n_No active pipeline data_\n\nYour sales pipeline is currently empty. Import existing opportunities or create new deals to begin advanced pipeline analytics and stage progression tracking.';
    }

    const stages = deals.reduce((acc: any, deal: any) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {});

    const totalValue = deals.reduce(
      (sum: number, deal: any) => sum + Number(deal.value_amount),
      0,
    );

    const stageSummary = Object.entries(stages)
      .map(([stage, count]) => {
        const percentage = (((count as number) / deals.length) * 100).toFixed(
          1,
        );
        const stageDisplay = formatStage(stage);
        return `• *${stageDisplay}*: ${count} deals (${percentage}%)`;
      })
      .join('\n');

    const formattedValue = formatCurrency(totalValue, deals[0]?.value_currency);

    return `📊 *Pipeline Intelligence Dashboard*\n\n*Portfolio Overview:*\n${stageSummary}\n\n*Pipeline Metrics:*\n• *Total Value*: ${formattedValue}\n• *Active Opportunities*: ${deals.length}`;
  }

  // Handle deals commands
  if (lowerText.includes('deals') || lowerText === 'deals') {
    if (
      lowerText.includes('all deals') ||
      lowerText.includes('show me deals') ||
      lowerText === 'deals'
    ) {
      if (deals.length === 0) {
        return '💼 *Deal Portfolio Management*\n\n_Portfolio currently empty_\n\nEstablish your sales pipeline by importing existing opportunities from your CRM or creating new deals. Portfolio analytics and insights will be available once deals are added to the system.';
      }

      const summary = deals
        .slice(0, 8) // Show up to 8 deals
        .map((d: any, index: number) => {
          const formattedValue = formatCurrency(
            d.value_amount,
            d.value_currency,
          );
          const stageDisplay = formatStage(d.stage);
          const momentum = d.momentum ? ` • Momentum: ${d.momentum}/100` : '';
          return `*${index + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}
          `;
        })
        .join('\n\n');

      const totalValue = deals.reduce(
        (sum: number, deal: any) => sum + Number(deal.value_amount),
        0,
      );
      const avgDealSize = totalValue / deals.length;

      const formattedTotal = formatCurrency(
        totalValue,
        deals[0]?.value_currency,
      );
      const formattedAvg = formatCurrency(
        avgDealSize,
        deals[0]?.value_currency,
      );

      return `💼 *Enterprise Deal Portfolio*\n\n${summary}${deals.length > 8 ? `\n\n_...plus ${deals.length - 8} additional opportunities_` : ''}\n\n*Portfolio Analytics:*\n• *Total Value*: ${formattedTotal}\n• *Average Deal Size*: ${formattedAvg}\n• *Active Opportunities*: ${deals.length}\n• *Portfolio Diversification*: ${Object.keys(deals.reduce((acc: any, d) => ({ ...acc, [d.stage]: true }), {})).length} stages\n\n_Use \`pipeline\` for stage analysis • \`top\` for highest values_`;
    }

    if (lowerText.includes('top') || lowerText.includes('highest')) {
      if (deals.length === 0) {
        return '🏆 *High-Value Opportunity Analysis*\n\n_No opportunities available for ranking_\n\nHigh-value opportunity tracking requires active deals. Create premium prospects to unlock advanced opportunity management and prioritization features.';
      }

      const topDeals = deals
        .slice(0, 5)
        .map((d: any, i) => {
          const formattedValue = formatCurrency(
            d.value_amount,
            d.value_currency,
          );
          const stageDisplay = formatStage(d.stage);
          const probability = d.probability
            ? ` • ${d.probability}% probability`
            : '';
          return `*${i + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}_${probability}`;
        })
        .join('\n\n');

      const topDealsValue = deals
        .slice(0, 5)
        .reduce((sum: number, deal: any) => sum + Number(deal.value_amount), 0);
      const topPercent = (
        (topDealsValue /
          deals.reduce(
            (sum: number, deal: any) => sum + Number(deal.value_amount),
            0,
          )) *
        100
      ).toFixed(1);

      return `🏆 *Strategic Opportunity Ranking*\n\n${topDeals}\n\n• Top 5 represent ${topPercent}% of total pipeline value\n• Concentrate efforts on these high-impact opportunities\n• Consider executive engagement for enterprise deals\n\n_Rankings based on deal value • Updated in real-time_`;
    }

    return `💡 *Deal Analytics Available:*\n\n*Core Analytics:*\n• \`deals\` - Complete portfolio overview\n• \`top\` - High-value opportunity ranking\n• \`pipeline\` - Stage distribution analysis\n\n_All analytics feature real-time data synchronization_`;
  }

  // Handle top deals command (even without "deals" in the text)
  if (lowerText.includes('top') && !lowerText.includes('deals')) {
    const activeDeals = deals.filter(
      (d: any) => d.stage.toLowerCase() !== 'lost',
    );

    if (activeDeals.length === 0) {
      return '🏆 *High-Value Opportunity Analysis*\n\n_No opportunities available for ranking_\n\nHigh-value opportunity tracking requires active deals. Create premium prospects to unlock advanced opportunity management and prioritization features.';
    }

    const topDeals = activeDeals
      .slice(0, 5)
      .map((d: any, i) => {
        const formattedValue = formatCurrency(d.value_amount, d.value_currency);
        const stageDisplay = formatStage(d.stage);
        const probability = d.probability
          ? ` • ${d.probability}% probability`
          : '';
        return `*${i + 1}. ${d.company_name}*\n   ${formattedValue} • _${stageDisplay}_${probability}`;
      })
      .join('\n\n');

    const topDealsValue = activeDeals
      .slice(0, 5)
      .reduce((sum: number, deal: any) => sum + Number(deal.value_amount), 0);

    const totalValue = activeDeals.reduce(
      (sum: number, deal: any) => sum + Number(deal.value_amount),
      0,
    );

    const topPercent = ((topDealsValue / totalValue) * 100).toFixed(1);

    return `🏆 *Strategic Opportunity Ranking*\n\n${topDeals}\n\n• Top 5 represent ${topPercent}% of total pipeline value\n• Concentrate efforts on these high-impact opportunities\n• Consider executive engagement for enterprise deals\n\n_Rankings based on deal value • Updated in real-time_`;
  }

  // Handle help command
  if (lowerText.includes('help') || lowerText.includes('commands')) {
    return `🤖 *Vellora AI*\n_Intelligent Sales Assistant_\n\n*Core Analytics Commands:*\n\`deals\` - Portfolio overview with diversification metrics\n\`pipeline\` - Stage intelligence & velocity analysis\n\`top\` - Strategic opportunity ranking system\n\n*System Commands:*\n\`help\` - Display this comprehensive guide\n`;
  }

  return `🤖 *Vellora AI*\n\n_Welcome to your intelligent sales assistant_\n\n*Quick Start Commands:*\n• \`deals\` - Portfolio analytics\n• \`pipeline\` - Stage intelligence\n• \`top\` - Opportunity ranking\n• \`help\` - Full documentation\n`;
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
    console.warn('Signature mismatch');
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const payload = JSON.parse(body);

  console.log('🔍 Incoming Slack Event:', JSON.stringify(payload, null, 2));

  // Slack URL verification
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle app_mention
  if (payload.event?.type === 'app_mention') {
    const team_id = payload.team_id;
    const tokenData = await getBotTokenForTeam(team_id);

    if (!tokenData) {
      console.error(`No token for workspace: ${team_id}`);
      return NextResponse.json(
        { ok: false, error: 'Bot token not found' },
        { status: 500 },
      );
    }

    // Get deals for this account
    const deals = await getDealsForAccount(tokenData.account_id);
    // Get the account name
    const accountName = await getAccountName(tokenData.account_id);

    // Extract text (excluding bot mention)
    const fullText = payload.event.text;
    const botId = payload.authorizations?.[0]?.user_id || '';
    const cleanedText = fullText.replace(`<@${botId}>`, '').trim();

    console.log('🤖 Processing mention:', cleanedText);

    // Handle command
    const commandReply = handleSlackCommand(cleanedText, deals, accountName);
    const channel = payload.event.channel;

    try {
      const reply = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          channel,
          text: commandReply,
        }),
      });

      const replyData = await reply.json();
      if (!replyData.ok) {
        console.error('Reply failed:', replyData);
      } else {
        console.log('Replied successfully to Slack');
      }
    } catch (error) {
      console.error('Error sending Slack message:', error);
    }
  }

  // Handle direct messages to the bot
  if (
    payload.event?.type === 'message' &&
    payload.event?.channel_type === 'im' &&
    !payload.event?.bot_id
  ) {
    console.log('📩 Direct message to bot:', payload.event.text);

    const team_id = payload.team_id;
    const tokenData = await getBotTokenForTeam(team_id);

    if (!tokenData) {
      console.error(`No token for workspace: ${team_id}`);
      return NextResponse.json(
        { ok: false, error: 'Bot token not found' },
        { status: 500 },
      );
    }

    // Get deals for this account
    const deals = await getDealsForAccount(tokenData.account_id);
    // Get the account name
    const accountName = await getAccountName(tokenData.account_id);

    // Handle command
    const commandReply = handleSlackCommand(
      payload.event.text,
      deals,
      accountName,
    );
    const channel = payload.event.channel;

    try {
      const reply = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          channel,
          text: commandReply,
        }),
      });

      const replyData = await reply.json();
      if (!replyData.ok) {
        console.error('DM Reply failed:', replyData);
      } else {
        console.log('Replied successfully to DM');
      }
    } catch (error) {
      console.error('Error sending DM reply:', error);
    }
  }

  return NextResponse.json({ ok: true });
}
