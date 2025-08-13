import { v4 as uuidv4 } from 'uuid';

/**
 * Extract company name from email domain
 */
function extractCompanyFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  const domain = email.split('@')[1];
  if (!domain) return null;
  
  // Skip common email providers
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
  ];
  
  if (commonDomains.includes(domain.toLowerCase())) return null;
  
  // Convert domain to potential company name
  const companyName = domain.split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return companyName;
}

/**
 * Extract domain from email for website analysis
 */
function extractDomainFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  const domain = email.split('@')[1];
  if (!domain) return null;
  
  // Skip common email providers
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
  ];
  
  if (commonDomains.includes(domain.toLowerCase())) return null;
  
  return `https://${domain}`;
}

/**
 * Get enhanced company name from various sources
 */
function getEnhancedCompanyName(dealData: any): string {
  // Priority order for company name
  const sources = [
    dealData.dealname,           // HubSpot deal name
    dealData.name,               // Salesforce deal name  
    dealData.title,              // Pipedrive deal title
    dealData.company_name,       // Direct company name
    dealData.contact?.company,   // Contact's company
    dealData.properties?.dealname, // HubSpot properties
    dealData.org_id?.name,       // Pipedrive organization
  ];

  // Try each source
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim().length > 0) {
      return source.trim();
    }
  }

  // Try extracting from email
  const email = dealData.contact?.email || dealData.primary_email || dealData.email;
  if (email) {
    const extracted = extractCompanyFromEmail(email);
    if (extracted) {
      return extracted;
    }
  }

  return 'Unknown Company';
}

/**
 * Interface for transformed deals - matches your database schema
 */
export interface TransformedDeal {
  id: string;
  account_id: string;
  company_name: string | null;
  industry: string | null;
  value_amount: number;
  value_currency: string;
  stage: string;
  source: string | null; // Source of the deal (e.g., CRM platform)
  probability: number | null;
  company_size: string | null;
  website: string | null;
  deal_title: string | null;
  deal_id?: string | null;
  next_action: string | null;
  relationship_insights: string | null;
  last_meeting_summary: string | null;
  momentum: number;
  momentum_trend: string;
  last_momentum_change: string | null;
  close_date: string | null;
  pain_points: string[];
  next_steps: string[];
  blockers: string[];
  opportunities: string[];
  tags: string[];
  primary_contact: string; // ✅ Added required field
  primary_email: string; // ✅ Added required field
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  // For UI display only - not stored in database
  stage_name?: string;
}

/**
 * Interface for transformed deal contacts
 */
export interface TransformedDealContact {
  id: string;
  deal_id: string;
  name: string; // ✅ Changed from null to required
  email: string; // ✅ Changed from null to required
  phone: string | null;
  role: string | null;
  contact_role_type: string | null;
  is_primary: boolean;
  is_decision_maker: boolean;
  last_contacted: string | null;
  notes: string | null;
  contact_id: string | null; // ✅ Added required field
  created_at: string;
  updated_at: string;
}

/**
 * Result interface for transformation functions
 */
export interface TransformResult {
  deals: TransformedDeal[];
  dealContacts: TransformedDealContact[];
}

/**
 * Stage mapping for different CRM platforms
 * Updated to match your actual database enum values:
 * interested, contacted, demo, proposal, negotiation, won, lost
 */
export const stageMap = {
  // Pipedrive stages
  pipedrive: {
    1: 'contacted', // Qualified → contacted
    2: 'interested', // Contact Made → interested
    3: 'demo', // Demo Scheduled → demo
    4: 'proposal', // Proposal Made → proposal
    5: 'negotiation', // Negotiations Started → negotiation
  },
  // Salesforce stages
  salesforce: {
    Prospecting: 'interested',
    Qualification: 'contacted',
    'Needs Analysis': 'contacted',
    'Value Proposition': 'demo',
    'Id. Decision Makers': 'proposal',
    'Perception Analysis': 'proposal',
    'Proposal/Price Quote': 'proposal',
    'Negotiation/Review': 'negotiation',
    'Closed Won': 'won',
    'Closed Lost': 'lost',
  },
  // HubSpot stages
  hubspot: {
    appointmentscheduled: 'interested',
    qualifiedtobuy: 'contacted',
    presentationscheduled: 'demo',
    decisionmakerbroughtin: 'proposal',
    contractsent: 'negotiation',
    closedwon: 'won',
    closedlost: 'lost',
  },
  // Zoho stages - Add explicit mapping for common Zoho stage names
  zoho: {
    Qualification: 'contacted',
    'Needs Analysis': 'contacted',
    'Value Proposition': 'demo',
    'Identify Decision Makers': 'proposal',
    'Proposal/Price Quote': 'proposal',
    'Negotiation/Review': 'negotiation',
    'Closed Won': 'won',
    'Closed Lost': 'lost',
    // Add lowercase versions for safety
    qualification: 'contacted',
    'needs analysis': 'contacted',
    'value proposition': 'demo',
    'identify decision makers': 'proposal',
    'proposal/price quote': 'proposal',
    'negotiation/review': 'negotiation',
    'closed won': 'won',
    'closed lost': 'lost',
  } as Record<string, string>,
  // Folk stages - Based on your sample data
  folk: {
    Lead: 'interested',
    Qualified: 'contacted',
    'Follow-up': 'contacted',
    Demo: 'demo',
    Proposal: 'proposal',
    Negotiation: 'negotiation',
    'Closed-won': 'won',
    'Closed-lost': 'lost',
    // Lowercase versions
    lead: 'interested',
    qualified: 'contacted',
    'follow-up': 'contacted',
    demo: 'demo',
    proposal: 'proposal',
    negotiation: 'negotiation',
    'closed-won': 'won',
    'closed-lost': 'lost',
  } as Record<string, string>,
};

/**
 * Check for existing deals in the database
 * @param deals - Deals to check
 * @param supabaseClient - Supabase client instance
 * @param accountId - Account ID to check within
 */
export async function checkExistingDeals(
  deals: TransformedDeal[],
  supabaseClient: any,
  accountId: string,
): Promise<{
  existingDeals: TransformedDeal[];
  newDeals: TransformedDeal[];
  duplicateInfo: Array<{
    importDeal: TransformedDeal;
    existingDeal: any;
    reason: string;
  }>;
}> {
  console.log(`🔍 Checking for existing deals in account ${accountId}...`);

  const existingDeals: TransformedDeal[] = [];
  const newDeals: TransformedDeal[] = [];
  const duplicateInfo: Array<{
    importDeal: TransformedDeal;
    existingDeal: any;
    reason: string;
  }> = [];

  try {
    // Get all existing deals for this account
    const { data: existingDealsInDB, error } = await supabaseClient
      .from('deals')
      .select(
        'id, deal_id, deal_title, company_name, primary_email, source, value_amount, stage',
      )
      .eq('account_id', accountId);

    if (error) {
      console.error('❌ Error fetching existing deals:', error);
      // If we can't check, assume all are new to avoid blocking import
      return { existingDeals: [], newDeals: deals, duplicateInfo: [] };
    }

    const existingDealsMap = new Map();
    const existingDealsByEmail = new Map();
    const existingDealsByTitle = new Map();

    // Build lookup maps
    existingDealsInDB?.forEach((existingDeal: any) => {
      // Map by deal_id (most reliable)
      if (existingDeal.deal_id) {
        existingDealsMap.set(existingDeal.deal_id, existingDeal);
      }

      // Map by primary email + company (secondary check)
      if (existingDeal.primary_email && existingDeal.company_name) {
        const emailKey = `${existingDeal.primary_email.toLowerCase()}-${existingDeal.company_name.toLowerCase()}`;
        existingDealsByEmail.set(emailKey, existingDeal);
      }

      // Map by title + company (tertiary check)
      if (existingDeal.deal_title && existingDeal.company_name) {
        const titleKey = `${existingDeal.deal_title.toLowerCase()}-${existingDeal.company_name.toLowerCase()}`;
        existingDealsByTitle.set(titleKey, existingDeal);
      }
    });

    // Check each deal for duplicates
    for (const deal of deals) {
      let isDuplicate = false;
      let duplicateReason = '';
      let existingDeal = null;

      // Check 1: Same deal_id (most reliable)
      if (deal.deal_id && existingDealsMap.has(deal.deal_id)) {
        isDuplicate = true;
        duplicateReason = `Deal ID already exists: ${deal.deal_id}`;
        existingDeal = existingDealsMap.get(deal.deal_id);
      }
      // Check 2: Same email + company (likely same contact/deal)
      else if (deal.primary_email && deal.company_name) {
        const emailKey = `${deal.primary_email.toLowerCase()}-${deal.company_name.toLowerCase()}`;
        if (existingDealsByEmail.has(emailKey)) {
          isDuplicate = true;
          duplicateReason = `Same contact already exists: ${deal.primary_email} at ${deal.company_name}`;
          existingDeal = existingDealsByEmail.get(emailKey);
        }
      }
      // Check 3: Same title + company (possible duplicate)
      else if (deal.deal_title && deal.company_name) {
        const titleKey = `${deal.deal_title.toLowerCase()}-${deal.company_name.toLowerCase()}`;
        if (existingDealsByTitle.has(titleKey)) {
          isDuplicate = true;
          duplicateReason = `Similar deal already exists: "${deal.deal_title}" at ${deal.company_name}`;
          existingDeal = existingDealsByTitle.get(titleKey);
        }
      }

      if (isDuplicate && existingDeal) {
        existingDeals.push(deal);
        duplicateInfo.push({
          importDeal: deal,
          existingDeal: existingDeal,
          reason: duplicateReason,
        });
        console.log(`🔄 Duplicate found: ${duplicateReason}`);
      } else {
        newDeals.push(deal);
      }
    }

    console.log(
      `✅ Duplicate check complete: ${existingDeals.length} duplicates, ${newDeals.length} new deals`,
    );

    return { existingDeals, newDeals, duplicateInfo };
  } catch (err) {
    console.error('❌ Error during duplicate check:', err);
    // If error occurs, assume all deals are new to avoid blocking import
    return { existingDeals: [], newDeals: deals, duplicateInfo: [] };
  }
}

/**
 * Transform Folk CRM people data to our database schema
 * Folk CRM stores deals as "people" with custom field values in groups
 * @param peopleData - Array of Folk CRM people (with customFieldValues)
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformFolkDeals(
  peopleData: any[],
  accountId: string,
  createdBy: string,
): TransformResult {
  const deals: TransformedDeal[] = [];
  const dealContacts: TransformedDealContact[] = [];

  console.log(`🔄 Transforming ${peopleData.length} Folk CRM people...`);

  for (const person of peopleData) {
    const dealId = uuidv4();
    const contactId = uuidv4();

    // Get the first group (assuming people belong to one main group)
    const group = person.groups?.[0];
    const groupId = group?.id;
    const fields = person.customFieldValues?.[groupId] || {};

    // Get company information
    const company =
      person.companies?.[0]?.name || person.companies?.[0] || 'Unknown';

    // Map Folk status to our stage enum
    let stage = 'interested'; // Default stage
    const status = fields['Status'] || '';

    // Try direct mapping first
    if (status && stageMap.folk[status]) {
      stage = stageMap.folk[status];
    } else if (status) {
      // Fallback to keyword-based mapping
      const lowerStatus = status.toLowerCase();
      if (lowerStatus.includes('qualified')) {
        stage = 'contacted';
      } else if (
        lowerStatus.includes('demo') ||
        lowerStatus.includes('presentation')
      ) {
        stage = 'demo';
      } else if (
        lowerStatus.includes('proposal') ||
        lowerStatus.includes('quote')
      ) {
        stage = 'proposal';
      } else if (
        lowerStatus.includes('negotiation') ||
        lowerStatus.includes('review')
      ) {
        stage = 'negotiation';
      } else if (
        lowerStatus.includes('won') ||
        lowerStatus.includes('closed-won')
      ) {
        stage = 'won';
      } else if (
        lowerStatus.includes('lost') ||
        lowerStatus.includes('closed-lost')
      ) {
        stage = 'lost';
      } else if (
        lowerStatus.includes('follow') ||
        lowerStatus.includes('follow-up')
      ) {
        stage = 'contacted';
      } else if (lowerStatus.includes('lead')) {
        stage = 'interested';
      }
    }

    console.log(
      `🔍 Folk person "${person.fullName}" status: "${status}" → stage: "${stage}"`,
    );

    // Create the deal record
    const transformedDeal: TransformedDeal = {
      id: dealId,
      account_id: accountId,
      company_name: company,
      industry: fields['Company vertical'] || 'Technology',
      value_amount: parseFloat(fields['Deal value']) || 0,
      value_currency: 'USD',
      stage: stage,
      source: 'folk', // Source of the deal
      probability: null,
      company_size: fields['Company size'] || null,
      website: person.urls?.[0] || null,
      deal_title: `${person.fullName}${company !== 'Unknown' ? ` (${company})` : ''}`,
      deal_id: person.id || null, // Use Folk person ID as deal_id
      next_action: fields['Next steps'] || null,
      relationship_insights: null,
      last_meeting_summary: null,
      momentum: 0,
      momentum_trend: 'steady',
      last_momentum_change: null,
      close_date: fields['Closed date'] || null,
      pain_points: fields['Lost reason'] ? [fields['Lost reason']] : [],
      next_steps: fields['Next steps']
        ? [fields['Next steps']]
        : ['Schedule a meeting'],
      blockers: [],
      opportunities: [],
      tags: [fields['Channel'], group?.name].filter(Boolean),
      primary_contact:
        person.fullName ||
        `${person.firstName} ${person.lastName}`.trim() ||
        '',
      primary_email: person.emails?.[0] || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: createdBy,
      updated_by: createdBy,
      stage_name: getStageDisplayName(stage), // For UI display
    };

    deals.push(transformedDeal);

    // Create contact record
    const dealContact: TransformedDealContact = {
      id: contactId,
      deal_id: dealId,
      name:
        person.fullName ||
        `${person.firstName} ${person.lastName}`.trim() ||
        'Unknown Contact',
      email: person.emails?.[0] || 'unknown@example.com',
      phone: person.phones?.[0] || null,
      role: person.jobTitle || null,
      contact_role_type: null,
      is_primary: true,
      is_decision_maker: false, // Could be determined from Folk custom fields if available
      last_contacted: null,
      notes: person.description || null,
      contact_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dealContacts.push(dealContact);

    console.log(
      `✅ Transformed Folk person: ${person.fullName} (${company}) - Stage: ${stage}`,
    );
  }

  console.log(
    `🎉 Folk transformation complete: ${deals.length} deals, ${dealContacts.length} contacts`,
  );
  return { deals, dealContacts };
}

/**
 * Transform Pipedrive deals to our database schema
 * @param dealsData - Array of Pipedrive deals
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformPipedriveDeals(
  dealsData: any[],
  accountId: string,
  createdBy: string,
): TransformResult {
  const deals: TransformedDeal[] = [];
  const dealContacts: TransformedDealContact[] = [];

  console.log(`🔄 Transforming ${dealsData.length} Pipedrive deals...`);

  for (const deal of dealsData) {
    const dealId = uuidv4();

    // Map Pipedrive stage to our enum
    const mappedStage =
      stageMap.pipedrive[deal.stage_id as keyof typeof stageMap.pipedrive] ||
      'interested';

    // Get person data from deal.person_id
    const person = deal.person_id;

    // Get primary email for analysis
    const primaryEmail = person?.email?.[0]?.value ||
      person?.email ||
      person?.primary_email ||
      person?.email_address ||
      deal.person_id?.email?.[0]?.value ||
      deal.person_id?.email ||
      deal.person_id?.primary_email ||
      '';

    // Enhanced company name extraction
    const companyName = getEnhancedCompanyName({
      title: deal.title,
      company_name: deal.org_id?.name,
      org_id: deal.org_id,
      primary_email: primaryEmail
    });

    // Extract website from domain if available
    const websiteUrl = extractDomainFromEmail(primaryEmail);

    // Create the deal record
    const transformedDeal: TransformedDeal = {
      id: dealId,
      account_id: accountId,
      company_name: companyName,
      industry: 'Technology', // ✅ Fixed: Changed from 'N/A' to valid value
      value_amount: deal.value || 0,
      value_currency: deal.currency || 'USD',
      stage: mappedStage,
      source: 'pipedrive', // Source of the deal
      probability: deal.probability || 0,
      company_size: null,
      website: websiteUrl,
      deal_title: deal.title || null,
      deal_id: deal.id ? deal.id.toString() : null, // Keep original deal_id
      next_action: deal.next_activity_note || null,
      relationship_insights: null,
      last_meeting_summary: null,
      momentum: 0,
      momentum_trend: 'steady',
      last_momentum_change: null,
      close_date: deal.expected_close_date || null,
      pain_points: [],
      next_steps: ['Schedule a meeting', 'Research company background'],
      blockers: [],
      opportunities: [],
      tags: ['imported-pipedrive'],
      primary_contact: person?.name || '', // ✅ Fixed: Use person variable
      primary_email: primaryEmail,
      created_at: deal.add_time || new Date().toISOString(),
      updated_at: deal.update_time || new Date().toISOString(),
      created_by: createdBy,
      updated_by: createdBy,
      stage_name: getStageDisplayName(mappedStage), // For UI display
    };

    deals.push(transformedDeal);

    // Create contact record if person exists
    if (person?.value) {
      const dealContact: TransformedDealContact = {
        id: uuidv4(),
        deal_id: dealId,
        name: person.name || 'Unknown Contact',
        email:
          person.email?.[0]?.value ||
          person.email ||
          person.primary_email ||
          person.email_address ||
          'unknown@example.com',
        phone: person.phone?.[0]?.value || null,
        role: 'Primary Contact',
        contact_role_type: null,
        is_primary: true,
        is_decision_maker: false,
        last_contacted: null,
        notes: deal.next_activity_note || null,
        contact_id: null,
        created_at: deal.add_time || new Date().toISOString(),
        updated_at: deal.update_time || new Date().toISOString(),
      };
      dealContacts.push(dealContact);
    }

    console.log(
      `✅ Transformed Pipedrive deal: ${deal.title} (Stage: ${mappedStage})`,
    );
  }

  console.log(
    `🎉 Pipedrive transformation complete: ${deals.length} deals, ${dealContacts.length} contacts`,
  );
  return { deals, dealContacts };
}

/**
 * Transform Salesforce deals to our database schema
 * @param dealsData - Array of Salesforce deals
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformSalesforceDeals(
  dealsData: any[],
  accountId: string,
  createdBy: string,
): TransformResult {
  const deals: TransformedDeal[] = [];
  const dealContacts: TransformedDealContact[] = [];

  console.log(`🔄 Transforming ${dealsData.length} Salesforce deals...`);

  for (const deal of dealsData) {
    const dealId = uuidv4();

    // Map Salesforce stage to our enum
    const mappedStage =
      stageMap.salesforce[deal.stage as keyof typeof stageMap.salesforce] ||
      'interested';

    // Get primary email for analysis
    const primaryEmail = deal.contacts?.email ||
      deal.contacts?.primary_email ||
      deal.contacts?.email_address ||
      deal.email ||
      deal.primary_email ||
      '';

    // Enhanced company name extraction
    const companyName = getEnhancedCompanyName({
      name: deal.name,
      company_name: deal.contacts?.company,
      contact: deal.contacts,
      primary_email: primaryEmail
    });

    // Extract website from domain if available
    const websiteUrl = extractDomainFromEmail(primaryEmail);

    // Create the deal record
    const transformedDeal: TransformedDeal = {
      id: dealId,
      account_id: accountId,
      company_name: companyName,
      industry: 'Technology',
      value_amount: deal.value || 0,
      value_currency: 'USD',
      stage: mappedStage,
      source: 'salesforce',
      probability: deal.probability || null,
      company_size: null,
      website: websiteUrl,
      deal_title: deal.name || null,
      deal_id: deal.id || null,
      next_action: null,
      relationship_insights: null,
      last_meeting_summary: null,
      momentum: 0,
      momentum_trend: 'steady',
      last_momentum_change: null,
      close_date: deal.closeDate || null,
      pain_points: [],
      next_steps: ['Schedule a meeting', 'Research company background'],
      blockers: [],
      opportunities: [],
      tags: ['imported-salesforce'],
      primary_contact: deal.contacts
        ? `${deal.contacts.first_name || ''} ${deal.contacts.last_name || ''}`.trim() ||
          ''
        : '',
      primary_email: primaryEmail,
      created_at: deal.createdAt || new Date().toISOString(),
      updated_at: deal.updatedAt || new Date().toISOString(),
      created_by: createdBy,
      updated_by: createdBy,
      stage_name: getStageDisplayName(mappedStage), // For UI display
    };
    deals.push(transformedDeal);

    // Create contact record if exists
    if (deal.contacts?.id) {
      const contact = deal.contacts;
      const dealContact: TransformedDealContact = {
        id: uuidv4(),
        deal_id: dealId,
        name:
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          'Unknown Contact',
        email:
          contact.email ||
          contact.primary_email ||
          contact.email_address ||
          'unknown@example.com',
        phone: contact.phone || null,
        role: null,
        contact_role_type: null,
        is_primary: true,
        is_decision_maker: false,
        last_contacted: null,
        notes: null,
        contact_id: null,
        created_at: deal.createdAt || new Date().toISOString(),
        updated_at: deal.updatedAt || new Date().toISOString(),
      };
      dealContacts.push(dealContact);
    }

    console.log(
      `✅ Transformed Salesforce deal: ${deal.name} (Stage: ${mappedStage})`,
    );
  }

  console.log(
    `🎉 Salesforce transformation complete: ${deals.length} deals, ${dealContacts.length} contacts`,
  );
  return { deals, dealContacts };
}

/**
 * Transform HubSpot deals to our database schema
 * @param dealsData - Array of HubSpot deals
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformHubSpotDeals(
  dealsData: any[],
  accountId: string,
  createdBy: string,
): TransformResult {
  const deals: TransformedDeal[] = [];
  const dealContacts: TransformedDealContact[] = [];
  const contactIdMap: { [key: string]: string } = {};

  console.log(`🔄 Transforming ${dealsData.length} HubSpot deals...`);

  for (const deal of dealsData) {
    const dealId = uuidv4();
    const contact = deal.contacts; // This comes from the fetch-data API merge

    console.log(`📞 Processing deal: ${deal.name || deal.id} with contact:`, contact ? 'YES' : 'NO');

    // Map HubSpot stage to our enum
    const mappedStage =
      stageMap.hubspot[deal.stage as keyof typeof stageMap.hubspot] ||
      'interested';

    // Handle contact creation if contact data exists
    let contactId = null;
    if (contact && contact.id) {
      // Check if we've already processed this contact
      if (!contactIdMap[contact.id]) {
        contactId = uuidv4();
        contactIdMap[contact.id] = contactId;
        
        const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
                           contact.email?.split('@')[0] || 
                           'Unknown Contact';

        const dealContact: TransformedDealContact = {
          id: contactId,
          deal_id: dealId,
          name: contactName,
          email: contact.email || 'unknown@example.com',
          phone: contact.phone || null,
          role: 'Primary Contact',
          contact_role_type: null,
          is_primary: true,
          is_decision_maker: false,
          last_contacted: null,
          notes: contact.company ? `Company: ${contact.company}` : null,
          contact_id: null,
          created_at: contact.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        dealContacts.push(dealContact);
        console.log(`✅ Created contact for deal ${deal.name}: ${contactName} (${contact.email})`);
      } else {
        contactId = contactIdMap[contact.id];
        console.log(`🔄 Reusing existing contact for deal ${deal.name}`);
      }
    } else {
      console.log(`⚠️ No contact data found for deal: ${deal.name || deal.id}`);
      
      // If no contact data but deal has a primary email, create a basic contact
      const dealEmail = deal.primary_email || deal.email || deal.properties?.email;
      if (dealEmail && dealEmail !== 'unknown@example.com') {
        contactId = uuidv4();
        const contactName = dealEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Contact';
        
        const fallbackContact: TransformedDealContact = {
          id: contactId,
          deal_id: dealId,
          name: contactName,
          email: dealEmail,
          phone: null,
          role: 'Primary Contact',
          contact_role_type: null,
          is_primary: true,
          is_decision_maker: false,
          last_contacted: null,
          notes: 'Auto-created from deal email - contact details may be incomplete',
          contact_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        dealContacts.push(fallbackContact);
        console.log(`📧 Created fallback contact from deal email: ${contactName} (${dealEmail})`);
      }
    }

    // Get primary email for analysis (prioritize contact email, then deal email)
    const primaryEmail = contact?.email ||
      deal.primary_email ||
      deal.email ||
      deal.properties?.email ||
      '';

    // Enhanced company name extraction
    const companyName = getEnhancedCompanyName({
      dealname: deal.name,
      company_name: contact?.company,
      contact: contact,
      primary_email: primaryEmail,
      properties: deal.properties
    });

    // Extract website from domain if available
    const websiteUrl = extractDomainFromEmail(primaryEmail);

    // Create the deal record
    const transformedDeal: TransformedDeal = {
      id: dealId,
      account_id: accountId,
      company_name: companyName,
      industry: 'Technology',
      value_amount: parseFloat(deal.value) || 0,
      value_currency: 'USD',
      stage: mappedStage,
      source: 'hubspot',
      probability: null,
      company_size: null,
      website: websiteUrl,
      deal_title: deal.name || null,
      deal_id: deal.id || null,
      next_action: null,
      relationship_insights: null,
      last_meeting_summary: null,
      momentum: 0,
      momentum_trend: 'steady',
      last_momentum_change: null,
      close_date: deal.closeDate || null,
      pain_points: [],
      next_steps: ['Schedule a meeting', 'Research company background'],
      blockers: [],
      opportunities: [],
      tags: ['imported-hubspot'],
      primary_contact: contact
        ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
          contact.email?.split('@')[0] || 
          'Unknown Contact'
        : 'No Contact',
      primary_email: primaryEmail,
      created_at: deal.created_at || new Date().toISOString(),
      updated_at: deal.updated_at || new Date().toISOString(),
      created_by: createdBy,
      updated_by: createdBy,
      stage_name: getStageDisplayName(mappedStage),
    };
    deals.push(transformedDeal);

    console.log(
      `✅ Transformed HubSpot deal: ${companyName} (${deal.name}) - Stage: ${mappedStage}`,
    );
  }

  console.log(
    `🎉 HubSpot transformation complete: ${deals.length} deals, ${dealContacts.length} contacts`,
  );
  return { deals, dealContacts };
}

/**
 * Transform Zoho deals to our database schema
 * @param dealsData - Array of Zoho deals
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformZohoDeals(
  dealsData: any[],
  accountId: string,
  createdBy: string,
): TransformResult {
  const dealsRaw =
    Array.isArray(dealsData) && dealsData.length > 0 && dealsData[0]?.data
      ? dealsData[0].data
      : Array.isArray(dealsData)
        ? dealsData
        : [];
  const contactsRaw =
    Array.isArray(dealsData) && dealsData.length > 1 && dealsData[1]?.data
      ? dealsData[1].data
      : [];

  const deals: TransformedDeal[] = [];
  const dealContacts: TransformedDealContact[] = [];

  console.log(`🔄 Transforming ${dealsRaw.length} Zoho deals...`);

  for (const deal of dealsRaw) {
    const dealId = uuidv4();
    let mappedStage = 'interested'; // Default fallback
    const zohoStage = String(deal.Stage || '');

    const getZohoStageMapping = (stage: string): string | undefined => {
      if (stage in stageMap.zoho) return stageMap.zoho[stage];
      const lowerStage = stage.toLowerCase();
      if (lowerStage in stageMap.zoho) return stageMap.zoho[lowerStage];
      return undefined;
    };

    const directMapping = getZohoStageMapping(zohoStage);
    if (directMapping) {
      mappedStage = directMapping;
    } else {
      const lowerStage = zohoStage.toLowerCase();
      if (
        lowerStage.includes('qualification') ||
        lowerStage.includes('qualified')
      ) {
        mappedStage = 'demo';
      } else if (
        lowerStage.includes('proposal') ||
        lowerStage.includes('quote')
      ) {
        mappedStage = 'proposal';
      } else if (
        lowerStage.includes('negotiation') ||
        lowerStage.includes('review')
      ) {
        mappedStage = 'negotiation';
      } else if (
        lowerStage.includes('closed won') ||
        lowerStage.includes('won')
      ) {
        mappedStage = 'won';
      } else if (
        lowerStage.includes('closed lost') ||
        lowerStage.includes('lost')
      ) {
        mappedStage = 'lost';
      }
    }

    const transformedDeal: TransformedDeal = {
      id: dealId,
      account_id: accountId,
      company_name: deal.Account_Name?.name || 'Unknown',
      industry: 'Technology',
      value_amount: parseFloat(deal.Amount) || 0,
      value_currency: deal.Currency || 'USD',
      stage: mappedStage,
      source: 'zoho',
      stage_name: getStageDisplayName(mappedStage),
      probability: deal.Probability ?? null,
      company_size: null,
      website: null,
      deal_title: deal.Deal_Name || null,
      deal_id: deal.id || null,
      next_action: null,
      relationship_insights: null,
      last_meeting_summary: null,
      momentum: 0,
      momentum_trend: 'steady',
      last_momentum_change: null,
      close_date: deal.Closing_Date || null,
      pain_points: [],
      next_steps: ['Schedule a meeting'],
      blockers: [],
      opportunities: [],
      tags: Array.isArray(deal.Tag) ? deal.Tag : deal.Tag ? [deal.Tag] : [],
      primary_contact: deal.Contact_Name?.name || '',
      primary_email: (() => {
        const fullContact = contactsRaw.find(
          (c: any) => c.id === deal.Contact_Name?.id,
        );
        return (
          deal.Contact_Email ||
          deal.contact_email ||
          deal.Contact_Name?.email ||
          fullContact?.Email ||
          fullContact?.email ||
          ''
        );
      })(),
      created_at: deal.Created_Time || new Date().toISOString(),
      updated_at: deal.Modified_Time || new Date().toISOString(),
      created_by: createdBy,
      updated_by: createdBy,
    };
    deals.push(transformedDeal);

    if (deal.Contact_Name?.id) {
      const fullContact = contactsRaw.find(
        (c: any) => c.id === deal.Contact_Name.id,
      );
      dealContacts.push({
        id: uuidv4(),
        deal_id: dealId,
        name:
          deal.Contact_Name?.name ||
          fullContact?.Full_Name ||
          'Unknown Contact',
        email:
          fullContact?.Email ||
          fullContact?.email ||
          deal.Contact_Email ||
          deal.contact_email ||
          'unknown@example.com',
        phone: fullContact?.Phone || deal.Contact_Phone || null,
        role: null,
        contact_role_type: null,
        is_primary: true,
        is_decision_maker: false,
        last_contacted: fullContact?.Last_Activity_Time || null,
        notes: fullContact?.Description || null,
        contact_id: null,
        created_at:
          fullContact?.Created_Time ||
          deal.Created_Time ||
          new Date().toISOString(),
        updated_at:
          fullContact?.Modified_Time ||
          deal.Modified_Time ||
          new Date().toISOString(),
      });
    }
    console.log(
      `✅ Transformed Zoho deal: ${deal.Deal_Name || 'Unnamed'} (Stage: ${mappedStage})`,
    );
  }

  console.log(
    `🎉 Zoho transformation complete: ${deals.length} deals, ${dealContacts.length} contacts`,
  );
  return { deals, dealContacts };
}

/**
 * Helper function to get display name for stage enum values
 * @param stage - Stage enum value
 * @returns Human-readable stage name
 */
function getStageDisplayName(stage: string): string {
  const displayNames: { [key: string]: string } = {
    interested: 'Interested',
    contacted: 'Contacted',
    demo: 'Demo',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
  };
  return displayNames[stage] || 'Interested';
}

/**
 * Main transform function that routes to the appropriate platform transformer
 * @param dealsData - Raw deals data from CRM platform
 * @param platform - CRM platform name (pipedrive, salesforce, hubspot, zoho, folk)
 * @param accountId - Account ID to associate deals with
 * @param createdBy - User ID who created the import
 */
export function transformDeals(
  dealsData: any,
  platform: string,
  accountId: string = 'account123',
  createdBy: string = 'user456',
): TransformResult {
  console.log(`🚀 Starting transformation for platform: ${platform}`);
  const dataArray = Array.isArray(dealsData) ? dealsData : [dealsData];
  switch (platform.toLowerCase()) {
    case 'pipedrive':
      return transformPipedriveDeals(dataArray, accountId, createdBy);
    case 'salesforce':
      return transformSalesforceDeals(dataArray, accountId, createdBy);
    case 'hubspot':
      return transformHubSpotDeals(dataArray, accountId, createdBy);
    case 'zoho':
      return transformZohoDeals(dataArray, accountId, createdBy);
    case 'folk':
      return transformFolkDeals(dataArray, accountId, createdBy);
    default:
      console.error(`❌ Unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Trigger post-import analysis for deals
 * @param dealIds - Array of deal IDs to analyze
 * @param accountId - Account ID
 */
export async function triggerPostImportAnalysis(
  dealIds: string[],
  accountId: string
): Promise<void> {
  console.log(`🔍 Triggering post-import analysis for ${dealIds.length} deals`);
  
  try {
    // Call the API route instead of importing server-only code
    const response = await fetch('/api/deals/post-import-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dealIds,
        accountId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Post-import analysis completed for ${dealIds.length} deals:`, result);
  } catch (error) {
    console.error('❌ Post-import analysis failed:', error);
    // Don't throw error as import should succeed even if analysis fails
  }
}

/**
 * Insert transformed data into Supabase database and trigger analysis
 * @param transformResult - Result from transform function
 * @param supabaseClient - Supabase client instance
 * @param accountId - Account ID for post-import analysis
 * @param triggerAnalysis - Whether to trigger post-import analysis (default: true)
 */
export async function insertTransformedData(
  { deals, dealContacts }: TransformResult,
  supabaseClient: any,
  accountId?: string,
  triggerAnalysis: boolean = true,
): Promise<{ dealIds: string[] }> {
  console.log(`💾 Starting database insertion...`);
  const dealIds: string[] = [];
  
  try {
    // Insert deals first
    if (deals.length > 0) {
      const dealsForDB = deals.map(({ stage_name, ...deal }) => deal);
      const { error: dealError } = await supabaseClient
        .from('deals')
        .insert(dealsForDB);

      if (dealError) {
        console.error('❌ Failed to insert deals:', dealError);
        throw new Error(`Deal insertion failed: ${dealError.message}`);
      }
      
      // Collect deal IDs for analysis
      dealIds.push(...deals.map(deal => deal.id));
      console.log(`✅ Inserted ${deals.length} deals`);
    }

    // Insert deal contacts
    if (dealContacts.length > 0) {
      const { error: contactError } = await supabaseClient
        .from('deal_contacts')
        .insert(dealContacts);

      if (contactError) {
        console.error('❌ Failed to insert deal contacts:', contactError);
        throw new Error(
          `Deal contact insertion failed: ${contactError.message}`,
        );
      }
      console.log(`✅ Inserted ${dealContacts.length} deal contacts`);
    }

    console.log('🎉 Database insertion completed successfully!');

    // Trigger post-import analysis if enabled and accountId provided
    if (triggerAnalysis && accountId && dealIds.length > 0) {
      console.log(`🔍 Triggering analysis for ${dealIds.length} imported deals...`);
      
      // Trigger analysis in background (don't await to avoid blocking the response)
      triggerPostImportAnalysis(dealIds, accountId).catch(error => {
        console.error('❌ Background analysis failed:', error);
      });
    }

    return { dealIds };
  } catch (err) {
    console.error('🔥 Database insertion error:', err);
    throw err;
  }
}
