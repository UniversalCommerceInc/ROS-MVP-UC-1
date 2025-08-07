'use client';

import { useTransition } from 'react';

import { Calendar, Loader2, Mail } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { toast } from '@kit/ui/sonner';

import { connectGmailAction } from '../_lib/server/server-actions';

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
        toast.info(
          'Redirecting to Google for Gmail and Calendar permissions...',
        );

        const result = await connectGmailAction({ accountId });

        if (result.success && result.redirectUrl) {
          // Redirect to Google OAuth with both Gmail and Calendar permissions
          window.location.href = result.redirectUrl;
        } else {
          toast.error(result.error || 'Failed to start Gmail connection');
        }
      } catch (error) {
        toast.error('Failed to start Gmail connection');
        console.error('Gmail connection error:', error);
      }
    });
  };

  // Default children with both icons
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
