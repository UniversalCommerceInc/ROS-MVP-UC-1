// integrations/page.tsx
import { Alert, AlertDescription } from '@kit/ui/alert';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { If } from '@kit/ui/if';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

// local imports
import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import { IntegrationsErrorToast } from './_components/integrations-error-toast';
import { IntegrationsGrid } from './_components/integrations-grid';
import { getIntegrationStatus } from './_lib/server/integrations.service';

interface TeamAccountIntegrationsPageProps {
  params: Promise<{ account: string }>;
  searchParams?: Promise<{
    platform?: string;
    status?: string;
    error?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('common:integrations');

  return {
    title,
  };
};

async function TeamAccountIntegrationsPage({
  params,
  searchParams,
}: TeamAccountIntegrationsPageProps) {
  const account = (await params).account;
  const search = await searchParams;
  const error = search?.error;
  // Get the current team workspace to access the account ID
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  // Get integration status for all platforms
  const integrationStatus = await getIntegrationStatus(accountId);

  const hasAnyConnection = Object.values(integrationStatus).some(
    (status) => status.isConnected,
  );

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:integrations'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="space-y-6">
          {/* Integration Connection Status */}
          <If condition={!hasAnyConnection}>
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Connect your business platforms to streamline workflows and
                    unlock powerful insights.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </If>

          {/* Integrations Grid */}
          <IntegrationsGrid
            accountId={accountId}
            accountName={account}
            integrationStatus={integrationStatus}
          />
          <IntegrationsErrorToast error={error} />
        </div>
      </PageBody>
    </>
  );
}

export default TeamAccountIntegrationsPage;
