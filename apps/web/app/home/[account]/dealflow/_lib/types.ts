// types/deal.ts - Based on your database schema

export type DealStage = 
  | 'interested'
  | 'contacted'
  | 'demo'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type MomentumTrend = 'accelerating' | 'steady' | 'decelerating' | 'stalled';

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  isDecisionMaker?: boolean;
  lastContacted?: string;
  avatarUrl?: string;
}

export interface MomentumMarker {
  deal_id: string;
  marker_type: 'stakeholder_intro' | 'buying_question' | 'prospect_next_step';
  description: string;
  impact: 'high' | 'medium' | 'low';
  id: string;
  created_at: string;
}

export interface DealContact {
  deal_id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  contact_role_type?: 'primary' | 'secondary' | 'decision_maker' | 'influencer';
  last_contacted?: string;
  notes?: string;
  id: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealActivity {
  deal_id: string;
  activity_type: string;
  title: string;
  description?: string;
  due_date?: string;
  created_by?: string;
  id: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Deal {
  // Core identification
  id: string;
  account_id: string;
  deal_id?: string; // External deal ID

  // Company information
  company_name: string;
  industry: string;
  company_size?: string;
  website?: string;

  // Deal details
  deal_title?: string;
  value_amount: number;
  value_currency: string;
  stage: DealStage;
  probability?: number;
  close_date?: string;
  source?: string;

  // Contact information
  primary_contact: string;
  primary_email: string;

  // Momentum and analysis
  momentum: number;
  momentum_trend: MomentumTrend;
  last_momentum_change?: string;

  // AI Analysis and insights
  pain_points?: string[];
  next_steps?: string[];
  blockers?: string[];
  opportunities?: string[];
  green_flags?: string[];
  red_flags?: string[];
  organizational_context?: string[];
  competitor_mentions?: string[];
  sentiment_engagement?: string[];

  // Meeting information
  last_meeting_date?: string;
  last_meeting_type?: string;
  last_meeting_summary?: string;
  last_meeting_notes?: string;
  meeting_highlights?: Record<string, any>[];
  meeting_action_items?: Record<string, any>[];
  total_meetings?: number;

  // Email information  
  email_summary?: string;
  email_summary_updated_at?: string;

  // Relationship and context
  relationship_insights?: string;
  company_description?: string;
  next_action?: string;
  tags?: string[];

  // AI Analysis
  last_analysis_date?: string;
  ai_analysis_raw?: string;
  ai_insights?: Record<string, any>;

  // Timestamps and metadata
  created_at: string;
  updated_at: string;
  last_updated?: string;
  created_by?: string;
  updated_by?: string;
  assigned_to?: string; // User ID of assigned team member

  // Related data (populated via joins)
  deal_contacts?: DealContact[];
  deal_activities?: DealActivity[];
  momentum_markers?: MomentumMarker[];
}

// Frontend-friendly interface for components
export interface DealDisplay {
  id: string;
  companyName: string; // maps to company_name
  industry: string;
  value: string; // formatted value_amount + value_currency
  contact: string; // maps to primary_contact
  email: string; // maps to primary_email
  stage: Deal['stage'];
  createdAt: string; // maps to created_at
  closeDate?: string; // maps to close_date
  probability?: number;
  painPoints?: string[]; // maps to pain_points
  nextSteps?: string[]; // maps to next_steps
  companySize?: string; // maps to company_size
  website?: string;
  dealTitle?: string; // maps to deal_title
  nextAction?: string; // maps to next_action
  relationshipInsights?: string; // maps to relationship_insights
  last_meeting_summary?: string;
  momentum: number;
  momentumTrend: Deal['momentum_trend'];
  momentumMarkers: MomentumMarker[];
  lastMomentumChange?: string; // maps to last_momentum_change
  blockers?: string[];
  opportunities?: string[];
  assignedTo?: string; // maps to assigned_to
}

// Utility function to convert database Deal to display format
export function dealToDisplay(deal: Deal): DealDisplay {
  return {
    id: deal.id,
    companyName: deal.company_name,
    industry: deal.industry,
    value: `${deal.value_currency} ${deal.value_amount.toLocaleString()}`,
    contact: deal.primary_contact,
    email: deal.primary_email,
    stage: deal.stage,
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
    last_meeting_summary: deal.last_meeting_summary,
    momentum: deal.momentum,
    momentumTrend: deal.momentum_trend,
    momentumMarkers: deal.momentum_markers || [],
    lastMomentumChange: deal.last_momentum_change,
    blockers: deal.blockers,
    opportunities: deal.opportunities,
    assignedTo: deal.assigned_to,
  };
}

// Utility function to convert display format back to database format
export function displayToDeal(
  display: DealDisplay,
  accountId: string,
): Partial<Deal> {
  // Parse value string back to amount and currency
  const valueMatch = display.value.match(/^([A-Z]{3})\s+([\d,]+)$/);
  const currency = valueMatch?.[1] || 'USD';
  const amount = valueMatch?.[2]
    ? parseFloat(valueMatch[2].replace(/,/g, ''))
    : 0;

  return {
    account_id: accountId,
    company_name: display.companyName,
    industry: display.industry,
    value_amount: amount,
    value_currency: currency,
    primary_contact: display.contact,
    primary_email: display.email,
    stage: display.stage,
    close_date: display.closeDate,
    probability: display.probability,
    pain_points: display.painPoints,
    next_steps: display.nextSteps,
    company_size: display.companySize,
    website: display.website,
    deal_title: display.dealTitle,
    next_action: display.nextAction,
    relationship_insights: display.relationshipInsights,
    last_meeting_summary: display.last_meeting_summary,
    momentum: display.momentum,
    momentum_trend: display.momentumTrend,
    last_momentum_change: display.lastMomentumChange,
    blockers: display.blockers,
    opportunities: display.opportunities,
    assigned_to: display.assignedTo,
  };
}
