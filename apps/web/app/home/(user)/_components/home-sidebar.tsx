import { If } from '@kit/ui/if';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
} from '@kit/ui/shadcn-sidebar';
import { cn } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import featuresFlagConfig from '~/config/feature-flags.config';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { UserNotifications } from '~/home/(user)/_components/user-notifications';

// home imports
import type { UserWorkspace } from '../_lib/server/load-user-workspace';
import { HomeAccountSelector } from './home-account-selector';
import { InvitationCountBadge } from './invitation-count-badge';

interface HomeSidebarProps {
  workspace: UserWorkspace;
}

export function HomeSidebar(props: HomeSidebarProps) {
  const { workspace, user, accounts } = props.workspace;
  const collapsible = personalAccountNavigationConfig.sidebarCollapsedStyle;

  return (
    <Sidebar collapsible={collapsible}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div className={'flex items-center justify-between gap-x-3'}>
          <If
            condition={featuresFlagConfig.enableTeamAccounts}
            fallback={
              <AppLogo
                className={cn(
                  'p-2 group-data-[minimized=true]:max-w-full group-data-[minimized=true]:py-0',
                )}
              />
            }
          >
            <HomeAccountSelector userId={user.id} accounts={accounts} />
          </If>

          <div className={'group-data-[minimized=true]:hidden flex items-center'}>
            <UserNotifications userId={user.id} />
            <InvitationCountBadge />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={personalAccountNavigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        <ProfileAccountDropdownContainer user={user} account={workspace} />
      </SidebarFooter>
    </Sidebar>
  );
}
