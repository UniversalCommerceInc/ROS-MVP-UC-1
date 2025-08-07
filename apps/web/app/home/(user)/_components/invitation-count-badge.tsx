import { Badge } from '@kit/ui/badge';
import { If } from '@kit/ui/if';

import { loadUserInvitations } from '../_lib/server/load-user-invitations';

export async function InvitationCountBadge() {
  const invitations = await loadUserInvitations();
  const count = invitations.length;

  return (
    <If condition={count > 0}>
      <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
        {count}
      </Badge>
    </If>
  );
} 