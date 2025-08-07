import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Helper function to refresh token if expired
export async function refreshMicrosoftToken(accountId: string): Promise<{
  success: boolean;
  access_token?: string;
  expires_at?: string;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    // Get current token data from database
    const { data: tokenData, error: fetchError } = await supabase
      .from('microsoft_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (fetchError || !tokenData) {
      logger.error('No Microsoft tokens found for account', {
        accountId,
        fetchError,
      });
      return {
        success: false,
        error: 'Microsoft account not connected',
      };
    }

    // Check if token is actually expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now < expiresAt) {
      // Token is still valid, return current token
      return {
        success: true,
        access_token: tokenData.access_token,
        expires_at: tokenData.expires_at,
      };
    }

    logger.info('Refreshing expired Microsoft token', { accountId });

    // Make request to Microsoft's token endpoint
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
          scope:
            tokenData.scope ||
            'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access',
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Failed to refresh Microsoft token', {
        accountId,
        status: tokenResponse.status,
        error: errorText,
      });

      throw new Error(
        `Failed to refresh token: ${tokenResponse.status} ${errorText}`,
      );
    }

    const newTokenData = await tokenResponse.json();

    // Calculate new expiry time
    const expiresIn = newTokenData.expires_in || 3600; // Default to 1 hour
    const newExpiryDate = new Date();
    newExpiryDate.setSeconds(newExpiryDate.getSeconds() + expiresIn);
    const newExpiresAt = newExpiryDate.toISOString();

    // Update token in database
    const { error: updateError } = await supabase
      .from('microsoft_tokens')
      .update({
        access_token: newTokenData.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
        // Update refresh token if provided
        ...(newTokenData.refresh_token && {
          refresh_token: newTokenData.refresh_token,
        }),
      })
      .eq('account_id', accountId);

    if (updateError) {
      logger.error('Failed to update refreshed token in database', {
        accountId,
        updateError,
      });
      throw updateError;
    }

    logger.info('Successfully refreshed Microsoft token', { accountId });

    return {
      success: true,
      access_token: newTokenData.access_token,
      expires_at: newExpiresAt,
    };
  } catch (error) {
    logger.error('Error refreshing Microsoft token', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh token',
    };
  }
}

// Helper function to get valid access token (refreshing if needed)
export async function getValidMicrosoftToken(accountId: string): Promise<{
  success: boolean;
  access_token?: string;
  error?: string;
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    // Get current token data
    const { data: tokenData, error: fetchError } = await supabase
      .from('microsoft_tokens')
      .select('access_token, expires_at')
      .eq('account_id', accountId)
      .single();

    if (fetchError || !tokenData) {
      return {
        success: false,
        error: 'Microsoft account not connected',
      };
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now >= expiresAt) {
      // Token is expired, refresh it
      const refreshResult = await refreshMicrosoftToken(accountId);
      if (!refreshResult.success) {
        return {
          success: false,
          error: refreshResult.error || 'Failed to refresh token',
        };
      }
      return {
        success: true,
        access_token: refreshResult.access_token,
      };
    }

    // Token is still valid
    return {
      success: true,
      access_token: tokenData.access_token,
    };
  } catch (error) {
    logger.error('Error getting valid Microsoft token', { accountId, error });
    return {
      success: false,
      error: 'Failed to get valid token',
    };
  }
}
