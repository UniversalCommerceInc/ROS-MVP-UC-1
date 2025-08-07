'use client';

import { useTransition } from 'react';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';

import { syncEmailsAction } from '../_lib/server/server-actions';

interface SyncEmailsButtonProps {
  accountId: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export function SyncEmailsButton({
  accountId,
  variant = 'outline',
  size = 'sm',
  children = 'Sync Now',
}: SyncEmailsButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      try {
        const result = await syncEmailsAction({ accountId });
        if (result.success) {
          toast.success('Email sync started');
        } else {
          toast.error(result.error || 'Failed to start email sync');
        }
      } catch (error) {
        toast.error('Failed to start email sync');
        console.error('Email sync error:', error);
      }
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={isPending}
    >
      {isPending ? 'Syncing...' : children}
    </Button>
  );
}
