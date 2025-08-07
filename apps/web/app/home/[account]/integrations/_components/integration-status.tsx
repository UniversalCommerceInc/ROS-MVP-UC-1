'use client';

import React, { useEffect, useState } from 'react';

import { Badge } from '@kit/ui/badge';

interface IntegrationStatusProps {
  accountId: string;
}

export function IntegrationStatus({ accountId }: IntegrationStatusProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle',
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // You could implement real-time sync status checking here
    // For example, polling an API endpoint or using WebSocket
    const checkSyncStatus = async () => {
      try {
        const response = await fetch(
          `/api/integrations/sync-status?accountId=${accountId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSyncStatus(data.status);
          setLastSyncTime(data.lastSync);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
        setSyncStatus('error');
      }
    };

    // Check immediately
    checkSyncStatus();

    // Set up polling (every 30 seconds)
    const interval = setInterval(checkSyncStatus, 30000);

    return () => clearInterval(interval);
  }, [accountId]);

  const getStatusVariant = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync Error';
      default:
        return 'Synced';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant()} className="text-xs">
        {syncStatus === 'syncing' && (
          <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent"></div>
        )}
        {getStatusText()}
      </Badge>
      {lastSyncTime && syncStatus !== 'syncing' && (
        <span className="text-muted-foreground text-xs">
          Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
