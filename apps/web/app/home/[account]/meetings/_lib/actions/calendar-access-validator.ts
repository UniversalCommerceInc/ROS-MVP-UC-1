// Create this file at: ~/home/[account]/meetings/_lib/actions/calendar-access-validator.ts
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface CalendarAccessResult {
  hasAccess: boolean;
  needsReconnect: boolean;
  error?: string;
  scopeIssue?: boolean;
}

/**
 * Validate that the account has proper calendar access (simplified version)
 */
export async function validateCalendarAccess(
  accountId: string,
): Promise<CalendarAccessResult> {
  const logger = await getLogger();

  try {
    const supabase = getSupabaseServerClient();

    logger.info('Validating calendar access', { accountId });

    // Check if Gmail tokens exist and have calendar scope
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('scope, email_address, access_token, expires_at, refresh_token')
      .eq('account_id', accountId)
      .single();

    if (tokenError || !tokenData) {
      logger.error('No Gmail tokens found', { accountId, tokenError });
      return {
        hasAccess: false,
        needsReconnect: true,
        error: 'Gmail account not connected',
      };
    }

    // Check scope
    const scope = tokenData.scope || '';
    const hasCalendarScope =
      scope.includes('calendar.readonly') || scope.includes('calendar');

    if (!hasCalendarScope) {
      logger.warn('Gmail token missing calendar scope', {
        accountId,
        email: tokenData.email_address,
        currentScope: scope.substring(0, 100) + '...',
      });
      return {
        hasAccess: false,
        needsReconnect: true,
        scopeIssue: true,
        error:
          'Calendar permissions not granted. Please reconnect your Gmail account to enable calendar sync.',
      };
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at)
      : null;

    if (expiresAt && now >= expiresAt) {
      logger.warn('Gmail token is expired', {
        accountId,
        email: tokenData.email_address,
        expiresAt: expiresAt.toISOString(),
      });
      return {
        hasAccess: false,
        needsReconnect: true,
        error: 'Gmail token expired. Please reconnect your Gmail account.',
      };
    }

    // Quick validation - just check if we have a valid access token
    if (!tokenData.access_token) {
      logger.error('No access token found', { accountId });
      return {
        hasAccess: false,
        needsReconnect: true,
        error: 'No valid access token found',
      };
    }

    logger.info('Calendar access validation passed', {
      accountId,
      email: tokenData.email_address,
      hasScope: hasCalendarScope,
      tokenValid: !!tokenData.access_token,
    });

    return {
      hasAccess: true,
      needsReconnect: false,
    };
  } catch (error) {
    logger.error('Error validating calendar access', {
      accountId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      hasAccess: false,
      needsReconnect: true,
      error: 'Failed to validate calendar access',
    };
  }
}

/**
 * Get user-friendly error message for calendar access issues
 */
export function getCalendarErrorMessage(result: CalendarAccessResult): string {
  if (result.hasAccess) {
    return '';
  }

  if (result.scopeIssue) {
    return 'Calendar permissions required. Please click "Connect Gmail" and grant calendar access.';
  }

  if (result.needsReconnect) {
    return (
      result.error ||
      'Please reconnect your Gmail account to enable calendar sync.'
    );
  }

  return result.error || 'Calendar access unavailable.';
}
