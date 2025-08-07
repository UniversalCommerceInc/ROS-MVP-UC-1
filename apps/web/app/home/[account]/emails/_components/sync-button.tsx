'use client';

import { useEffect, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { triggerGmailSync } from '../_lib/actions/gmail';

interface SyncButtonProps {
  accountId: string;
  hasGmailConnected: boolean;
  gmailEmail?: string;
  syncStatus?: string | null; // 'idle' | 'loading' | 'success' | 'error' | 'failed'
}

export default function SyncButton({
  accountId,
  hasGmailConnected,
  gmailEmail,
  syncStatus,
}: SyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const router = useRouter();

  // Show initial error state if sync status is failed
  const initialError =
    syncStatus === 'failed' ? 'Previous sync failed - click to retry' : '';

  // Debug logging on component mount
  useEffect(() => {
    const debug = {
      accountId: accountId ? 'present' : 'missing',
      hasGmailConnected,
      gmailEmail: gmailEmail || 'undefined',
      syncStatus: syncStatus || 'undefined',
      isLoading,
      isPending,
      status,
      buttonDisabled: isLoading || isPending,
    };
    setDebugInfo(JSON.stringify(debug, null, 2));
    console.log('SyncButton Debug Info:', debug);
  }, [
    accountId,
    hasGmailConnected,
    gmailEmail,
    syncStatus,
    isLoading,
    isPending,
    status,
  ]);

  const handleSync = async () => {
    console.log('🔄 Sync button clicked');
    console.log('📊 Props:', {
      accountId,
      hasGmailConnected,
      gmailEmail,
      syncStatus,
    });
    console.log('🔍 Current state:', {
      isLoading,
      isPending,
      status,
      buttonDisabled: isLoading || isPending,
    });

    if (!hasGmailConnected || !gmailEmail) {
      const error = !hasGmailConnected
        ? 'hasGmailConnected is false'
        : 'gmailEmail is missing';
      console.log('❌ Sync aborted:', error);
      setStatus('error');
      setErrorMessage(`Gmail account not connected (Debug: ${error})`);
      return;
    }

    setIsLoading(true);
    setStatus('loading');
    setErrorMessage('');

    try {
      console.log('🚀 Calling triggerGmailSync with:', {
        accountId,
        gmailEmail,
      });
      const result = await triggerGmailSync(accountId, gmailEmail);
      console.log('📥 Sync result:', result);

      if (result.success) {
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
      } else {
        console.log('❌ Sync failed:', result.error);
        setStatus('error');
        setErrorMessage(result.error || 'Sync failed');
      }
    } catch (error) {
      console.log('💥 Sync exception:', error);
      setStatus('error');
      setErrorMessage('An error occurred during sync');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (syncStatus === 'failed' && status === 'idle') {
      return 'Retry Sync';
    }
    switch (status) {
      case 'loading':
        return 'Syncing...';
      case 'success':
        return 'Sync Complete';
      case 'error':
        return 'Sync Failed';
      default:
        return 'Sync Emails';
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
      return 'secondary'; // Show as warning for failed status
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

  if (!hasGmailConnected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button variant="outline" size="sm" disabled>
          <RefreshCw className="mr-2 h-4 w-4" />
          No Gmail Connected
        </Button>
        <p className="text-muted-foreground text-xs">
          Connect Gmail in Settings → Integrations
        </p>
        {/* Debug Info */}
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer">
            Debug Info
          </summary>
          <pre className="bg-muted mt-2 rounded p-2 text-xs whitespace-pre-wrap">
            {debugInfo}
          </pre>
        </details>
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
        <p className="text-xs text-green-600">Sync started successfully</p>
      )}

      {(status === 'error' && errorMessage) ||
      (syncStatus === 'failed' && status === 'idle') ? (
        <p className="text-xs text-red-600">{errorMessage || initialError}</p>
      ) : null}

      {status === 'loading' && (
        <p className="text-muted-foreground text-xs">Fetching new emails...</p>
      )}

      {/* Debug Info (development only) */}
      {/* {process.env.NODE_ENV === 'development' && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer">
            Debug Info
          </summary>
          <pre className="bg-muted mt-2 rounded p-2 text-xs whitespace-pre-wrap">
            {debugInfo}
          </pre>
        </details>
      )} */}
    </div>
  );
}
