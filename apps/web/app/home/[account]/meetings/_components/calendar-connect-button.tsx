'use client';

import { useState } from 'react';

import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

interface CalendarConnectButtonProps {
  accountId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function CalendarConnectButton({
  accountId,
  variant = 'default',
  size = 'default',
  className,
}: CalendarConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // First check current permissions
      const checkResponse = await fetch(
        '/api/check-gmail-calendar-permissions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId }),
        },
      );

      const checkResult = await checkResponse.json();

      if (checkResult.success && checkResult.hasCalendar) {
        toast.success('Calendar is already connected!');
        window.location.reload();
        return;
      }

      // Need to connect or reconnect with calendar permissions
      toast.info('Redirecting to Google to grant calendar permissions...');

      // Use the API route approach for consistency
      const connectResponse = await fetch('/api/auth/connect-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          includeCalendar: true,
        }),
      });

      const connectResult = await connectResponse.json();

      if (connectResult.success && connectResult.redirectUrl) {
        // Redirect to Google OAuth with calendar permissions
        window.location.href = connectResult.redirectUrl;
      } else {
        throw new Error(
          connectResult.error || 'Failed to start connection process',
        );
      }
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast.error('Failed to connect calendar. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      variant={variant}
      size={size}
      className={className}
    >
      {isConnecting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Calendar className="mr-2 h-4 w-4" />
      )}
      {isConnecting ? 'Connecting...' : 'Connect Calendar'}
    </Button>
  );
}
