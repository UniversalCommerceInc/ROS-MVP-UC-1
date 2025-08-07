import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { HomeAccountsList } from '~/home/(user)/_components/home-accounts-list';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { ClearTeamCookie } from './_components/clear-team-cookie';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');

  return {
    title,
  };
};

function TeamsPage() {
  return (
    <div className={'container flex flex-col flex-1 h-screen'}>
      <ClearTeamCookie />
      
      <PageHeader
        title={<Trans i18nKey={'common:routes.home'} />}
        description={<Trans i18nKey={'common:homeTabDescription'} />}
      />

      <PageBody>
        <HomeAccountsList />
      </PageBody>
    </div>
  );
}

export default withI18n(TeamsPage);
