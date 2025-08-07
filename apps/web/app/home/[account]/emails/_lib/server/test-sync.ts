'use server';

import { google } from 'googleapis';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function testGmailSync(accountId: string): Promise<{
  success: boolean;
  hasTokens: boolean;
  error?: string;
  tokenValid?: boolean;
  profileData?: {
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
  };
}> {
  const logger = await getLogger();
  const supabase = getSupabaseServerClient();

  try {
    logger.info('Testing Gmail sync for account', { accountId });

    // 1. Check if account exists
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !accountData) {
      logger.error('Account not found', { accountId, accountError });
      return {
        success: false,
        hasTokens: false,
        error: 'Account not found',
      };
    }

    // 2. Check if Gmail tokens exist
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      logger.info('No Gmail tokens found', { accountId, tokenError });
      return {
        success: true,
        hasTokens: false,
        error: 'No Gmail tokens found for this account',
      };
    }

    // 3. Test if tokens are valid by making a simple API call
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      let accessToken = tokenData.access_token;

      if (now >= expiresAt) {
        logger.info('Token expired, attempting refresh', { accountId });

        oauth2Client.setCredentials({
          refresh_token: tokenData.refresh_token,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        if (!credentials.access_token) {
          throw new Error('Failed to refresh access token');
        }

        accessToken = credentials.access_token;

        // Update token in database
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: credentials.access_token,
            expires_at: new Date(
              Date.now() + (credentials.expiry_date || 3600000),
            ).toISOString(),
          })
          .eq('account_id', accountId);

        logger.info('Token refreshed successfully', { accountId });
      }

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: tokenData.refresh_token,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Simple test - get user profile
      const profile = await gmail.users.getProfile({ userId: 'me' });

      logger.info('Gmail API test successful', {
        accountId,
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
      });

      return {
        success: true,
        hasTokens: true,
        tokenValid: true,
        profileData: {
          emailAddress: profile.data.emailAddress || '',
          messagesTotal: profile.data.messagesTotal || 0,
          threadsTotal: profile.data.threadsTotal || 0,
        },
      };
    } catch (apiError) {
      logger.error('Gmail API test failed', { accountId, apiError });
      return {
        success: false,
        hasTokens: true,
        tokenValid: false,
        error: `Gmail API test failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
      };
    }
  } catch (error) {
    logger.error('Test Gmail sync failed', { accountId, error });
    return {
      success: false,
      hasTokens: false,
      error: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
