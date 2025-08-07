import { use } from 'react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { DashboardDemo } from './_components/dashboard-demo';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import { redirect } from 'next/navigation';
import pathsConfig from '~/config/paths.config';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:home.pageTitle');

  return {
    title,
  };
};

function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = use(params).account;

  // can we redirect to the dealflow page from here? Here is the code. Where is useRedirect?
  // const { useRedirect } = require('next/navigation');

  redirect(pathsConfig.app.accountDealflow.replace('[account]', account));

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:routes.dashboard'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <DashboardDemo />
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
