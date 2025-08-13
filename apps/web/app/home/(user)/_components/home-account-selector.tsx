'use client';

import { useContext } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { AccountSelector } from '@kit/accounts/account-selector';
import { type PendingInvitation } from '@kit/accounts/hooks/use-pending-invitations';
import { SidebarContext } from '@kit/ui/shadcn-sidebar';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const features = {
  enableTeamCreation: featureFlagsConfig.enableTeamCreation,
};

export function HomeAccountSelector(props: {
  accounts: Array<{
    label: string | null;
    value: string | null;
    image: string | null;
  }>;

  userId: string;
  collisionPadding?: number;
}) {
  const router = useRouter();
  const context = useContext(SidebarContext);

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    try {
      // Navigate to the join page which uses the existing server action
      const joinUrl = `/join?invite_token=${invitation.invite_token}`;
      router.push(joinUrl);
    } catch (error) {
      console.error('Error navigating to join page:', error);
      toast.error('Failed to process invitation');
    }
  };

  return (
    <AccountSelector
      collapsed={!context?.open}
      collisionPadding={props.collisionPadding ?? 20}
      accounts={props.accounts}
      features={features}
      userId={props.userId}
      onAccountChange={(value) => {
        if (value) {
          const path = pathsConfig.app.accountHome.replace('[account]', value);
          router.replace(path);
        }
      }}
      onAcceptInvitation={handleAcceptInvitation}
    />
  );
}
