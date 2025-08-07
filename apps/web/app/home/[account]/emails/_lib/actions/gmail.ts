'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  GmailAccountsResponse,
  GmailEmailsResponse,
  SendEmailResponse,
  SyncResponse,
} from '../types';

export async function triggerGmailSync(
  accountId: string,
  email: string,
): Promise<SyncResponse> {
  console.log('🔍 triggerGmailSync called with:', { accountId, email });

  try {
    const supabase = getSupabaseServerClient();
    console.log('✅ Supabase client created');

    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('id, email_address, expires_at')
      .eq('account_id', accountId)
      .eq('email_address', email)
      .single();

    console.log('📊 Gmail token query result:', { tokenData, tokenError });

    if (tokenError || !tokenData) {
      console.log(
        '❌ Gmail token not found:',
        tokenError?.message || 'No data',
      );
      return {
        success: false,
        error: `Gmail account not connected: ${tokenError?.message || 'Token not found'}`,
      };
    }

    console.log('✅ Gmail token found:', {
      id: tokenData.id,
      email_address: tokenData.email_address,
      expires_at: tokenData.expires_at,
    });

    // Trigger sync via API - use NEXT_PUBLIC_SITE_URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const syncUrl = `${baseUrl}/api/gmail/sync`;
    console.log('🚀 Calling sync API:', syncUrl, 'baseUrl:', baseUrl);

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        email,
      }),
    });

    console.log('📥 Sync API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Sync API failed:', errorText);
      return {
        success: false,
        error: `Failed to trigger sync: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    console.log('✅ Sync API success:', result);

    return {
      success: true,
    };
  } catch (error) {
    console.error('💥 Error triggering Gmail sync:', error);
    return {
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function disconnectGmailAccount(
  accountId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServerClient();

    // Delete token data
    const { error } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('account_id', accountId)
      .eq('email_address', email);

    if (error) {
      return {
        success: false,
        error: 'Failed to disconnect account',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error disconnecting Gmail account:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function sendEmail(
  accountId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
): Promise<SendEmailResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/gmail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        to,
        subject,
        body,
        cc,
        bcc,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send email',
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messageId,
      threadId: data.threadId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getGmailAccounts(
  accountId: string,
): Promise<GmailAccountsResponse> {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('email_address, expires_at')
      .eq('account_id', accountId);

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch Gmail accounts',
      };
    }

    return {
      success: true,
      accounts: data,
    };
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getGmailEmails(
  accountId: string,
  options: {
    limit?: number;
    offset?: number;
    threadId?: string;
    search?: string;
    labels?: string[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  },
): Promise<GmailEmailsResponse> {
  try {
    const supabase = getSupabaseServerClient();
    const {
      limit = 50,
      offset = 0,
      threadId,
      search,
      labels,
      sortBy = 'received_at',
      sortDirection = 'desc',
    } = options;

    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId);

    // Apply filters
    if (threadId) {
      query = query.eq('thread_id', threadId);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%, body_text.ilike.%${search}%`,
      );
    }

    if (labels && labels.length > 0) {
      // Filter for emails that have at least one of the specified labels
      query = query.overlaps('labels', labels);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch emails',
      };
    }

    return {
      success: true,
      emails: data,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching Gmail emails:', error);
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}

export async function getDealRelatedEmails(
  accountId: string,
  options: {
    limit?: number;
    offset?: number;
    dealId?: string;
    search?: string;
  } = {},
): Promise<GmailEmailsResponse> {
  const { limit = 20, offset = 0, dealId, search } = options;

  try {
    const supabase = getSupabaseServerClient();

    // Get all emails for this account directly from emails table
    const { data: allEmails, error: allEmailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('account_id', accountId)
      .order('received_at', { ascending: false });

    // Get deal contacts data
    const { data: dealContactsData, error: contactError } = await supabase
      .from('deal_contacts')
      .select(
        `
        deal_id,
        name,
        email,
        role,
        is_primary
      `,
      )
      .not('email', 'is', null);

    // Get contacts data
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId);

    // Extract all contact emails from deal_contacts
    const contactEmails =
      dealContactsData?.map((dc) => dc.email).filter(Boolean) || [];

    // Also get emails from the contacts table
    const additionalContactEmails =
      contacts?.map((contact) => contact.email) || [];

    // Combine both email sources
    const allContactEmails = [
      ...new Set([...contactEmails, ...additionalContactEmails]),
    ];

    // If we have no deal contacts yet, return all account emails
    if (allContactEmails.length === 0) {
      console.log(
        '⚠️ No deal contacts found, returning all emails for account',
      );
      const { data: accountEmails, error: accountEmailsError } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', accountId)
        .order('received_at', { ascending: false })
        .range(offset, offset + limit - 1);

      console.log('📬 Returning all account emails:', {
        count: accountEmails?.length || 0,
        total: allEmails?.length || 0,
        error: accountEmailsError?.message || null,
      });

      return {
        success: true,
        emails: accountEmails || [],
        total: allEmails?.length || 0,
      };
    }

    // Build the query for deal-related emails
    let emailQuery = supabase
      .from('emails')
      .select('*')
      .eq('account_id', accountId);

    // Filter by contact emails (from_email OR any email in to_email)
    const emailFilters = allContactEmails
      .map((email) => `from_email.eq.${email},to_email.cs.{"${email}"}`)
      .join(',');

    if (emailFilters) {
      emailQuery = emailQuery.or(emailFilters);
    }

    // Add search functionality
    if (search) {
      emailQuery = emailQuery.or(
        `subject.ilike.%${search}%,body_text.ilike.%${search}%`,
      );
    }

    // Apply sorting and pagination
    const { data: dealEmails, error: dealEmailsError } = await emailQuery
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('🎯 Deal-related emails found:', {
      count: dealEmails?.length || 0,
      error: dealEmailsError?.message || null,
      contactEmails: allContactEmails,
    });

    return {
      success: true,
      emails: dealEmails || [],
      total: dealEmails?.length || 0,
    };
  } catch (error) {
    console.error('❌ Error in getDealRelatedEmails:', error);
    return {
      success: false,
      error: 'Internal server error',
      emails: [],
      total: 0,
    };
  }
}
// export async function getDealRelatedEmails(
//   accountId: string,
//   options: {
//     limit?: number;
//     offset?: number;
//     dealId?: string;
//     search?: string;
//   } = {},
// ): Promise<GmailEmailsResponse> {
//   const { limit = 20, offset = 0, dealId, search } = options;

//   try {
//     const supabase = getSupabaseServerClient();

//     // Get all emails for this account directly from emails table
//     const { data: allEmails, error: allEmailsError } = await supabase
//       .from('emails')
//       .select('*')
//       .eq('account_id', accountId)
//       .order('received_at', { ascending: false });

//     // Get deal contacts data
//     const { data: dealContactsData, error: contactError } = await supabase
//       .from('deal_contacts')
//       .select(
//         `
//         deal_id,
//         name,
//         email,
//         role,
//         is_primary,
//         is_decision_maker
//       `,
//       )
//       .not('email', 'is', null);

//     // Get deals data
//     const { data: dealsData, error: dealsError } = await supabase
//       .from('deals')
//       .select('id, company_name, stage, value_amount, value_currency')
//       .eq('account_id', accountId);

//     // Get contacts data
//     const { data: contacts, error: contactsError } = await supabase
//       .from('contacts')
//       .select('*')
//       .eq('account_id', accountId);

//     console.log('📊 Data fetched:', {
//       allEmails: allEmails?.length || 0,
//       dealContacts: dealContactsData?.length || 0,
//       deals: dealsData?.length || 0,
//       contacts: contacts?.length || 0,
//     });

//     // FILTER OUT ORPHANED DEAL CONTACTS - Only keep contacts that have valid deals
//     const validDealIds = new Set(dealsData?.map((d) => d.id) || []);
//     const validDealContacts =
//       dealContactsData?.filter((dc) => validDealIds.has(dc.deal_id)) || [];

//     console.log('🧹 Filtered orphaned contacts:', {
//       original: dealContactsData?.length || 0,
//       valid: validDealContacts.length,
//       orphaned: (dealContactsData?.length || 0) - validDealContacts.length,
//     });

//     // Extract all contact emails from valid deal_contacts only
//     const contactEmails = validDealContacts
//       .map((dc) => dc.email)
//       .filter(Boolean);

//     // Also get emails from the contacts table
//     const additionalContactEmails =
//       contacts?.map((contact) => contact.email) || [];

//     // Combine both email sources
//     const allContactEmails = [
//       ...new Set([...contactEmails, ...additionalContactEmails]),
//     ];

//     console.log('📧 Contact emails found:', allContactEmails);

//     // If we have no deal contacts yet, return all account emails
//     if (allContactEmails.length === 0) {
//       console.log(
//         '⚠️ No deal contacts found, returning all emails for account',
//       );
//       const { data: accountEmails, error: accountEmailsError } = await supabase
//         .from('emails')
//         .select('*')
//         .eq('account_id', accountId)
//         .order('received_at', { ascending: false })
//         .range(offset, offset + limit - 1);

//       console.log('📬 Returning all account emails:', {
//         count: accountEmails?.length || 0,
//         total: allEmails?.length || 0,
//         error: accountEmailsError?.message || null,
//       });

//       return {
//         success: true,
//         emails: accountEmails || [],
//         total: allEmails?.length || 0,
//       };
//     }

//     // Build the query for deal-related emails
//     let emailQuery = supabase
//       .from('emails')
//       .select('*')
//       .eq('account_id', accountId);

//     // Filter by specific deal if provided
//     if (dealId) {
//       // Get contacts for this specific deal (only valid ones)
//       const dealSpecificContacts = validDealContacts
//         .filter((dc) => dc.deal_id === dealId)
//         .map((dc) => dc.email)
//         .filter(Boolean);

//       if (dealSpecificContacts.length > 0) {
//         const dealEmailFilters = dealSpecificContacts
//           .map((email) => `from_email.eq.${email},to_email.cs.{"${email}"}`)
//           .join(',');

//         if (dealEmailFilters) {
//           emailQuery = emailQuery.or(dealEmailFilters);
//         }
//       }
//     } else {
//       // Filter by contact emails (from_email OR any email in to_email)
//       const emailFilters = allContactEmails
//         .map((email) => `from_email.eq.${email},to_email.cs.{"${email}"}`)
//         .join(',');

//       if (emailFilters) {
//         emailQuery = emailQuery.or(emailFilters);
//       }
//     }

//     // Add search functionality
//     if (search) {
//       emailQuery = emailQuery.or(
//         `subject.ilike.%${search}%,body_text.ilike.%${search}%`,
//       );
//     }

//     // Apply sorting and pagination
//     const { data: dealEmails, error: dealEmailsError } = await emailQuery
//       .order('received_at', { ascending: false })
//       .range(offset, offset + limit - 1);

//     console.log('🎯 Deal-related emails found:', {
//       count: dealEmails?.length || 0,
//       error: dealEmailsError?.message || null,
//     });

//     // ADD DEAL CONTEXT TO EACH EMAIL - USING ONLY VALID DEAL CONTACTS
//     const emailsWithContext =
//       dealEmails?.map((email, emailIndex) => {
//         const dealContext = [];

//         // Get all unique email addresses involved in this email (from + to)
//         let toEmailArray = [];

//         if (email.to_email) {
//           if (Array.isArray(email.to_email)) {
//             toEmailArray = email.to_email;
//           } else if (typeof email.to_email === 'string') {
//             // Try to parse if it looks like JSON array
//             if (email.to_email.startsWith('[')) {
//               try {
//                 toEmailArray = JSON.parse(email.to_email);
//               } catch (e) {
//                 toEmailArray = [email.to_email];
//               }
//             } else {
//               toEmailArray = [email.to_email];
//             }
//           } else {
//             toEmailArray = [email.to_email];
//           }
//         }

//         const emailAddresses = [email.from_email, ...toEmailArray].filter(
//           Boolean,
//         );

//         console.log(
//           `\n🔍 [${emailIndex + 1}] Processing email: ${email.subject || 'No subject'}`,
//         );

//         // For each email address, find ALL matching VALID deal contacts
//         for (const emailAddress of emailAddresses) {
//           const contactMatches = validDealContacts.filter(
//             (dc) => dc.email === emailAddress,
//           );

//           console.log(
//             `👤 Found ${contactMatches.length} VALID contacts for ${emailAddress}:`,
//             contactMatches.map((c) => ({
//               deal_id: c.deal_id,
//               name: c.name,
//               email: c.email,
//             })),
//           );

//           // For each matching contact, add their deal context
//           for (const contact of contactMatches) {
//             const deal = dealsData?.find((d) => d.id === contact.deal_id);

//             if (deal) {
//               // Check if we already have this deal in the context to avoid duplicates
//               const existingDealContext = dealContext.find(
//                 (ctx) => ctx.deal.id === deal.id,
//               );

//               if (!existingDealContext) {
//                 console.log(`🏢 ✅ ADDING deal context: ${deal.company_name}`);
//                 dealContext.push({
//                   contact: {
//                     id: contact.deal_id,
//                     name: contact.name,
//                     email: contact.email,
//                     role: contact.role || '',
//                     is_decision_maker: contact.is_decision_maker || false,
//                   },
//                   deal: {
//                     id: deal.id,
//                     company_name: deal.company_name,
//                     stage: deal.stage,
//                     value: `${deal.value_amount || 0} ${deal.value_currency || 'USD'}`,
//                   },
//                 });
//               } else {
//                 console.log(
//                   `🔄 Deal ${deal.company_name} already in context, skipping`,
//                 );
//               }
//             }
//           }
//         }

//         console.log(
//           `🎯 Final deal context for email "${email.subject}":`,
//           dealContext.length,
//           'deals -',
//           dealContext.map((ctx) => ctx.deal.company_name),
//         );

//         return {
//           ...email,
//           dealContext: dealContext.length > 0 ? dealContext : undefined,
//         };
//       }) || [];

//     return {
//       success: true,
//       emails: emailsWithContext,
//       total: emailsWithContext.length,
//     };
//   } catch (error) {
//     console.error('❌ Error in getDealRelatedEmails:', error);
//     return {
//       success: false,
//       error: 'Internal server error',
//       emails: [],
//       total: 0,
//     };
//   }
// }
