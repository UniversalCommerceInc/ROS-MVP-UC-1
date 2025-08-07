// import { NextResponse } from 'next/server';
// import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
// import {
//   fetchEmailDetails,
//   fetchEmails,
//   parseEmailDetails,
//   refreshGoogleToken,
// } from '~/home/[account]/emails/_lib/utils';
// export async function POST(request: Request) {
//   try {
//     const supabase = getSupabaseServerAdminClient();
//     const { accountId, email } = await request.json();
//     if (!accountId || !email) {
//       return NextResponse.json(
//         { error: 'Missing required parameters' },
//         { status: 400 },
//       );
//     }
//     // Create sync status entry
//     const { data: syncStatus, error: syncStatusError } = await supabase
//       .from('email_sync_status')
//       .insert({
//         account_id: accountId,
//         email,
//         status: 'in_progress',
//         emails_synced: 0,
//       })
//       .select()
//       .single();
//     if (syncStatusError) {
//       console.error('Error creating sync status:', syncStatusError);
//       return NextResponse.json(
//         { error: 'Failed to create sync status' },
//         { status: 500 },
//       );
//     }
//     // Get Gmail token data
//     const { data: tokenData, error: tokenError } = await supabase
//       .from('gmail_tokens')
//       .select('*')
//       .eq('account_id', accountId)
//       .eq('email_address', email)
//       .single();
//     if (tokenError || !tokenData) {
//       await supabase
//         .from('email_sync_status')
//         .update({
//           status: 'failed',
//           error_message: 'Gmail token not found',
//           completed_at: new Date().toISOString(),
//         })
//         .eq('id', syncStatus.id);
//       return NextResponse.json(
//         { error: 'Gmail token not found' },
//         { status: 404 },
//       );
//     }
//     // Check if token is expired and refresh if needed
//     let accessToken = tokenData.access_token;
//     let expiresAt = new Date(tokenData.expires_at);
//     if (expiresAt < new Date()) {
//       try {
//         const { access_token, expires_at } = await refreshGoogleToken(
//           tokenData.refresh_token,
//         );
//         accessToken = access_token;
//         expiresAt = new Date(expires_at);
//         // Update token in database
//         await supabase
//           .from('gmail_tokens')
//           .update({
//             access_token,
//             expires_at,
//           })
//           .eq('id', tokenData.id);
//       } catch (error) {
//         console.error('Error refreshing token:', error);
//         await supabase
//           .from('email_sync_status')
//           .update({
//             status: 'failed',
//             error_message: 'Failed to refresh token',
//             completed_at: new Date().toISOString(),
//           })
//           .eq('id', syncStatus.id);
//         return NextResponse.json(
//           { error: 'Failed to refresh token' },
//           { status: 401 },
//         );
//       }
//     }
//     // Determine query based on last sync time - SIMPLE LOGIC LIKE ORIGINAL
//     let query = '';
//     let emailsProcessed = 0;
//     if (tokenData.last_sync) {
//       // Convert to RFC 3339 format for Gmail API
//       const lastSyncDate = new Date(tokenData.last_sync);
//       query = `after:${Math.floor(lastSyncDate.getTime() / 1000)}`;
//     } else {
//       // First sync - limit to last 30 days to avoid overwhelming the system
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//       query = `after:${Math.floor(thirtyDaysAgo.getTime() / 1000)}`;
//     }
//     // Fetch emails (with pagination)
//     let pageToken = '';
//     let hasMorePages = true;
//     while (hasMorePages) {
//       const emailsResponse = await fetchEmails(accessToken, query, pageToken);
//       const messages = emailsResponse.messages || [];
//       // Process each email
//       for (const message of messages) {
//         try {
//           const emailDetails = await fetchEmailDetails(accessToken, message.id);
//           const parsedEmail = parseEmailDetails(emailDetails);
//           // Store email in database
//           await supabase.from('emails').upsert({
//             account_id: accountId,
//             ...parsedEmail,
//           });
//           emailsProcessed++;
//         } catch (error) {
//           console.error(`Error processing email ${message.id}:`, error);
//           // Continue with next email
//         }
//       }
//       // Check if there are more pages
//       pageToken = emailsResponse.nextPageToken;
//       hasMorePages = !!pageToken;
//       // Limit to 500 emails per sync to avoid timeouts
//       if (emailsProcessed >= 500) {
//         hasMorePages = false;
//       }
//     }
//     // Update sync status and last_sync timestamp - LIKE ORIGINAL
//     const now = new Date().toISOString();
//     await supabase
//       .from('gmail_tokens')
//       .update({
//         last_sync: now,
//       })
//       .eq('id', tokenData.id);
//     // Update sync status
//     await supabase
//       .from('email_sync_status')
//       .update({
//         status: 'completed',
//         emails_synced: emailsProcessed,
//         completed_at: now,
//       })
//       .eq('id', syncStatus.id);
//     return NextResponse.json({
//       success: true,
//       emailsProcessed,
//     });
//   } catch (error) {
//     console.error('Sync error:', error);
//     // Try to update sync status if possible
//     try {
//       const supabase = getSupabaseServerAdminClient();
//       const { data: syncStatuses } = await supabase
//         .from('email_sync_status')
//         .select('id')
//         .eq('status', 'in_progress')
//         .order('started_at', { ascending: false })
//         .limit(1);
//       if (syncStatuses && syncStatuses.length > 0) {
//         await supabase
//           .from('email_sync_status')
//           .update({
//             status: 'failed',
//             error_message:
//               error instanceof Error ? error.message : 'Unknown error',
//             completed_at: new Date().toISOString(),
//           })
//           .eq('id', syncStatuses[0].id);
//       }
//     } catch (logError) {
//       console.error('Failed to update sync status:', logError);
//     }
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  fetchEmailDetails,
  fetchEmails,
  parseEmailDetails,
  refreshGoogleToken,
} from '~/home/[account]/emails/_lib/utils';

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerAdminClient();
    const { accountId, email } = await request.json();

    if (!accountId || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Create sync status entry
    const { data: syncStatus, error: syncStatusError } = await supabase
      .from('email_sync_status')
      .insert({
        account_id: accountId,
        email,
        status: 'in_progress',
        emails_synced: 0,
      })
      .select()
      .single();

    if (syncStatusError) {
      console.error('Error creating sync status:', syncStatusError);
      return NextResponse.json(
        { error: 'Failed to create sync status' },
        { status: 500 },
      );
    }

    // Get Gmail token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .eq('email_address', email)
      .single();

    if (tokenError || !tokenData) {
      await supabase
        .from('email_sync_status')
        .update({
          status: 'failed',
          error_message: 'Gmail token not found',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncStatus.id);

      return NextResponse.json(
        { error: 'Gmail token not found' },
        { status: 404 },
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    let expiresAt = new Date(tokenData.expires_at);

    if (expiresAt < new Date()) {
      try {
        const { access_token, expires_at } = await refreshGoogleToken(
          tokenData.refresh_token,
        );
        accessToken = access_token;
        expiresAt = new Date(expires_at);

        // Update token in database
        await supabase
          .from('gmail_tokens')
          .update({
            access_token,
            expires_at,
            sync_status: 'syncing',
          })
          .eq('id', tokenData.id);
      } catch (error) {
        console.error('Error refreshing token:', error);

        // Update both tables on token refresh failure
        await supabase
          .from('email_sync_status')
          .update({
            status: 'failed',
            error_message: 'Failed to refresh token',
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncStatus.id);

        await supabase
          .from('gmail_tokens')
          .update({
            sync_status: 'failed',
          })
          .eq('id', tokenData.id);

        return NextResponse.json(
          { error: 'Failed to refresh token' },
          { status: 401 },
        );
      }
    } else {
      // Token is valid, just update sync status to syncing
      await supabase
        .from('gmail_tokens')
        .update({
          sync_status: 'syncing',
        })
        .eq('id', tokenData.id);
    }

    // Determine query based on last sync time - SIMPLE LOGIC LIKE ORIGINAL
    let query = '';
    let emailsProcessed = 0;

    if (tokenData.last_sync) {
      // Convert to RFC 3339 format for Gmail API
      const lastSyncDate = new Date(tokenData.last_sync);
      query = `after:${Math.floor(lastSyncDate.getTime() / 1000)}`;
    } else {
      // First sync - limit to last 30 days to avoid overwhelming the system
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = `after:${Math.floor(thirtyDaysAgo.getTime() / 1000)}`;
    }

    // Fetch emails (with pagination)
    let pageToken = '';
    let hasMorePages = true;

    while (hasMorePages) {
      const emailsResponse = await fetchEmails(accessToken, query, pageToken);
      const messages = emailsResponse.messages || [];

      // Process each email
      for (const message of messages) {
        try {
          const emailDetails = await fetchEmailDetails(accessToken, message.id);
          const parsedEmail = parseEmailDetails(emailDetails);

          // Store email in database
          await supabase.from('emails').upsert({
            account_id: accountId,
            ...parsedEmail,
          });

          emailsProcessed++;
        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error);
          // Continue with next email
        }
      }

      // Check if there are more pages
      pageToken = emailsResponse.nextPageToken;
      hasMorePages = !!pageToken;

      // Limit to 500 emails per sync to avoid timeouts
      if (emailsProcessed >= 500) {
        hasMorePages = false;
      }
    }

    // Update sync status and last_sync timestamp - LIKE ORIGINAL
    const now = new Date().toISOString();
    await supabase
      .from('gmail_tokens')
      .update({
        last_sync: now,
        sync_status: 'completed',
      })
      .eq('id', tokenData.id);

    // Update sync status
    await supabase
      .from('email_sync_status')
      .update({
        status: 'completed',
        emails_synced: emailsProcessed,
        completed_at: now,
      })
      .eq('id', syncStatus.id);

    return NextResponse.json({
      success: true,
      emailsProcessed,
    });
  } catch (error) {
    console.error('Sync error:', error);

    // Try to update sync status if possible
    try {
      const supabase = getSupabaseServerAdminClient();
      const { accountId, email } = await request.json();

      const { data: syncStatuses } = await supabase
        .from('email_sync_status')
        .select('id')
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      if (syncStatuses && syncStatuses.length > 0) {
        await supabase
          .from('email_sync_status')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncStatuses[0].id);
      }

      // Also update gmail_tokens sync_status to failed in main error
      try {
        await supabase
          .from('gmail_tokens')
          .update({
            sync_status: 'failed',
          })
          .eq('account_id', accountId)
          .eq('email_address', email);
      } catch (tokenError) {
        console.error('Failed to update gmail_tokens sync_status:', tokenError);
      }
    } catch (logError) {
      console.error('Failed to update sync status:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
