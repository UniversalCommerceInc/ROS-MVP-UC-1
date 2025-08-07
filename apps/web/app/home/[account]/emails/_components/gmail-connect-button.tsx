'use client';

import { useTransition } from 'react';

import { Calendar, Loader2, Mail } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';

// import { connectGmailAction } from '../_lib/server/server-actions';

interface GmailConnectButtonProps {
  accountId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

export function GmailConnectButton({
  accountId,
  variant = 'outline',
  size = 'sm',
  children,
  className,
}: GmailConnectButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      try {
        console.log(
          '🔄 Starting Gmail connection via API for accountId:',
          accountId,
        );

        toast.info(
          'Redirecting to Google for Gmail and Calendar permissions...',
        );

        // ✅ Use API route instead of server action
        const response = await fetch('/api/auth/gmail/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            autoConnect: false,
          }),
        });

        const result = await response.json();

        console.log('📊 Gmail API result:', {
          success: result.success,
          hasRedirectUrl: !!result.redirectUrl,
          error: result.error,
          status: response.status,
        });

        if (result.success && result.redirectUrl) {
          console.log('✅ Redirecting to Gmail OAuth:', result.redirectUrl);
          window.location.href = result.redirectUrl;
        } else {
          const errorMessage =
            result.error || 'Failed to start Gmail connection';
          console.error('❌ Gmail connection failed:', result);
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error('💥 Gmail connection error caught:', error);
        toast.error('Failed to start Gmail connection');
      }
    });
  };

  const defaultChildren = (
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4" />
      <Calendar className="h-4 w-4" />
      <span>Connect Gmail & Calendar</span>
    </div>
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Connecting...</span>
        </div>
      ) : (
        children || defaultChildren
      )}
    </Button>
  );
}
