'use client';

import { useTransition } from 'react';

import { Calendar, Loader2, Mail } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';

// import { connectMicrosoftAction } from '../_lib/server/server-actions';

interface OutlookConnectButtonProps {
  accountId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

export function OutlookConnectButton({
  accountId,
  variant = 'outline',
  size = 'sm',
  children,
  className,
}: OutlookConnectButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleConnect = () => {
    startTransition(async () => {
      try {
        console.log(
          '🔄 Starting Microsoft connection via API for accountId:',
          accountId,
        );

        toast.info(
          'Redirecting to Microsoft for Outlook and Calendar permissions...',
        );

        // ✅ Use API route instead of server action
        const response = await fetch('/api/auth/microsoft/connect', {
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

        console.log('📊 Microsoft API result:', {
          success: result.success,
          hasRedirectUrl: !!result.redirectUrl,
          error: result.error,
          status: response.status,
        });

        if (result.success && result.redirectUrl) {
          console.log('✅ Redirecting to Microsoft OAuth:', result.redirectUrl);
          window.location.href = result.redirectUrl;
        } else {
          const errorMessage =
            result.error || 'Failed to start Microsoft connection';
          console.error('❌ Microsoft connection failed:', result);
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error('💥 Microsoft connection error caught:', error);
        toast.error('Failed to start Microsoft connection');
      }
    });
  };

  const defaultChildren = (
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4" />
      <Calendar className="h-4 w-4" />
      <span>Connect Outlook & Calendar</span>
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
