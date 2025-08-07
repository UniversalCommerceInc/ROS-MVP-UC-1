'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { toast } from '@kit/ui/sonner';

export function OAuthToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      toast.success('Gmail account connected successfully!');
      // Remove the query param
      router.replace(window.location.pathname);
    } else if (error) {
      const errorMessages = {
        oauth_failed: 'Gmail connection was cancelled or failed',
        invalid_request: 'Invalid OAuth request',
        connection_failed: 'Failed to connect Gmail account',
      };

      const message =
        errorMessages[error as keyof typeof errorMessages] ||
        'Gmail connection failed';
      toast.error(message);

      // Remove the query param
      router.replace(window.location.pathname);
    }
  }, [searchParams, router]);

  return null;
}
