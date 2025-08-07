'use client';

import { useEffect, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

import { Button } from '@kit/ui/button';

interface OutlookSyncButtonProps {
  accountId: string;
  hasOutlookConnected: boolean;
  outlookEmail?: string;
  syncStatus?: string | null; // 'idle' | 'loading' | 'success' | 'error' | 'failed'
}

export default function OutlookSyncButton({
  accountId,
  hasOutlookConnected,
  outlookEmail,
  syncStatus,
}: OutlookSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Show initial error state if sync status is failed
  const initialError =
    syncStatus === 'failed' ? 'Previous sync failed - click to retry' : '';

  const handleSync = async () => {
    console.log('🔄 Microsoft sync button clicked');
    console.log('📊 Props:', {
      accountId,
      hasOutlookConnected,
      outlookEmail,
      syncStatus,
    });

    if (!hasOutlookConnected || !outlookEmail) {
      const error = !hasOutlookConnected
        ? 'hasOutlookConnected is false'
        : 'outlookEmail is missing';
      console.log('❌ Sync aborted:', error);
      setStatus('error');
      setErrorMessage(`Microsoft account not connected (Debug: ${error})`);
      return;
    }

    setIsLoading(true);
    setStatus('loading');
    setErrorMessage('');

    try {
      console.log('🚀 Calling Microsoft sync API with:', {
        accountId,
        outlookEmail,
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/microsoft/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          email: outlookEmail,
        }),
      });

      console.log('📥 Microsoft sync response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      console.log('✅ Microsoft sync successful:', result);

      setStatus('success');
      console.log('✅ Sync successful, refreshing page...');

      // Refresh the page to show new emails
      startTransition(() => {
        router.refresh();
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (error) {
      console.log('💥 Microsoft sync exception:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Sync failed');
      console.error('Microsoft sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (syncStatus === 'failed' && status === 'idle') {
      return 'Retry Outlook Sync';
    }
    switch (status) {
      case 'loading':
        return 'Syncing Outlook...';
      case 'success':
        return 'Outlook Sync Complete';
      case 'error':
        return 'Outlook Sync Failed';
      default:
        return 'Sync Outlook Emails';
    }
  };

  const getButtonIcon = () => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="mr-2 h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="mr-2 h-4 w-4" />;
      case 'error':
        return <AlertCircle className="mr-2 h-4 w-4" />;
      default:
        return <RefreshCw className="mr-2 h-4 w-4" />;
    }
  };

  const getButtonVariant = ():
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link' => {
    if (syncStatus === 'failed' && status === 'idle') {
      return 'secondary';
    }
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!hasOutlookConnected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button variant="outline" size="sm" disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          No Outlook Connected
        </Button>
        <p className="text-muted-foreground text-xs">
          Connect Microsoft in Emails → Connect
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleSync}
        variant={getButtonVariant()}
        size="sm"
        disabled={isLoading || isPending}
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>

      {/* Status Messages */}
      {status === 'success' && (
        <p className="text-xs text-green-600">
          Outlook sync started successfully
        </p>
      )}

      {(status === 'error' && errorMessage) ||
      (syncStatus === 'failed' && status === 'idle') ? (
        <p className="text-xs text-red-600">{errorMessage || initialError}</p>
      ) : null}

      {status === 'loading' && (
        <p className="text-muted-foreground text-xs">
          Fetching Outlook emails...
        </p>
      )}
    </div>
  );
}
