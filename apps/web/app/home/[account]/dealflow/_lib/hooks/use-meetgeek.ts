'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

interface MeetingSummary {
  id: string;
  dealId: string;
  summary: string;
  highlights: string[];
  actionItems: string[];
  transcriptUrl?: string;
  createdAt: string;
}

interface MeetingWithStatus {
  id: string;
  dealId: string;
  meetingId?: string;
  status: 'scheduled' | 'completed' | 'processing';
  title?: string;
  createdAt: string;
}

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client only if credentials are available
const supabase =
  supabaseUrl && supabaseAnonKey ? getSupabaseBrowserClient() : null;

export function useMeetGeek(dealId?: string) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<
    'idle' | 'polling' | 'syncing'
  >('idle');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync functionality for scheduled meetings
  const startAutoSync = useCallback(
    async (meetingId: string, maxAttempts: number = 12) => {
      if (!supabase || autoSyncStatus !== 'idle') return;

      console.log(`🔄 Starting auto-sync for MeetGeek meeting: ${meetingId}`);
      setAutoSyncStatus('polling');

      let attempts = 0;

      const pollForTranscript = async (): Promise<boolean> => {
        attempts++;
        console.log(
          `📡 Auto-sync attempt ${attempts}/${maxAttempts} for meeting ${meetingId}`,
        );

        try {
          setAutoSyncStatus('syncing');

          // Try to sync with MeetGeek API
          const response = await fetch('/api/meetgeek/sync-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId }),
          });

          const result = await response.json();

          if (result.success && result.data?.transcriptSegments > 0) {
            console.log(`✅ Auto-sync successful for meeting ${meetingId}`);
            setAutoSyncStatus('idle');
            return true;
          } else if (
            result.error?.includes('not found') ||
            result.error?.includes('404')
          ) {
            console.log(`⏳ Meeting ${meetingId} not ready yet, will retry...`);
            setAutoSyncStatus('polling');
            return false;
          } else {
            console.log(`⚠️ Auto-sync attempt failed: ${result.error}`);
            setAutoSyncStatus('polling');
            return false;
          }
        } catch (error) {
          console.error(`❌ Auto-sync error for meeting ${meetingId}:`, error);
          setAutoSyncStatus('polling');
          return false;
        }
      };

      // Initial attempt
      const success = await pollForTranscript();
      if (success) return;

      // Set up polling interval (every 2 minutes)
      pollIntervalRef.current = setInterval(
        async () => {
          if (attempts >= maxAttempts) {
            console.log(
              `⏹️ Auto-sync stopped for meeting ${meetingId} after ${maxAttempts} attempts`,
            );
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setAutoSyncStatus('idle');
            return;
          }

          const success = await pollForTranscript();
          if (success && pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        },
        2 * 60 * 1000,
      ); // 2 minutes
    },
    [autoSyncStatus],
  );

  // Stop auto-sync
  const stopAutoSync = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setAutoSyncStatus('idle');
  }, []);

  // Manual sync function
  const syncMeetingData = useCallback(async (meetingId: string) => {
    if (!meetingId) {
      setError('Meeting ID is required');
      return { success: false, error: 'Meeting ID is required' };
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Manual sync for MeetGeek meeting: ${meetingId}`);

      const response = await fetch('/api/meetgeek/sync-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Manual sync successful:`, result.data);
        return { success: true, data: result.data };
      } else {
        const errorMsg = result.message || result.error || 'Sync failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Manual sync error:', error);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dealId) return;

    async function fetchMeetingSummary() {
      if (!supabase) {
        // Return mock data if Supabase is not configured
        setSummary({
          id: '1',
          dealId: dealId!,
          summary:
            'Demo meeting summary: Discussed product features and pricing. Client showed strong interest in our AI capabilities.',
          highlights: [
            'Client needs AI-powered analytics',
            'Budget range: $40-60k',
            'Decision timeline: End of Q2',
          ],
          actionItems: [
            'Send detailed proposal by Friday',
            'Schedule technical demo next week',
            'Connect with their IT team',
          ],
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch deal data with meeting information
        const { data, error } = await supabase
          .from('deals')
          .select(
            'last_meeting_summary, meeting_highlights, meeting_action_items, last_meeting_date',
          )
          .eq('id', dealId)
          .single();

        if (error) throw error;

        if (data && data.last_meeting_summary) {
          setSummary({
            id: dealId,
            dealId,
            summary: data.last_meeting_summary,
            highlights: data.meeting_highlights || [],
            actionItems: data.meeting_action_items || [],
            createdAt: data.last_meeting_date || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error fetching meeting summary:', err);
        setError('Failed to load meeting summary');
      } finally {
        setLoading(false);
      }
    }

    fetchMeetingSummary();
  }, [dealId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const syncMeeting = async (meetingId: string) => {
    if (!dealId) {
      setError('Deal ID is required for syncing');
      return false;
    }

    if (!supabase) {
      // Simulate sync for demo
      const mockSummary = {
        id: Date.now().toString(),
        dealId: dealId,
        summary: `New meeting summary synced at ${new Date().toLocaleTimeString()}: Productive discussion about implementation timeline and technical requirements.`,
        highlights: [
          'Technical requirements aligned',
          'Implementation can start next month',
          'Preferred our solution over competitors',
        ],
        actionItems: [
          'Finalize contract terms',
          'Set up kickoff meeting',
          'Assign implementation team',
        ],
        createdAt: new Date().toISOString(),
      };
      setSummary(mockSummary);
      return true;
    }

    try {
      setLoading(true);

      // Call the Edge Function to sync meeting data
      const { data, error } = await supabase.functions.invoke('sync-meetgeek', {
        body: { meetingId, dealId },
      });

      if (error) throw error;

      // Refresh the meeting data
      const { data: updatedDeal, error: fetchError } = await supabase
        .from('deals')
        .select(
          'last_meeting_summary, meeting_highlights, meeting_action_items, last_meeting_date',
        )
        .eq('id', dealId)
        .single();

      if (fetchError) throw fetchError;

      if (updatedDeal && updatedDeal.last_meeting_summary && dealId) {
        setSummary({
          id: dealId,
          dealId: dealId,
          summary: updatedDeal.last_meeting_summary,
          highlights: updatedDeal.meeting_highlights || [],
          actionItems: updatedDeal.meeting_action_items || [],
          createdAt: updatedDeal.last_meeting_date || new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Error syncing meeting:', err);
      setError('Failed to sync meeting');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    loading,
    error,
    syncMeeting,
    syncMeetingData,
    startAutoSync,
    stopAutoSync,
    autoSyncStatus,
  };
}

// Hook specifically for monitoring scheduled meetings and auto-syncing
export function useAutoMeetingSync(dealId: string) {
  const [scheduledMeetings, setScheduledMeetings] = useState<
    MeetingWithStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { startAutoSync, stopAutoSync, autoSyncStatus } = useMeetGeek();

  useEffect(() => {
    if (!supabase || !dealId) return;

    const fetchScheduledMeetings = async () => {
      try {
        const { data, error } = await supabase
          .from('scheduled_meetings')
          .select(
            'id, deal_id, meetgeek_meeting_id, status, meeting_title, created_at',
          )
          .eq('deal_id', dealId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const meetings: MeetingWithStatus[] = (data || []).map((meeting) => ({
          id: meeting.id,
          dealId: meeting.deal_id,
          meetingId: meeting.meetgeek_meeting_id,
          status: meeting.status as 'scheduled' | 'completed' | 'processing',
          title: meeting.meeting_title,
          createdAt: meeting.created_at,
        }));

        setScheduledMeetings(meetings);

        // Check for scheduled meetings with MeetGeek IDs that haven't been completed
        const pendingMeetings = meetings.filter(
          (m) =>
            m.meetingId &&
            m.status === 'scheduled' &&
            m.createdAt &&
            Date.now() - new Date(m.createdAt).getTime() > 5 * 60 * 1000, // At least 5 minutes old
        );

        // Start auto-sync for the most recent pending meeting
        if (pendingMeetings.length > 0 && autoSyncStatus === 'idle') {
          const latestPending = pendingMeetings[0];
          console.log(
            `🎯 Starting auto-sync for latest pending meeting:`,
            latestPending,
          );
          if (latestPending.meetingId) {
            startAutoSync(latestPending.meetingId);
          }
        }
      } catch (error) {
        console.error('Error fetching scheduled meetings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledMeetings();

    // Set up real-time subscription to scheduled_meetings
    const subscription = supabase
      .channel('scheduled_meetings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_meetings',
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          console.log('📡 Scheduled meeting change detected:', payload);
          fetchScheduledMeetings();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      stopAutoSync();
    };
  }, [dealId, startAutoSync, stopAutoSync, autoSyncStatus]);

  return {
    scheduledMeetings,
    loading,
    autoSyncStatus,
  };
}
