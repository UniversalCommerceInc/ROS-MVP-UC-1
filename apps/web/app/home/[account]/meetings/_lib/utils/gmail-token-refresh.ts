// utils/gmail-token-refresh.ts
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  needsReconnect?: boolean;
}

interface GmailTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  email_address: string;
}

/**
 * Refresh Gmail access token using refresh token
 */
export async function refreshGmailToken(
  accountId: string,
): Promise<TokenRefreshResult> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    logger.info('Starting Gmail token refresh', { accountId });

    // Get current token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      logger.error('No Gmail tokens found for refresh', {
        accountId,
        tokenError,
      });
      return {
        success: false,
        error: 'No Gmail tokens found',
        needsReconnect: true,
      };
    }

    if (!tokenData.refresh_token) {
      logger.error('No refresh token available', { accountId });
      return {
        success: false,
        error: 'No refresh token available',
        needsReconnect: true,
      };
    }

    // Check if token is actually expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresAt.getTime() > now.getTime() + bufferTime) {
      logger.info('Token is still valid, no refresh needed', {
        accountId,
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
      });
      return {
        success: true,
        accessToken: tokenData.access_token,
      };
    }

    logger.info('Token expired, refreshing...', {
      accountId,
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
    });

    // Refresh the token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      logger.error('Token refresh failed', {
        accountId,
        status: refreshResponse.status,
        error: errorText,
      });

      // If refresh token is invalid, user needs to reconnect
      if (refreshResponse.status === 400) {
        return {
          success: false,
          error: 'Refresh token invalid - reconnection required',
          needsReconnect: true,
        };
      }

      return {
        success: false,
        error: `Token refresh failed: ${errorText}`,
      };
    }

    const refreshData = await refreshResponse.json();

    if (!refreshData.access_token) {
      logger.error('No access token in refresh response', {
        accountId,
        refreshData,
      });
      return {
        success: false,
        error: 'Invalid refresh response',
      };
    }

    // Calculate new expiry time
    const expiresIn = refreshData.expires_in || 3600; // Default to 1 hour
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Update token in database
    const updateData: any = {
      access_token: refreshData.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    };

    // Update refresh token if provided (Google sometimes sends a new one)
    if (refreshData.refresh_token) {
      updateData.refresh_token = refreshData.refresh_token;
    }

    const { error: updateError } = await supabase
      .from('gmail_tokens')
      .update(updateData)
      .eq('account_id', accountId);

    if (updateError) {
      logger.error('Failed to update refreshed token', {
        accountId,
        updateError,
      });
      return {
        success: false,
        error: 'Failed to save refreshed token',
      };
    }

    logger.info('Token refreshed successfully', {
      accountId,
      newExpiresAt,
      hasNewRefreshToken: !!refreshData.refresh_token,
    });

    return {
      success: true,
      accessToken: refreshData.access_token,
    };
  } catch (error) {
    logger.error('Error during token refresh', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: 'Token refresh failed',
    };
  }
}

/**
 * Get valid Gmail access token, refreshing if necessary
 */
export async function getValidGmailToken(
  accountId: string,
): Promise<TokenRefreshResult> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    // First try to get current token
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, expires_at')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      return {
        success: false,
        error: 'No Gmail tokens found',
        needsReconnect: true,
      };
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresAt.getTime() > now.getTime() + bufferTime) {
      // Token is still valid
      return {
        success: true,
        accessToken: tokenData.access_token,
      };
    }

    // Token is expired, refresh it
    logger.info('Token expired, attempting refresh', { accountId });
    return await refreshGmailToken(accountId);
  } catch (error) {
    logger.error('Error getting valid Gmail token', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: 'Failed to get valid token',
    };
  }
}

/**
 * Wrapper for Google API calls with automatic token refresh
 */
export async function makeAuthenticatedGoogleRequest(
  accountId: string,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const logger = await getLogger();

  // Get valid token
  const tokenResult = await getValidGmailToken(accountId);

  if (!tokenResult.success || !tokenResult.accessToken) {
    throw new Error(tokenResult.error || 'Failed to get valid token');
  }

  // Make the API call
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenResult.accessToken}`,
    },
  });

  // If we get 401, try refreshing token once more
  if (response.status === 401) {
    logger.info('Got 401, attempting token refresh', { accountId, url });

    const refreshResult = await refreshGmailToken(accountId);

    if (!refreshResult.success || !refreshResult.accessToken) {
      throw new Error('Token refresh failed after 401');
    }

    // Retry the request with new token
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${refreshResult.accessToken}`,
      },
    });
  }

  return response;
}
