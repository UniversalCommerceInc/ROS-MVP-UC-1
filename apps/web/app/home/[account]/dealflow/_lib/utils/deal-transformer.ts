// Client-safe deal transformation utility
// Can be used by both client and server components

import { DB_STAGE_TO_UI } from '../constants';

export interface TransformedDeal {
  id: string;
  companyName: string;
  industry: string;
  valueAmount: number;
  valueCurrency: string;
  value: string; // formatted value
  contact: string;
  email: string;
  stage: 'interested' | 'contacted' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;
  closeDate?: string;
  probability?: number;
  painPoints?: string[];
  nextSteps?: string[];
  companySize?: string;
  website?: string;
  dealTitle?: string;
  nextAction?: string;
  relationshipInsights?: string;
  last_meeting_summary?: string;
  momentum?: number;
  momentumTrend?: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  lastMomentumChange?: string;
  blockers?: string[];
  opportunities?: string[];
  tags?: string[];
  source?: string;
  createdBy?: string;
  updatedBy?: string;
  greenFlags?: string[];
  redFlags?: string[];
  organizationalContext?: string[];
  competitorMentions?: string[];
  sentimentEngagement?: string[];
  lastAnalysisDate?: string;
  aiAnalysisRaw?: string;
}

export function transformDealFromDbClient(deal: any): TransformedDeal {
  const formatValue = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount || 0);
  };

  // Map database stage back to UI stage using our mapping
  const uiStage = DB_STAGE_TO_UI[deal.stage] || 'interested';

  // Get primary contact information
  const primaryContact = Array.isArray(deal.deal_contacts)
    ? deal.deal_contacts.find((contact: any) => contact.is_primary) ||
      deal.deal_contacts[0]
    : deal.deal_contacts;

  const contactName = primaryContact?.name || '';
  const contactEmail = primaryContact?.email || '';

  return {
    id: deal.id,
    companyName: deal.company_name,
    industry: deal.industry || '',
    valueAmount: deal.value_amount || 0,
    valueCurrency: deal.value_currency || 'USD',
    value: formatValue(deal.value_amount, deal.value_currency),
    contact: contactName,
    email: contactEmail,
    stage: uiStage,
    createdAt: deal.created_at,
    updatedAt: deal.updated_at,
    closeDate: deal.close_date,
    probability: deal.probability || 0,
    painPoints: deal.pain_points || [],
    nextSteps: deal.next_steps || [],
    companySize: deal.company_size,
    website: deal.website,
    dealTitle: deal.deal_title,
    nextAction: deal.next_action,
    relationshipInsights: deal.relationship_insights,
    last_meeting_summary: deal.last_meeting_summary,
    momentum: deal.momentum || 0,
    momentumTrend: deal.momentum_trend || 'steady',
    lastMomentumChange: deal.last_momentum_change,
    blockers: deal.blockers || [],
    opportunities: deal.opportunities || [],
    tags: deal.tags || [],
    source: deal.source,
    createdBy: deal.created_by,
    updatedBy: deal.updated_by,
    greenFlags: deal.green_flags || [],
    redFlags: deal.red_flags || [],
    organizationalContext: deal.organizational_context || [],
    competitorMentions: deal.competitor_mentions || [],
    sentimentEngagement: deal.sentiment_engagement || [],
    lastAnalysisDate: deal.last_analysis_date,
    aiAnalysisRaw: deal.ai_analysis_raw,
  };
} 