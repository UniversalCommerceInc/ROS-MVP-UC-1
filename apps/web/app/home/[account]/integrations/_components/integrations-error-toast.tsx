'use client';

import { useEffect } from 'react';

import { toast } from '@kit/ui/sonner';

export function IntegrationsErrorToast({ error }: { error?: string }) {
  useEffect(() => {
    if (error === 'slack_storage_failed') {
      toast.error(
        'Failed to connect Slack — this workspace might already be linked to another team.',
      );
    }
  }, [error]);

  return null;
}
