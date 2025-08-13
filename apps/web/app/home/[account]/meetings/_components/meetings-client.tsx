'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  subDays,
} from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Link,
  Loader2,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users2,
  X,
  Zap,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { cn } from '@kit/ui/utils';

import {
  GoogleLogo,
  MicrosoftLogo,
} from '../../emails/_components/email-integrations';
import { GmailConnectButton } from '../../emails/_components/gmail-connect-button';
import { OutlookConnectButton } from '../../emails/_components/outlook-connect-button';
import { CreateDealFromMeetingDialog } from './create-deal-from-meeting-dialog';

// Meeting impact types
type MeetingImpact = 'breakthrough' | 'progress' | 'neutral' | 'friction';

interface Meeting {
  id: string;
  dealId: string;
  dealName: string;
  date: string;
  impact: MeetingImpact;
  momentum: number;
  keyOutcome: string;
  decisions: string[];
  actionItems: Array<{
    id: string;
    text: string;
    owner: string;
    dueDate?: string;
    completed?: boolean;
  }>;
  insights: string[];
  participants: string[];
  duration: number;
  transcriptAvailable: boolean;
  recordingAvailable: boolean;
  suggestedFollowUp?: {
    type: 'email' | 'call' | 'meeting';
    title: string;
    message: string;
    timing: string;
  };
  keyInsightSnippet?: string;
  meetingSummary?: string;
  deal_id?: string | null;
  source?: string; // Added source property

  // Enhanced insight data
  meetingSummaries?: any[];
  meetingHighlights?: any[];
  fullSummary?: string | null;
  aiInsights?: string | null;
  emailInsights?: string[];
}

interface CalendarConnectionStatus {
  google: {
    connected: boolean;
    email: string | null;
    expires_at: string | null;
  };
  microsoft: {
    connected: boolean;
    email: string | null;
    expires_at: string | null;
  };
}

// Helper functions (keeping existing ones)
const getImpactColor = (impact: MeetingImpact) => {
  switch (impact) {
    case 'breakthrough':
      return 'text-green-400';
    case 'progress':
      return 'text-blue-400';
    case 'neutral':
      return 'text-gray-400';
    case 'friction':
      return 'text-orange-400';
  }
};

const getImpactIcon = (impact: MeetingImpact, className = 'h-5 w-5') => {
  const iconClass = cn(className, getImpactColor(impact));
  switch (impact) {
    case 'breakthrough':
      return <TrendingUp className={iconClass} />;
    case 'progress':
      return <ArrowRight className={iconClass} />;
    case 'neutral':
      return <Minus className={iconClass} />;
    case 'friction':
      return <TrendingDown className={iconClass} />;
  }
};

const getImpactPillBgColor = (impact: MeetingImpact) => {
  switch (impact) {
    case 'breakthrough':
      return 'bg-green-500/20 text-green-300';
    case 'progress':
      return 'bg-blue-500/20 text-blue-300';
    case 'neutral':
      return 'bg-gray-500/20 text-gray-300';
    case 'friction':
      return 'bg-orange-500/20 text-orange-300';
  }
};

const getImpactLabel = (impact: MeetingImpact) => {
  switch (impact) {
    case 'breakthrough':
      return 'Breakthrough';
    case 'progress':
      return 'Progress';
    case 'neutral':
      return 'Discovery';
    case 'friction':
      return 'Friction';
  }
};

const groupMeetingsByDeal = (meetings: Meeting[]) => {
  return meetings.reduce(
    (acc, meeting) => {
      if (!acc[meeting.dealId]) {
        acc[meeting.dealId] = {
          dealName: meeting.dealName,
          meetings: [],
        };
      }
      acc[meeting.dealId]?.meetings.push(meeting);
      acc[meeting.dealId]?.meetings.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return acc;
    },
    {} as Record<string, { dealName: string; meetings: Meeting[] }>,
  );
};

interface MeetingsClientProps {
  meetings: Meeting[];
  accountId: string;
  account: string;
}

export function MeetingsClient({
  meetings,
  accountId,
  account,
}: MeetingsClientProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(
    meetings[0] || null,
  );
  const [modalMeeting, setModalMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<
    'timeline' | 'insights' | 'analytics'
  >('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterImpact, setFilterImpact] = useState<MeetingImpact | 'all'>(
    'all',
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInvitingBot, setIsInvitingBot] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [createDealMeeting, setCreateDealMeeting] = useState<Meeting | null>(
    null,
  );
  const [calendarStatus, setCalendarStatus] =
    useState<CalendarConnectionStatus | null>(null);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);

  // Fetch calendar connection status on component mount
  useEffect(() => {
    fetchCalendarStatus();
  }, [accountId]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch(
        `/api/calendar-status?accountId=${accountId}`,
      );
      if (response.ok) {
        const status = await response.json();
        setCalendarStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    }
  };

  const handleCalendarSync = async () => {
    try {
      setIsSyncing(true);

      const response = await fetch(
        `/api/sync-meetings-comprehensive?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            triggerSource: 'manual',
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        const sourcesText = result.sources?.length
          ? ` from ${result.sources.join(' and ')}`
          : '';

        toast.success(
          `Synced ${result.saved} calendar events${sourcesText} and invited MeetGeek bot to ${result.invited} meetings!`,
        );
        window.location.reload();
      } else {
        if (
          result.error?.includes('Gmail') ||
          result.error?.includes('Microsoft') ||
          result.error?.includes('Connect') ||
          result.status === 401
        ) {
          setShowConnectionPanel(true);
          toast.error('Please connect at least one calendar service first.');
          return;
        }
        toast.error(result.error || 'Failed to sync meetings');
      }
    } catch (error) {
      console.error('Meeting sync error:', error);
      toast.error('Failed to sync meetings');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInviteMeetGeekBot = async () => {
    try {
      setIsInvitingBot(true);

      const response = await fetch(
        `/api/invite-meetgeek-all?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Invited MeetGeek bot to ${result.invited} meetings! ${result.meetingsUpdated} meeting records updated.`,
        );
        if (result.invited > 0) {
          window.location.reload();
        }
      } else {
        toast.error(
          result.error || 'Failed to invite MeetGeek bot to meetings',
        );
      }
    } catch (error) {
      console.error('MeetGeek bot invitation error:', error);
      toast.error('Failed to invite MeetGeek bot to meetings');
    } finally {
      setIsInvitingBot(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    // Date filter
    if (dateRange?.from && dateRange.to) {
      const meetingDate = new Date(meeting.date);
      if (
        !isWithinInterval(meetingDate, {
          start: dateRange.from,
          end: dateRange.to,
        })
      ) {
        return false;
      }
    }

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      meeting.dealName.toLowerCase().includes(searchLower) ||
      meeting.keyOutcome.toLowerCase().includes(searchLower) ||
      meeting.insights.some((i) => i.toLowerCase().includes(searchLower)) ||
      meeting.decisions.some((d) => d.toLowerCase().includes(searchLower));

    // Impact filter
    const matchesImpact =
      filterImpact === 'all' || meeting.impact === filterImpact;

    return matchesSearch && matchesImpact;
  });

  const meetingsByDeal = groupMeetingsByDeal(filteredMeetings);
  const sortedDealEntries = Object.entries(meetingsByDeal).sort(
    ([, dealA], [, dealB]) => {
      const latestMeetingA = dealA.meetings[0]?.date;
      const latestMeetingB = dealB.meetings[0]?.date;
      if (!latestMeetingA || !latestMeetingB) return 0;
      return (
        new Date(latestMeetingB).getTime() - new Date(latestMeetingA).getTime()
      );
    },
  );

  // Calculate calendar connection stats
  const connectedCalendars = calendarStatus
    ? [
        calendarStatus.google.connected && 'Google Calendar',
        calendarStatus.microsoft.connected && 'Microsoft Calendar',
      ].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-monument mb-2 text-4xl text-white">
                Meetings
              </h1>
              <p className="text-lg text-white/70">
                What happened. What it means. What's next.
              </p>
              {/* Calendar connection status */}
              {calendarStatus && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {connectedCalendars.length > 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-green-400">
                        Connected: {connectedCalendars.join(', ')}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-400" />
                      <span className="text-orange-400">
                        No calendars connected
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConnectionPanel(true)}
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Settings className="mr-2 h-4 w-4" />
                Calendar Settings
              </Button>

              <Button
                onClick={handleCalendarSync}
                disabled={
                  isSyncing || isInvitingBot || connectedCalendars.length === 0
                }
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')}
                />
                {isSyncing ? 'Syncing...' : 'Sync Calendar'}
              </Button>

              <Button
                onClick={handleInviteMeetGeekBot}
                disabled={isSyncing || isInvitingBot}
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Bot
                  className={cn(
                    'mr-2 h-4 w-4',
                    isInvitingBot && 'animate-pulse',
                  )}
                />
                {isInvitingBot ? 'Inviting Bot...' : 'Invite AI Notetaker'}
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Connection Alert */}
        {connectedCalendars.length === 0 && (
          <Alert className="mb-6 border-orange-500/30 bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-200">
              Connect your Google Calendar or Microsoft Calendar to start
              syncing meetings.
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-orange-300 hover:text-orange-200"
                onClick={() => setShowConnectionPanel(true)}
              >
                Connect Calendar →
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {/* Filter Summary */}
        {(searchQuery || filterImpact !== 'all' || dateRange?.from) && (
          <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span>
                  Showing {filteredMeetings.length} of {meetings.length}{' '}
                  meetings
                </span>
                {searchQuery && <span>• Search: "{searchQuery}"</span>}
                {filterImpact !== 'all' && (
                  <span>• Impact: {getImpactLabel(filterImpact)}</span>
                )}
                {dateRange?.from && (
                  <span>
                    • Date:{' '}
                    {dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : `Since ${format(dateRange.from, 'MMM d')}`}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterImpact('all');
                  setDateRange(undefined);
                }}
                className="text-white/60 hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full flex-grow sm:w-auto sm:max-w-md sm:flex-grow-0">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search outcomes, insights, decisions..."
              className="w-full border-white/10 bg-white/5 pl-10 placeholder:text-white/40 focus:border-white/20"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={cn(
                'transition-all',
                viewMode === 'timeline'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
            >
              Timeline
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('insights')}
              className={cn(
                'transition-all',
                viewMode === 'insights'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
            >
              Insights
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('analytics')}
              className={cn(
                'transition-all',
                viewMode === 'analytics'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
            >
              Analytics
            </Button>
          </div>

          <div className="ml-auto flex flex-wrap gap-1">
            {(
              [
                'all',
                'breakthrough',
                'progress',
                'neutral',
                'friction',
              ] as const
            ).map((impact) => (
              <Button
                key={impact}
                variant="ghost"
                size="sm"
                onClick={() => setFilterImpact(impact)}
                className={cn(
                  'px-2 py-1 text-xs transition-all sm:px-3 sm:py-1.5 sm:text-sm',
                  filterImpact === impact
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                  impact !== 'all' && filterImpact !== impact
                    ? getImpactColor(impact)
                    : '',
                  impact !== 'all' && filterImpact === impact
                    ? getImpactColor(impact)
                    : '',
                )}
              >
                {impact === 'all' ? (
                  'All'
                ) : (
                  <div className="flex items-center gap-1">
                    {getImpactIcon(impact, 'h-3.5 w-3.5 sm:h-4 sm:w-4')}
                    <span className="hidden sm:inline">
                      {getImpactLabel(impact)}
                    </span>
                  </div>
                )}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from
                    ? dateRange?.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : `Since ${format(dateRange.from, 'MMM d')}`
                    : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {dateRange?.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(undefined)}
                className="text-white/60 hover:bg-white/5 hover:text-white"
              >
                Clear
              </Button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Quick Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 7),
                        to: new Date(),
                      })
                    }
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 30),
                        to: new Date(),
                      })
                    }
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 90),
                        to: new Date(),
                      })
                    }
                  >
                    Last 90 days
                  </Button>
                  <Separator className="my-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setFilterImpact('breakthrough')}
                  >
                    Breakthrough meetings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setFilterImpact('friction')}
                  >
                    Friction meetings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Left Column: Timeline / Insights */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {viewMode === 'timeline' ? (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {sortedDealEntries.length > 0 ? (
                    sortedDealEntries.map(
                      ([dealId, { dealName, meetings }]) => (
                        <div key={dealId} className="space-y-3">
                          <h3 className="text-xl font-semibold text-white/90">
                            {dealName}
                          </h3>
                          <div className="relative border-l border-white/10 pl-6">
                            {meetings.map((meeting, index) => (
                              <MeetingMoment
                                key={meeting.id}
                                meeting={meeting}
                                isSelected={selectedMeeting?.id === meeting.id}
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setModalMeeting(meeting);
                                }}
                                isLastInGroup={index === meetings.length - 1}
                                onCreateDeal={() => {
                                  setCreateDealMeeting(meeting);
                                  setModalMeeting(null); // Close modal
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="py-16 text-center">
                      <Sparkles className="mx-auto mb-4 h-16 w-16 text-white/20" />
                      <p className="text-lg text-white/50">
                        {meetings.length === 0
                          ? "No calendar events found. Click 'Sync Calendar' to import your Google Calendar meetings."
                          : 'No meetings match your criteria.'}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : viewMode === 'insights' ? (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <MeetingInsightsComponent meetings={filteredMeetings} />
                </motion.div>
              ) : (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <MeetingAnalyticsComponent meetings={filteredMeetings} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Selected Meeting Details */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedMeeting ? (
                <motion.div
                  key={selectedMeeting.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="sticky top-24 space-y-6"
                >
                  <NextActionsPanel meeting={selectedMeeting} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="sticky top-24 flex h-full flex-col items-center justify-center rounded-xl bg-white/5 p-8 text-center"
                >
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-white/20" />
                  <p className="text-white/40">
                    Select a meeting to see details and next actions.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Meeting Details Modal */}
      <Dialog
        open={!!modalMeeting}
        onOpenChange={(open) => !open && setModalMeeting(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-gray-700 bg-gray-900">
          <DialogTitle>Meeting Details</DialogTitle>
          {modalMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-white">
                  {getImpactIcon(modalMeeting.impact, 'h-5 w-5')}
                  {modalMeeting.dealName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Meeting Overview */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(modalMeeting.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Clock className="h-4 w-4" />
                    {modalMeeting.duration} minutes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Users2 className="h-4 w-4" />
                    {modalMeeting.participants.length} participants
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Impact and Key Outcome */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        'text-sm',
                        getImpactPillBgColor(modalMeeting.impact),
                      )}
                    >
                      {getImpactLabel(modalMeeting.impact)}
                    </Badge>
                    {modalMeeting.meetingSummary && (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-400"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI Notetaker Summary
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-white">
                      {modalMeeting.meetingSummary
                        ? 'AI Notetaker Summary'
                        : 'Key Outcome'}
                    </h3>
                    <p className="leading-relaxed text-gray-300">
                      {modalMeeting.meetingSummary || modalMeeting.keyOutcome}
                    </p>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Tabs for Details */}
                <Tabs defaultValue="insights" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                    <TabsTrigger
                      value="insights"
                      className="text-gray-300 data-[state=active]:text-white"
                    >
                      Insights
                    </TabsTrigger>
                    <TabsTrigger
                      value="decisions"
                      className="text-gray-300 data-[state=active]:text-white"
                    >
                      Decisions
                    </TabsTrigger>
                    <TabsTrigger
                      value="actions"
                      className="text-gray-300 data-[state=active]:text-white"
                    >
                      Action Items
                    </TabsTrigger>
                    <TabsTrigger
                      value="participants"
                      className="text-gray-300 data-[state=active]:text-white"
                    >
                      Participants
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="insights" className="space-y-4">
                    {/* Full Meeting Summary */}
                    {modalMeeting.fullSummary && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                          <h4 className="font-medium text-blue-200">
                            Meeting Summary
                          </h4>
                        </div>
                        <p className="leading-relaxed text-gray-300">
                          {modalMeeting.fullSummary}
                        </p>
                      </div>
                    )}

                    {/* AI Insights */}
                    {modalMeeting.aiInsights && (
                      <div className="rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                          <h4 className="font-medium text-purple-200">
                            AI Analysis
                          </h4>
                        </div>
                        <p className="leading-relaxed text-gray-300">
                          {modalMeeting.aiInsights}
                        </p>
                      </div>
                    )}

                    {/* Meeting Highlights */}
                    {modalMeeting.meetingHighlights &&
                      modalMeeting.meetingHighlights.length > 0 && (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                            <h4 className="font-medium text-yellow-200">
                              Key Highlights
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {modalMeeting.meetingHighlights.map(
                              (highlight: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-1 text-yellow-400">
                                    ✨
                                  </span>
                                  <p className="text-gray-300">
                                    {highlight.highlight}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Email Context */}
                    {modalMeeting.emailInsights &&
                      modalMeeting.emailInsights.length > 0 && (
                        <div className="rounded-lg border border-green-500/30 bg-green-900/20 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-400"></div>
                            <h4 className="font-medium text-green-200">
                              Email Context
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {modalMeeting.emailInsights.map(
                              (insight: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-1 text-green-400">
                                    📧
                                  </span>
                                  <p className="text-gray-300">{insight}</p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Other Insights */}
                    <div className="rounded-lg bg-gray-800 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                        <h4 className="font-medium text-gray-200">
                          Meeting Details
                        </h4>
                      </div>
                      {modalMeeting.insights.length > 0 ? (
                        <div className="space-y-2">
                          {modalMeeting.insights.map((insight, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="mt-1 text-gray-500">•</span>
                              <p className="text-gray-300">{insight}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">
                          No additional insights available
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="decisions" className="space-y-3">
                    {modalMeeting.decisions.length > 0 ? (
                      modalMeeting.decisions.map((decision, index) => (
                        <div key={index} className="rounded-lg bg-gray-800 p-3">
                          <p className="text-gray-300">{decision}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">
                        No decisions recorded
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="actions" className="space-y-3">
                    {modalMeeting.actionItems.length > 0 ? (
                      modalMeeting.actionItems.map((action, index) => (
                        <div key={index} className="rounded-lg bg-gray-800 p-3">
                          <div className="flex items-start justify-between">
                            <p className="flex-1 text-gray-300">
                              {action.text}
                            </p>
                            <div className="ml-4 text-sm text-gray-500">
                              <p>Owner: {action.owner}</p>
                              {action.dueDate && (
                                <p>
                                  Due:{' '}
                                  {new Date(
                                    action.dueDate,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No action items</p>
                    )}
                  </TabsContent>

                  <TabsContent value="participants" className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {modalMeeting.participants.map((participant, index) => (
                        <div key={index} className="rounded-lg bg-gray-800 p-3">
                          <p className="text-gray-300">{participant}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Recording/Transcript Status */}
                {(modalMeeting.transcriptAvailable ||
                  modalMeeting.recordingAvailable) && (
                  <>
                    <Separator className="bg-gray-700" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white">
                        Available Resources
                      </h3>
                      <div className="flex gap-2">
                        {modalMeeting.transcriptAvailable && (
                          <Badge
                            variant="outline"
                            className="border-green-500 text-green-400"
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Transcript Available
                          </Badge>
                        )}
                        {modalMeeting.recordingAvailable && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-400"
                          >
                            Recording Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      {createDealMeeting && (
        <CreateDealFromMeetingDialog
          isOpen={!!createDealMeeting}
          onClose={() => setCreateDealMeeting(null)}
          meeting={{
            id: createDealMeeting.id,
            title: createDealMeeting.dealName,
            participant_emails: createDealMeeting.participants,
            host_email: undefined, // Not available in UI Meeting interface
            start_time: createDealMeeting.date,
          }}
          accountId={accountId}
          accountName={account}
          onDealCreated={() => {
            toast.success('Meeting converted to deal successfully!');
            window.location.reload(); // Refresh to show updated data
          }}
        />
      )}

      {/* Enhanced Calendar & Email Connection Panel Dialog */}
      <Dialog open={showConnectionPanel} onOpenChange={setShowConnectionPanel}>
        <DialogContent className="max-w-lg border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5 text-blue-400" />
              <CalendarIcon className="h-5 w-5 text-green-400" />
              Connect Email & Calendar
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Connect your email and calendar to automatically sync meetings and
              get AI insights from your communications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Benefits Section */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">
                  Automatic email sync with your deals
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-green-400" />
                <span className="text-gray-300">
                  Smart meeting scheduling and transcription
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 text-center">🤖</span>
                <span className="text-gray-300">
                  AI insights from your communications
                </span>
              </div>
            </div>

            {/* Connection Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-white">Choose a Provider:</h4>

              {/* Google Option */}
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <GoogleLogo className="h-6 w-6" />
                  <div>
                    <h3 className="font-medium text-white">Google</h3>
                    <p className="text-sm text-gray-400">
                      Gmail + Google Calendar
                    </p>
                    {calendarStatus?.google.connected &&
                      calendarStatus.google.email && (
                        <p className="text-xs text-green-400">
                          ✓ Connected: {calendarStatus.google.email}
                        </p>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {calendarStatus?.google.connected ? (
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-400"
                    >
                      ✓ Connected
                    </Badge>
                  ) : (
                    <GmailConnectButton
                      accountId={accountId}
                      variant="default"
                      size="sm"
                    >
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <CalendarIcon className="h-3 w-3" />
                        <span>Connect</span>
                      </div>
                    </GmailConnectButton>
                  )}
                </div>
              </div>

              {/* Microsoft Option */}
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <MicrosoftLogo className="h-6 w-6" />
                  <div>
                    <h3 className="font-medium text-white">Microsoft</h3>
                    <p className="text-sm text-gray-400">
                      Outlook + Microsoft Calendar
                    </p>
                    {calendarStatus?.microsoft.connected &&
                      calendarStatus.microsoft.email && (
                        <p className="text-xs text-green-400">
                          ✓ Connected: {calendarStatus.microsoft.email}
                        </p>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {calendarStatus?.microsoft.connected ? (
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-400"
                    >
                      ✓ Connected
                    </Badge>
                  ) : (
                    <OutlookConnectButton
                      accountId={accountId}
                      variant="default"
                      size="sm"
                    >
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <CalendarIcon className="h-3 w-3" />
                        <span>Connect</span>
                      </div>
                    </OutlookConnectButton>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-gray-400">
                You'll be redirected to authorize access. We only read emails
                and create calendar events - never send emails without your
                permission.
              </p>
              {calendarStatus &&
                (calendarStatus.google.connected ||
                  calendarStatus.microsoft.connected) && (
                  <div className="mt-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConnectionPanel(false)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                  </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// MeetingMoment Component
interface MeetingMomentProps {
  meeting: Meeting;
  isSelected: boolean;
  onClick: () => void;
  isLastInGroup: boolean;
  onCreateDeal?: (meeting: Meeting) => void; // New prop for creating deals
}

const MeetingMoment: React.FC<MeetingMomentProps> = ({
  meeting,
  isSelected,
  onClick,
  isLastInGroup,
  onCreateDeal,
}) => {
  const isStandalone =
    !meeting.deal_id || meeting.dealId?.startsWith('meeting_');

  return (
    <motion.div
      className={cn(
        'group relative mb-6 cursor-pointer transition-all duration-200',
        isSelected
          ? '-ml-4 scale-[1.02] rounded-lg bg-white/5 p-4'
          : '-ml-4 rounded-lg p-4 hover:scale-[1.01] hover:bg-white/[0.02]',
      )}
      whileHover={{ scale: isSelected ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute top-6 left-0 h-3 w-3 -translate-x-1/2 transform rounded-full border-2 transition-all duration-200',
          isSelected
            ? `${getImpactColor(meeting.impact).replace('text-', 'bg-')} border-white/20`
            : 'border-white/20 bg-white/10 group-hover:bg-white/20',
        )}
      />

      {/* Connecting line (if not last) */}
      {!isLastInGroup && (
        <div className="absolute top-9 left-0 h-full w-px -translate-x-1/2 transform bg-white/5" />
      )}

      {/* Content */}
      <div className="ml-6">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getImpactIcon(meeting.impact, 'h-4 w-4')}
            <div
              className={cn(
                'rounded-full px-2 py-1 text-xs',
                getImpactPillBgColor(meeting.impact),
              )}
            >
              {getImpactLabel(meeting.impact)}
            </div>
            {/* Standalone Meeting Badge */}
            {isStandalone && (
              <div className="rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-300">
                📅 Standalone
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-white/50">
              <CalendarDays className="h-3 w-3" />
              {new Date(meeting.date).toLocaleDateString()}
            </div>
            {/* Create Deal Button for Standalone Meetings */}
            {isStandalone && onCreateDeal && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 border-green-500/30 bg-green-500/10 px-2 text-xs text-green-300 hover:bg-green-500/20"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the meeting modal
                  onCreateDeal(meeting);
                }}
              >
                💼 Create Deal
              </Button>
            )}
          </div>
        </div>

        <div onClick={onClick}>
          <h4 className="mb-1 leading-tight font-medium text-white/90">
            {meeting.keyOutcome}
          </h4>

          <div className="mb-2 flex items-center gap-4 text-xs text-white/40">
            <div className="flex items-center gap-1">
              <Users2 className="h-3 w-3" />
              {meeting.participants.length} participants
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meeting.duration}m
            </div>
            {meeting.transcriptAvailable && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Transcript
              </div>
            )}
          </div>

          {meeting.keyInsightSnippet && (
            <p className="line-clamp-2 text-sm leading-relaxed text-white/60">
              {meeting.keyInsightSnippet}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// NextActionsPanel Component
interface NextActionsPanelProps {
  meeting: Meeting;
}

const NextActionsPanel: React.FC<NextActionsPanelProps> = ({ meeting }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="rounded-xl bg-white/5 p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          {getImpactIcon(meeting.impact, 'h-5 w-5')}
          <div
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              getImpactPillBgColor(meeting.impact),
            )}
          >
            {getImpactLabel(meeting.impact)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 font-semibold text-white">
            {meeting.meetingSummary
              ? 'AI Notetaker Summary'
              : 'Meeting Summary'}
          </h3>
          <p className="text-sm leading-relaxed text-white/70">
            {meeting.meetingSummary || meeting.keyOutcome}
          </p>
          {meeting.meetingSummary && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
              <Sparkles className="h-3 w-3" />
              Generated by AI Notetaker
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 font-medium text-white">Action Items</h4>
          <div className="space-y-2">
            {meeting.actionItems.length > 0 ? (
              meeting.actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg bg-white/5 p-3"
                >
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full',
                      item.completed ? 'bg-green-400' : 'bg-white/30',
                    )}
                  />
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        item.completed
                          ? 'text-white/50 line-through'
                          : 'text-white/90',
                      )}
                    >
                      {item.text}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-white/40">
                        {item.owner}
                      </span>
                      {item.dueDate && (
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-xs',
                            isOverdue(item.dueDate)
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-white/10 text-white/60',
                          )}
                        >
                          {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-white/40">
                No action items recorded
              </p>
            )}
          </div>
        </div>

        {meeting.insights.length > 0 && (
          <div>
            <h4 className="mb-3 font-medium text-white">Key Insights</h4>
            <div className="space-y-2">
              {meeting.insights.map((insight, index) => (
                <div key={index} className="rounded-lg bg-white/5 p-3">
                  <p className="text-sm text-white/80">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {meeting.decisions.length > 0 && (
          <div>
            <h4 className="mb-3 font-medium text-white">Decisions Made</h4>
            <div className="space-y-2">
              {meeting.decisions.map((decision, index) => (
                <div key={index} className="rounded-lg bg-white/5 p-3">
                  <p className="text-sm text-white/80">{decision}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Mail className="mr-2 h-4 w-4" />
              Follow Up
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Phone className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MeetingInsightsComponent
interface MeetingInsightsComponentProps {
  meetings: Meeting[];
}

const MeetingInsightsComponent: React.FC<MeetingInsightsComponentProps> = ({
  meetings,
}) => {
  const impactCounts = meetings.reduce(
    (acc, meeting) => {
      acc[meeting.impact] = (acc[meeting.impact] || 0) + 1;
      return acc;
    },
    {} as Record<MeetingImpact, number>,
  );

  const allInsights = meetings.flatMap((meeting) => meeting.insights);
  const recentInsights = allInsights.slice(0, 10); // Show recent insights

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(['breakthrough', 'progress', 'neutral', 'friction'] as const).map(
          (impact) => (
            <div key={impact} className="rounded-lg bg-white/5 p-4 text-center">
              <div className="mb-2 flex justify-center">
                {getImpactIcon(impact, 'h-6 w-6')}
              </div>
              <div className="mb-1 text-2xl font-bold text-white">
                {impactCounts[impact] || 0}
              </div>
              <div className="text-xs text-white/60">
                {getImpactLabel(impact)}
              </div>
            </div>
          ),
        )}
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold text-white">
          Recent Insights
        </h3>
        <div className="space-y-3">
          {recentInsights.length > 0 ? (
            recentInsights.map((insight, index) => (
              <div key={index} className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-white/80">{insight}</p>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-white/40">No insights recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// MeetingAnalyticsComponent
interface MeetingAnalyticsComponentProps {
  meetings: Meeting[];
}

const MeetingAnalyticsComponent: React.FC<MeetingAnalyticsComponentProps> = ({
  meetings,
}) => {
  const analytics = useMemo(() => {
    const totalMeetings = meetings.length;
    const totalDuration = meetings.reduce(
      (sum, meeting) => sum + meeting.duration,
      0,
    );
    const averageDuration =
      totalMeetings > 0 ? Math.round(totalDuration / totalMeetings) : 0;

    const impactCounts = meetings.reduce(
      (acc, meeting) => {
        acc[meeting.impact] = (acc[meeting.impact] || 0) + 1;
        return acc;
      },
      {} as Record<MeetingImpact, number>,
    );

    const dealCounts = meetings.reduce(
      (acc, meeting) => {
        acc[meeting.dealName] = (acc[meeting.dealName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topDeals = Object.entries(dealCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalActionItems = meetings.reduce(
      (sum, meeting) => sum + meeting.actionItems.length,
      0,
    );
    const completedActionItems = meetings.reduce(
      (sum, meeting) =>
        sum + meeting.actionItems.filter((item) => item.completed).length,
      0,
    );

    const completionRate =
      totalActionItems > 0
        ? Math.round((completedActionItems / totalActionItems) * 100)
        : 0;

    return {
      totalMeetings,
      totalDuration,
      averageDuration,
      impactCounts,
      topDeals,
      totalActionItems,
      completedActionItems,
      completionRate,
    };
  }, [meetings]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-white/60">Total Meetings</p>
              <p className="text-3xl font-semibold text-white">
                {analytics.totalMeetings}
              </p>
            </div>
            <div className="bg-designer-violet/20 rounded-full p-3">
              <CalendarDays className="text-designer-violet h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-white/60">Total Duration</p>
              <p className="text-3xl font-semibold text-white">
                {formatDuration(analytics.totalDuration)}
              </p>
              <p className="text-xs text-white/40">
                Avg: {formatDuration(analytics.averageDuration)}
              </p>
            </div>
            <div className="bg-designer-blue/20 rounded-full p-3">
              <Clock className="text-designer-blue h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-white/60">Action Items</p>
              <p className="text-3xl font-semibold text-white">
                {analytics.totalActionItems}
              </p>
              <p className="text-xs text-white/40">
                {analytics.completedActionItems} completed
              </p>
            </div>
            <div className="rounded-full bg-green-500/20 p-3">
              <Target className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-white/60">Completion Rate</p>
              <p className="text-3xl font-semibold text-white">
                {analytics.completionRate}%
              </p>
              <p className="text-xs text-white/40">Action items</p>
            </div>
            <div className="rounded-full bg-yellow-500/20 p-3">
              <CheckCircle2 className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Impact Distribution */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Meeting Impact Distribution
          </h3>
          <div className="space-y-3">
            {(['breakthrough', 'progress', 'neutral', 'friction'] as const).map(
              (impact) => {
                const count = analytics.impactCounts[impact] || 0;
                const percentage =
                  analytics.totalMeetings > 0
                    ? Math.round((count / analytics.totalMeetings) * 100)
                    : 0;
                return (
                  <div
                    key={impact}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getImpactIcon(impact, 'h-4 w-4')}
                      <span className="text-white/80 capitalize">{impact}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-white/10">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            getImpactColor(impact),
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-sm text-white/60">{count}</span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* Top Deals */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Most Active Deals
          </h3>
          <div className="space-y-3">
            {analytics.topDeals.map((deal, index) => (
              <div
                key={deal.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-designer-violet/20 text-designer-violet flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-white/80">{deal.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-white/10">
                    <div
                      className="bg-designer-violet h-2 rounded-full"
                      style={{
                        width: `${analytics.topDeals[0]?.count ? (deal.count / analytics.topDeals[0].count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-sm text-white/60">
                    {deal.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
          Export Analytics
        </Button>
      </div>
    </div>
  );
};
