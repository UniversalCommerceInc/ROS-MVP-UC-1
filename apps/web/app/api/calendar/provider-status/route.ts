// import { NextResponse } from 'next/server';
// import { getSupabaseServerClient } from '@kit/supabase/server-client';
// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const accountId = searchParams.get('accountId');
//     if (!accountId) {
//       return NextResponse.json(
//         { error: 'Account ID is required' },
//         { status: 400 },
//       );
//     }
//     const supabase = getSupabaseServerClient();
//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser();
//     if (userError || !user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 401 });
//     }
//     // Verify account access
//     const { data: membership } = await supabase
//       .from('accounts_memberships')
//       .select('account_role')
//       .eq('account_id', accountId)
//       .eq('user_id', user.id)
//       .single();
//     if (!membership) {
//       return NextResponse.json(
//         { error: 'Access denied to this account' },
//         { status: 403 },
//       );
//     }
//     // Check Google/Gmail connection - get more details for email provider selector
//     const { data: gmailToken, error: gmailError } = await supabase
//       .from('gmail_tokens')
//       .select(
//         'access_token, expires_at, is_active, email_address, last_sync, sync_status',
//       )
//       .eq('account_id', accountId)
//       .eq('user_id', user.id)
//       .single();
//     console.log('🔍 Google token check:', {
//       hasToken: !!gmailToken?.access_token,
//       isActive: gmailToken?.is_active,
//       expiresAt: gmailToken?.expires_at,
//       isExpired: gmailToken?.expires_at
//         ? new Date(gmailToken.expires_at) <= new Date()
//         : 'no expiry date',
//       currentTime: new Date().toISOString(),
//     });
//     const googleConnected =
//       !gmailError &&
//       gmailToken &&
//       gmailToken.access_token &&
//       gmailToken.is_active !== false &&
//       new Date(gmailToken.expires_at) > new Date();
//     // Check Microsoft connection - get more details for email provider selector
//     const { data: microsoftToken, error: microsoftError } = await supabase
//       .from('microsoft_tokens')
//       .select(
//         'access_token, expires_at, is_active, email_address, last_sync, sync_status',
//       )
//       .eq('account_id', accountId)
//       .eq('user_id', user.id)
//       .single();
//     const microsoftConnected =
//       !microsoftError &&
//       microsoftToken &&
//       microsoftToken.access_token &&
//       microsoftToken.is_active !== false &&
//       new Date(microsoftToken.expires_at) > new Date();
//     // Get additional connection details for debugging and email provider selector
//     const connectionDetails = {
//       google: {
//         hasToken: !!gmailToken?.access_token,
//         isActive: gmailToken?.is_active !== false,
//         isExpired: gmailToken?.expires_at
//           ? new Date(gmailToken.expires_at) <= new Date()
//           : true,
//         expiresAt: gmailToken?.expires_at,
//         email: gmailToken?.email_address, // Add email for provider selector
//         lastSync: gmailToken?.last_sync, // Add last sync for provider selector
//         syncStatus: gmailToken?.sync_status, // Add sync status
//         error: gmailError?.message,
//       },
//       microsoft: {
//         hasToken: !!microsoftToken?.access_token,
//         isActive: microsoftToken?.is_active !== false,
//         isExpired: microsoftToken?.expires_at
//           ? new Date(microsoftToken.expires_at) <= new Date()
//           : true,
//         expiresAt: microsoftToken?.expires_at,
//         email: microsoftToken?.email_address, // Add email for provider selector
//         lastSync: microsoftToken?.last_sync, // Add last sync for provider selector
//         syncStatus: microsoftToken?.sync_status, // Add sync status
//         error: microsoftError?.message,
//       },
//     };
//     console.log('📊 Provider status check:', {
//       accountId,
//       userId: user.id,
//       google: googleConnected,
//       microsoft: microsoftConnected,
//       details: connectionDetails,
//     });
//     return NextResponse.json({
//       success: true,
//       google: googleConnected,
//       microsoft: microsoftConnected,
//       details: connectionDetails, // Include enhanced details for email provider selector
//     });
//   } catch (error) {
//     console.error('❌ Error checking provider status:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Import the token refresh utilities
import { getValidGmailToken } from '~/lib/utils/google-token-utils';
import { getValidMicrosoftToken } from '~/lib/utils/microsoft-token-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Verify account access
    const { data: membership } = await supabase
      .from('accounts_memberships')
      .select('account_role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this account' },
        { status: 403 },
      );
    }

    // Check and refresh Google/Gmail connection
    let googleConnected = false;
    let googleDetails = {
      hasToken: false,
      isActive: false,
      isExpired: true,
      expiresAt: null as string | null,
      email: null as string | null,
      lastSync: null as string | null,
      syncStatus: null as string | null,
      error: null as string | null,
      tokenRefreshed: false,
    };

    try {
      // Try to get valid Google token (will refresh if expired)
      const googleTokenResult = await getValidGmailToken(accountId);

      if (googleTokenResult.success) {
        googleConnected = true;

        // Get updated token data from database after potential refresh
        const { data: gmailToken } = await supabase
          .from('gmail_tokens')
          .select(
            'access_token, expires_at, is_active, email_address, last_sync, sync_status',
          )
          .eq('account_id', accountId)
          .eq('user_id', user.id)
          .single();

        if (gmailToken) {
          googleDetails = {
            hasToken: !!gmailToken.access_token,
            isActive: gmailToken.is_active !== false,
            isExpired: gmailToken.expires_at
              ? new Date(gmailToken.expires_at) <= new Date()
              : true,
            expiresAt: gmailToken.expires_at,
            email: gmailToken.email_address,
            lastSync: gmailToken.last_sync,
            syncStatus: gmailToken.sync_status,
            error: null,
            tokenRefreshed: true, // Token was checked/refreshed
          };
        }
      } else {
        googleDetails.error = googleTokenResult.error || 'Google token invalid';
      }
    } catch (error) {
      console.error('Error checking Google token:', error);
      googleDetails.error = 'Failed to check Google token';
    }

    // Check and refresh Microsoft connection
    let microsoftConnected = false;
    let microsoftDetails = {
      hasToken: false,
      isActive: false,
      isExpired: true,
      expiresAt: null as string | null,
      email: null as string | null,
      lastSync: null as string | null,
      syncStatus: null as string | null,
      error: null as string | null,
      tokenRefreshed: false,
    };

    try {
      // Try to get valid Microsoft token (will refresh if expired)
      const microsoftTokenResult = await getValidMicrosoftToken(accountId);

      if (microsoftTokenResult.success) {
        microsoftConnected = true;

        // Get updated token data from database after potential refresh
        const { data: microsoftToken } = await supabase
          .from('microsoft_tokens')
          .select(
            'access_token, expires_at, is_active, email_address, last_sync, sync_status',
          )
          .eq('account_id', accountId)
          .eq('user_id', user.id)
          .single();

        if (microsoftToken) {
          microsoftDetails = {
            hasToken: !!microsoftToken.access_token,
            isActive: microsoftToken.is_active !== false,
            isExpired: microsoftToken.expires_at
              ? new Date(microsoftToken.expires_at) <= new Date()
              : true,
            expiresAt: microsoftToken.expires_at,
            email: microsoftToken.email_address,
            lastSync: microsoftToken.last_sync,
            syncStatus: microsoftToken.sync_status,
            error: null,
            tokenRefreshed: true, // Token was checked/refreshed
          };
        }
      } else {
        microsoftDetails.error =
          microsoftTokenResult.error || 'Microsoft token invalid';
      }
    } catch (error) {
      console.error('Error checking Microsoft token:', error);
      microsoftDetails.error = 'Failed to check Microsoft token';
    }

    // Enhanced connection details with refresh info
    const connectionDetails = {
      google: googleDetails,
      microsoft: microsoftDetails,
    };

    console.log('📊 Provider status check (with refresh):', {
      accountId,
      userId: user.id,
      google: googleConnected,
      microsoft: microsoftConnected,
      googleRefreshed: googleDetails.tokenRefreshed,
      microsoftRefreshed: microsoftDetails.tokenRefreshed,
      details: connectionDetails,
    });

    return NextResponse.json({
      success: true,
      google: googleConnected,
      microsoft: microsoftConnected,
      details: connectionDetails,
      refreshed_at: new Date().toISOString(), // Timestamp when tokens were checked
    });
  } catch (error) {
    console.error('❌ Error checking provider status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
