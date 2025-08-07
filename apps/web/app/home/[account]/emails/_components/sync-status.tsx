'use client';

import { useEffect, useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { Badge } from '@kit/ui/badge';

import { getGmailIntegrationStatus } from '../_lib/server/emails.service';

interface SyncStatusProps {
  accountId: string;
  isPolling?: boolean;
  onSyncComplete?: () => void;
}

type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'completed'
  | 'failed'
  | 'not_started';

export function SyncStatus({
  accountId,
  isPolling = false,
  onSyncComplete,
}: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus>('not_started');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [totalEmailsSynced, setTotalEmailsSynced] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const integrationStatus = await getGmailIntegrationStatus(accountId);
        setStatus(integrationStatus.syncStatus as SyncStatus);
        setLastSyncAt(integrationStatus.lastSyncAt || null);
        setTotalEmailsSynced(integrationStatus.totalEmailsSynced || 0);
        setErrorMessage(integrationStatus.errorMessage || null);

        // If sync completed and we were polling, call callback
        if (
          integrationStatus.syncStatus === 'completed' &&
          isPolling &&
          onSyncComplete
        ) {
          onSyncComplete();
        }
      } catch (error) {
        console.error('Failed to check sync status:', error);
      }
    };

    // Initial check
    checkStatus();

    // Start polling if requested
    if (isPolling) {
      interval = setInterval(checkStatus, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accountId, isPolling, onSyncComplete]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'syncing':
        return (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <Badge variant="outline">Syncing...</Badge>
          </div>
        );
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never';

    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Sync Status</span>
        {getStatusDisplay()}
      </div>

      {status === 'syncing' && (
        <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
          <div className="bg-primary h-full animate-pulse" />
        </div>
      )}

      <div className="text-muted-foreground space-y-1 text-xs">
        <div>Last sync: {formatLastSync()}</div>
        <div>Total emails: {totalEmailsSynced}</div>
        {errorMessage && (
          <div className="text-destructive">Error: {errorMessage}</div>
        )}
      </div>
    </div>
  );
}
