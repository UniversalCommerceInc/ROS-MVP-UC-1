'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Calendar, Loader2, Mail } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { toast } from '@kit/ui/sonner';

import { MicrosoftLogo } from '../[account]/emails/_components/email-integrations';

interface AutoEmailConnectionProps {
  accountId: string;
  hasEmailConnected: boolean;
  userEmail?: string;
}

export function AutoEmailConnection({
  accountId,
  hasEmailConnected,
  userEmail,
}: AutoEmailConnectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<
    'gmail' | 'microsoft' | null
  >(null);
  const [showDialog, setShowDialog] = useState(false);

  // Check if this is a first login or if auto-connection was skipped
  const isFirstLogin = searchParams.get('first_login') === 'true';
  const autoConnectionSkipped = searchParams.get('gmail_skipped') === 'true';
  const gmailConnected = searchParams.get('gmail_connected') === 'true';
  const connectionError = searchParams.get('error') === 'connection_failed';

  // Storage keys for tracking connection attempts
  const storageKey = `gmail_connection_attempted_${accountId}`;
  const skipStorageKey = `gmail_connection_skipped_${accountId}`;

  useEffect(() => {
    // Check if connection attempt was already made or user previously skipped
    const connectionAttempted = localStorage.getItem(storageKey) === 'true';
    const previouslySkipped = localStorage.getItem(skipStorageKey) === 'true';

    // Clear attempt flag if Gmail is now connected
    if (hasEmailConnected || gmailConnected) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(skipStorageKey);
      return;
    }

    // Don't show if connection was already attempted or skipped
    if (connectionAttempted || previouslySkipped || autoConnectionSkipped) {
      return;
    }

    // Only auto-connect if:
    // 1. This is a first login OR
    // 2. User doesn't have Gmail connected AND hasn't tried before
    const shouldAutoConnect =
      (isFirstLogin || !hasEmailConnected) && !connectionError;

    if (shouldAutoConnect && !isConnecting) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setShowDialog(true);
      }, 1000);
    }
  }, [
    isFirstLogin,
    hasEmailConnected,
    autoConnectionSkipped,
    isConnecting,
    accountId,
    gmailConnected,
    connectionError,
    storageKey,
    skipStorageKey,
  ]);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setConnectingProvider('gmail');

    try {
      // Mark that a connection attempt was made
      localStorage.setItem(storageKey, 'true');

      toast.info('Setting up Gmail & Calendar integration...');

      // Generate Gmail OAuth URL with auto-connect flag
      const connectResponse = await fetch('/api/auth/gmail/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId, autoConnect: true }),
      });

      if (connectResponse.ok) {
        const { redirectUrl } = await connectResponse.json();
        if (redirectUrl) {
          // Add a parameter to track this is auto-connection
          const autoConnectUrl = new URL(redirectUrl);
          autoConnectUrl.searchParams.set('auto_connect', 'true');

          window.location.href = autoConnectUrl.toString();
          return;
        }
      }

      toast.error('Failed to start Gmail connection');
    } catch (error) {
      console.error('Gmail connection error:', error);
      toast.error('Failed to start Gmail connection');
    } finally {
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  const handleConnectMicrosoft = async () => {
    // Set connecting state for UI feedback
    setIsConnecting(true);
    setConnectingProvider('microsoft');

    try {
      // Inform the user about the process
      toast.info('Setting up Outlook & Microsoft Calendar integration...');

      // Asynchronously call the backend to get the Microsoft OAuth redirect URL
      const connectResponse = await fetch('/api/auth/microsoft/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send accountId and the autoConnect flag in the request body
        body: JSON.stringify({ accountId, autoConnect: true }),
      });

      // Check if the backend call was successful
      if (connectResponse.ok) {
        const { redirectUrl } = await connectResponse.json();

        // If a redirect URL is received, modify and use it
        if (redirectUrl) {
          // Add a URL parameter to indicate this is an auto-connection flow
          const autoConnectUrl = new URL(redirectUrl);
          autoConnectUrl.searchParams.set('auto_connect', 'true');

          // Redirect the user to the generated Microsoft OAuth URL
          window.location.href = autoConnectUrl.toString();
          return; // Exit the function after redirecting
        }
      }

      // If the response was not 'ok' or did not contain a redirectUrl, show an error
      toast.error('Failed to start Microsoft connection');
    } catch (error) {
      // Catch any network or other errors during the fetch process
      console.error('Microsoft connection error:', error);
      toast.error('Failed to start Microsoft connection');
    } finally {
      // Reset the connecting state regardless of success or failure
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  const handleSkip = () => {
    setShowDialog(false);

    // Mark that user skipped connection
    localStorage.setItem(skipStorageKey, 'true');

    // Add parameter to prevent showing again during this session
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('email_skipped', 'true');
    router.replace(currentUrl.pathname + currentUrl.search);

    toast.info(
      'Email connection skipped. You can connect later from Settings → Emails',
    );
  };

  if (!showDialog) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <Calendar className="h-5 w-5 text-green-600" />
            Complete Your Setup
          </DialogTitle>
          <DialogDescription>
            Connect your email and calendar to unlock Vellora's full potential:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span>Automatic email sync with your deals</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span>Smart meeting scheduling and transcription</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 text-center">🤖</span>
              <span>AI insights from your communications</span>
            </div>
          </div>

          {/* Provider Options */}
          <div className="border-border border-t pt-4">
            <p className="text-foreground mb-3 text-sm font-medium">
              Choose your email provider:
            </p>

            <div className="space-y-2">
              {/* Gmail Option */}
              <Button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                variant="outline"
                className="h-12 w-full justify-start gap-3 hover:border-slate-600 hover:bg-slate-600 hover:text-white"
              >
                <div className="flex flex-1 items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <div className="text-left">
                    <div className="text-foreground font-medium">
                      Gmail & Google Calendar
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Connect with Google
                    </div>
                  </div>
                </div>
                {isConnecting && connectingProvider === 'gmail' && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                )}
              </Button>

              {/* Microsoft Option */}
              <Button
                onClick={handleConnectMicrosoft}
                disabled={isConnecting}
                variant="outline"
                className="h-12 w-full justify-start gap-3 hover:border-slate-600 hover:bg-slate-600 hover:text-white"
              >
                <div className="flex flex-1 items-center gap-2">
                  <MicrosoftLogo className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-foreground font-medium">
                      Outlook & Microsoft Calendar
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Connect with Microsoft
                    </div>
                  </div>
                </div>
                {isConnecting && connectingProvider === 'microsoft' && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isConnecting}
              className="flex-1"
            >
              Skip for now
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            You'll be redirected to authorize access. We only read emails and
            create calendar events - never send emails without your permission.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
