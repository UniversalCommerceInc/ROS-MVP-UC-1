'use client';

import { useTransition } from 'react';

import { Calendar, Loader2, Mail } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';

import { connectMicrosoftAction } from '../_lib/server/server-actions';

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
        toast.info(
          'Redirecting to Microsoft for Outlook and Calendar permissions...',
        );

        const result = await connectMicrosoftAction({ accountId });

        if (result.success && result.redirectUrl) {
          // Redirect to Microsoft OAuth with both Outlook and Calendar permissions
          window.location.href = result.redirectUrl;
        } else {
          toast.error(result.error || 'Failed to start Microsoft connection');
        }
      } catch (error) {
        toast.error('Failed to start Microsoft connection');
        console.error('Microsoft connection error:', error);
      }
    });
  };

  // Default children with both icons
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
