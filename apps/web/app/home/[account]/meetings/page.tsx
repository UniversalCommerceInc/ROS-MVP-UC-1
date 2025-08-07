import { formatDistanceToNow } from 'date-fns';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { PageBody } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

// Local imports
import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import { GmailConnectButton } from '../emails/_components/gmail-connect-button';
import { MeetingsClient } from './_components/meetings-client';
import { getMeetings } from './_lib/actions/meetings.actions';

interface TeamAccountMeetingsPageProps {
  params: Promise<{ account: string }>;
  searchParams?: Promise<{
    offset?: string;
    search?: string;
    impact?: string;
    dateFrom?: string;
    dateTo?: string;
    view?: 'timeline' | 'insights' | 'analytics';
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('common:meetings');

  return {
    title,
  };
};

// Force dynamic rendering since this page uses server actions and cookies
export const dynamic = 'force-dynamic';

async function TeamAccountMeetingsPage(props: TeamAccountMeetingsPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const account = params.account;

  // Get the current team workspace to access the account ID
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  // Check calendar permissions for THIS specific account
  // const permissionsResult = await checkGmailCalendarPermissionsAction({
  //   accountId,
  // });
  // const needsCalendarConnection =
  //   !permissionsResult.hasCalendar && permissionsResult.needsReconnect;

  // Fetch meetings data using account ID
  const result = await getMeetings(accountId);

  // Add server-side debug logging
  console.log('🔍 SERVER PAGE DEBUG:', {
    accountId,
    resultType: typeof result,
    resultLength: Array.isArray(result) ? result.length : 'not array',
    resultStructure: Array.isArray(result) ? result[0] : result,
    firstFewTitles: Array.isArray(result)
      ? result.slice(0, 3).map((m) => m.title || m.dealName || 'No title')
      : 'N/A',
  });

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:meetings'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="space-y-6">
          {/* Connection Status Logic - Show only ONE alert */}

          {/* No Gmail/Calendar Connection Alert - Show if missing either */}
          {/* <If
            condition={
              !permissionsResult.hasGmail ||
              (!permissionsResult.hasCalendar && permissionsResult.hasGmail)
            }
          >
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {!permissionsResult.hasGmail
                        ? 'Gmail & Calendar connection required'
                        : 'Calendar access required'}
                    </span>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {!permissionsResult.hasGmail
                        ? 'Connect your Google account to access Gmail and Calendar features for meeting management.'
                        : 'You have Gmail connected but need to grant calendar permissions to sync meeting events.'}
                    </p>
                  </div>
                  <GmailConnectButton
                    accountId={accountId}
                    variant={
                      !permissionsResult.hasGmail ? 'default' : 'outline'
                    }
                    size="sm"
                  >
                    {!permissionsResult.hasGmail
                      ? 'Connect Gmail & Calendar'
                      : 'Add Calendar Access'}
                  </GmailConnectButton>
                </div>
              </AlertDescription>
            </Alert>
          </If> */}

          {/* Connection Status (if connected) */}
          {/* <If
            condition={
              permissionsResult.hasGmail && permissionsResult.hasCalendar
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Calendar Integration</h2>
                <p className="text-muted-foreground text-sm">
                  Connected: {permissionsResult.email} •
                  {permissionsResult.connectedAt && (
                    <>
                      {' '}
                      Connected{' '}
                      {formatDistanceToNow(
                        new Date(permissionsResult.connectedAt),
                        { addSuffix: true },
                      )}
                    </>
                  )}
                  • Account: {account}
                </p>
              </div>
              <Badge variant="secondary" className="text-green-600">
                ✓ Calendar Connected
              </Badge>
            </div>
          </If> */}

          <MeetingsClient
            meetings={result || []}
            accountId={accountId}
            account={account}
            // searchParams={searchParams}
          />
        </div>
      </PageBody>
    </>
  );
}

export default TeamAccountMeetingsPage;
