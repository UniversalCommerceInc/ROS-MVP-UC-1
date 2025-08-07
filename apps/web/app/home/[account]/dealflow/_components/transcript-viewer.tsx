'use client';

import { useEffect, useRef, useState } from 'react';

import { Clock, Copy, Download, Pause, Play, Search, User } from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { cn } from '@kit/ui/utils';

interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
}

interface TranscriptViewerProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TranscriptViewer({
  meetingId,
  isOpen,
  onClose,
}: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTranscript, setFilteredTranscript] = useState<
    TranscriptSegment[]
  >([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = getSupabaseBrowserClient();

  // Fetch transcript data
  useEffect(() => {
    if (isOpen && meetingId) {
      fetchTranscript();
    }
  }, [isOpen, meetingId]);

  // Filter transcript when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscript(transcript);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = transcript.filter((segment) =>
      segment.text.toLowerCase().includes(query),
    );
    setFilteredTranscript(filtered);
  }, [searchQuery, transcript]);

  const fetchTranscript = async () => {
    setLoading(true);
    try {
      // Try to fetch real meeting data from database
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (meetingError) {
        console.log('No meeting found in database, using mock data');
        // Fallback to mock data
        const mockTranscript: TranscriptSegment[] = generateMockTranscript();
        setTranscript(mockTranscript);
        setFilteredTranscript(mockTranscript);
        setAudioUrl('https://example.com/meeting-recording.mp3');
      } else {
        console.log('Found meeting data:', meeting);

        // If we have a transcript URL, we could potentially fetch the actual transcript
        // For now, we'll use enhanced mock data based on the meeting info
        const enhancedMockTranscript: TranscriptSegment[] =
          generateEnhancedMockTranscript(meeting);
        setTranscript(enhancedMockTranscript);
        setFilteredTranscript(enhancedMockTranscript);

        // Use the recording URL from the meeting if available
        setAudioUrl(
          meeting.recording_url ||
            meeting.transcript_url ||
            'https://example.com/meeting-recording.mp3',
        );
      }

      // Simulate API delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Error fetching transcript:', error);
      // Fallback to mock data on error
      const mockTranscript: TranscriptSegment[] = generateMockTranscript();
      setTranscript(mockTranscript);
      setFilteredTranscript(mockTranscript);
      setAudioUrl('https://example.com/meeting-recording.mp3');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTranscript = (): TranscriptSegment[] => {
    // Generate a realistic mock transcript
    return [
      {
        speaker: 'John Smith',
        text: "Thanks everyone for joining today's call. We're here to discuss the implementation of VELLORA.AI into your current sales workflow.",
        start_time: 0,
        end_time: 10.5,
      },
      {
        speaker: 'Sarah Johnson',
        text: "Great to be here. We're really excited about the potential of your solution. Our main pain point right now is the amount of time our sales team spends on administrative tasks.",
        start_time: 11.2,
        end_time: 22.8,
      },
      {
        speaker: 'John Smith',
        text: "That's exactly what we specialize in. Our AI-powered system can reduce admin work by up to 60%, freeing your team to focus on actual selling.",
        start_time: 23.5,
        end_time: 35.2,
      },
      {
        speaker: 'Michael Chen',
        text: "Can you tell us more about the implementation timeline? We're looking to roll this out before the end of the quarter.",
        start_time: 36.0,
        end_time: 42.3,
      },
      {
        speaker: 'John Smith',
        text: 'Absolutely. Our typical implementation takes 2-3 weeks. We start with data migration, then user training, and finally go live with full support.',
        start_time: 43.1,
        end_time: 55.7,
      },
      {
        speaker: 'Sarah Johnson',
        text: 'What about integration with our existing CRM? We use Salesforce and need seamless data flow.',
        start_time: 56.4,
        end_time: 64.2,
      },
      {
        speaker: 'John Smith',
        text: 'We have a native Salesforce integration that works out of the box. All your data will sync automatically in real-time.',
        start_time: 65.0,
        end_time: 75.8,
      },
      {
        speaker: 'Michael Chen',
        text: 'That sounds promising. What about security? We handle sensitive customer data.',
        start_time: 76.5,
        end_time: 82.1,
      },
      {
        speaker: 'John Smith',
        text: "Security is a top priority for us. We're SOC 2 compliant, use end-to-end encryption, and can sign custom DPAs if needed.",
        start_time: 83.0,
        end_time: 95.3,
      },
      {
        speaker: 'Sarah Johnson',
        text: "Great. Let's talk about pricing. Our budget for this quarter is somewhat limited.",
        start_time: 96.0,
        end_time: 102.5,
      },
      {
        speaker: 'John Smith',
        text: 'I understand. We have flexible pricing options and can work with your budget constraints. Let me walk you through our packages.',
        start_time: 103.2,
        end_time: 115.0,
      },
      // Add more segments as needed
    ];
  };

  const generateEnhancedMockTranscript = (
    meeting: any,
  ): TranscriptSegment[] => {
    // Generate transcript based on actual meeting data
    const baseTranscript = generateMockTranscript();

    // If we have highlights or action items, incorporate them into the transcript
    if (meeting.highlights && meeting.highlights.length > 0) {
      const highlightSegments = meeting.highlights.map(
        (highlight: string, index: number) => ({
          speaker: 'Meeting Participant',
          text: highlight,
          start_time: 120 + index * 15,
          end_time: 135 + index * 15,
        }),
      );
      baseTranscript.push(...highlightSegments);
    }

    if (meeting.action_items && meeting.action_items.length > 0) {
      const actionSegments = meeting.action_items.map(
        (action: string, index: number) => ({
          speaker: 'Action Item Discussion',
          text: `We need to ${action}`,
          start_time: 200 + index * 20,
          end_time: 220 + index * 20,
        }),
      );
      baseTranscript.push(...actionSegments);
    }

    // Add summary as closing segment if available
    if (meeting.summary) {
      baseTranscript.push({
        speaker: 'Meeting Summary',
        text: meeting.summary,
        start_time: 300,
        end_time: 330,
      });
    }

    return baseTranscript.sort((a, b) => a.start_time - b.start_time);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlaySegment = (segment: TranscriptSegment) => {
    if (!audioRef.current || !audioUrl) return;

    // Set current time to segment start
    audioRef.current.currentTime = segment.start_time;

    // Play audio
    audioRef.current.play();
    setIsPlaying(true);
    setActiveSegment(`${segment.speaker}-${segment.start_time}`);

    // Set timeout to pause at segment end
    const duration = segment.end_time - segment.start_time;
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, duration * 1000);
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCopyTranscript = () => {
    const text = transcript
      .map((segment) => `${segment.speaker}: ${segment.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed inset-4 m-auto max-h-[calc(100vh-3rem)] w-[95vw] max-w-4xl overflow-hidden border-gray-700 bg-gray-900 p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Transcript Viewer</DialogTitle>
        <DialogHeader className="border-b border-gray-700 px-6 py-4">
          <DialogTitle>Meeting Transcript</DialogTitle>
          <DialogDescription>
            Full transcript of the meeting with{' '}
            {transcript.length > 0 ? transcript[0].speaker : 'participants'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(100%-80px)] flex-col">
          {/* Audio player (hidden but functional) */}
          {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

          {/* Controls */}
          <div className="flex items-center justify-between border-b border-gray-700 px-6 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handlePlayPause}
                disabled={!audioUrl}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPlaying ? 'Pause' : 'Play'} Recording
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyTranscript}
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </Button>
              {audioUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(audioUrl, '_blank')}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>

            <div className="relative w-1/3">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript..."
                className="border-gray-700 bg-gray-800 pl-10"
              />
            </div>
          </div>

          {/* Transcript content */}
          <Tabs defaultValue="transcript" className="flex flex-1 flex-col">
            <TabsList className="justify-start bg-transparent px-6 pt-4">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="speakers">By Speaker</TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="m-0 flex-1 p-0">
              <ScrollArea className="h-full px-6 py-4">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredTranscript.map((segment, index) => (
                      <div
                        key={`${segment.speaker}-${segment.start_time}`}
                        className={cn(
                          'flex gap-4',
                          activeSegment ===
                            `${segment.speaker}-${segment.start_time}` &&
                            '-mx-2 rounded-md bg-gray-800/50 px-2 py-1',
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-designer-violet/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                            <User className="text-designer-violet h-5 w-5" />
                          </div>
                          <button
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                            onClick={() => handlePlaySegment(segment)}
                          >
                            <Clock className="h-3 w-3" />
                            {formatTime(segment.start_time)}
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium">
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
                    ))}

                    {filteredTranscript.length === 0 && !loading && (
                      <div className="py-10 text-center">
                        <p className="text-gray-400">
                          No results found for "{searchQuery}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="speakers" className="m-0 flex-1 p-0">
              <ScrollArea className="h-full px-6 py-4">
                {loading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        {Array.from({ length: 3 }).map((_, j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Group by speaker */}
                    {Object.entries(
                      transcript.reduce(
                        (acc, segment) => {
                          if (!acc[segment.speaker]) {
                            acc[segment.speaker] = [];
                          }
                          acc[segment.speaker].push(segment);
                          return acc;
                        },
                        {} as Record<string, TranscriptSegment[]>,
                      ),
                    ).map(([speaker, segments]) => (
                      <div key={speaker} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-designer-violet/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                            <User className="text-designer-violet h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-semibold">{speaker}</h3>
                          <span className="text-sm text-gray-400">
                            {segments.length} segment
                            {segments.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="space-y-3 pl-14">
                          {segments.map((segment) => (
                            <div
                              key={`${segment.speaker}-${segment.start_time}`}
                              className="space-y-1"
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                                  onClick={() => handlePlaySegment(segment)}
                                >
                                  <Clock className="h-3 w-3" />
                                  {formatTime(segment.start_time)}
                                </button>
                              </div>
                              <p className="leading-relaxed text-white/80">
                                {highlightSearchText(segment.text)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
