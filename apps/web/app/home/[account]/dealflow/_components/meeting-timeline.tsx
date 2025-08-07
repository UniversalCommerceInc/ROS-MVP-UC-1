'use client';

import { useState, useEffect } from 'react';

import { Calendar, ChevronDown, ChevronUp, Clock, Mic, CalendarClock, Video, Loader2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

interface Meeting {
  id: string;
  title: string;
  date: string | null;
  duration: number | null;
  participants: string[];
  summary: string;
  actionItems: string[];
  type: 'completed' | 'scheduled';
  recordingUrl?: string;
  meetingLink?: string;
  status?: string;
  aiInsights?: string;
}

interface MeetingTimelineProps {
  dealId: string;
  accountId: string;
}

export default function MeetingTimeline({ dealId, accountId }: MeetingTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dealId || !accountId) return;

    const fetchMeetings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/deals/${dealId}/meetings?accountId=${accountId}`,
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('📅 Fetched real meetings:', data.meetings);
          setMeetings(data.meetings || []);
        } else {
          console.error('Failed to fetch meetings - Response:', response.status, response.statusText);
          setError('Failed to load meetings');
          setMeetings([]);
        }
      } catch (error) {
        console.error('Error fetching meetings:', error);
        setError('Failed to load meetings');
        setMeetings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetings();
  }, [dealId, accountId]);

  // Show only the first meeting if not expanded
  const displayedMeetings = isExpanded ? meetings : meetings.slice(0, 1);

  if (!dealId) return null;

  return (
    <Card className="border-gray-700 bg-gray-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-white">
            Meeting Timeline
          </CardTitle>
          {meetings.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-designer-violet" />
            <span className="ml-2 text-xs text-gray-400">Loading meetings...</span>
          </div>
        ) : error ? (
          <div className="py-3 text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : displayedMeetings.length > 0 ? (
          <div className="space-y-3">
            {displayedMeetings.map((meeting, index) => (
              <div
                key={meeting.id}
                className={cn(
                  'relative',
                  index !== displayedMeetings.length - 1 && 'pb-3',
                )}
              >
                {/* Timeline connector */}
                {index !== displayedMeetings.length - 1 && (
                  <div className="absolute top-6 bottom-0 left-3 w-0.5 bg-gray-700" />
                )}

                <div className="flex gap-3">
                  <div className="bg-designer-violet/20 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {meeting.type === 'completed' ? (
                      <Mic className="text-designer-violet h-3 w-3" />
                    ) : (
                      <CalendarClock className="text-blue-400 h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{meeting.title}</p>
                      {meeting.type === 'scheduled' && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                          {meeting.status || 'Scheduled'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {meeting.date && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(meeting.date).toLocaleDateString()}
                        </div>
                      )}
                      {meeting.duration && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Clock className="mr-1 h-3 w-3" />
                          {meeting.duration} min
                        </div>
                      )}
                    </div>
                    
                    {meeting.summary && (
                      <p className="mt-2 text-xs text-gray-300">
                        {meeting.summary}
                      </p>
                    )}

                    {meeting.actionItems && meeting.actionItems.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-400">
                          {meeting.type === 'completed' ? 'Key Highlights:' : 'Action Items:'}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {meeting.actionItems.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1 text-xs text-gray-300"
                            >
                              <span className="text-green-400">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {meeting.recordingUrl && (
                      <div className="mt-2">
                        <a
                          href={meeting.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-designer-violet hover:text-designer-violet/80"
                        >
                          <Video className="h-3 w-3" />
                          View Recording
                        </a>
                      </div>
                    )}

                    {meeting.meetingLink && meeting.type === 'scheduled' && (
                      <div className="mt-2">
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-400/80"
                        >
                          <Video className="h-3 w-3" />
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs text-gray-400">
              No meetings yet. Schedule a meeting to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
