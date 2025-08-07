'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AutoEmailSyncOptions {
  accountId: string;
  enabled: boolean;
  syncInterval?: number; // in milliseconds, default 5 minutes
  onSyncSuccess?: (data: any) => void;
  onSyncError?: (error: string) => void;
}

export function useAutoEmailSync(options: AutoEmailSyncOptions) {
  const [status, setStatus] = useState<'idle' | 'syncing'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstSync = useRef(true);

  const { 
    accountId, 
    enabled, 
    syncInterval = 5 * 60 * 1000, // 5 minutes default
    onSyncSuccess, 
    onSyncError 
  } = options;

  const performSync = useCallback(async (): Promise<boolean> => {
    if (!accountId || status === 'syncing') return false;

    setStatus('syncing');
    
    try {
      console.log('📧 Auto email sync: Starting sync for account:', accountId);
      
      // Get connected Gmail accounts
      const accountsResponse = await fetch(`/api/gmail/accounts?accountId=${accountId}`);
      const accountsData = await accountsResponse.json();
      
      if (!accountsData.success || !accountsData.accounts?.length) {
        console.log('📧 Auto email sync: No connected Gmail accounts found');
        setStatus('idle');
        return false;
      }

      let syncSuccessful = false;
      
      // Sync each connected Gmail account
      for (const account of accountsData.accounts) {
        try {
          const syncResponse = await fetch('/api/gmail/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountId,
              email: account.email_address,
            }),
          });

          const syncResult = await syncResponse.json();
          
          if (syncResult.success) {
            console.log(`✅ Auto email sync: Successfully synced ${account.email_address}`);
            syncSuccessful = true;
            
            if (onSyncSuccess) {
              onSyncSuccess({
                email: account.email_address,
                emailsSynced: syncResult.emailsSynced || 0,
                lastSyncTime: new Date().toISOString(),
              });
            }
          } else {
            console.warn(`⚠️ Auto email sync: Failed to sync ${account.email_address}:`, syncResult.error);
          }
        } catch (error) {
          console.error(`❌ Auto email sync: Error syncing ${account.email_address}:`, error);
        }
      }

      if (syncSuccessful) {
        setLastSyncTime(new Date());
        setSyncCount(prev => prev + 1);
        console.log('✅ Auto email sync: Completed successfully');
      }

      setStatus('idle');
      return syncSuccessful;
      
    } catch (error) {
      console.error('❌ Auto email sync: Error during sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      
      if (onSyncError) {
        onSyncError(errorMessage);
      }
      
      setStatus('idle');
      return false;
    }
  }, [accountId, status, onSyncSuccess, onSyncError]);

  const triggerManualSync = useCallback(async () => {
    if (status !== 'idle') return false;
    return await performSync();
  }, [performSync, status]);

  const startAutoSync = useCallback(() => {
    if (!enabled || !accountId || intervalRef.current) return;
    
    console.log('🔄 Auto email sync: Starting automatic sync every', syncInterval / 1000 / 60, 'minutes');
    
    // Perform initial sync after a short delay (unless it's the very first time)
    if (!isFirstSync.current) {
      setTimeout(() => {
        if (status === 'idle') {
          performSync();
        }
      }, 10000); // 10 second delay for initial sync
    }
    isFirstSync.current = false;
    
    // Set up periodic sync
    intervalRef.current = setInterval(() => {
      if (status === 'idle') {
        performSync();
      }
    }, syncInterval);
    
  }, [enabled, accountId, syncInterval, status, performSync]);

  const stopAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Auto email sync: Stopped automatic sync');
    }
  }, []);

  // Effect to start/stop auto sync based on enabled flag
  useEffect(() => {
    if (enabled && accountId) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    
    return () => {
      stopAutoSync();
    };
  }, [enabled, accountId, startAutoSync, stopAutoSync]);

  return {
    status,
    lastSyncTime,
    syncCount,
    isSyncing: status === 'syncing',
    triggerManualSync,
    startAutoSync,
    stopAutoSync,
  };
} 