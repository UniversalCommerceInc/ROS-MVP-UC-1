'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ProfileAvatar } from '@kit/ui/profile-avatar';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { UserInvitation } from '../_lib/server/load-user-invitations';

interface PendingInvitationsProps {
  invitations: UserInvitation[];
}

export function PendingInvitations({ invitations }: PendingInvitationsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  console.log('🎨 PendingInvitations component rendered with:', { 
    invitationCount: invitations.length, 
    invitations 
  });

  const handleAcceptInvitation = (inviteToken: string, accountSlug: string) => {
    // Redirect to the join page with the invite token
    router.push(`/join?invite_token=${inviteToken}`);
  };

  if (invitations.length === 0) {
    console.log('❌ PendingInvitations: No invitations to display');
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm">
        <strong>Debug:</strong> No pending invitations found (count: {invitations.length})
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="teams:pendingInvitations" defaults="Pending Team Invitations" />
        </CardTitle>
        <CardDescription>
          <Trans 
            i18nKey="teams:pendingInvitationsDescription" 
            defaults="You have been invited to join these teams"
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center space-x-4">
              <If condition={invitation.account_picture_url}>
                {(url) => (
                  <ProfileAvatar
                    displayName={invitation.account_name}
                    pictureUrl={url}
                  />
                )}
              </If>
              
              <If condition={!invitation.account_picture_url}>
                <ProfileAvatar
                  text={invitation.account_name}
                />
              </If>

              <div>
                <h4 className="font-medium">{invitation.account_name}</h4>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.invited_by_name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary">
                    {invitation.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleAcceptInvitation(invitation.invite_token, invitation.account_slug)}
                disabled={isPending}
              >
                <Trans i18nKey="teams:acceptInvitation" defaults="Accept" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
              >
                <Trans i18nKey="teams:declineInvitation" defaults="Decline" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 