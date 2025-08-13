import { redirect } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';
import { PendingInvitations } from './_components/pending-invitations';
import { loadUserInvitations } from './_lib/server/load-user-invitations';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');

  return {
    title,
  };
};

async function UserHomePage() {
  const invitations = await loadUserInvitations();

  // If user has no pending invitations, check if they should be redirected to a team workspace
  if (invitations.length === 0) {
    const shouldRedirect = await checkForTeamRedirect();
    if (shouldRedirect) {
      redirect(shouldRedirect);
    }
  }

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.home'} />}
        description={<Trans i18nKey={'common:homeTabDescription'} />}
      />

      <PageBody>
        <div className="space-y-6">
          <PendingInvitations invitations={invitations} />
          
          {invitations.length === 0 && (
            <div className="text-center text-muted-foreground">
              <Trans i18nKey={'common:welcome'} defaults="Welcome to your dashboard!" />
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}

async function checkForTeamRedirect(): Promise<string | null> {
  try {
    const client = getSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) return null;

    // Check if user has any team memberships
    const { data: memberships } = await client
      .from('accounts_memberships')
      .select(`
        account_id,
        accounts!inner(slug, is_personal_account)
      `)
      .eq('user_id', user.id)
      .eq('accounts.is_personal_account', false)
      .limit(1);

    if (memberships && memberships.length > 0) {
      const membership = memberships[0];
      const teamAccount = membership?.accounts;
      if (teamAccount && !teamAccount.is_personal_account) {
        console.log('🔄 Redirecting team member to dealflow:', {
          userId: user.id,
          teamSlug: teamAccount.slug,
          redirectTo: `/home/${teamAccount.slug}/dealflow`
        });
        return `/home/${teamAccount.slug}/dealflow`;
      }
    } else {
      // No team memberships found, redirect to vellora-sales dealflow as fallback
      console.log('🔄 No team memberships found, redirecting to vellora-sales dealflow:', {
        userId: user.id,
        redirectTo: '/home/vellora-sales/dealflow'
      });
      return '/home/vellora-sales/dealflow';
    }

    return null;
  } catch (error) {
    console.error('Error checking for team redirect:', error);
    return null;
  }
}

export default withI18n(UserHomePage);
