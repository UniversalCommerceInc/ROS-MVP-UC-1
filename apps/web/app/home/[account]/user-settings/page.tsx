import { PersonalAccountSettingsContainer } from '@kit/accounts/personal-account-settings';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import authConfig from '~/config/auth.config';
import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:settingsTab');

  return {
    title,
  };
};

const features = {
  enableAccountDeletion: featureFlagsConfig.enableAccountDeletion,
  enablePasswordUpdate: authConfig.providers.password,
};

const callbackPath = pathsConfig.auth.callback;
const accountHomePath = pathsConfig.app.accountHome;

const paths = {
  callback: callbackPath + `?next=${accountHomePath}`,
};

interface TeamAccountUserSettingsPageProps {
  params: Promise<{ account: string }>;
}

async function TeamAccountUserSettingsPage(props: TeamAccountUserSettingsPageProps) {
  const user = await requireUserInServerComponent();
  const { account: accountSlug } = await props.params;
  
  // Get team account data
  const api = createTeamAccountsApi(getSupabaseServerClient());
  const teamAccount = await api.getTeamAccount(accountSlug);

  return (
    <>
      <PageHeader title={'User Settings'} description={<AppBreadcrumbs />} />
      <PageBody>
        <div className={'flex w-full flex-1 flex-col lg:max-w-2xl'}>
          <PersonalAccountSettingsContainer
            userId={user.id}
            features={features}
            paths={paths}
            teamAccountId={teamAccount.id}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountUserSettingsPage);
