'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import { useAutoMeetingSync } from '../_lib/hooks/use-meetgeek';

interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

interface Meeting {
  id: string;
  deal_id: string;
  meeting_id?: string;
  title?: string;
  summary: string;
  highlights: string[];
  action_items: any[];
  transcript_url?: string;
  recording_url?: string;
  created_at: string;
  start_time?: string;
  end_time?: string;
  participant_emails?: string[];
  hasActualTranscript?: boolean;
  _source?: string;
  _status?: string;
}

interface MeetingSummaryProps {
  dealId: string;
  accountId: string;
  className?: string;
}

export default function MeetingSummary({
  dealId,
  accountId,
  className,
}: MeetingSummaryProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTranscript, setFilteredTranscript] = useState<
    TranscriptSegment[]
  >([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-sync functionality
  const { scheduledMeetings, autoSyncStatus } = useAutoMeetingSync(dealId);

  const supabase = getSupabaseBrowserClient();

  // Load meetings data on component mount
  useEffect(() => {
    fetchMeetings();
  }, [dealId]);

  // Filter transcript when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscript(transcript);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = transcript.filter(
      (segment) =>
        segment.text.toLowerCase().includes(query) ||
        segment.speaker.toLowerCase().includes(query),
    );
    setFilteredTranscript(filtered);
  }, [searchQuery, transcript]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching meetings for deal:', dealId);

      // Get current user to ensure proper filtering
      // const {
      //   data: { user },
      //   error: userError,
      // } = await supabase.auth.getUser();
      // if (userError || !user) {
      //   console.error('User not authenticated:', userError);
      //   setMeetings([]);
      //   return;
      // }

      // console.log('👤 Current user:', user.email);

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, company_name, account_id')
        .eq('id', dealId)
        .eq('account_id', accountId) // Add this line
        .single();

      if (dealError || !deal) {
        console.error('Deal not found or not owned by user:', dealError);
        setMeetings([]);
        return;
      }

      console.log('✅ Deal verified:', deal.company_name);

      let allMeetings: Meeting[] = [];

      // 1. Fetch deal-level meeting data (highlights and summary from MeetGeek)
      console.log(
        '🔍 DEBUG: Fetching deal-level meeting data for highlights and summary',
      );
      const { data: dealData, error: dealDataError } = await supabase
        .from('deals')
        .select(
          'meeting_highlights, meeting_action_items, last_meeting_summary, last_meeting_date',
        )
        .eq('id', dealId)
        .single();

      console.log('📊 DEBUG: Deal data query result:', {
        success: !dealDataError,
        error: dealDataError,
        hasHighlights: dealData?.meeting_highlights?.length > 0,
        highlightsCount: dealData?.meeting_highlights?.length || 0,
        hasSummary: !!dealData?.last_meeting_summary,
        summaryPreview:
          dealData?.last_meeting_summary?.substring(0, 100) + '...',
      });

      // 2. Fetch meetings from meetings table (processed meetings with transcripts)
      // Filter by deal_id directly since we already verified user owns this deal
      console.log(
        '🔍 DEBUG: Fetching meetings from meetings table for deal:',
        dealId,
      );
      // Add account_id filter to meetings query
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('deal_id', dealId)
        .eq('account_id', accountId) // Add this line
        .order('timestamp_start_utc', { ascending: false });

      console.log('📊 DEBUG: Meetings table query result:', {
        success: !meetingsError,
        error: meetingsError,
        dataCount: meetingsData?.length || 0,
        firstMeeting: meetingsData?.[0]
          ? {
              id: meetingsData[0].id,
              meeting_id: meetingsData[0].meeting_id,
              title: meetingsData[0].title,
            }
          : null,
      });

      console.log('📅 Meetings from meetings table:', {
        meetingsData,
        meetingsError,
      });

      // 3. Fetch scheduled meetings from scheduled_meetings table
      // Add account_id filter to scheduled meetings query
      const { data: scheduledMeetingsData, error: scheduledError } =
        await supabase
          .from('scheduled_meetings')
          .select('*')
          .eq('deal_id', dealId)
          .eq('account_id', accountId) // Add this line
          .order('created_at', { ascending: false });

      console.log('📅 Scheduled meetings:', {
        scheduledMeetingsData,
        scheduledError,
      });

      // 4. Convert meetings table data and merge with modular table data
      if (meetingsData && meetingsData.length > 0) {
        // Fetch modular data for all meetings
        const meetingIds = meetingsData.map((m) => m.id);

        // Fetch from modular tables
        // Add account_id filter to all modular table queries
        const [summariesData, highlightsData, actionsData] = await Promise.all([
          supabase
            .from('summaries') // Changed from 'meeting_summaries'
            .select('*')
            .in('meeting_id', meetingIds)
            .eq('account_id', accountId), // Add this line
          supabase
            .from('highlights') // Changed from 'meeting_highlights'
            .select('*')
            .in('meeting_id', meetingIds)
            .eq('account_id', accountId), // Add this line
          supabase
            .from('activities') // Changed from 'meeting_actions' to match your schema
            .select('*')
            .in('deal_id', [dealId]), // Changed to deal_id since activities link to deals
          // .eq('account_id', accountId),
        ]);

        console.log('📊 Modular data fetched:', {
          summaries: summariesData.data?.length || 0,
          highlights: highlightsData.data?.length || 0,
          actions: actionsData.data?.length || 0,
        });

        const convertedMeetings = meetingsData.map((meeting) => {
          // Get modular data for this meeting
          const meetingSummary = summariesData.data?.find(
            (s) => s.meeting_id === meeting.id,
          );
          const meetingHighlights =
            highlightsData.data?.filter((h) => h.meeting_id === meeting.id) ||
            [];
          const meetingActions =
            actionsData.data?.filter((a) => a.meeting_id === meeting.id) || [];

          // Priority: Modular tables > Deal-level data > Legacy JSONB
          const summary =
            meetingSummary?.summary_text ||
            dealData?.last_meeting_summary ||
            meeting.summary ||
            'Meeting completed - processing insights';

          const highlights =
            meetingHighlights.length > 0
              ? meetingHighlights.map((h) => h.highlight_text)
              : dealData?.meeting_highlights &&
                  dealData.meeting_highlights.length > 0
                ? dealData.meeting_highlights.map((h: any) =>
                    typeof h === 'string'
                      ? h
                      : h.highlightText ||
                        h.text ||
                        h.label ||
                        JSON.stringify(h),
                  )
                : Array.isArray(meeting.highlights)
                  ? meeting.highlights.map((h: any) =>
                      typeof h === 'string'
                        ? h
                        : h.highlightText ||
                          h.text ||
                          h.label ||
                          JSON.stringify(h),
                    )
                  : [];

          const action_items =
            meetingActions.length > 0
              ? meetingActions.map((a) => ({
                  text: a.action_text,
                  assignee: a.assignee,
                  due_date: a.due_date,
                  priority: a.priority,
                }))
              : dealData?.meeting_action_items &&
                  dealData.meeting_action_items.length > 0
                ? dealData.meeting_action_items
                : Array.isArray(meeting.action_items)
                  ? meeting.action_items
                  : [];

          console.log(`🔍 Converting meeting ${meeting.meeting_id}:`, {
            modularSummary: !!meetingSummary,
            modularHighlights: meetingHighlights.length,
            modularActions: meetingActions.length,
            dealHighlights: dealData?.meeting_highlights?.length || 0,
            finalHighlights: highlights.length,
            finalSummary: summary.substring(0, 50) + '...',
          });

          return {
            id: meeting.id,
            deal_id: meeting.deal_id,
            meeting_id: meeting.meeting_id,
            title: meeting.title || 'Meeting',
            summary,
            highlights,
            action_items,
            transcript_url: meeting.transcript_url,
            recording_url: meeting.recording_url,
            created_at: meeting.timestamp_start_utc || meeting.created_at, // Use timestamp_start_utc as created_at
            start_time: meeting.timestamp_start_utc,
            end_time: meeting.timestamp_end_utc,
            participant_emails: Array.isArray(meeting.participant_emails)
              ? meeting.participant_emails
              : [],
            _source: 'meetings',
          };
        });
        allMeetings.push(...convertedMeetings);
      }

      // 5. Convert scheduled meetings data and merge with deal-level data
      if (scheduledMeetingsData && scheduledMeetingsData.length > 0) {
        const convertedScheduled = scheduledMeetingsData.map((scheduled) => {
          console.log(`🔍 Converting scheduled meeting:`, {
            id: scheduled.id,
            meetgeek_meeting_id: scheduled.meetgeek_meeting_id,
            status: scheduled.status,
            title: scheduled.meeting_title,
          });

          // For completed meetings, use deal-level data if available
          const isCompleted = scheduled.status === 'completed';
          const highlights =
            isCompleted &&
            dealData?.meeting_highlights &&
            dealData.meeting_highlights.length > 0
              ? dealData.meeting_highlights.map((h: any) =>
                  typeof h === 'string'
                    ? h
                    : h.highlightText || h.text || h.label || JSON.stringify(h),
                )
              : [];

          const summary =
            isCompleted && dealData?.last_meeting_summary
              ? dealData.last_meeting_summary
              : scheduled.status === 'completed'
                ? 'Meeting completed - click to view transcript'
                : 'Meeting scheduled - transcript will be available after completion';

          const action_items =
            isCompleted &&
            dealData?.meeting_action_items &&
            dealData.meeting_action_items.length > 0
              ? dealData.meeting_action_items
              : [];

          return {
            id: scheduled.id,
            deal_id: scheduled.deal_id,
            meeting_id: scheduled.meetgeek_meeting_id, // Use MeetGeek meeting ID if available
            title: scheduled.meeting_title || 'Scheduled Meeting',
            summary,
            highlights,
            action_items,
            transcript_url: scheduled.meetgeek_meeting_id
              ? `meetgeek://${scheduled.meetgeek_meeting_id}`
              : undefined,
            recording_url: undefined,
            created_at: scheduled.created_at,
            start_time: scheduled.start_time,
            end_time: scheduled.end_time,
            participant_emails: scheduled.attendees || [],
            _source: 'scheduled_meetings',
            _status: scheduled.status,
          };
        });
        allMeetings.push(...convertedScheduled);
      }

      // 6. Get all transcript data upfront to check which meetings have transcripts
      console.log('🔍 DEBUG: Fetching all transcripts to check availability');
      const { data: allTranscripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('meeting_id');

      console.log('📝 DEBUG: Transcripts query result:', {
        success: !transcriptsError,
        error: transcriptsError,
        transcriptCount: allTranscripts?.length || 0,
      });
      console.log(
        '📝 All available transcripts (meeting_ids):',
        allTranscripts?.map((t) => t.meeting_id),
      );

      // 7. Add transcript status to meetings
      const meetingsWithTranscriptStatus = allMeetings.map((meeting) => {
        // Check if this meeting has transcript data
        const hasActualTranscript = !!(
          meeting.id && allTranscripts?.some((t) => t.meeting_id === meeting.id)
        );

        console.log(
          `📋 Meeting ${meeting.meeting_id}: hasTranscript = ${hasActualTranscript}`,
        );

        return {
          ...meeting,
          hasActualTranscript,
        };
      });

      // 8. Sort meetings by date (most recent first)
      meetingsWithTranscriptStatus.sort((a, b) => {
        const dateComparison =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        console.log(`🔄 Comparing meetings by date:
          A: ${a.meeting_id} (${a.created_at})
          B: ${b.meeting_id} (${b.created_at})
          → ${dateComparison > 0 ? 'B newer' : 'A newer'}`);
        return dateComparison;
      });

      allMeetings = meetingsWithTranscriptStatus;

      console.log('✅ Final meetings list:', allMeetings);
      console.log(
        '🎯 Meetings with transcript status:',
        allMeetings.map((m) => ({
          id: m.id,
          title: m.title,
          meeting_id: m.meeting_id,
          hasActualTranscript: m.hasActualTranscript,
          created_at: m.created_at,
        })),
      );
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscript = async (meeting: Meeting) => {
    setTranscriptLoading(true);
    setTranscriptError(null);
    try {
      console.log('🎯 Frontend: fetchTranscript called with meeting:', {
        id: meeting.id,
        meeting_id: meeting.meeting_id,
        title: meeting.title,
        hasActualTranscript: meeting.hasActualTranscript,
        _source: meeting._source,
        _status: meeting._status,
      });

      // Only attempt to fetch real transcript data if we have a meeting_id
      if (meeting.meeting_id && meeting.meeting_id !== 'null') {
        console.log(
          '🎯 Frontend: Fetching real transcript for meeting ID:',
          meeting.meeting_id,
        );
        console.log(
          '📡 Frontend: Making API request to:',
          `/api/transcripts/${meeting.meeting_id}`,
        );

        const response = await fetch(
          `/api/transcripts/${meeting.meeting_id}?accountId=${accountId}`,
        );
        console.log('📡 Frontend: API response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
        });

        const result = await response.json();
        console.log('📝 Frontend: Transcript API result:', {
          success: result.success,
          hasTranscript: !!result.transcript,
          transcriptLength: result.transcript?.length || 0,
          error: result.error,
          meetingId: result.meetingId,
          meetingTitle: result.meeting?.title,
          stats: result.stats,
        });

        if (response.ok && result.success && result.transcript?.length > 0) {
          console.log(
            `✅ Found ${result.transcript.length} unique transcript segments`,
          );

          const meetingData = result.meeting;

          // Convert database transcript to our format with better speaker names
          const realTranscript: TranscriptSegment[] = result.transcript.map(
            (segment: any, index: number) => {
              // Parse timestamp to get seconds from start
              const timestamp = new Date(segment.timestamp);
              const meetingStart = new Date(result.transcript[0].timestamp);
              const secondsFromStart = Math.max(
                0,
                (timestamp.getTime() - meetingStart.getTime()) / 1000,
              );

              // Improve speaker identification
              let speakerName = segment.speaker;
              if (segment.speaker === 'Unknown speaker' || !segment.speaker) {
                // Use participant emails to create better speaker names
                if (meetingData?.participant_emails?.length > 0) {
                  const speakerIndex =
                    Math.floor(index / 5) %
                    meetingData.participant_emails.length;
                  const email = meetingData.participant_emails[speakerIndex];
                  speakerName =
                    email === 'tim@vellora.ai'
                      ? 'Timothy Lefkowitz'
                      : email === 'matt@vellora.ai'
                        ? 'Matt'
                        : email.split('@')[0].charAt(0).toUpperCase() +
                          email.split('@')[0].slice(1);
                } else {
                  speakerName = `Speaker ${Math.floor(index / 5) + 1}`;
                }
              }

              return {
                speaker: speakerName,
                text: segment.transcript,
                start_time: secondsFromStart,
                end_time: secondsFromStart + 5, // Estimate 5 seconds per segment
              };
            },
          );

          console.log(
            `🎤 Processed transcript with ${realTranscript.length} segments:`,
            realTranscript.slice(0, 3),
          );
          console.log('🎤 Setting transcript state with real data');
          setTranscript(realTranscript);
          setFilteredTranscript(realTranscript);

          // Trigger comprehensive AI analysis of the transcript
          if (meeting.id) {
            console.log(
              '🤖 Triggering comprehensive AI analysis for meeting UUID:',
              meeting.id,
            );
            try {
              const analysisResponse = await fetch(
                `/api/analyze-comprehensive?accountId=${accountId}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    meetingId: meeting.id,
                  }),
                },
              );

              if (analysisResponse.ok) {
                const analysisResult = await analysisResponse.json();
                console.log('✅ Comprehensive AI analysis completed:', {
                  painPoints: analysisResult.analysis?.painPoints?.length || 0,
                  nextSteps: analysisResult.analysis?.nextSteps?.length || 0,
                  greenFlags: analysisResult.analysis?.greenFlags?.length || 0,
                  redFlags: analysisResult.analysis?.redFlags?.length || 0,
                  meetingScore: analysisResult.analysis?.meetingScore || 0,
                  storageResults: analysisResult.storage,
                });

                // Refresh meeting data to show updated insights
                if (analysisResult.success) {
                  console.log(
                    '🎉 Refreshing meeting data to show comprehensive insights',
                  );
                  await fetchMeetings(); // Refresh the meetings list to show updated data
                }
              } else {
                const errorData = await analysisResponse.json();
                console.error('❌ Comprehensive analysis failed:', errorData);
              }
            } catch (analysisError) {
              console.error(
                'Error triggering comprehensive AI analysis:',
                analysisError,
              );
              // Don't fail the transcript loading if analysis fails
            }
          }

          return;
        } else {
          console.log('⚠️ No transcript data found via API');
          console.log('API response:', result);
          setTranscriptError('No transcript data available for this meeting');
          setTranscript([]);
          setFilteredTranscript([]);
          return;
        }
      } else {
        console.log('⚠️ No meeting_id available for transcript fetch');
        setTranscriptError('No transcript available for this meeting');
        setTranscript([]);
        setFilteredTranscript([]);
        return;
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setTranscriptError('Failed to load transcript data');
      setTranscript([]);
      setFilteredTranscript([]);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchMeetings();
  };

  const handleViewTranscript = async (meeting: Meeting) => {
    if (isTranscriptExpanded) {
      setIsTranscriptExpanded(false);
      setTranscript([]);
      setSearchQuery('');
      setTranscriptError(null);
    } else {
      setIsTranscriptExpanded(true);
      await fetchTranscript(meeting);
    }
  };

  const highlightSearchText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const query = searchQuery.toLowerCase();
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-designer-violet/30 font-medium text-white">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMeeting = async () => {
    if (!meetingToDelete) return;

    setDeleting(true);
    try {
      console.log('🗑️ Deleting meeting:', meetingToDelete.id);

      const source = meetingToDelete._source || 'meetings';
      const response = await fetch(
        `/api/meetings/delete?meetingId=${meetingToDelete.id}&source=${source}`,
        {
          method: 'DELETE',
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Meeting deleted successfully');

        // Remove the meeting from the local state
        setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete.id));

        // If the deleted meeting was selected, reset selection
        if (selectedMeeting === meetingToDelete.id) {
          setSelectedMeeting(null);
          setIsTranscriptExpanded(false);
          setTranscript([]);
          setSearchQuery('');
          setTranscriptError(null);
        }

        // Close the dialog
        setDeleteDialogOpen(false);
        setMeetingToDelete(null);

        // Optionally refresh the data to ensure consistency
        setTimeout(() => {
          fetchMeetings();
        }, 500);
      } else {
        console.error('Failed to delete meeting:', result.error);
        alert(`Failed to delete meeting: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && meetings.length === 0) {
    return (
      <Card className={cn('border-white/10 bg-black/40', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="text-designer-violet h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className={cn('border-white/10 bg-black/40', className)}>
        <CardContent className="py-8 text-center">
          <Mic className="mx-auto mb-3 h-12 w-12 text-white/20" />
          <p className="text-sm text-white/50">No meeting data available yet</p>
        </CardContent>
      </Card>
    );
  }

  // Find the most recent meeting (first in sorted array) instead of prioritizing transcript meetings
  const latestMeeting = meetings[0]; // Most recent meeting due to sorting
  const currentMeeting = selectedMeeting
    ? meetings.find((m) => m.id === selectedMeeting)
    : latestMeeting;

  // Debug logging for meeting selection
  console.log('🎯 Current meeting selection:', {
    selectedMeeting,
    latestMeeting: latestMeeting
      ? {
          id: latestMeeting.id,
          title: latestMeeting.title,
          meeting_id: latestMeeting.meeting_id,
          hasActualTranscript: latestMeeting.hasActualTranscript,
          created_at: latestMeeting.created_at,
        }
      : null,
    currentMeeting: currentMeeting
      ? {
          id: currentMeeting.id,
          title: currentMeeting.title,
          meeting_id: currentMeeting.meeting_id,
          hasActualTranscript: currentMeeting.hasActualTranscript,
          created_at: currentMeeting.created_at,
        }
      : null,
  });

  return (
    <Card className={cn('border-white/10 bg-black/40', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>

            {/* Auto-sync status indicator */}
            {autoSyncStatus !== 'idle' && (
              <div className="bg-designer-violet/10 border-designer-violet/20 flex items-center gap-2 rounded-full border px-3 py-1">
                {autoSyncStatus === 'polling' ? (
                  <>
                    <Wifi className="text-designer-violet h-3 w-3 animate-pulse" />
                    <span className="text-designer-violet text-xs">
                      Waiting for transcript...
                    </span>
                  </>
                ) : autoSyncStatus === 'syncing' ? (
                  <>
                    <Loader2 className="text-designer-violet h-3 w-3 animate-spin" />
                    <span className="text-designer-violet text-xs">
                      Syncing with AI Notetaker...
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Mic className="text-designer-violet h-5 w-5" />
            <CardTitle className="text-lg">Meeting Insights</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {meetings.length > 1 && (
          <div className="mb-4">
            <ScrollArea className="h-20 w-full">
              <div className="flex flex-col gap-2 pr-4">
                {meetings.map((meeting) => {
                  const hasTranscript = meeting.hasActualTranscript;
                  return (
                    <div
                      key={meeting.id}
                      className="group flex items-center gap-1"
                    >
                      <Button
                        variant={
                          currentMeeting?.id === meeting.id
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        className={cn(
                          'relative flex-1 justify-start text-xs',
                          currentMeeting?.id === meeting.id
                            ? 'bg-designer-violet border-designer-violet text-white'
                            : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white',
                          hasTranscript &&
                            currentMeeting?.id !== meeting.id &&
                            'border-designer-violet/50 bg-designer-violet/10',
                        )}
                        onClick={() => setSelectedMeeting(meeting.id)}
                      >
                        {currentMeeting?.id === meeting.id && (
                          <div className="absolute top-1/2 left-1 h-2 w-2 -translate-y-1/2 transform rounded-full bg-white"></div>
                        )}
                        <Calendar
                          className={cn(
                            'mr-2 h-3 w-3',
                            currentMeeting?.id === meeting.id ? 'ml-3' : '',
                          )}
                        />
                        <span
                          className={cn(
                            'flex-1 truncate text-left font-medium',
                            currentMeeting?.id === meeting.id
                              ? 'text-white'
                              : 'text-white/80',
                          )}
                        >
                          {formatDate(meeting.created_at)}
                        </span>
                        <span
                          className={cn(
                            'mr-2 max-w-[120px] truncate text-xs',
                            currentMeeting?.id === meeting.id
                              ? 'text-white/90'
                              : 'text-white/50',
                          )}
                        >
                          {meeting.title}
                        </span>
                        {hasTranscript ? (
                          <FileText
                            className={cn(
                              'h-3 w-3',
                              currentMeeting?.id === meeting.id
                                ? 'text-white'
                                : 'text-designer-violet',
                            )}
                          />
                        ) : meeting.meeting_id && autoSyncStatus !== 'idle' ? (
                          <div className="flex items-center">
                            <Loader2
                              className={cn(
                                'h-3 w-3 animate-spin',
                                currentMeeting?.id === meeting.id
                                  ? 'text-white/70'
                                  : 'text-designer-violet/70',
                              )}
                            />
                          </div>
                        ) : meeting.meeting_id ? (
                          <WifiOff
                            className={cn(
                              'h-3 w-3',
                              currentMeeting?.id === meeting.id
                                ? 'text-white/50'
                                : 'text-white/30',
                            )}
                          />
                        ) : null}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100',
                          'text-white/50 hover:bg-red-500/20 hover:text-red-400',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeeting(meeting);
                        }}
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/60">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-sm font-medium text-white">
                    {currentMeeting?.title || 'Meeting Summary'}
                  </h4>
                  {currentMeeting?.hasActualTranscript && (
                    <Badge
                      variant="outline"
                      className="text-designer-violet border-designer-violet text-xs"
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Transcript Available
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-white/80">
                  {currentMeeting?.summary || 'No summary available'}
                </p>
              </div>
              {currentMeeting && (
                <>
                  {currentMeeting.hasActualTranscript ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-designer-violet/50 hover:bg-designer-violet/10 w-full"
                      onClick={() => handleViewTranscript(currentMeeting)}
                    >
                      <FileText className="text-designer-violet mr-2 h-4 w-4" />
                      {isTranscriptExpanded
                        ? 'Hide Transcript'
                        : 'View Full Transcript'}
                      {isTranscriptExpanded ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  ) : currentMeeting.meeting_id &&
                    currentMeeting.meeting_id !== 'null' ? (
                    <div className="space-y-2 py-3 text-center">
                      <p className="text-sm text-white/50">
                        Meeting completed - click to sync transcript from
                        AI Notetaker
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('🔄 Manual sync with MeetGeek API...');
                          try {
                            console.log(
                              '🔄 Syncing MeetGeek meeting:',
                              currentMeeting.meeting_id,
                            );
                            const response = await fetch(
                              `/api/meetgeek/sync-meeting?accountId=${accountId}`,
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  meetingId: currentMeeting.meeting_id,
                                }),
                              },
                            );
                            
                            let result;
                            try {
                              result = await response.json();
                            } catch (jsonError) {
                              console.error('❌ Failed to parse sync response as JSON:', jsonError);
                              throw new Error('Invalid response from sync endpoint');
                            }

                            if (response.ok && result?.success) {
                              console.log(
                                '✅ Meeting synced successfully:',
                                result.data,
                              );
                              
                              // Check if new transcripts were added and trigger notifications
                              if (result.data?.transcriptsStored > 0) {
                                toast.success('Transcript Updated', {
                                  description: `Meeting transcript processed. Analyzing insights...`,
                                });
                                
                                // Trigger deal updates refresh after a short delay to allow AI analysis
                                setTimeout(() => {
                                  handleRefresh();
                                  toast.success('Deal Updated', {
                                    description: 'Meeting insights and momentum score updated from transcript analysis.',
                                  });
                                }, 3000);
                              } else {
                                // Just refresh normally
                                handleRefresh();
                              }
                            } else {
                              const errorMessage = result?.error || 
                                                 result?.message || 
                                                 `HTTP ${response.status}: ${response.statusText}` || 
                                                 'Unknown error';
                              console.error('❌ Sync failed:', {
                                status: response.status,
                                statusText: response.statusText,
                                result: result,
                                error: errorMessage
                              });
                              
                              toast.error('Sync Failed', {
                                description: errorMessage,
                              });
                            }
                          } catch (error) {
                            console.error(
                              '❌ Error syncing with MeetGeek:',
                              error,
                            );
                            const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
                            toast.error('Sync Error', {
                              description: `Failed to sync with MeetGeek: ${errorMessage}`,
                            });
                          }
                        }}
                        className="text-xs"
                        disabled={loading || autoSyncStatus === 'syncing'}
                      >
                        {autoSyncStatus === 'syncing' ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        {autoSyncStatus === 'syncing'
                          ? 'Syncing...'
                          : 'Check for Transcript'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 py-3 text-center">
                      <p className="text-sm text-white/50">
                        Transcript will be available after meeting completion
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="highlights" className="mt-4">
            <div className="space-y-2">
              {currentMeeting?.highlights &&
              currentMeeting.highlights.length > 0 ? (
                currentMeeting.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="bg-designer-violet/10 flex items-start gap-2 rounded-lg p-3"
                  >
                    <AlertCircle className="text-designer-violet mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm text-white/80">{highlight}</p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-white/50">
                  No highlights available
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-2">
              {currentMeeting?.action_items &&
              currentMeeting.action_items.length > 0 ? (
                currentMeeting.action_items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white/80">{item.text}</p>
                      {item.assignee && (
                        <div className="mt-1 flex items-center gap-1">
                          <User className="h-3 w-3 text-white/50" />
                          <span className="text-xs text-white/50">
                            {item.assignee}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-white/50">
                  No action items available
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Inline Transcript Expansion */}
        {isTranscriptExpanded && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Meeting Transcript
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = transcript
                      .map((segment) => `${segment.speaker}: ${segment.text}`)
                      .join('\n\n');
                    navigator.clipboard.writeText(text);
                  }}
                  disabled={transcript.length === 0}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcript..."
                    className="w-64 border-gray-700 bg-gray-800 pl-10"
                    disabled={transcript.length === 0}
                  />
                </div>
              </div>
            </div>

            <ScrollArea className="h-96 pr-4">
              {transcriptLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transcriptError ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-white/20" />
                  <p className="mb-2 text-white/50">{transcriptError}</p>
                  <p className="text-sm text-white/30">
                    Transcript data may not be available for this meeting yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTranscript.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto mb-3 h-12 w-12 text-white/20" />
                      <p className="text-white/50">
                        {searchQuery
                          ? 'No matching transcript segments found'
                          : 'No transcript available'}
                      </p>
                    </div>
                  ) : (
                    filteredTranscript.map((segment, index) => (
                      <div
                        key={index}
                        className="flex gap-4 rounded-lg bg-gray-800/30 p-3 transition-colors hover:bg-gray-800/50"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-designer-violet/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                            <User className="text-designer-violet h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(segment.start_time)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium text-white">
                              {segment.speaker}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTime(segment.start_time)} -{' '}
                              {formatTime(segment.end_time)}
                            </span>
                          </div>
                          <p className="leading-relaxed text-white/80">
                            {highlightSearchText(segment.text)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Meeting
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete "{meetingToDelete?.title}"?
              {meetingToDelete?.hasActualTranscript &&
                ' This will also delete the transcript data.'}
              <br />
              <span className="font-medium text-red-400">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMeeting}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            >
              {deleting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {deleting ? 'Deleting...' : 'Delete Meeting'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
