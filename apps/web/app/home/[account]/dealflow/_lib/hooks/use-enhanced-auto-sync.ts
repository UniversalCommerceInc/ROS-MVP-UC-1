'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface EnhancedAutoSyncOptions {
  accountId: string;
  dealId?: string;
  enabled: boolean;
  onSyncSuccess?: (data: any) => void;
  onSyncError?: (error: string) => void;
}

export function useEnhancedAutoSync(options: EnhancedAutoSyncOptions) {
  const [status, setStatus] = useState<'idle' | 'polling' | 'syncing'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Enhanced sync function with better error handling and retry logic
  const performSync = useCallback(async (meetingId?: string): Promise<boolean> => {
    // Prevent too frequent checks (minimum 5 minutes between background checks)
    const now = Date.now();
    if (!meetingId && now - lastCheckTimeRef.current < 5 * 60 * 1000) {
      console.log('🔄 Enhanced auto-sync: Skipping check (too soon since last check)');
      return false;
    }
    lastCheckTimeRef.current = now;
    
    setStatus('syncing');
    
    try {
      console.log('🔄 Enhanced auto-sync: Checking for new transcripts...', {
        accountId: options.accountId,
        dealId: options.dealId,
        meetingId,
        attempt: syncCount + 1,
      });

      // If we have a specific meeting ID, sync that meeting
      if (meetingId) {
        const response = await fetch('/api/meetgeek/sync-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId }),
        });

        const result = await response.json();

        if (result.success && result.data?.transcriptSegments > 0) {
          console.log('✅ Enhanced auto-sync: Meeting sync successful', result.data);
          setLastSyncTime(new Date());
          setSyncCount(prev => prev + 1);
          options.onSyncSuccess?.(result.data);
          setStatus('idle');
          return true;
        }
      }

      // General transcript polling - check for any new transcripts for this account/deal
      const transcriptCheckResponse = await fetch(`/api/transcripts/check-new?accountId=${options.accountId}${options.dealId ? `&dealId=${options.dealId}` : ''}`, {
        method: 'GET',
      });

      if (transcriptCheckResponse.ok) {
        const transcriptResult = await transcriptCheckResponse.json();
        
        if (transcriptResult.hasNewTranscripts) {
          console.log('✅ Enhanced auto-sync: New transcripts detected', transcriptResult);
          setLastSyncTime(new Date());
          setSyncCount(prev => prev + 1);
          options.onSyncSuccess?.(transcriptResult);
          setStatus('idle');
          return true;
        }
      }

      console.log('📡 Enhanced auto-sync: No new transcripts found');
      setStatus('idle');
      return false;

    } catch (error) {
      console.error('❌ Enhanced auto-sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      options.onSyncError?.(errorMessage);
      setStatus('idle');
      return false;
    }
  }, [options, syncCount]);

  // Start intensive polling for a specific meeting (after scheduling)
  const startIntensivePolling = useCallback((meetingId: string, maxAttempts: number = 15) => {
    if (!options.enabled || status !== 'idle') return;

    console.log(`🎯 Starting intensive polling for meeting: ${meetingId}`);
    setStatus('polling');

    let attempts = 0;

    const poll = async () => {
      attempts++;
      console.log(`📡 Intensive polling attempt ${attempts}/${maxAttempts} for meeting ${meetingId}`);

      const success = await performSync(meetingId);
      
      if (success) {
        console.log(`✅ Intensive polling successful for meeting ${meetingId}`);
        stopIntensivePolling();
        return;
      }

      if (attempts >= maxAttempts) {
        console.log(`⏹️ Intensive polling stopped for meeting ${meetingId} after ${maxAttempts} attempts`);
        stopIntensivePolling();
        return;
      }
    };

    // Initial attempt
    poll();

    // Set up interval polling every 2 minutes
    pollIntervalRef.current = setInterval(poll, 2 * 60 * 1000);
  }, [performSync, options.enabled, status]);

  // Stop intensive polling
  const stopIntensivePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Start background polling (less frequent, ongoing)
  const startBackgroundPolling = useCallback(() => {
    if (!options.enabled || backgroundIntervalRef.current) return;

    console.log('🌐 Starting background transcript polling...');

    // Poll every 15 minutes for general transcript updates (increased from 10 minutes)
    backgroundIntervalRef.current = setInterval(async () => {
      // Only poll if enabled and idle
      if (options.enabled && status === 'idle') {
        console.log('🔍 Background polling: Checking for new transcripts...');
        try {
          await performSync();
        } catch (error) {
          console.error('Background polling error:', error);
        }
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Only do initial check if we haven't initialized yet
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setTimeout(() => {
        if (status === 'idle') {
          performSync();
        }
      }, 30 * 1000);
    }
  }, [options.enabled]); // Removed performSync and status from dependencies

  // Stop background polling
  const stopBackgroundPolling = useCallback(() => {
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
      backgroundIntervalRef.current = null;
      console.log('🌐 Background transcript polling stopped');
    }
  }, []);

  // Manual sync trigger
  const triggerManualSync = useCallback(async () => {
    if (status !== 'idle') return false;
    return await performSync();
  }, [performSync, status]);

  // Auto-start background polling when enabled (only once)
  useEffect(() => {
    if (options.enabled && !backgroundIntervalRef.current) {
      startBackgroundPolling();
    } else if (!options.enabled) {
      stopBackgroundPolling();
    }

    return () => {
      stopBackgroundPolling();
    };
  }, [options.enabled]); // Removed callback dependencies to prevent restarts

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopIntensivePolling();
      stopBackgroundPolling();
    };
  }, [stopIntensivePolling, stopBackgroundPolling]);

  return {
    status,
    lastSyncTime,
    syncCount,
    startIntensivePolling,
    stopIntensivePolling,
    startBackgroundPolling,
    stopBackgroundPolling,
    triggerManualSync,
    isPolling: status === 'polling',
    isSyncing: status === 'syncing',
    isActive: status !== 'idle',
  };
} 