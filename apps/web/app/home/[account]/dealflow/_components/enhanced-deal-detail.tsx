'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  Clock,
  Download,
  Edit,
  Info,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import { cn } from '@kit/ui/utils';

import { useAuth } from '~/components/providers/auth-provider';

import {
  GmailLogo,
  OutlookLogo,
} from '../../emails/_components/email-integrations';
import { useDealUpdatesStream } from '../_lib/hooks/use-deal-updates-stream';
import { useEnhancedAutoSync } from '../_lib/hooks/use-enhanced-auto-sync';
import { DealAssignment } from './deal-assignment';
import { EmailProviderSelector } from './email-provider-selector';
import { GmailCompose } from './gmail-compose';
// import { MeetGeekBotService } from "@/services/meetgeekBotService";
import InlineEmailEditor from './inline-email-editor';
// import { CalendarIntegrationSection } from "@/components/calendar/calendar-integration-section";
import MeetingCalendarModal from './meeting-calendar-modal';
import { MeetingProviderSelector } from './meeting-provider-selector';
import MeetingSummary from './meeting-summary';
import MeetingTimeline from './meeting-timeline';

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  isDecisionMaker?: boolean;
  isPrimary?: boolean;
  lastContacted?: string;
  avatarUrl?: string;
  contactRoleType?: 'technical' | 'financial' | 'executive' | 'other';
}

interface Activity {
  id: string;
  type:
    | 'email'
    | 'call'
    | 'meeting'
    | 'note'
    | 'task'
    | 'file'
    | 'scheduled_meeting';
  title: string;
  description?: string;
  date: string;
  completed?: boolean;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  metadata?: {
    from?: string;
    to?: string[] | string;
    subject?: string;
    body?: string;
    isRead?: boolean;
    isFromUser?: boolean;
    duration?: number;
    participant_count?: number;
    has_transcript?: boolean;
    meeting_id?: string;
    summary?: string;
    status?: string;
    attendees?: string[];
    meetgeek_id?: string;
    end_time?: string;
    source?: string;
  };
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xls' | 'ppt' | 'other';
  uploadedAt: string;
  size?: string;
  url?: string;
}

interface Deal {
  id: string;
  companyName: string;
  industry: string;
  value: string;
  contact: Contact;
  email: string;
  stage:
    | 'interested'
    | 'contacted'
    | 'demo'
    | 'proposal'
    | 'negotiation'
    | 'won'
    | 'lost';
  createdAt: string;
  closeDate?: string;
  probability?: number;
  painPoints?: string[];
  nextSteps?: string[];
  companySize?: string;
  website?: string;
  dealTitle?: string;
  nextAction?: string;
  relationshipInsights?: string;
  description?: string;
  contacts?: Contact[];
  activities?: Activity[];
  documents?: Document[];
  // AI analysis fields
  greenFlags?: string[];
  redFlags?: string[];
  organizationalContext?: string[];
  competitorMentions?: string[];
  sentimentEngagement?: string[];
  lastAnalysisDate?: string;
  // Assignment field
  assignedTo?: string;
}

interface EnhancedDealDetailProps {
  deal: Deal | null;
  accountId: string;
  accountSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (deal: Deal) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSchedulingResponse?: boolean;
  showPlatformSelector?: boolean;
  dealInfo?: {
    dealId: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
  };
  showEmailProviderSelector?: boolean; // ADD
  availableProviders?: ('gmail' | 'outlook')[]; // ADD
  emailProvider?: 'gmail' | 'outlook'; // ADD
  emailComponents?: {
    subject: string;
    body: string;
    to: string;
    cc?: string;
    bcc?: string;
    provider?: 'gmail' | 'outlook'; // ADD
  };
}

interface MeetingDetails {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  attendees: string[];
}

// Google Meet Icon Component (Original Logo)
const GoogleMeetIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 32 32"
  >
    <path d="M24,21.45V25a2.0059,2.0059,0,0,1-2,2H9V21h9V16Z" fill="#00ac47" />
    <polygon fill="#31a950" points="24 11 24 21.45 18 16 18 11 24 11" />
    <polygon fill="#ea4435" points="9 5 9 11 3 11 9 5" />
    <rect fill="#4285f4" height="11" width="6" x="3" y="11" />
    <path
      d="M24,7v4h-.5L18,16V11H9V5H22A2.0059,2.0059,0,0,1,24,7Z"
      fill="#ffba00"
    />
    <path d="M9,21v6H5a2.0059,2.0059,0,0,1-2-2V21Z" fill="#0066da" />
    <path
      d="M29,8.26V23.74a.9989.9989,0,0,1-1.67.74L24,21.45,18,16l5.5-5,.5-.45,3.33-3.03A.9989.9989,0,0,1,29,8.26Z"
      fill="#00ac47"
    />
    <polygon fill="#188038" points="24 10.55 24 21.45 18 16 23.5 11 24 10.55" />
  </svg>
);

// Microsoft Teams Icon Component (Updated Clean Logo)
const TeamsIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      fill="#5059C9"
      d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323zM13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"
    />
    <path
      fill="#7B83EB"
      d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113zM11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"
    />
    <path
      fill="#000000"
      d="M8.814 6.875v5.255a.598.598 0 01-.596.595H5.193a3.951 3.951 0 01-.287-1.476V7.5a.61.61 0 01.597-.624h3.31z"
      opacity=".1"
    />
    <path
      fill="#000000"
      d="M8.488 6.875v5.58a.6.6 0 01-.596.595H5.347a3.22 3.22 0 01-.267-.65 3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.488 6.875v4.93a.6.6 0 01-.596.595H5.08a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.163 6.875v4.93a.6.6 0 01-.596.595H5.079a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.66z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.814 5.195v1.024c-.055.003-.107.006-.163.006-.055 0-.107-.003-.163-.006A2.115 2.115 0 016.593 4.6h1.625a.598.598 0 01.596.594z"
      opacity=".1"
    />
    <path
      fill="#000000"
      d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z"
      opacity=".2"
    />
    <path
      fill="#000000"
      d="M8.163 5.52v.647a2.115 2.115 0 01-1.465-1.242h.87a.598.598 0 01.595.595z"
      opacity=".2"
    />
    <path
      fill="url(#microsoft-teams-color-16__paint0_linear_2372_494)"
      d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"
    />
    <path
      fill="#ffffff"
      d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"
    />
    <defs>
      <linearGradient
        id="microsoft-teams-color-16__paint0_linear_2372_494"
        x1="2.244"
        x2="6.906"
        y1="4.46"
        y2="12.548"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#5A62C3" />
        <stop offset=".5" stopColor="#4D55BD" />
        <stop offset="1" stopColor="#3940AB" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Determines if a next step should show the "Execute with AI" button
 * Only show for:
 * 1. Follow up email steps
 * 2. Meeting invite steps
 * 3. The first next step if it's about scheduling a meeting
 */
function shouldShowExecuteWithAI(
  step: string,
  index: number,
  allSteps: string[],
): boolean {
  const stepLower = step.toLowerCase();

  // Check if this is the first step and it's about scheduling a meeting
  const isFirstStep = index === 0;
  const isSchedulingStep =
    (stepLower.includes('schedule') && stepLower.includes('meeting')) ||
    (stepLower.includes('schedule') && stepLower.includes('call')) ||
    (stepLower.includes('book') && stepLower.includes('meeting')) ||
    (stepLower.includes('set up') && stepLower.includes('meeting')) ||
    stepLower.includes('schedule a meeting');

  // Check if this is about drafting a follow up email
  const isFollowUpEmail =
    (stepLower.includes('follow up') && stepLower.includes('email')) ||
    (stepLower.includes('follow-up') && stepLower.includes('email')) ||
    (stepLower.includes('send') && stepLower.includes('follow up')) ||
    (stepLower.includes('send') && stepLower.includes('follow-up')) ||
    (stepLower.includes('draft') && stepLower.includes('email')) ||
    (stepLower.includes('email') && stepLower.includes('follow'));

  // Check if this is about sending a meeting invite
  const isMeetingInvite =
    (stepLower.includes('meeting') && stepLower.includes('invite')) ||
    (stepLower.includes('send') && stepLower.includes('calendar')) ||
    (stepLower.includes('send') && stepLower.includes('meeting')) ||
    (stepLower.includes('calendar') && stepLower.includes('invite'));

  // Only show Execute with AI for:
  // 1. First step if it's about scheduling
  // 2. Follow up email steps
  // 3. Meeting invite steps
  return (
    (isFirstStep && isSchedulingStep) || isFollowUpEmail || isMeetingInvite
  );
}

export default function EnhancedDealDetail({
  deal,
  accountId,
  accountSlug,
  isOpen,
  onClose,
  onUpdate,
}: EnhancedDealDetailProps) {
  const { user } = useAuth();
  const [meetingProvider, setMeetingProvider] = useState<
    'google' | 'microsoft'
  >('google');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contacts' | 'activity' | 'documents' | 'meetings'
  >('overview');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localNextSteps, setLocalNextSteps] = useState<string[]>([]);
  const [localPainPoints, setLocalPainPoints] = useState<string[]>([]);
  const [deletingNextStep, setDeletingNextStep] = useState<number | null>(null);
  const [deletingPainPoint, setDeletingPainPoint] = useState<number | null>(
    null,
  );
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showCalendarInline, setShowCalendarInline] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedStartSlot, setSelectedStartSlot] = useState<string | null>(
    null,
  );

  const [selectedEndSlot, setSelectedEndSlot] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<
    MeetingDetails & { provider?: 'google' | 'microsoft' }
  >({
    title: `Meeting with ${deal?.companyName ?? ''}`,
    startTime: '09:00',
    endTime: '10:00',
    description: `Meeting with ${deal?.contact?.name ?? ''} from ${deal?.companyName ?? ''}`,
    location: 'Google Meet', // This will be updated based on provider
    attendees: deal?.contact?.email ? [deal.contact.email] : [],
    provider: 'google',
  });
  const [busyTimes, setBusyTimes] = useState<
    { date: string; times: { start: string; end: string }[] }[]
  >([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendeeNameInput, setAttendeeNameInput] = useState('');
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [schedulingTimeSlot, setSchedulingTimeSlot] = useState<string | null>(
    null,
  );
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [realActivities, setRealActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // State for email provider selection
  const [selectedEmailProvider, setSelectedEmailProvider] = useState<
    'gmail' | 'outlook' | null
  >(null);

  // Enhanced auto-sync for intensive polling after meeting scheduling
  const { startIntensivePolling } = useEnhancedAutoSync({
    accountId,
    enabled: true,
    onSyncSuccess: (data) => {
      console.log('✅ Enhanced deal detail auto-sync success:', data);
    },
    onSyncError: (error) => {
      console.error('❌ Enhanced deal detail auto-sync error:', error);
    },
  });

  // Real-time deal updates stream for automatic UI refresh
  useDealUpdatesStream({
    accountId,
    dealId: deal?.id,
    enabled: !!deal?.id,
    onDealUpdate: (updatedDeal) => {
      console.log('📡 Deal updated in real-time:', updatedDeal);

      // Update the deal in the parent component if onUpdate is provided
      if (onUpdate) {
        // Transform the database deal to match the component's expected format
        const transformedDeal = {
          ...deal,
          momentum: updatedDeal.momentum,
          momentumTrend: updatedDeal.momentum_trend,
          nextSteps: updatedDeal.next_steps || [],
          painPoints: updatedDeal.pain_points || [],
          greenFlags: updatedDeal.green_flags || [],
          redFlags: updatedDeal.red_flags || [],
          lastMeetingSummary: updatedDeal.last_meeting_summary,
          blockers: updatedDeal.blockers || [],
          opportunities: updatedDeal.opportunities || [],
          lastAnalysisDate: updatedDeal.last_analysis_date,
        };

        onUpdate(transformedDeal);
      }
    },
  });

  // Email summary state
  const [emailSummary, setEmailSummary] = useState<string | null>(null);
  const [emailSummaryLoading, setEmailSummaryLoading] = useState(false);
  const [emailSummaryError, setEmailSummaryError] = useState<string | null>(
    null,
  );

  // Contact editing state
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingContactData, setEditingContactData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    isDecisionMaker: boolean;
    isPrimary: boolean;
    contactRoleType: 'technical' | 'financial' | 'executive' | 'other';
  }>({
    name: '',
    email: '',
    phone: '',
    role: '',
    isDecisionMaker: false,
    isPrimary: false,
    contactRoleType: 'other',
  });
  const [newContactData, setNewContactData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
  }>({ name: '', email: '', phone: '', role: '' });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [refreshContacts, setRefreshContacts] = useState(0);

  // Edit deal state
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [editDealData, setEditDealData] = useState({
    companyName: '',
    dealTitle: '',
    value: '',
    stage: '',
    closeDate: '',
    description: '',
    industry: '',
  });
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [isDeletingDeal, setIsDeletingDeal] = useState(false);

  // No mock data - use only real contacts from database

  // Fetch real contacts for the deal
  const [realContacts, setRealContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const fetchRealContacts = async () => {
    if (!deal?.id) return;

    setContactsLoading(true);
    try {
      const response = await fetch(
        `/api/deals/${deal.id}/contacts?accountId=${accountId}`,
      );
      if (response.ok) {
        const data = await response.json();
        console.log('📞 Fetched real contacts:', data.contacts);
        setRealContacts(data.contacts || []);
      } else {
        console.error(
          'Failed to fetch contacts - Response:',
          response.status,
          response.statusText,
        );
        setRealContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setRealContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  // Refresh contacts when deal changes or refresh trigger changes
  useEffect(() => {
    if (deal?.id && accountId) {
      console.log(
        '🔄 Fetching contacts for deal:',
        deal.id,
        'account:',
        accountId,
      );
      fetchRealContacts();
    }
  }, [deal?.id, accountId, refreshContacts]);

  // Use only real contacts from database
  const displayContacts = realContacts;

  // Mock activities are now replaced with real activities fetched from the API
  // const mockActivities: Activity[] = useMemo(() => deal?.activities || [], [deal])

  const mockDocuments: Document[] = useMemo(
    () =>
      deal?.documents || [
        {
          id: '1',
          name: 'TechCorp_Proposal_v1.pdf',
          type: 'pdf',
          uploadedAt: '2023-05-15T14:00:00',
          size: '2.4 MB',
        },
        {
          id: '2',
          name: 'Product_Brochure.pdf',
          type: 'pdf',
          uploadedAt: '2023-05-16T09:30:00',
          size: '1.8 MB',
        },
      ],
    [deal],
  );

  const enhancedDeal: Deal = useMemo(
    () => ({
      ...deal!,
      nextSteps: localNextSteps,
      painPoints: localPainPoints,
      contacts: displayContacts,
      activities: realActivities,
      documents: mockDocuments,
      closeDate: deal?.closeDate || '2023-06-30',
    }),
    [
      deal,
      localNextSteps,
      localPainPoints,
      displayContacts,
      realActivities,
      mockDocuments,
    ],
  );

  // Function to calculate time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Initialize AI conversation when modal opens
  useEffect(() => {
    if (isOpen && deal) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: `What action can I help you take next?`,
          timestamp: new Date(),
        },
      ]);
      setActiveTab('overview');

      // Initialize local state with deal data
      setLocalNextSteps(deal.nextSteps || []);
      setLocalPainPoints(deal.painPoints || []);

      // Update meeting details when deal changes
      setMeetingDetails({
        title: `Meeting with ${deal?.companyName ?? ''}`,
        startTime: '09:00',
        endTime: '10:00',
        description: `Meeting with ${deal?.contact?.name ?? ''} from ${
          deal?.companyName ?? ''
        }`,
        location: 'Google Meet',
        attendees: deal?.contact?.email ? [deal.contact.email] : [],
      });

      // Fetch real activities when deal changes
      fetchRealActivities();
    }
  }, [isOpen, deal]);

  // Update local state when deal analysis data changes (e.g., after comprehensive analysis completes)
  useEffect(() => {
    if (deal) {
      setLocalNextSteps(deal.nextSteps || []);
      setLocalPainPoints(deal.painPoints || []);
    }
  }, [deal?.nextSteps, deal?.painPoints, deal?.lastAnalysisDate]);

  // Auto-scroll to bottom of messages within the chat container only
  useEffect(() => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  const formatCurrency = (value: string) => {
    if (!value || value === 'null' || value === 'undefined') return '$0';

    // Handle different value formats
    let cleanValue = value.toString().trim();

    // If it already starts with $, return as is if it's properly formatted
    if (cleanValue.startsWith('$') && !cleanValue.includes('NaN')) {
      return cleanValue;
    }

    // Extract numbers from various formats like "USD 50000", "$50,000", "50000", etc.
    const numberMatch = cleanValue.match(/[\d,]+/);
    if (!numberMatch) return '$0';

    const numValue = parseInt(numberMatch[0].replace(/,/g, ''));
    if (isNaN(numValue)) return '$0';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  // Helper function to detect if AI response suggests scheduling a meeting
  const detectMeetingSchedulingSuggestion = (
    response: string,
    requestType: string,
  ): boolean => {
    // Don't auto-trigger if this was already a meeting scheduling request
    if (requestType === 'meeting_schedule') {
      return false;
    }

    const responseLower = response.toLowerCase();

    // Look for scheduling suggestions in the AI response
    const schedulingKeywords = [
      'schedule a meeting',
      'book a meeting',
      'set up a meeting',
      'arrange a meeting',
      'plan a meeting',
      'schedule a call',
      'book a call',
      'set up a call',
      'schedule time',
      'book time',
      'meet with',
      'meeting with',
    ];

    const nextStepIndicators = [
      'next step',
      'should',
      'recommend',
      'suggest',
      'action item',
      'follow up',
      'priority',
    ];

    // Check if response contains scheduling keywords
    const hasSchedulingKeyword = schedulingKeywords.some((keyword) =>
      responseLower.includes(keyword),
    );

    // Check if it's framed as a next step or recommendation
    const isRecommendation = nextStepIndicators.some((indicator) =>
      responseLower.includes(indicator),
    );

    // Additional patterns for scheduling suggestions
    const schedulingPatterns = [
      /schedule.*meeting/,
      /book.*meeting/,
      /set up.*meeting/,
      /arrange.*meeting/,
      /next.*meeting/,
      /call.*schedule/,
      /meeting.*asap/,
      /follow.*meeting/,
    ];

    const hasSchedulingPattern = schedulingPatterns.some((pattern) =>
      pattern.test(responseLower),
    );

    // Return true if response suggests scheduling and it's framed as a recommendation/next step
    return (hasSchedulingKeyword || hasSchedulingPattern) && isRecommendation;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'closed-won':
        return 'bg-green-500/20 text-green-400';
      case 'closed-lost':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-white';
    }
  };

  const parseNextStepsFromResponse = (response: string): string[] => {
    try {
      // Common patterns for next steps in AI responses
      const patterns = [
        // Pattern 1: Numbered lists (1. 2. 3.)
        /^\s*\d+\.\s*(.+)/gm,
        // Pattern 2: Bullet points (• - *)
        /^\s*[•\-\*]\s*(.+)/gm,
        // Pattern 3: Looking for "Next Steps" section
        /(?:next steps?|action items?|recommendations?)[:\s]*\n((?:\s*[\d•\-\*]\s*.+\n?)+)/gi,
        // Pattern 4: Short-term/immediate actions
        /(?:immediate|short-term|this week)[:\s]*\n((?:\s*[\d•\-\*]\s*.+\n?)+)/gi,
      ];

      let extractedSteps: string[] = [];

      for (const pattern of patterns) {
        const matches = response.match(pattern);
        if (matches) {
          const steps = matches
            .map((match) => {
              // Clean up the matched text
              return match
                .replace(/^\s*[\d•\-\*]\s*/, '') // Remove bullet/number
                .replace(/\n.*$/, '') // Remove any trailing content
                .trim();
            })
            .filter((step) => step.length > 10 && step.length < 200); // Reasonable length

          if (steps.length > 0) {
            extractedSteps = steps;
            break; // Use the first successful pattern
          }
        }
      }

      // If no structured format found, try to extract sentences that look like action items
      if (extractedSteps.length === 0) {
        const sentences = response.split(/[.!?]\s+/);
        extractedSteps = sentences
          .filter((sentence) => {
            const actionWords = [
              'send',
              'schedule',
              'prepare',
              'follow up',
              'contact',
              'create',
              'draft',
              'call',
              'email',
              'meet',
            ];
            return (
              actionWords.some((word) =>
                sentence.toLowerCase().includes(word),
              ) &&
              sentence.length > 15 &&
              sentence.length < 150
            );
          })
          .map((sentence) => sentence.trim())
          .slice(0, 5); // Limit to 5 steps max
      }

      // Clean and validate the extracted steps
      return extractedSteps
        .map((step) => step.trim())
        .filter((step) => {
          // Basic length filter
          if (step.length < 5 || step.length > 200) return false;

          // Filter out redundant or meta-tasks
          const redundantTasks = [
            'identify pain points',
            'execute with ai',
            'ask ai',
            'use ai',
            'click execute',
            'analyze pain points',
            'find pain points',
          ];

          const stepLower = step.toLowerCase();
          return !redundantTasks.some((task) => stepLower.includes(task));
        })
        .slice(0, 5); // Maximum 5 next steps
    } catch (error) {
      console.error('Error parsing next steps:', error);
      return [];
    }
  };

  const parsePainPointsFromResponse = (response: string): string[] => {
    try {
      // Common patterns for pain points in AI responses
      const patterns = [
        // Pattern 1: Numbered lists (1. 2. 3.)
        /^\s*\d+\.\s*(.+)/gm,
        // Pattern 2: Bullet points (• - *)
        /^\s*[•\-\*]\s*(.+)/gm,
        // Pattern 3: Looking for "Pain Points" or "Challenges" section
        /(?:pain points?|challenges?|problems?|issues?|difficulties?)[:\s]*\n((?:\s*[\d•\-\*]\s*.+\n?)+)/gi,
        // Pattern 4: Key challenges/problems sections
        /(?:key challenges?|main problems?|primary issues?)[:\s]*\n((?:\s*[\d•\-\*]\s*.+\n?)+)/gi,
      ];

      let extractedPainPoints: string[] = [];

      for (const pattern of patterns) {
        const matches = response.match(pattern);
        if (matches) {
          const painPoints = matches
            .map((match) => {
              // Clean up the matched text
              return match
                .replace(/^\s*[\d•\-\*]\s*/, '') // Remove bullet/number
                .replace(/\n.*$/, '') // Remove any trailing content
                .trim();
            })
            .filter((point) => point.length > 10 && point.length < 250); // Reasonable length for pain points

          if (painPoints.length > 0) {
            extractedPainPoints = painPoints;
            break; // Use the first successful pattern
          }
        }
      }

      // If no structured format found, try to extract sentences that look like pain points
      if (extractedPainPoints.length === 0) {
        const sentences = response.split(/[.!?]\s+/);
        extractedPainPoints = sentences
          .filter((sentence) => {
            const painWords = [
              'struggle',
              'difficulty',
              'challenge',
              'problem',
              'issue',
              'lack',
              'inefficient',
              'slow',
              'costly',
              'manual',
              'time-consuming',
              'frustrated',
            ];
            return (
              painWords.some((word) => sentence.toLowerCase().includes(word)) &&
              sentence.length > 20 &&
              sentence.length < 200
            );
          })
          .map((sentence) => sentence.trim())
          .slice(0, 5); // Limit to 5 pain points max
      }

      // Clean and validate the extracted pain points
      return extractedPainPoints
        .map((point) => point.trim())
        .filter((point) => point.length > 10 && point.length < 250)
        .slice(0, 5); // Maximum 5 pain points
    } catch (error) {
      console.error('Error parsing pain points:', error);
      return [];
    }
  };

  const sendMessageWithText = async (messageText: string) => {
    if (!messageText.trim() || isTyping || !deal) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    await processMessage(messageText);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping || !deal) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');
    setIsTyping(true);

    await processMessage(messageToSend);
  };

  const processMessage = async (messageToSend: string) => {
    if (!deal) return;

    // ADD: Check if this is an email provider selection response
    if (
      messageToSend.toLowerCase().includes('gmail') ||
      messageToSend.toLowerCase().includes('outlook')
    ) {
      const isGmailSelected = messageToSend.toLowerCase().includes('gmail');
      const isOutlookSelected = messageToSend.toLowerCase().includes('outlook');

      if (isGmailSelected) {
        setSelectedEmailProvider('gmail');
      } else if (isOutlookSelected) {
        setSelectedEmailProvider('outlook');
      }
    }

    // Check if this is a contract negotiation request
    if (
      messageToSend.toLowerCase().includes('negotiate contract') ||
      messageToSend.toLowerCase().includes('contract terms') ||
      messageToSend.toLowerCase().includes('contract negotiation') ||
      (messageToSend.toLowerCase().includes('help me with') &&
        messageToSend.toLowerCase().includes('contract'))
    ) {
      try {
        console.log('🤝 Sending contract negotiation request to AI...');

        // For mock deals, don't call the API that requires database access
        if (deal.id.startsWith('mock-')) {
          console.log('Using mock data for contract negotiation advice');

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `🤝 **Contract Negotiation Strategy for ${
                deal.companyName
              }**

## 📋 Preparation Steps
• Review their stated pain points: ${
                deal.painPoints?.[0] || 'current challenges'
              }
• Understand their decision-making process and timeline
• Prepare value justification tied to their specific needs

## 💰 Pricing Strategy
• Lead with value, not price - emphasize ROI
• Consider flexible payment terms for this ${deal.value} deal
• Offer pilot or phased implementation to reduce risk

## 🔧 Implementation Terms
• Clearly define scope and deliverables
• Set realistic timelines with milestones
• Include success metrics and KPIs

## ⚖️ Risk Mitigation
• Address their specific concerns upfront
• Offer guarantees or service level agreements
• Provide references from similar ${deal.industry} companies

## 🤝 Closing Tactics
• Create urgency with limited-time incentives
• Start with smaller scope to build trust
• Get agreement on next steps: ${deal.nextSteps?.[0] || 'follow-up meeting'}

*Contract negotiation strategy generated using AI analysis specific to ${
                deal.companyName
              }*`,
              timestamp: new Date(),
            },
          ]);

          setIsTyping(false);
          return;
        }

        const response = await fetch('/api/negotiate-contract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            companyName: deal.companyName,
            dealValue: deal.value,
            stage: deal.stage,
            painPoints: deal.painPoints,
            nextSteps: deal.nextSteps,
            industry: deal.industry,
            contactName: deal.contact?.name,
            specificRequest: messageToSend,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `🤝 **Contract Negotiation Strategy**\n\n${data.advice}\n\n*Generated using AI analysis specific to ${deal.companyName}*`,
              timestamp: new Date(),
            },
          ]);
        } else {
          // Use fallback advice if API call failed
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content:
                data.advice ||
                'I encountered an issue generating contract negotiation advice. Please try again or contact support.',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error getting contract negotiation advice:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              "I'm sorry, I encountered an error while generating contract negotiation advice. Please try again later.",
            timestamp: new Date(),
          },
        ]);
      }

      setIsTyping(false);
      return;
    }

    // Check if this is a contact addition request
    const contactInfo = parseContactFromMessage(messageToSend);
    if (contactInfo) {
      console.log('👤 Contact addition request detected:', contactInfo);

      try {
        const contactAdded = await addContactFromMessage(contactInfo);

        if (contactAdded) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ **Contact Added Successfully!**

I've added ${contactInfo.name || contactInfo.email} to your contacts for ${
                deal.companyName
              }.

**Contact Details:**
${contactInfo.name ? `• **Name:** ${contactInfo.name}` : ''}
• **Email:** ${contactInfo.email}
${contactInfo.phone ? `• **Phone:** ${contactInfo.phone}` : ''}
${contactInfo.role ? `• **Role:** ${contactInfo.role}` : ''}

You can now find them in the Contacts tab and they'll be included in deal-related communications and analysis.`,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `❌ **Contact Addition Failed**

I wasn't able to add ${
                contactInfo.name || contactInfo.email
              } to your contacts. This might be because:
• The contact already exists
• There was a database error
• The email format is invalid

Please try adding them manually using the "Add Contact" button in the Contacts tab.`,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error adding contact:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ **Error Adding Contact**

I encountered an error while trying to add ${
              contactInfo.name || contactInfo.email
            } to your contacts. Please try adding them manually using the "Add Contact" button in the Contacts tab.`,
            timestamp: new Date(),
          },
        ]);
      }

      setIsTyping(false);
      return;
    }

    // Use real AI for all other requests
    try {
      console.log('🤖 Sending request to real AI-Deal...');

      // Determine request type based on input
      let requestType = 'general';
      const messageLower = messageToSend.toLowerCase();

      if (messageLower.includes('email') || messageLower.includes('draft')) {
        requestType = 'email';
      } else if (
        (!messageLower.includes('email') &&
          !messageLower.includes('draft') &&
          messageLower.includes('schedule') &&
          messageLower.includes('meeting')) ||
        (messageLower.includes('help') &&
          messageLower.includes('schedule') &&
          messageLower.includes('meeting')) ||
        messageLower.includes('schedule a meeting') ||
        messageLower.includes('book a meeting') ||
        messageLower.includes('set up a meeting') ||
        (messageLower.includes('meeting') &&
          (messageLower.includes('tuesday') ||
            messageLower.includes('wednesday') ||
            messageLower.includes('thursday') ||
            messageLower.includes('friday') ||
            messageLower.includes('monday')))
      ) {
        requestType = 'meeting_schedule';
      } else if (
        messageLower.includes('call') ||
        messageLower.includes('schedule')
      ) {
        requestType = 'call';
      } else if (
        messageLower.includes('analyze') ||
        messageLower.includes('analysis') ||
        messageLower.includes('pain point') ||
        messageLower.includes('challenge') ||
        messageLower.includes('identify') ||
        messageLower.includes('problem')
      ) {
        requestType = 'analysis';
      } else if (
        messageLower.includes('next steps') ||
        messageLower.includes('what should i do')
      ) {
        requestType = 'next_steps';
      }

      // Use specialized deal analysis endpoint for comprehensive analysis
      const apiEndpoint =
        requestType === 'analysis'
          ? `/api/deal-analysis?accountId=${accountId}`
          : `/api/ai-assistant?accountId=${accountId}`;

      const requestBody =
        requestType === 'analysis'
          ? { dealId: deal.id }
          : {
              dealId: deal.id,
              companyName: deal.companyName,
              dealValue: deal.value,
              stage: deal.stage,
              painPoints: deal.painPoints,
              nextSteps: deal.nextSteps,
              industry: deal.industry,
              contactName: deal.contact?.name,
              contactEmail: deal.email,
              requestType: requestType,
              userMessage: messageToSend,
              emailProvider: selectedEmailProvider,

              // Enhanced deal context for intelligent email drafting
              greenFlags: deal.greenFlags || [],
              redFlags: deal.redFlags || [],
              organizationalContext: deal.organizationalContext || [],
              sentimentEngagement: deal.sentimentEngagement || [],
              competitorMentions: deal.competitorMentions || [],
              emailSummary: emailSummary || '',
              dealTitle: deal.dealTitle || '',
              relationshipInsights: deal.relationshipInsights || '',
              momentum: (deal as any).momentum || 0,
              // Additional context that may be available from enhanced deal
              lastMeetingSummary: (deal as any).lastMeetingSummary || '',
              primaryContact:
                (deal as any).primaryContact || deal.contact?.name || '',
              primaryEmail: (deal as any).primaryEmail || deal.email || '',
              lastMeetingDate: (deal as any).lastMeetingDate || '',
              totalMeetings: (deal as any).totalMeetings || 0,
              momentumTrend: (deal as any).momentumTrend || 'steady',
            };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        if (data.showEmailProviderSelector && data.availableProviders) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
              showEmailProviderSelector: true,
              availableProviders: data.availableProviders,
              dealInfo: data.dealInfo,
            },
          ]);
          setIsTyping(false);
          return;
        }
        // Check if AI response suggests scheduling a meeting and auto-trigger scheduling
        const shouldAutoSchedule = detectMeetingSchedulingSuggestion(
          data.response,
          requestType,
        );

        if (shouldAutoSchedule && deal?.contact?.email) {
          console.log(
            '🤖 AI suggested scheduling - auto-triggering meeting scheduling flow',
          );

          // Add the AI's initial response
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
              isSchedulingResponse: data.isSchedulingResponse,
              dealInfo: data.dealInfo,
              emailComponents: data.emailComponents,
              emailProvider: data.emailProvider,
            },
          ]);

          // Auto-trigger meeting scheduling flow
          setTimeout(async () => {
            setIsTyping(true);

            try {
              console.log('📅 Auto-triggering meeting scheduling request...');

              const schedulingResponse = await fetch(
                `/api/ai-assistant?accountId=${accountId}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    dealId: deal.id,
                    companyName: deal.companyName,
                    dealValue: deal.value || 'Not specified',
                    stage: deal.stage,
                    painPoints: deal.painPoints || [],
                    nextSteps: deal.nextSteps || [],
                    industry: deal.industry || 'Not specified',
                    contactName: deal.contact?.name,
                    contactEmail: deal.email,
                    requestType: 'meeting_schedule',
                    userMessage: `help me schedule a meeting with ${deal.companyName}`,
                  }),
                },
              );

              const schedulingData = await schedulingResponse.json();

              if (schedulingData.success) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: schedulingData.response,
                    timestamp: new Date(),
                    isSchedulingResponse: schedulingData.isSchedulingResponse,
                    dealInfo: schedulingData.dealInfo,
                  },
                ]);
              } else {
                console.error(
                  '❌ Auto-scheduling failed:',
                  schedulingData.error,
                );
                setMessages((prev) => [
                  ...prev,
                  {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `I suggested scheduling a meeting, but I couldn't automatically show your available times. Please click the "Schedule Meeting" button above or tell me when you'd like to meet (e.g., "schedule for Tuesday at 2 PM").`,
                    timestamp: new Date(),
                  },
                ]);
              }
            } catch (error) {
              console.error('❌ Error in auto-scheduling:', error);
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `I suggested scheduling a meeting, but encountered an issue showing your calendar. You can use the "Schedule Meeting" button above or tell me a specific time you'd like to meet.`,
                  timestamp: new Date(),
                },
              ]);
            } finally {
              setIsTyping(false);
            }
          }, 800); // Small delay to make it feel natural

          return; // Don't process the rest of the normal flow
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            // Add metadata for interactive scheduling
            isSchedulingResponse: data.isSchedulingResponse,
            dealInfo: data.dealInfo,
            // Add email components for inline editor
            emailComponents: data.emailComponents,
            emailProvider: data.emailProvider,
          },
        ]);

        // NOTE: We no longer auto-update next steps from regular AI chat
        // Next steps should only be updated from:
        // 1. Meeting transcript analysis
        // 2. Meeting summaries/highlights
        // 3. Deal-related email analysis
        // This prevents accidental updates from casual AI conversations

        // Handle meeting scheduling completion
        if (
          data.requestType === 'meeting_schedule' &&
          data.meetingScheduled &&
          deal
        ) {
          try {
            console.log('📅 Meeting was scheduled, updating deal next steps');

            // Remove "Schedule a meeting" from next steps and add follow-up step
            const currentNextSteps = deal.nextSteps || [];
            const filteredSteps = currentNextSteps.filter(
              (step) =>
                !step.toLowerCase().includes('schedule') ||
                !step.toLowerCase().includes('meeting'),
            );

            // Add follow-up steps with specific meeting details
            const newNextSteps = [
              ...filteredSteps,
              'Prepare meeting agenda and talking points',
              `Meeting with ${data.meetingDetails?.contactName || deal.contact?.name || 'contact'} scheduled for ${data.meetingDetails?.date || 'upcoming date'}`,
              'Follow up after the meeting with next steps',
            ];

            // Update the deal in the database
            const updateResponse = await fetch(
              `/api/deals/${deal.id}?accountId=${accountId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  next_steps: newNextSteps,
                }),
              },
            );

            if (updateResponse.ok) {
              console.log('✅ Updated deal after meeting scheduling');

              // Update local state immediately
              setLocalNextSteps(newNextSteps);

              // Update local state through onUpdate callback
              if (onUpdate) {
                onUpdate({
                  ...deal,
                  nextSteps: newNextSteps,
                });
              }
            } else {
              console.error(
                '❌ Failed to update deal after meeting scheduling',
              );
            }
          } catch (updateError) {
            console.error(
              '❌ Error updating deal after meeting scheduling:',
              updateError,
            );
          }
        }

        // NOTE: We no longer auto-update next steps or pain points from regular AI chat
        // These critical deal fields should only be updated from:
        // 1. Meeting transcript analysis (via /api/analyze-transcript)
        // 2. Meeting summaries/highlights sync (via /api/meetgeek/sync-meeting)
        // 3. Deal-related email analysis (future feature)
        // This prevents accidental updates from casual AI conversations
      } else {
        // Use fallback response if API call failed
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              data.response ||
              'I encountered an issue generating a response. Please try again or contact support.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            "I'm sorry, I encountered an error while processing your request. Please try again later.",
          timestamp: new Date(),
        },
      ]);
    }

    setIsTyping(false);
  };

  const fetchBusyDates = async () => {
    try {
      const response = await fetch(
        `/api/calendar/busy-dates?accountId=${accountId}`,
      );
      const data = await response.json();
      console.log('API busyTimes:', data.busyTimes);
      setBusyTimes(data.busyTimes || []);
    } catch (error) {
      console.error('Error fetching busy times:', error);
      toast.error('Failed to fetch busy times');
    }
  };

  const fetchRealActivities = async () => {
    if (!deal?.id) return;

    setActivitiesLoading(true);
    try {
      const response = await fetch(
        `/api/deals/${deal.id}/activities?accountId=${accountId}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealActivities(data.activities || []);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const startEditingDescription = () => {
    // Load the current description being displayed
    const currentDescription =
      (enhancedDeal as any).companyDescription ||
      enhancedDeal.dealTitle ||
      enhancedDeal.relationshipInsights ||
      '';

    setEditingDescription(currentDescription);
    setIsEditingDescription(true);
  };

  const saveDescription = async () => {
    if (!deal?.id) return;

    setIsSavingDescription(true);
    try {
      const response = await fetch(
        `/api/deals/${deal.id}?accountId=${accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: editingDescription,
          }),
        },
      );

      if (response.ok) {
        const updatedDeal = await response.json();
        console.log('✅ Description updated successfully');

        // Update parent state with the correct field mapping
        if (onUpdate) {
          onUpdate({
            ...deal,
            relationshipInsights: editingDescription, // This maps to description in the API
          });
        }

        // The enhanced deal will update automatically via useMemo when the parent state changes

        setIsEditingDescription(false);
        toast.success('Description updated successfully');
      } else {
        console.error('❌ Failed to update description');
        toast.error('Failed to update description');
      }
    } catch (error) {
      console.error('❌ Error updating description:', error);
      toast.error('Error updating description');
    } finally {
      setIsSavingDescription(false);
    }
  };

  const cancelEditingDescription = () => {
    setIsEditingDescription(false);
    setEditingDescription('');
  };

  const addContactToDeal = async (email: string, name: string) => {
    if (!deal?.id) return false;

    setIsAddingContact(true);
    try {
      const response = await fetch(
        `/api/deals/add-contact?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            email,
            name,
          }),
        },
      );

      if (response.ok) {
        toast.success(`${name || email} added to deal contacts`);
        return true;
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add contact to deal');
        return false;
      }
    } catch (error) {
      console.error('Error adding contact to deal:', error);
      toast.error('Failed to add contact to deal');
      return false;
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleAddAttendee = async () => {
    if (!attendeeInput) return;

    // Add to meeting attendees immediately
    setMeetingDetails((prev) => ({
      ...prev,
      attendees: [...prev.attendees, attendeeInput],
      title: `Meeting with ${deal?.companyName ?? ''} and ${
        attendeeNameInput || attendeeInput
      }`,
    }));

    // Add to deal contacts in background
    const contactAdded = await addContactToDeal(
      attendeeInput,
      attendeeNameInput || '',
    );

    // Clear inputs
    setAttendeeInput('');
    setAttendeeNameInput('');
  };

  // Helper to generate time slots (e.g., every 30 min from 8:00 to 20:00)
  function generateTimeSlots(start = 8, end = 20, interval = 30) {
    const slots: string[] = [];
    for (let hour = start; hour < end; hour++) {
      for (let min = 0; min < 60; min += interval) {
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  }

  // Helper to convert 24-hour time to 12-hour format for display
  function formatTime12Hour(time24: string) {
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr);
    const minute = minuteStr;
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minute} ${ampm}`;
  }

  // When a date is selected, compute available time slots
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const busy = busyTimes.find((b) => b.date === dateStr);
    const slots = generateTimeSlots();
    if (!busy) {
      setAvailableTimes(slots);
      return;
    }
    // Filter out slots that overlap with any busy time
    const filtered = slots.filter((slot) => {
      const [slotHour, slotMin] = slot.split(':').map(Number);
      const slotStart = slotHour * 60 + slotMin;
      const slotEnd = slotStart + 30; // 30 min slot
      return !busy.times.some(({ start, end }) => {
        const [busyStartHour, busyStartMin] = start.split(':').map(Number);
        const [busyEndHour, busyEndMin] = end.split(':').map(Number);
        const busyStart = busyStartHour * 60 + busyStartMin;
        const busyEnd = busyEndHour * 60 + busyEndMin;
        return (
          slotStart < busyEnd && slotEnd > busyStart // overlap
        );
      });
    });
    setAvailableTimes(filtered);
  }, [selectedDate, busyTimes]);

  const handleDateSelect = async (
    date: Date,
    meetingDetails: MeetingDetails,
  ) => {
    if (!deal) return;
    setIsLoading(true);
    try {
      // Format the meeting details with proper contact information
      const formattedDetails = {
        ...meetingDetails,
        title:
          meetingDetails.title ||
          `Meeting with ${deal.contact?.name || 'Contact'}`,
        description:
          meetingDetails.description ||
          `Meeting with ${deal.contact?.name || 'Contact'} from ${
            deal.companyName || 'Company'
          }`,
        attendees:
          meetingDetails.attendees.length > 0
            ? meetingDetails.attendees
            : [deal.contact?.email].filter(Boolean),
      };

      console.log('Creating calendar event with data:', {
        dealId: deal.id,
        ...formattedDetails,
      });

      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId: deal.id,
          ...formattedDetails,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Meeting scheduled successfully');
        setIsCalendarClosing(true);
        setTimeout(() => {
          setShowCalendarInline(false);
          setIsCalendarClosing(false);
        }, 700);
      } else {
        toast.error(data.error || 'Failed to schedule meeting');
        setIsCalendarClosing(true);
        setTimeout(() => {
          setShowCalendarInline(false);
          setIsCalendarClosing(false);
        }, 700);
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('Failed to schedule meeting');
      setIsCalendarClosing(true);
      setTimeout(() => {
        setShowCalendarInline(false);
        setIsCalendarClosing(false);
      }, 700);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if a slot is busy
  function isSlotBusy(slot: string, busy: { start: string; end: string }[]) {
    const [slotHour, slotMin] = slot.split(':').map(Number);
    const slotStart = slotHour * 60 + slotMin;
    const slotEnd = slotStart + 30;
    return busy.some(({ start, end }) => {
      const [busyStartHour, busyStartMin] = start.split(':').map(Number);
      const [busyEndHour, busyEndMin] = end.split(':').map(Number);
      const busyStart = busyStartHour * 60 + busyStartMin;
      const busyEnd = busyEndHour * 60 + busyEndMin;
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  }

  // Helper to get all slots in the selected range
  function getSlotsInRange(start: string, end: string, slots: string[]) {
    const startIdx = slots.indexOf(start);
    const endIdx = slots.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return [];
    return slots.slice(startIdx, endIdx + 1);
  }

  // Function to schedule meeting from clicked time slot
  const scheduleFromTimeSlot = async (
    day: string,
    date: string,
    time: string,
    dealInfo: any,
  ) => {
    try {
      console.log('📅 Scheduling meeting from clicked time slot:', {
        day,
        date,
        time,
      });

      // Set loading state for this specific time slot
      const timeSlotKey = `${day}-${time}`;
      setSchedulingTimeSlot(timeSlotKey);

      // Get user's timezone preference
      let userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Default to browser timezone
      try {
        const timezoneResponse = await fetch('/api/user/timezone');
        if (timezoneResponse.ok) {
          const timezoneData = await timezoneResponse.json();
          userTimezone =
            timezoneData.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
      } catch (error) {
        console.warn('Could not fetch user timezone, using browser timezone');
      }

      console.log('📅 Using user timezone for meeting creation:', userTimezone);

      // Parse the clicked time and date in the user's timezone
      const [timeStr, period] = time.split(' ');
      const [hours, minutes] = timeStr.split(':');
      let hour = parseInt(hours);

      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      // Create timezone-aware datetime using Intl.DateTimeFormat to get timezone offset
      const year = new Date().getFullYear();
      const dateMatch = date.match(/(\w+)\s+(\d+)/);
      if (!dateMatch) {
        throw new Error('Invalid date format');
      }

      const monthName = dateMatch[1];
      const dayNum = dateMatch[2];

      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11,
      };

      const monthNum = monthMap[monthName] ?? 6; // Default to July if not found

      // Create a Date object in the user's timezone
      const targetDate = new Date(
        year,
        monthNum,
        parseInt(dayNum),
        hour,
        parseInt(minutes || '0'),
      );

      // Get timezone offset for the user's timezone using proper method
      let timezoneOffset = '';
      try {
        // Create a properly formatted date for the user's timezone and get the offset
        const utcTime =
          targetDate.getTime() - targetDate.getTimezoneOffset() * 60000;
        const targetTimeInTz = new Date(utcTime);

        // Use toLocaleString to get the time in the target timezone
        const timeInUserTz = targetTimeInTz.toLocaleString('en-CA', {
          timeZone: userTimezone,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        // Get offset using Intl.DateTimeFormat
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: userTimezone,
          timeZoneName: 'longOffset',
        });

        const parts = formatter.formatToParts(targetDate);
        const offsetPart = parts.find((part) => part.type === 'timeZoneName');

        if (offsetPart && offsetPart.value) {
          // Convert "GMT-05:00" to "-05:00" or similar
          timezoneOffset = offsetPart.value.replace('GMT', '');
        } else {
          // Fallback: calculate offset manually
          const now = new Date();
          const utc1 = new Date(
            now.getTime() + now.getTimezoneOffset() * 60000,
          );
          const utc2 = new Date(
            utc1.toLocaleString('en-US', { timeZone: userTimezone }),
          );
          const diff = (utc1.getTime() - utc2.getTime()) / 60000; // difference in minutes
          const hours = Math.floor(Math.abs(diff) / 60);
          const minutes = Math.abs(diff) % 60;
          const sign = diff > 0 ? '-' : '+';
          timezoneOffset = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      } catch (error) {
        console.warn(
          'Could not determine timezone offset, calculating from browser timezone',
        );
        // Fallback to browser timezone offset
        const offset = -targetDate.getTimezoneOffset();
        const hours = Math.floor(Math.abs(offset) / 60);
        const minutes = Math.abs(offset) % 60;
        const sign = offset >= 0 ? '+' : '-';
        timezoneOffset = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }

      const paddedMonth = (monthNum + 1).toString().padStart(2, '0');
      const paddedDay = dayNum.padStart(2, '0');
      const paddedHour = hour.toString().padStart(2, '0');
      const paddedMinute = parseInt(minutes || '0')
        .toString()
        .padStart(2, '0');

      // Create RFC3339 datetime string with timezone offset
      const startTime = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinute}:00${timezoneOffset}`;
      const endHour = hour + 1;
      const endTime = `${year}-${paddedMonth}-${paddedDay}T${endHour.toString().padStart(2, '0')}:${paddedMinute}:00${timezoneOffset}`;

      console.log('📅 Created timezone-aware datetime:', {
        startTime,
        endTime,
        userTimezone,
        timezoneOffset,
        originalTime: time,
        originalDate: date,
      });

      // Send scheduling request through AI-Deal
      const response = await fetch(`/api/ai-assistant?accountId=${accountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId: dealInfo.dealId,
          companyName: dealInfo.companyName,
          dealValue: deal?.value || 'Not specified',
          stage: deal?.stage || 'interested',
          painPoints: deal?.painPoints || [],
          nextSteps: deal?.nextSteps || [],
          industry: deal?.industry || 'Not specified',
          contactName: dealInfo.contactName,
          contactEmail: dealInfo.contactEmail,
          requestType: 'meeting_schedule',
          userMessage: `schedule a meeting for ${day} at ${time}`,
          startTime: startTime,
          endTime: endTime,
          meetingProvider: meetingProvider,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
          },
        ]);

        // Handle meeting scheduling completion (update next steps)
        if (data.meetingScheduled && deal) {
          try {
            console.log('📅 Meeting was scheduled, updating deal next steps');

            // Remove "Schedule a meeting" from next steps and add follow-up step
            const currentNextSteps = deal.nextSteps || [];
            const filteredSteps = currentNextSteps.filter(
              (step) =>
                !step.toLowerCase().includes('schedule') ||
                !step.toLowerCase().includes('meeting'),
            );

            // Add follow-up steps with specific meeting details
            const newNextSteps = [
              ...filteredSteps,
              'Prepare meeting agenda and talking points',
              `Meeting with ${dealInfo?.contactName || deal.contact?.name || 'contact'} scheduled for ${day}, ${date} at ${time}`,
              'Follow up after the meeting with next steps',
            ];

            // Update the deal in the database
            const updateResponse = await fetch(
              `/api/deals/${deal.id}?accountId=${accountId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  next_steps: newNextSteps,
                }),
              },
            );

            if (updateResponse.ok) {
              // Update local state immediately
              setLocalNextSteps(newNextSteps);

              if (onUpdate) {
                onUpdate({
                  ...deal,
                  nextSteps: newNextSteps,
                });
              }
            }

            // Start intensive polling if we have a MeetGeek meeting ID
            if (data.meetingDetails?.meetgeekMeetingId) {
              console.log(
                '🎯 Starting intensive polling for MeetGeek meeting:',
                data.meetingDetails.meetgeekMeetingId,
              );
              startIntensivePolling(data.meetingDetails.meetgeekMeetingId, 15); // 15 attempts = 30 minutes

              toast.success('Meeting Scheduled & Auto-Sync Started', {
                description:
                  "We'll automatically check for transcripts when the meeting ends.",
              });
            }
          } catch (updateError) {
            console.error(
              '❌ Error updating deal after meeting scheduling:',
              updateError,
            );
          }
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '❌ I encountered an error while scheduling the meeting. Please try again.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error scheduling meeting from time slot:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ I encountered an error while scheduling the meeting. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      // Clear loading state
      setSchedulingTimeSlot(null);
    }
  };

  // Function to parse available times from AI response and create clickable slots
  const parseAvailableTimesFromResponse = (content: string) => {
    try {
      console.log('🔍 Parsing available times from content:', content);

      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);
      const timeSlots: { day: string; date: string; times: string[] }[] = [];

      let currentDay = null;
      let currentDate = null;
      let currentTimes: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line is a day/date header (contains a comma and looks like "Tuesday, July 30")
        const dayMatch = line.match(/^([A-Za-z]+),\s*(.+)$/);

        if (dayMatch) {
          // Save previous day's times if we have them
          if (currentDay && currentDate && currentTimes.length > 0) {
            timeSlots.push({
              day: currentDay,
              date: currentDate,
              times: [...currentTimes],
            });
          }

          // Start new day
          currentDay = dayMatch[1].trim();
          currentDate = dayMatch[2].trim();
          currentTimes = [];

          console.log('📅 Found day:', currentDay, currentDate);
        } else if (currentDay && line.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/)) {
          // This is a time slot
          currentTimes.push(line);
          console.log('⏰ Found time:', line);
        }
      }

      // Don't forget the last day
      if (currentDay && currentDate && currentTimes.length > 0) {
        timeSlots.push({
          day: currentDay,
          date: currentDate,
          times: [...currentTimes],
        });
      }

      console.log('✅ Parsed time slots:', timeSlots);
      return timeSlots;
    } catch (error) {
      console.error('❌ Error parsing available times:', error);
      return [];
    }
  };

  const handleCreateMeeting = async () => {
    if (!selectedDate || !selectedStartSlot || !selectedEndSlot) {
      toast.error('Please select a date and time slot');
      return;
    }

    const [startHour, startMinute] = selectedStartSlot.split(':');
    const [endHour, endMinute] = selectedEndSlot.split(':');
    const startTime = new Date(selectedDate);
    startTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    const meetingData = {
      dealId: deal?.id,
      title: meetingDetails.title,
      description: meetingDetails.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: meetingDetails.location,
      attendees: meetingDetails.attendees,
      meetingProvider: meetingProvider, // Add this line
    };

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/calendar/create-event?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Enhanced error handling for different providers
        if (response.status === 401) {
          const providerName =
            meetingProvider === 'microsoft' ? 'Microsoft' : 'Gmail';
          toast.error(`${providerName} connection issue: ${errorData.error}`);
          return;
        }

        toast.error(errorData.error || 'Failed to create meeting');
        return;
      }

      const data = await response.json();

      if (data.success) {
        const providerName =
          meetingProvider === 'microsoft' ? 'Microsoft Teams' : 'Google Meet';
        toast.success(`Meeting created successfully with ${providerName}!`);
        setShowCalendarInline(false);
        setSelectedDate(undefined);
        setSelectedStartSlot(null);
        setSelectedEndSlot(null);
        setMeetingDetails({
          title: `Meeting with ${deal?.companyName ?? ''}`,
          startTime: '09:00',
          endTime: '10:00',
          description: `Meeting with ${deal?.contact?.name ?? ''} from ${deal?.companyName ?? ''}`,
          location:
            meetingProvider === 'microsoft' ? 'Microsoft Teams' : 'Google Meet',
          attendees: deal?.contact?.email ? [deal.contact.email] : [],
          provider: meetingProvider,
        });
      } else {
        toast.error(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Network error creating meeting:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Always ensure the primary contact is in the attendees list
  useEffect(() => {
    if (deal?.contact?.email && isOpen) {
      console.log('🎯 Setting up meeting details for deal:', deal.companyName);
      console.log('📧 Primary contact email:', deal.contact.email);
      console.log('👤 Primary contact name:', deal.contact.name);

      setMeetingDetails((prev) => {
        // Always reset to have primary contact as first attendee when opening
        const otherAttendees = prev.attendees.filter(
          (email) => email !== deal.contact.email,
        );
        const newAttendees = [deal.contact.email, ...otherAttendees];

        console.log('📝 Updated attendees:', newAttendees);

        return {
          ...prev,
          attendees: newAttendees,
          title: `Meeting with ${deal.contact.name || deal.companyName}`,
          description: `Meeting with ${deal.contact.name || 'Contact'} from ${
            deal.companyName
          }`,
        };
      });
    }
  }, [deal, isOpen]);

  // Fetch email summary when deal is opened
  useEffect(() => {
    const fetchEmailSummary = async () => {
      if (!deal?.id || !isOpen || !accountId) return;

      // Check if we already have a cached email summary
      if (deal.email_summary) {
        setEmailSummary(deal.email_summary);
        return;
      }

      setEmailSummaryLoading(true);
      setEmailSummaryError(null);

      try {
        console.log('📧 Fetching email summary for deal:', deal.id);

        const response = await fetch(
          `/api/deals/${deal.id}/email-summary?accountId=${accountId}`,
        );
        const data = await response.json();

        if (data.success && data.summary) {
          setEmailSummary(data.summary);
          console.log('✅ Email summary fetched successfully');
        } else {
          setEmailSummary(null);
          if (data.message) {
            console.log('📧 Email summary info:', data.message);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching email summary:', error);
        setEmailSummaryError('Failed to load email summary');
      } finally {
        setEmailSummaryLoading(false);
      }
    };

    fetchEmailSummary();
  }, [deal?.id, isOpen, accountId, deal?.email_summary]);

  // Refresh email summary function
  const refreshEmailSummary = async () => {
    if (!deal?.id || !accountId) return;

    setEmailSummaryLoading(true);
    setEmailSummaryError(null);

    try {
      console.log('🔄 Refreshing email summary for deal:', deal.id);

      const response = await fetch(
        `/api/deals/${deal.id}/email-summary?accountId=${accountId}&refresh=true`,
      );
      const data = await response.json();

      if (data.success && data.summary) {
        setEmailSummary(data.summary);
        toast.success('Email summary updated', {
          description: `Analyzed ${data.emailCount} recent emails`,
        });
      } else {
        setEmailSummary(null);
        if (data.message) {
          toast.info('Email Summary', {
            description: data.message,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing email summary:', error);
      setEmailSummaryError('Failed to refresh email summary');
      toast.error('Failed to refresh email summary');
    } finally {
      setEmailSummaryLoading(false);
    }
  };

  if (!deal) return null;

  const getStageDisplayName = (stage: string) => {
    const stageNames: Record<string, string> = {
      interested: 'Interested',
      qualified: 'Qualified',
      demo: 'Demo',
      proposal: 'Proposal',
      'closed-won': 'Closed Won',
      'closed-lost': 'Closed Lost',
      'follow-up-later': 'Follow Up Later',
    };
    return stageNames[stage] || stage;
  };

  // Contact management functions
  const startEditingContact = (contact: Contact) => {
    setEditingContact(contact.id);
    setEditingContactData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      isDecisionMaker: contact.isDecisionMaker || false,
      isPrimary: contact.isPrimary || false,
      contactRoleType: contact.contactRoleType || 'other',
    });
  };

  const saveContact = async (contactId: string) => {
    if (!deal?.id) return;

    setIsSavingContact(true);
    try {
      const response = await fetch(
        `/api/deals/update-contact?accountId=${accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            contactId,
            ...editingContactData,
          }),
        },
      );

      if (response.ok) {
        toast.success('Contact updated successfully');
        setEditingContact(null);
        setRefreshContacts((prev) => prev + 1);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update contact');
      }
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      toast.error('Error updating contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  const cancelEditingContact = () => {
    setEditingContact(null);
    setEditingContactData({
      name: '',
      email: '',
      phone: '',
      role: '',
      isDecisionMaker: false,
      isPrimary: false,
      contactRoleType: 'other',
    });
  };

  const deleteContact = async (contactId: string) => {
    if (!deal?.id) return;

    setIsSavingContact(true);
    try {
      const response = await fetch(
        `/api/deals/delete-contact?accountId=${accountId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            contactId,
          }),
        },
      );

      if (response.ok) {
        toast.success('Contact removed from deal');
        setRefreshContacts((prev) => prev + 1);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove contact');
      }
    } catch (error) {
      console.error('❌ Error removing contact:', error);
      toast.error('Error removing contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  const startAddingContact = () => {
    setIsAddingContact(true);
    setNewContactData({ name: '', email: '', phone: '', role: '' });
  };

  const addNewContact = async () => {
    if (!deal?.id || !newContactData.email) return;

    setIsSavingContact(true);
    try {
      const response = await fetch(
        `/api/deals/add-contact?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            email: newContactData.email,
            name: newContactData.name,
            phone: newContactData.phone,
            role: newContactData.role,
          }),
        },
      );

      if (response.ok) {
        toast.success('Contact added successfully');
        setIsAddingContact(false);
        setNewContactData({ name: '', email: '', phone: '', role: '' });
        setRefreshContacts((prev) => prev + 1);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      toast.error('Error adding contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  const cancelAddingContact = () => {
    setIsAddingContact(false);
    setNewContactData({ name: '', email: '', phone: '', role: '' });
  };

  // Function to parse contact information from AI message
  const parseContactFromMessage = (
    message: string,
  ): {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null => {
    const messageLower = message.toLowerCase();

    // Check if message contains contact addition keywords
    const addContactKeywords = [
      'add contact',
      'add this contact',
      'new contact',
      'add them to contacts',
      'add her to contacts',
      'add him to contacts',
      'add to contacts',
      'create contact',
      'save contact',
      'add as contact',
    ];

    if (!addContactKeywords.some((keyword) => messageLower.includes(keyword))) {
      return null;
    }

    // Extract email using regex
    const emailMatch = message.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    );
    const email = emailMatch ? emailMatch[0] : null;

    if (!email) {
      return null; // Can't add contact without email
    }

    // Extract name - look for patterns like "John Smith" or "Jane Doe"
    let name: string | undefined = undefined;
    const namePatterns = [
      // Pattern: "add John Smith (john@example.com)"
      /(?:add|contact)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+\(|\s+at|\s+<|\s+-)/i,
      // Pattern: "John Smith john@example.com"
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+[A-Za-z0-9._%+-]+@/i,
      // Pattern: "John Smith from TechCorp"
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+from/i,
      // Pattern: "add John Smith to contacts"
      /add\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+to/i,
      // Pattern: "contact John Smith"
      /contact\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    // Extract phone number
    const phoneMatch = message.match(
      /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    );
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // Extract role/title
    let role: string | undefined = undefined;
    const rolePatterns = [
      // Pattern: "VP of Sales", "Chief Technology Officer", etc.
      /(?:VP|Vice President|CEO|CTO|CFO|Director|Manager|Head|Chief)\s+(?:of\s+)?[A-Za-z\s]+/i,
      // Pattern: "Sales Manager", "Marketing Director", etc.
      /(?:Sales|Marketing|Technical|Engineering|Product|Operations|Business)\s+(?:Manager|Director|Lead|Specialist|Analyst|Coordinator)/i,
      // Pattern: role mentioned after "is" or "works as"
      /(?:is|works as|role is|title is)\s+(?:a|an|the)?\s*([A-Za-z\s]{2,30}?)(?:\s+at|\s+for|\s*\.|$)/i,
    ];

    for (const pattern of rolePatterns) {
      const match = message.match(pattern);
      if (match) {
        role = match[0].trim();
        break;
      }
    }

    return { name, email, phone, role };
  };

  const addContactFromMessage = async (contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  }) => {
    if (!deal?.id || !contactInfo.email) return false;

    try {
      const response = await fetch(
        `/api/deals/add-contact?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: deal.id,
            email: contactInfo.email,
            name: contactInfo.name || contactInfo.email,
            phone: contactInfo.phone || '',
            role: contactInfo.role || '',
          }),
        },
      );

      if (response.ok) {
        toast.success(
          `Contact ${contactInfo.name || contactInfo.email} added successfully`,
        );
        setRefreshContacts((prev) => prev + 1);
        return true;
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add contact');
        return false;
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
      return false;
    }
  };

  // Edit deal functions
  const startEditingDeal = () => {
    setEditDealData({
      companyName: enhancedDeal.companyName || '',
      dealTitle: enhancedDeal.dealTitle || enhancedDeal.companyName + ' Deal',
      value: enhancedDeal.value?.replace(/[^\d.]/g, '') || '',
      stage: enhancedDeal.stage || '',
      closeDate: enhancedDeal.closeDate || '',
      description: enhancedDeal.description || '',
      industry: enhancedDeal.industry || '',
    });
    setIsEditingDeal(true);
    setActiveTab('overview');
  };

  const saveEditedDeal = async () => {
    if (!deal?.id) return;

    setIsSavingDeal(true);
    try {
      const response = await fetch(
        `/api/deals/${deal.id}?accountId=${accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_name: editDealData.companyName,
            deal_title: editDealData.dealTitle,
            value: `USD ${Number(editDealData.value).toLocaleString()}`,
            stage: editDealData.stage,
            close_date: editDealData.closeDate,
            description: editDealData.description,
            industry: editDealData.industry,
          }),
        },
      );

      if (response.ok) {
        const updatedDeal = await response.json();
        console.log('✅ Deal updated successfully');

        // Update parent state
        if (onUpdate) {
          onUpdate({
            ...deal,
            companyName: editDealData.companyName,
            dealTitle: editDealData.dealTitle,
            value: `USD ${Number(editDealData.value).toLocaleString()}`,
            stage: editDealData.stage as any,
            closeDate: editDealData.closeDate,
            industry: editDealData.industry,
          });
        }

        setIsEditingDeal(false);
        toast.success('Deal updated successfully');

        // Wait for momentum scoring to complete, then refresh parent data
        setTimeout(async () => {
          try {
            console.log('🔄 Refreshing deals data after momentum scoring...');
            const response = await fetch(`/api/deals?accountId=${accountId}`);
            if (response.ok) {
              const dealsData = await response.json();
              console.log('✅ Refreshed deals data after edit');

              // Find and update the current deal if it exists in the updated data
              const updatedDeal = dealsData.find((d: any) => d.id === deal.id);
              if (updatedDeal && onUpdate) {
                onUpdate(updatedDeal);
              }
            }
          } catch (error) {
            console.error('❌ Error refreshing deals after edit:', error);
          }
        }, 4000); // 4 second delay to allow momentum scoring to complete
      } else {
        console.error('❌ Failed to update deal');
        toast.error('Failed to update deal');
      }
    } catch (error) {
      console.error('❌ Error updating deal:', error);
      toast.error('Error updating deal');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const cancelEditingDeal = () => {
    setIsEditingDeal(false);
    setEditDealData({
      companyName: '',
      dealTitle: '',
      value: '',
      stage: '',
      closeDate: '',
      description: '',
      industry: '',
    });
  };

  const handleDeleteDeal = async () => {
    if (!deal?.id) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the deal for ${deal.companyName}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeletingDeal(true);
    try {
      const response = await fetch(
        `/api/deals/${deal.id}?accountId=${accountId}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        console.log('✅ Deal deleted successfully');
        toast.success('Deal deleted successfully');
        onClose(); // Close the modal after deletion

        // TODO: Trigger refresh of deals list in parent component
        // This would need to be passed as a prop or handled by the parent
      } else {
        let errorData;
        let responseText = '';
        try {
          responseText = await response.text();
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          errorData = {
            error: `Parse error: ${parseError.message}`,
            rawResponse: responseText,
          };
        }

        console.error('❌ Failed to delete deal:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          responseText: responseText,
          url: response.url,
        });
        toast.error(
          `Failed to delete deal: ${errorData.error || errorData.message || response.statusText || 'Unknown error'}`,
        );
      }
    } catch (error) {
      console.error('❌ Error deleting deal:', error);
      toast.error('Error deleting deal');
    } finally {
      setIsDeletingDeal(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} key={deal?.id}>
      <DialogContent
        className="!fixed !inset-y-4 !right-0 !left-0 !m-0 max-h-[calc(100vh-3rem)] !w-screen !max-w-none overflow-hidden border-gray-700 bg-black p-0"
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          transform: 'none',
          margin: '0px',
          padding: '0px',
        }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby="deal-details-description"
        fullview
      >
        <DialogTitle className="px-4 py-1"></DialogTitle>
        <div id="deal-details-description" className="sr-only">
          {enhancedDeal.companyName} deal details with AI-Deal
        </div>
        {/* Custom Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {enhancedDeal.companyName}
            </h2>
            <Badge className={cn('text-xs', getStageColor(enhancedDeal.stage))}>
              {getStageDisplayName(enhancedDeal.stage)}
            </Badge>
            <span className="text-sm font-medium text-green-400">
              {formatCurrency(enhancedDeal.value)}
            </span>
            <DealAssignment
              dealId={deal?.id || ''}
              currentAssignedTo={deal?.assignedTo}
              accountSlug={accountSlug}
              variant="badge"
              showLabel={false}
              className="ml-2"
            />
          </div>

          {isEditingDeal ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={saveEditedDeal}
                disabled={isSavingDeal}
                className="text-green-400 hover:bg-green-400/10 hover:text-green-300"
              >
                {isSavingDeal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditingDeal}
                className="text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditingDeal}
                className="text-designer-violet hover:text-designer-violet/80 hover:bg-designer-violet/10"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Deal
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteDeal}
                disabled={isDeletingDeal}
                className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
              >
                {isDeletingDeal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex h-[calc(100%-52px)] overflow-hidden">
          {/* Left Side - Action Items */}
          <div className="flex w-1/2 flex-col overflow-hidden border-r border-gray-700">
            {/* Quick Info Bar */}
            <div className="flex items-center gap-4 border-b border-gray-700 bg-gray-800/50 px-4 py-2 text-xs">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Close:</span>
                <span>
                  {enhancedDeal.closeDate
                    ? new Date(enhancedDeal.closeDate).toLocaleDateString()
                    : 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Created:</span>
                <span>{getTimeAgo(enhancedDeal.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3 text-gray-400" />
                <span>{enhancedDeal.industry}</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-700 bg-gray-900">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'border-designer-violet text-designer-violet bg-designer-violet/10'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Info className="h-3 w-3" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'contacts'
                      ? 'border-designer-violet text-designer-violet bg-designer-violet/10'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Users className="h-3 w-3" />
                  Contacts
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'activity'
                      ? 'border-designer-violet text-designer-violet bg-designer-violet/10'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Activity className="h-3 w-3" />
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'documents'
                      ? 'border-designer-violet text-designer-violet bg-designer-violet/10'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Paperclip className="h-3 w-3" />
                  Documents
                </button>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'meetings'
                      ? 'border-designer-violet text-designer-violet bg-designer-violet/10'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <CalendarIcon className="h-3 w-3" />
                  Meetings
                </button>
              </div>
            </div>

            {/* Scrollable Content - Tab-based */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Edit Deal Form */}
                  {isEditingDeal ? (
                    <div className="space-y-6">
                      <div className="rounded-lg bg-gray-800/50 p-6">
                        <h3 className="mb-6 text-lg font-semibold text-white">
                          Edit Deal Details
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                          {/* Company Name */}
                          <div>
                            <Label
                              htmlFor="companyName"
                              className="text-sm font-medium text-gray-300"
                            >
                              Company Name
                            </Label>
                            <Input
                              id="companyName"
                              value={editDealData.companyName}
                              onChange={(e) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  companyName: e.target.value,
                                }))
                              }
                              className="mt-1 border-gray-600 bg-gray-700 text-white"
                              placeholder="Company name"
                            />
                          </div>

                          {/* Deal Title */}
                          <div>
                            <Label
                              htmlFor="dealTitle"
                              className="text-sm font-medium text-gray-300"
                            >
                              Deal Title
                            </Label>
                            <Input
                              id="dealTitle"
                              value={editDealData.dealTitle}
                              onChange={(e) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  dealTitle: e.target.value,
                                }))
                              }
                              className="mt-1 border-gray-600 bg-gray-700 text-white"
                              placeholder="Deal title"
                            />
                          </div>

                          {/* Value */}
                          <div>
                            <Label
                              htmlFor="value"
                              className="text-sm font-medium text-gray-300"
                            >
                              Value
                            </Label>
                            <Input
                              id="value"
                              type="number"
                              value={editDealData.value}
                              onChange={(e) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  value: e.target.value,
                                }))
                              }
                              className="mt-1 border-gray-600 bg-gray-700 text-white"
                              placeholder="45000"
                            />
                          </div>

                          {/* Stage */}
                          <div>
                            <Label
                              htmlFor="stage"
                              className="text-sm font-medium text-gray-300"
                            >
                              Stage
                            </Label>
                            <Select
                              value={editDealData.stage}
                              onValueChange={(value) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  stage: value,
                                }))
                              }
                            >
                              <SelectTrigger className="mt-1 border-gray-600 bg-gray-700 text-white">
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                              <SelectContent className="border-gray-600 bg-gray-700">
                                <SelectItem value="interested">
                                  Interested
                                </SelectItem>
                                <SelectItem value="qualified">
                                  Qualified
                                </SelectItem>
                                <SelectItem value="demo">Demo</SelectItem>
                                <SelectItem value="proposal">
                                  Proposal
                                </SelectItem>
                                <SelectItem value="closed-won">
                                  Closed Won
                                </SelectItem>
                                <SelectItem value="closed-lost">
                                  Closed Lost
                                </SelectItem>
                                <SelectItem value="follow-up-later">
                                  Follow Up Later
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Expected Close Date */}
                          <div>
                            <Label
                              htmlFor="closeDate"
                              className="text-sm font-medium text-gray-300"
                            >
                              Expected Close Date
                            </Label>
                            <Input
                              id="closeDate"
                              type="date"
                              value={editDealData.closeDate}
                              onChange={(e) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  closeDate: e.target.value,
                                }))
                              }
                              className="mt-1 border-gray-600 bg-gray-700 text-white"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <Label
                              htmlFor="description"
                              className="text-sm font-medium text-gray-300"
                            >
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              value={editDealData.description}
                              onChange={(e) =>
                                setEditDealData((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              className="mt-1 border-gray-600 bg-gray-700 text-white"
                              placeholder="Deal description..."
                              rows={4}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular Overview Content */
                    <>
                      {/* Next Steps - PRIMARY FOCUS */}
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-400">
                          <Zap className="h-4 w-4" />
                          NEXT STEPS
                        </h3>
                        {enhancedDeal.nextSteps &&
                        enhancedDeal.nextSteps.length > 0 ? (
                          <div className="space-y-3">
                            {enhancedDeal.nextSteps.map((step, index) => (
                              <div
                                key={index}
                                className={cn(
                                  'group flex items-start gap-3 transition-opacity',
                                  deletingNextStep === index && 'opacity-50',
                                )}
                              >
                                <div className="mt-0.5">
                                  <button
                                    onClick={async () => {
                                      if (!deal) return;

                                      console.log(
                                        '🗑️ Deleting next step:',
                                        step,
                                      );
                                      setDeletingNextStep(index);

                                      // Immediately update local state for responsive UI
                                      const updatedSteps =
                                        localNextSteps.filter(
                                          (_, i) => i !== index,
                                        );
                                      setLocalNextSteps(updatedSteps);

                                      // Update the database
                                      try {
                                        const updateResponse = await fetch(
                                          `/api/deals/${deal.id}?accountId=${accountId}`,
                                          {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type':
                                                'application/json',
                                            },
                                            body: JSON.stringify({
                                              next_steps: updatedSteps,
                                            }),
                                          },
                                        );

                                        if (updateResponse.ok) {
                                          console.log(
                                            '✅ Deleted next step successfully',
                                          );
                                          // Update parent state
                                          if (onUpdate) {
                                            onUpdate({
                                              ...deal,
                                              nextSteps: updatedSteps,
                                            });
                                          }
                                        } else {
                                          console.error(
                                            '❌ Failed to update database',
                                          );
                                          // Revert local state on failure
                                          setLocalNextSteps(
                                            deal.nextSteps || [],
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          '❌ Failed to delete next step:',
                                          error,
                                        );
                                        // Revert local state on failure
                                        setLocalNextSteps(deal.nextSteps || []);
                                      } finally {
                                        setDeletingNextStep(null);
                                      }
                                    }}
                                    disabled={deletingNextStep === index}
                                    className="h-5 w-5 rounded-full border-2 border-green-400 bg-gray-900 transition-colors hover:border-red-500 hover:bg-red-500 disabled:opacity-50"
                                    title="Click to delete this step"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-white">{step}</p>
                                  {/* Only show Execute with AI button for follow up emails, meeting invites, and scheduling steps */}
                                  {shouldShowExecuteWithAI(
                                    step,
                                    index,
                                    localNextSteps,
                                  ) && (
                                    <div className="mt-1 flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-green-400 hover:bg-green-400/10 hover:text-green-300"
                                        disabled={deletingNextStep === index}
                                        onClick={async () => {
                                          const stepLower = step.toLowerCase();

                                          // Check if this is a meeting scheduling step
                                          const isSchedulingStep =
                                            (stepLower.includes('schedule') &&
                                              stepLower.includes('meeting')) ||
                                            (stepLower.includes('schedule') &&
                                              stepLower.includes('call')) ||
                                            (stepLower.includes('book') &&
                                              stepLower.includes('meeting')) ||
                                            (stepLower.includes('set up') &&
                                              stepLower.includes('meeting')) ||
                                            stepLower.includes(
                                              'schedule a meeting',
                                            );

                                          // Check if this is about drafting a follow up email
                                          const isFollowUpEmail =
                                            (stepLower.includes('follow up') &&
                                              stepLower.includes('email')) ||
                                            (stepLower.includes('follow-up') &&
                                              stepLower.includes('email')) ||
                                            (stepLower.includes('send') &&
                                              stepLower.includes(
                                                'follow up',
                                              )) ||
                                            (stepLower.includes('send') &&
                                              stepLower.includes(
                                                'follow-up',
                                              )) ||
                                            (stepLower.includes('draft') &&
                                              stepLower.includes('email')) ||
                                            (stepLower.includes('email') &&
                                              stepLower.includes('follow'));

                                          // Check if this is about sending a meeting invite
                                          const isMeetingInvite =
                                            (stepLower.includes('meeting') &&
                                              stepLower.includes('invite')) ||
                                            (stepLower.includes('send') &&
                                              stepLower.includes('calendar')) ||
                                            (stepLower.includes('send') &&
                                              stepLower.includes('meeting')) ||
                                            (stepLower.includes('calendar') &&
                                              stepLower.includes('invite'));

                                          if (isSchedulingStep) {
                                            console.log(
                                              '🗓️ Triggering AI meeting scheduling workflow',
                                            );
                                            const schedulingMessage = `Help me schedule a meeting with ${deal?.companyName}`;
                                            await sendMessageWithText(
                                              schedulingMessage,
                                            );
                                          } else if (isFollowUpEmail) {
                                            console.log(
                                              '📧 Triggering AI follow-up email workflow',
                                            );
                                            const emailMessage = `Help me draft a follow-up email for ${deal?.companyName}. ${step}`;
                                            await sendMessageWithText(
                                              emailMessage,
                                            );
                                          } else if (isMeetingInvite) {
                                            console.log(
                                              '📅 Triggering AI meeting invite workflow',
                                            );
                                            const inviteMessage = `Help me create a meeting invite for ${deal?.companyName}. ${step}`;
                                            await sendMessageWithText(
                                              inviteMessage,
                                            );
                                          } else {
                                            // Fallback for any other allowed steps
                                            const message = `Help me with: ${step}`;
                                            await sendMessageWithText(message);
                                          }
                                        }}
                                      >
                                        <ArrowRight className="mr-1 h-3 w-3" />
                                        Execute with AI
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="group flex items-start gap-3">
                            <div className="mt-0.5">
                              <div className="h-5 w-5 rounded-full border-2 border-green-400 bg-gray-900 transition-colors group-hover:bg-green-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-400">
                                No next steps defined. Schedule a meeting to get
                                started.
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 h-6 px-2 text-xs text-green-400 hover:bg-green-400/10 hover:text-green-300"
                                onClick={async () => {
                                  // For empty next steps, also check if we should schedule a meeting
                                  if (
                                    !enhancedDeal.nextSteps ||
                                    enhancedDeal.nextSteps.length === 0
                                  ) {
                                    console.log(
                                      '🗓️ No next steps defined, suggesting meeting scheduling',
                                    );

                                    // Fetch busy dates first
                                    await fetchBusyDates();

                                    // Show the calendar inline for scheduling
                                    setShowCalendarInline(true);

                                    // Provide AI context about starting with a meeting
                                    const contextMessage = `I recommend starting with scheduling a meeting for ${deal?.companyName}. The calendar is now open for you to select a date and time. This will help establish contact and move the deal forward.`;
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content: contextMessage,
                                        timestamp: new Date(),
                                      },
                                    ]);
                                  } else {
                                    // For other cases, use the regular AI assistant
                                    const message =
                                      'What should I do next with this deal? Please provide specific next steps.';
                                    await sendMessageWithText(message);
                                  }
                                }}
                              >
                                <ArrowRight className="mr-1 h-3 w-3" />
                                Execute with AI
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Key Information */}
                      <div className="bg-designer-violet/10 border-designer-violet/30 rounded-lg border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-designer-violet flex items-center gap-2 text-sm font-semibold">
                            <Info className="h-4 w-4" />
                            KEY INFORMATION
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditingDescription}
                            className="text-designer-violet hover:text-designer-violet/80 hover:bg-designer-violet/10 h-6 px-2 text-xs"
                          >
                            Edit
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {/* Description */}
                          <div>
                            <h4 className="mb-2 text-sm font-medium text-gray-300">
                              Description
                            </h4>
                            {isEditingDescription ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingDescription}
                                  onChange={(e) =>
                                    setEditingDescription(e.target.value)
                                  }
                                  className="min-h-[120px] resize-none border-gray-700 bg-gray-800 text-sm text-white"
                                  placeholder="Enter deal description..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={saveDescription}
                                    disabled={isSavingDescription}
                                    className="bg-designer-violet hover:bg-designer-violet/90 h-7 px-3 text-xs"
                                  >
                                    {isSavingDescription ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Save'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditingDescription}
                                    className="h-7 px-3 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed text-white/80">
                                {/* Prioritize user-edited description, then AI-generated, then fallbacks */}
                                {enhancedDeal.relationshipInsights ? (
                                  <p>{enhancedDeal.relationshipInsights}</p>
                                ) : (enhancedDeal as any).companyDescription ? (
                                  <p>
                                    {(enhancedDeal as any).companyDescription}
                                  </p>
                                ) : enhancedDeal.dealTitle ? (
                                  <p>{enhancedDeal.dealTitle}</p>
                                ) : (
                                  <p className="text-gray-400 italic">
                                    No company information available. Click Edit
                                    to add a description.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Last Meeting Summary */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                              <CalendarIcon className="h-3 w-3" />
                              Last Meeting Summary
                            </h4>
                            <div className="text-sm leading-relaxed text-white/80">
                              {enhancedDeal.last_meeting_summary ? (
                                <p>{enhancedDeal.last_meeting_summary}</p>
                              ) : (
                                <p className="text-gray-400 italic">
                                  No meetings yet. Schedule a meeting to get
                                  started.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Email Summary */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Mail className="h-3 w-3" />
                                Recent Email Summary
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={refreshEmailSummary}
                                disabled={emailSummaryLoading}
                                className="text-designer-violet hover:text-designer-violet/80 hover:bg-designer-violet/10 h-6 px-2 text-xs"
                              >
                                {emailSummaryLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Refresh'
                                )}
                              </Button>
                            </div>
                            <div className="text-sm leading-relaxed text-white/80">
                              {emailSummaryLoading ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-gray-400 italic">
                                    Analyzing recent emails...
                                  </span>
                                </div>
                              ) : emailSummaryError ? (
                                <p className="text-red-400 italic">
                                  {emailSummaryError}
                                </p>
                              ) : emailSummary ? (
                                <p>{emailSummary}</p>
                              ) : (
                                <p className="text-gray-400 italic">
                                  No recent emails found. Email conversations
                                  will be automatically summarized.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Key People Section */}
                      <div className="bg-designer-violet/10 border-designer-violet/30 rounded-lg border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-designer-violet flex items-center gap-2 text-sm font-semibold">
                            <User className="h-4 w-4" />
                            KEY PEOPLE
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('contacts')}
                            className="text-designer-violet hover:bg-designer-violet/20 h-6 px-2 text-xs hover:text-white"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Key Person
                          </Button>
                        </div>

                        {/* Identified Decision Makers */}
                        <div className="space-y-3">
                          {/* Primary Contact */}
                          <div>
                            <h4 className="mb-2 text-xs font-medium text-gray-300">
                              Primary Contact
                            </h4>
                            <div className="space-y-2">
                              {deal?.contact ? (
                                <div className="flex items-center gap-3 rounded-lg bg-gray-800/30 p-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-designer-blue/20 text-designer-blue text-xs">
                                      {deal.contact.name
                                        ? deal.contact.name
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : 'PC'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {deal.contact.name || 'Primary Contact'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {deal.contact.role || 'Primary Contact'}
                                    </p>
                                    <div className="mt-1 flex items-center gap-1">
                                      <Mail className="h-3 w-3 text-gray-400" />
                                      <p className="truncate text-xs text-gray-400">
                                        {deal.contact.email || deal.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <Mail className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <Phone className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-4">
                                  <span className="text-xs text-gray-400">
                                    No primary contact set.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Identified Decision Makers */}
                          <div className="border-t border-gray-700 pt-3">
                            <h4 className="mb-2 text-xs font-medium text-gray-300">
                              Identified Decision Makers
                            </h4>
                            <div className="space-y-2">
                              {/* Only show decision makers when they are explicitly identified */}
                              {displayContacts.filter(
                                (contact) => contact.isDecisionMaker,
                              ).length > 0 ? (
                                displayContacts
                                  .filter((contact) => contact.isDecisionMaker)
                                  .map((contact, index) => (
                                    <div
                                      key={contact.id}
                                      className="rounded-lg bg-gray-800/30 p-3"
                                    >
                                      {editingContact === contact.id ? (
                                        // Edit mode for key people
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-1 gap-3">
                                            <div>
                                              <Label className="text-xs font-medium text-gray-300">
                                                Name
                                              </Label>
                                              <Input
                                                value={editingContactData.name}
                                                onChange={(e) =>
                                                  setEditingContactData(
                                                    (prev) => ({
                                                      ...prev,
                                                      name: e.target.value,
                                                    }),
                                                  )
                                                }
                                                className="mt-1 border-gray-600 bg-gray-700 text-sm text-white"
                                                placeholder="Contact name"
                                              />
                                            </div>

                                            <div>
                                              <Label className="text-xs font-medium text-gray-300">
                                                Role
                                              </Label>
                                              <Input
                                                value={editingContactData.role}
                                                onChange={(e) =>
                                                  setEditingContactData(
                                                    (prev) => ({
                                                      ...prev,
                                                      role: e.target.value,
                                                    }),
                                                  )
                                                }
                                                className="mt-1 border-gray-600 bg-gray-700 text-sm text-white"
                                                placeholder="Job title or role"
                                              />
                                            </div>

                                            <div>
                                              <Label className="text-xs font-medium text-gray-300">
                                                Email
                                              </Label>
                                              <Input
                                                type="email"
                                                value={editingContactData.email}
                                                onChange={(e) =>
                                                  setEditingContactData(
                                                    (prev) => ({
                                                      ...prev,
                                                      email: e.target.value,
                                                    }),
                                                  )
                                                }
                                                className="mt-1 border-gray-600 bg-gray-700 text-sm text-white"
                                                placeholder="email@example.com"
                                              />
                                            </div>

                                            <div>
                                              <Label className="text-xs font-medium text-gray-300">
                                                Phone
                                              </Label>
                                              <Input
                                                type="tel"
                                                value={editingContactData.phone}
                                                onChange={(e) =>
                                                  setEditingContactData(
                                                    (prev) => ({
                                                      ...prev,
                                                      phone: e.target.value,
                                                    }),
                                                  )
                                                }
                                                className="mt-1 border-gray-600 bg-gray-700 text-sm text-white"
                                                placeholder="+1 (555) 123-4567"
                                              />
                                            </div>

                                            <div>
                                              <Label className="text-xs font-medium text-gray-300">
                                                Contact Role Type
                                              </Label>
                                              <Select
                                                value={
                                                  editingContactData.contactRoleType
                                                }
                                                onValueChange={(
                                                  value:
                                                    | 'technical'
                                                    | 'financial'
                                                    | 'executive'
                                                    | 'other',
                                                ) =>
                                                  setEditingContactData(
                                                    (prev) => ({
                                                      ...prev,
                                                      contactRoleType: value,
                                                    }),
                                                  )
                                                }
                                              >
                                                <SelectTrigger className="mt-1 border-gray-600 bg-gray-700 text-sm text-white">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="technical">
                                                    Technical
                                                  </SelectItem>
                                                  <SelectItem value="financial">
                                                    Financial
                                                  </SelectItem>
                                                  <SelectItem value="executive">
                                                    Executive
                                                  </SelectItem>
                                                  <SelectItem value="other">
                                                    Other
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                              <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                  <Switch
                                                    checked={
                                                      editingContactData.isDecisionMaker
                                                    }
                                                    onCheckedChange={(
                                                      checked,
                                                    ) =>
                                                      setEditingContactData(
                                                        (prev) => ({
                                                          ...prev,
                                                          isDecisionMaker:
                                                            checked,
                                                        }),
                                                      )
                                                    }
                                                  />
                                                  <Label className="text-xs text-gray-300">
                                                    Decision Maker
                                                  </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Switch
                                                    checked={
                                                      editingContactData.isPrimary
                                                    }
                                                    onCheckedChange={(
                                                      checked,
                                                    ) =>
                                                      setEditingContactData(
                                                        (prev) => ({
                                                          ...prev,
                                                          isPrimary: checked,
                                                        }),
                                                      )
                                                    }
                                                  />
                                                  <Label className="text-xs text-gray-300">
                                                    Primary Contact
                                                  </Label>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 pt-2">
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                saveContact(contact.id)
                                              }
                                              disabled={isSavingContact}
                                              className="bg-designer-violet hover:bg-designer-violet/80 h-7 px-3 text-xs text-white"
                                            >
                                              {isSavingContact ? (
                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                              ) : (
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                              )}
                                              Save
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={cancelEditingContact}
                                              className="h-7 px-3 text-xs text-gray-400 hover:text-white"
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                deleteContact(contact.id)
                                              }
                                              disabled={isSavingContact}
                                              className="ml-auto h-7 px-3 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                            >
                                              <AlertTriangle className="mr-1 h-3 w-3" />
                                              Remove
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        // View mode for key people
                                        <>
                                          <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-designer-violet/20 text-designer-violet text-xs">
                                                  {contact.name &&
                                                    contact.name
                                                      .substring(0, 2)
                                                      .toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white">
                                                  {contact.name}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                  {contact.role}
                                                </p>
                                                <div className="mt-1 flex items-center gap-1">
                                                  <Mail className="h-3 w-3 text-gray-400" />
                                                  <p className="truncate text-xs text-gray-400">
                                                    {contact.email}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                startEditingContact(contact)
                                              }
                                              className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          </div>

                                          <div className="flex items-center gap-4 text-xs">
                                            {contact.contactRoleType && (
                                              <Badge
                                                variant="outline"
                                                className="capitalize"
                                              >
                                                {contact.contactRoleType}
                                              </Badge>
                                            )}
                                            {contact.isPrimary && (
                                              <Badge className="bg-blue-500/20 text-blue-400">
                                                Primary
                                              </Badge>
                                            )}
                                            <div className="ml-auto flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                              >
                                                <Mail className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                              >
                                                <Phone className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))
                              ) : (
                                <div className="flex items-center justify-center py-4">
                                  <span className="text-xs text-gray-400">
                                    No decision makers identified yet.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Identified Internal Champions */}
                          <div className="border-t border-gray-700 pt-3">
                            <h4 className="mb-2 text-xs font-medium text-gray-300">
                              Identified Internal Champions
                            </h4>
                            <div className="space-y-2">
                              {/* Only show internal champions when they are explicitly identified */}
                              {/* Note: Champions will be identified through meeting analysis and manual tagging */}
                              <div className="flex items-center justify-center py-4">
                                <span className="text-xs text-gray-400">
                                  No internal champions identified yet.
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-designer-violet hover:text-designer-violet/80 hover:bg-designer-violet/10 h-6 px-2 text-xs"
                              onClick={() => setActiveTab('contacts')}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              View All Contacts
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Pain Points - SECONDARY FOCUS */}
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          PAIN POINTS TO ADDRESS
                        </h3>
                        {enhancedDeal.painPoints &&
                        enhancedDeal.painPoints.length > 0 ? (
                          <div className="space-y-3">
                            {enhancedDeal.painPoints.map((point, index) => (
                              <div
                                key={index}
                                className={cn(
                                  'group flex items-start gap-3 transition-opacity',
                                  deletingPainPoint === index && 'opacity-50',
                                )}
                              >
                                <div className="mt-0.5">
                                  <div className="h-5 w-5 rounded-full border-2 border-red-400 bg-gray-900 transition-colors group-hover:bg-red-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-white">{point}</p>
                                  <div className="mt-1 flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300"
                                      disabled={deletingPainPoint === index}
                                      onClick={async () => {
                                        const message = `Help me negotiate contract terms to address: ${point}`;
                                        await sendMessageWithText(message);
                                      }}
                                    >
                                      <ArrowRight className="mr-1 h-3 w-3" />
                                      Negotiate Contract
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-xs text-gray-400 hover:bg-red-400/10 hover:text-red-300"
                                      disabled={deletingPainPoint === index}
                                      onClick={async () => {
                                        if (!deal) return;

                                        console.log(
                                          '🗑️ Deleting pain point:',
                                          point,
                                        );
                                        console.log(
                                          '🔄 Current pain points:',
                                          localPainPoints,
                                        );

                                        setDeletingPainPoint(index);

                                        // Immediately update local state for responsive UI
                                        const updatedPainPoints =
                                          localPainPoints.filter(
                                            (_, i) => i !== index,
                                          );
                                        setLocalPainPoints(updatedPainPoints);
                                        console.log(
                                          '🔄 Updated pain points locally:',
                                          updatedPainPoints,
                                        );

                                        // Update the database
                                        try {
                                          const updateResponse = await fetch(
                                            `/api/deals/${deal.id}`,
                                            {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type':
                                                  'application/json',
                                              },
                                              body: JSON.stringify({
                                                pain_points: updatedPainPoints,
                                              }),
                                            },
                                          );

                                          if (updateResponse.ok) {
                                            console.log(
                                              '✅ Deleted pain point successfully',
                                            );
                                            console.log(
                                              '🔄 Calling onUpdate with:',
                                              {
                                                ...deal,
                                                painPoints: updatedPainPoints,
                                              },
                                            );

                                            // Update parent state
                                            if (onUpdate) {
                                              onUpdate({
                                                ...deal,
                                                painPoints: updatedPainPoints,
                                              });
                                            } else {
                                              console.warn(
                                                '⚠️ onUpdate callback is not defined',
                                              );
                                            }
                                          } else {
                                            console.error(
                                              '❌ Failed to update database:',
                                              await updateResponse.text(),
                                            );
                                            // Revert local state on failure
                                            setLocalPainPoints(
                                              deal.painPoints || [],
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            '❌ Failed to delete pain point:',
                                            error,
                                          );
                                          // Revert local state on failure
                                          setLocalPainPoints(
                                            deal.painPoints || [],
                                          );
                                        } finally {
                                          setDeletingPainPoint(null);
                                        }
                                      }}
                                      title="Delete this pain point"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="group flex items-start gap-3">
                            <div className="mt-0.5">
                              <div className="h-5 w-5 rounded-full border-2 border-red-400 bg-gray-900 transition-colors group-hover:bg-red-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-400">
                                No pain points identified yet.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Green Flags - AI INSIGHTS */}
                      {enhancedDeal.greenFlags &&
                        enhancedDeal.greenFlags.length > 0 && (
                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              POSITIVE SIGNALS
                            </h3>
                            <ul className="space-y-2">
                              {enhancedDeal.greenFlags.map((flag, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-0.5 text-green-400">
                                    ✓
                                  </span>
                                  <span className="text-sm text-white">
                                    {flag}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Red Flags - AI INSIGHTS */}
                      {enhancedDeal.redFlags &&
                        enhancedDeal.redFlags.length > 0 && (
                          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-400">
                              <AlertTriangle className="h-4 w-4" />
                              RISK FACTORS
                            </h3>
                            <ul className="space-y-2">
                              {enhancedDeal.redFlags.map((flag, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-0.5 text-orange-400">
                                    ⚠
                                  </span>
                                  <span className="text-sm text-white">
                                    {flag}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Quick Actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={async () => {
                            setSelectedEmailProvider(null);
                            await sendMessageWithText(
                              'Draft a follow-up email for this deal',
                            );
                          }}
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          Email
                        </Button>
                        {/* <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={async () => {
                            await sendMessageWithText(
                              'Help me schedule a meeting',
                            );
                          }}
                        >
                          <Bot className="mr-1 h-3 w-3" />
                          AI Schedule Meeting
                        </Button> */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={async () => {
                            // Add platform selection message to chat
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content:
                                  "I'd be happy to help you schedule a meeting! First, please choose your preferred meeting platform:",
                                timestamp: new Date(),
                                showPlatformSelector: true,
                                dealInfo: {
                                  dealId: deal?.id || '',
                                  companyName: deal?.companyName || '',
                                  contactName: deal?.contact?.name || 'Contact',
                                  contactEmail: deal?.contact?.email || '',
                                },
                              },
                            ]);
                          }}
                        >
                          <Bot className="mr-1 h-3 w-3" />
                          AI Schedule Meeting
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={async () => {
                            console.log(
                              '🗓️ Schedule Meeting clicked for:',
                              deal?.companyName,
                            );
                            console.log(
                              '📧 Primary contact:',
                              deal?.contact?.email,
                            );

                            if (!showCalendarInline && deal?.contact?.email) {
                              setMeetingDetails((prev) => ({
                                ...prev,
                                attendees: [deal.contact.email],
                                title: `Meeting with ${
                                  deal.contact.name || deal.companyName
                                }`,
                                description: `Meeting with ${
                                  deal.contact.name || 'Contact'
                                } from ${deal.companyName}`,
                              }));
                            }
                            setShowCalendarInline((prev) => !prev);
                            if (!showCalendarInline) await fetchBusyDates();
                          }}
                          disabled={isLoading}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          Schedule Meeting
                        </Button>
                      </div>

                      {/* Inline Calendar & Meeting Form */}
                      {showCalendarInline && (
                        <div
                          className={`my-4 rounded-lg border border-gray-700 bg-gray-900 p-4 transition-all duration-700 ${
                            isCalendarClosing
                              ? 'pointer-events-none scale-95 opacity-0'
                              : 'scale-100 opacity-100'
                          }`}
                        >
                          <div className="flex justify-center">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) =>
                                setSelectedDate(date ?? undefined)
                              }
                              className="rounded-md border border-gray-700"
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              classNames={{
                                day_selected:
                                  'bg-designer-violet text-white hover:bg-designer-violet hover:text-white focus:bg-designer-violet focus:text-white',
                                day_today: 'bg-gray-800 text-white',
                                day_outside: 'text-gray-500 opacity-50',
                                day_disabled: 'text-gray-500 opacity-50',
                                day_range_middle:
                                  'aria-selected:bg-gray-800 aria-selected:text-white',
                                day_hidden: 'invisible',
                                nav_button: 'hover:bg-gray-800',
                                nav_button_previous: 'absolute left-1',
                                nav_button_next: 'absolute right-1',
                                caption: 'text-white',
                                table: 'w-full border-collapse space-y-1',
                                head_row: 'flex',
                                head_cell:
                                  'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
                                row: 'flex w-full mt-2',
                                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                              }}
                            />
                          </div>
                          {selectedDate && (
                            <div className="space-y-4 border-t border-gray-700 pt-4">
                              <div className="space-y-2">
                                <Label>Choose a Time Slot</Label>
                                {(() => {
                                  const dateStr = selectedDate
                                    .toISOString()
                                    .slice(0, 10);
                                  const busy = busyTimes.find(
                                    (b) => b.date === dateStr,
                                  );
                                  const busyArr = busy?.times || [];
                                  const slots = generateTimeSlots();
                                  return (
                                    <div className="grid grid-cols-3 gap-2">
                                      {slots.map((slot) => {
                                        const slotBusy = isSlotBusy(
                                          slot,
                                          busyArr,
                                        );
                                        let inSelectedRange = false;
                                        if (
                                          selectedStartSlot &&
                                          selectedEndSlot
                                        ) {
                                          const range = getSlotsInRange(
                                            selectedStartSlot,
                                            selectedEndSlot,
                                            slots,
                                          );
                                          inSelectedRange =
                                            range.includes(slot);
                                        }
                                        return (
                                          <Button
                                            key={slot}
                                            type="button"
                                            variant={
                                              slotBusy
                                                ? 'destructive'
                                                : inSelectedRange
                                                  ? 'default'
                                                  : 'outline'
                                            }
                                            className={
                                              slotBusy
                                                ? 'cursor-not-allowed border-red-400 bg-red-500/20 text-red-400'
                                                : inSelectedRange
                                                  ? 'ring-designer-violet ring-2'
                                                  : ''
                                            }
                                            disabled={slotBusy}
                                            onClick={() => {
                                              if (slotBusy) return;
                                              if (
                                                !selectedStartSlot ||
                                                (selectedStartSlot &&
                                                  selectedEndSlot)
                                              ) {
                                                setSelectedStartSlot(slot);
                                                setSelectedEndSlot(null);
                                              } else if (
                                                selectedStartSlot &&
                                                !selectedEndSlot
                                              ) {
                                                if (
                                                  slots.indexOf(slot) >
                                                  slots.indexOf(
                                                    selectedStartSlot,
                                                  )
                                                ) {
                                                  // Check if any slot in the range is busy
                                                  const range = getSlotsInRange(
                                                    selectedStartSlot,
                                                    slot,
                                                    slots,
                                                  );
                                                  const rangeHasBusy =
                                                    range.some((s) =>
                                                      isSlotBusy(s, busyArr),
                                                    );
                                                  if (!rangeHasBusy) {
                                                    setSelectedEndSlot(slot);
                                                    setMeetingDetails({
                                                      ...meetingDetails,
                                                      startTime:
                                                        selectedStartSlot,
                                                      endTime: slot,
                                                    });
                                                  }
                                                } else {
                                                  setSelectedStartSlot(slot);
                                                  setSelectedEndSlot(null);
                                                }
                                              }
                                            }}
                                          >
                                            {formatTime12Hour(slot)}
                                          </Button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="space-y-2">
                                <Label>Attendees</Label>
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {meetingDetails.attendees.map(
                                    (email, idx) => {
                                      const isPrimaryContact =
                                        email === deal?.contact?.email;
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center rounded px-2 py-1 ${
                                            isPrimaryContact
                                              ? 'bg-designer-violet/20 border-designer-violet/40 border'
                                              : 'bg-gray-800'
                                          }`}
                                        >
                                          <span className="text-xs text-white">
                                            {isPrimaryContact && (
                                              <span className="text-designer-violet mr-1">
                                                ★
                                              </span>
                                            )}
                                            {isPrimaryContact
                                              ? `${deal?.contact?.name} (${email})`
                                              : email}
                                          </span>
                                          {(!isPrimaryContact ||
                                            meetingDetails.attendees.length >
                                              1) && (
                                            <button
                                              type="button"
                                              className="ml-1 text-red-400 hover:text-red-600"
                                              onClick={() =>
                                                setMeetingDetails((prev) => ({
                                                  ...prev,
                                                  attendees:
                                                    prev.attendees.filter(
                                                      (_, i) => i !== idx,
                                                    ),
                                                }))
                                              }
                                              title={
                                                isPrimaryContact
                                                  ? 'Remove primary contact'
                                                  : 'Remove attendee'
                                              }
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      type="text"
                                      placeholder="Contact name"
                                      className="flex-1 border-gray-700 bg-gray-800"
                                      value={attendeeNameInput || ''}
                                      onChange={(e) =>
                                        setAttendeeNameInput(e.target.value)
                                      }
                                    />
                                    <Input
                                      type="email"
                                      placeholder="Contact email"
                                      className="flex-1 border-gray-700 bg-gray-800"
                                      value={attendeeInput || ''}
                                      onChange={(e) =>
                                        setAttendeeInput(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === 'Enter' &&
                                          attendeeInput
                                        ) {
                                          handleAddAttendee();
                                        }
                                      }}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddAttendee}
                                    disabled={!attendeeInput || isAddingContact}
                                    className="w-full"
                                  >
                                    {isAddingContact
                                      ? 'Adding...'
                                      : 'Add to Meeting & Deal Contacts'}
                                  </Button>
                                  <p className="text-xs text-gray-400">
                                    New contacts will be automatically added to
                                    this deal's contact list
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="title">Meeting Title</Label>
                                <Input
                                  id="title"
                                  value={meetingDetails.title}
                                  onChange={(e) =>
                                    setMeetingDetails({
                                      ...meetingDetails,
                                      title: e.target.value,
                                    })
                                  }
                                  className="border-gray-700 bg-gray-800"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={meetingDetails.description}
                                  onChange={(e) =>
                                    setMeetingDetails({
                                      ...meetingDetails,
                                      description: e.target.value,
                                    })
                                  }
                                  className="border-gray-700 bg-gray-800"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Meeting Platform</Label>
                                <MeetingProviderSelector
                                  selectedProvider={meetingProvider}
                                  onProviderChange={(provider) => {
                                    setMeetingProvider(provider);
                                    setMeetingDetails((prev) => ({
                                      ...prev,
                                      provider,
                                      location:
                                        provider === 'microsoft'
                                          ? 'Microsoft Teams'
                                          : 'Google Meet',
                                    }));
                                  }}
                                  accountId={accountId}
                                  className="mb-4"
                                />
                              </div>
                            </div>
                          )}
                          <div className="mt-4 flex justify-end gap-2 border-t border-gray-700 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsCalendarClosing(true);
                                setTimeout(() => {
                                  setShowCalendarInline(false);
                                  setIsCalendarClosing(false);
                                }, 700);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreateMeeting}
                              disabled={!selectedDate || isLoading}
                              className="bg-designer-violet hover:bg-designer-violet/90 flex items-center justify-center"
                            >
                              {isLoading ? (
                                <span className="loader mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                              ) : null}
                              Schedule
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* AI Notetaker Meeting Insights - Only for real deals */}
                      {enhancedDeal.id &&
                        !enhancedDeal.id.startsWith('mock-') && (
                          <MeetingSummary
                            dealId={enhancedDeal.id}
                            accountId={accountId}
                          />
                        )}
                    </>
                  )}
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="text-designer-violet h-5 w-5" />
                      <h3 className="text-designer-violet text-lg font-semibold">
                        Contacts
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startAddingContact}
                      className="text-designer-violet hover:bg-designer-violet/20 hover:text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>

                  {contactsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="text-designer-violet h-6 w-6 animate-spin" />
                      <span className="ml-2 text-gray-400">
                        Loading contacts...
                      </span>
                    </div>
                  ) : displayContacts.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-gray-400">
                        No contacts found for this deal.
                      </span>
                    </div>
                  ) : (
                    <>
                      {displayContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="rounded-lg bg-gray-800/50 p-4"
                        >
                          {editingContact === contact.id ? (
                            // Edit mode
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label
                                    htmlFor={`name-${contact.id}`}
                                    className="text-sm font-medium text-gray-300"
                                  >
                                    Name
                                  </Label>
                                  <Input
                                    id={`name-${contact.id}`}
                                    value={editingContactData.name}
                                    onChange={(e) =>
                                      setEditingContactData((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                      }))
                                    }
                                    className="mt-1 border-gray-600 bg-gray-700 text-white"
                                    placeholder="Contact name"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor={`role-${contact.id}`}
                                    className="text-sm font-medium text-gray-300"
                                  >
                                    Role
                                  </Label>
                                  <Input
                                    id={`role-${contact.id}`}
                                    value={editingContactData.role}
                                    onChange={(e) =>
                                      setEditingContactData((prev) => ({
                                        ...prev,
                                        role: e.target.value,
                                      }))
                                    }
                                    className="mt-1 border-gray-600 bg-gray-700 text-white"
                                    placeholder="Job title or role"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor={`email-${contact.id}`}
                                    className="text-sm font-medium text-gray-300"
                                  >
                                    Email
                                  </Label>
                                  <Input
                                    id={`email-${contact.id}`}
                                    type="email"
                                    value={editingContactData.email}
                                    onChange={(e) =>
                                      setEditingContactData((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                      }))
                                    }
                                    className="mt-1 border-gray-600 bg-gray-700 text-white"
                                    placeholder="email@example.com"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor={`phone-${contact.id}`}
                                    className="text-sm font-medium text-gray-300"
                                  >
                                    Phone
                                  </Label>
                                  <Input
                                    id={`phone-${contact.id}`}
                                    type="tel"
                                    value={editingContactData.phone}
                                    onChange={(e) =>
                                      setEditingContactData((prev) => ({
                                        ...prev,
                                        phone: e.target.value,
                                      }))
                                    }
                                    className="mt-1 border-gray-600 bg-gray-700 text-white"
                                    placeholder="+1 (555) 123-4567"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor={`contactRoleType-${contact.id}`}
                                    className="text-sm font-medium text-gray-300"
                                  >
                                    Contact Role Type
                                  </Label>
                                  <Select
                                    value={editingContactData.contactRoleType}
                                    onValueChange={(
                                      value:
                                        | 'technical'
                                        | 'financial'
                                        | 'executive'
                                        | 'other',
                                    ) =>
                                      setEditingContactData((prev) => ({
                                        ...prev,
                                        contactRoleType: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="mt-1 border-gray-600 bg-gray-700 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="technical">
                                        Technical
                                      </SelectItem>
                                      <SelectItem value="financial">
                                        Financial
                                      </SelectItem>
                                      <SelectItem value="executive">
                                        Executive
                                      </SelectItem>
                                      <SelectItem value="other">
                                        Other
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={
                                          editingContactData.isDecisionMaker
                                        }
                                        onCheckedChange={(checked) =>
                                          setEditingContactData((prev) => ({
                                            ...prev,
                                            isDecisionMaker: checked,
                                          }))
                                        }
                                      />
                                      <Label className="text-sm text-gray-300">
                                        Decision Maker
                                      </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={editingContactData.isPrimary}
                                        onCheckedChange={(checked) =>
                                          setEditingContactData((prev) => ({
                                            ...prev,
                                            isPrimary: checked,
                                          }))
                                        }
                                      />
                                      <Label className="text-sm text-gray-300">
                                        Primary Contact
                                      </Label>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveContact(contact.id)}
                                  disabled={isSavingContact}
                                  className="bg-designer-violet hover:bg-designer-violet/80 text-white"
                                >
                                  {isSavingContact ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingContact}
                                  className="text-gray-400 hover:text-white"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteContact(contact.id)}
                                  disabled={isSavingContact}
                                  className="ml-auto text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                >
                                  <AlertTriangle className="mr-1 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="mb-3 flex items-center justify-between">
                                <div>
                                  <h4 className="text-lg font-medium text-white">
                                    {contact.name}
                                  </h4>
                                  <p className="text-sm text-gray-400">
                                    {contact.role}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingContact(contact)}
                                  className="text-gray-400 hover:text-white"
                                >
                                  Edit
                                </Button>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="text-designer-violet h-4 w-4" />
                                  <span className="text-designer-violet">
                                    {contact.email}
                                  </span>
                                </div>
                                {contact.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-green-400" />
                                    <span className="text-gray-300">
                                      {contact.phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add New Contact Form */}
                      {isAddingContact && (
                        <div className="border-designer-violet/50 rounded-lg border-2 border-dashed bg-gray-800/50 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <Plus className="text-designer-violet h-5 w-5" />
                            <h4 className="text-designer-violet text-lg font-medium">
                              Add New Contact
                            </h4>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <Label
                                  htmlFor="new-name"
                                  className="text-sm font-medium text-gray-300"
                                >
                                  Name
                                </Label>
                                <Input
                                  id="new-name"
                                  value={newContactData.name}
                                  onChange={(e) =>
                                    setNewContactData((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="mt-1 border-gray-600 bg-gray-700 text-white"
                                  placeholder="Contact name"
                                />
                              </div>

                              <div>
                                <Label
                                  htmlFor="new-role"
                                  className="text-sm font-medium text-gray-300"
                                >
                                  Role
                                </Label>
                                <Input
                                  id="new-role"
                                  value={newContactData.role}
                                  onChange={(e) =>
                                    setNewContactData((prev) => ({
                                      ...prev,
                                      role: e.target.value,
                                    }))
                                  }
                                  className="mt-1 border-gray-600 bg-gray-700 text-white"
                                  placeholder="Job title or role"
                                />
                              </div>

                              <div>
                                <Label
                                  htmlFor="new-email"
                                  className="text-sm font-medium text-gray-300"
                                >
                                  Email *
                                </Label>
                                <Input
                                  id="new-email"
                                  type="email"
                                  value={newContactData.email}
                                  onChange={(e) =>
                                    setNewContactData((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  className="mt-1 border-gray-600 bg-gray-700 text-white"
                                  placeholder="email@example.com"
                                  required
                                />
                              </div>

                              <div>
                                <Label
                                  htmlFor="new-phone"
                                  className="text-sm font-medium text-gray-300"
                                >
                                  Phone
                                </Label>
                                <Input
                                  id="new-phone"
                                  type="tel"
                                  value={newContactData.phone}
                                  onChange={(e) =>
                                    setNewContactData((prev) => ({
                                      ...prev,
                                      phone: e.target.value,
                                    }))
                                  }
                                  className="mt-1 border-gray-600 bg-gray-700 text-white"
                                  placeholder="+1 (555) 123-4567"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={addNewContact}
                                disabled={
                                  isSavingContact || !newContactData.email
                                }
                                className="bg-designer-violet hover:bg-designer-violet/80 text-white"
                              >
                                {isSavingContact ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Add Contact
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelAddingContact}
                                className="text-gray-400 hover:text-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="text-designer-violet h-5 w-5" />
                      <h3 className="text-designer-violet text-lg font-semibold">
                        Activity Log
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchRealActivities}
                      disabled={activitiesLoading}
                      className="text-gray-400 hover:text-white"
                    >
                      {activitiesLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>

                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="text-designer-violet h-6 w-6 animate-spin" />
                      <span className="ml-2 text-gray-400">
                        Loading activities...
                      </span>
                    </div>
                  ) : realActivities.length > 0 ? (
                    realActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-lg bg-gray-800/50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700">
                            {activity.type === 'email' && (
                              <Mail className="h-4 w-4 text-gray-400" />
                            )}
                            {activity.type === 'meeting' && (
                              <CalendarIcon className="h-4 w-4 text-gray-400" />
                            )}
                            {activity.type === 'scheduled_meeting' && (
                              <CalendarIcon className="h-4 w-4 text-blue-400" />
                            )}
                            {activity.type === 'call' && (
                              <Phone className="h-4 w-4 text-green-400" />
                            )}
                            {![
                              'email',
                              'meeting',
                              'scheduled_meeting',
                              'call',
                            ].includes(activity.type) && (
                              <Activity className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-lg font-medium text-white">
                                {activity.title}
                              </h4>
                              <span className="text-sm text-gray-400">
                                {getTimeAgo(activity.date)}
                              </span>
                            </div>
                            <p className="mb-2 text-sm text-gray-300">
                              {activity.description}
                            </p>

                            {/* Email specific metadata */}
                            {activity.type === 'email' && activity.metadata && (
                              <div className="space-y-1 text-xs text-gray-400">
                                <div>From: {activity.metadata.from}</div>
                                {activity.metadata.subject && (
                                  <div>
                                    Subject: {activity.metadata.subject}
                                  </div>
                                )}
                                {activity.metadata.body && (
                                  <div className="mt-2 rounded bg-gray-700/30 p-2">
                                    <p className="text-gray-300">
                                      {activity.metadata.body}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Meeting specific metadata */}
                            {(activity.type === 'meeting' ||
                              activity.type === 'scheduled_meeting') &&
                              activity.metadata && (
                                <div className="space-y-1 text-xs text-gray-400">
                                  {activity.metadata.duration && (
                                    <div>
                                      Duration: {activity.metadata.duration}{' '}
                                      minutes
                                    </div>
                                  )}
                                  {activity.metadata.participant_count && (
                                    <div>
                                      Participants:{' '}
                                      {activity.metadata.participant_count}
                                    </div>
                                  )}
                                  {activity.metadata.has_transcript && (
                                    <div className="text-green-400">
                                      ✓ Transcript available
                                    </div>
                                  )}
                                  {activity.metadata.status && (
                                    <div>
                                      Status: {activity.metadata.status}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <Activity className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                      <p>No activities found for this deal.</p>
                      <p className="text-sm">
                        Activities will appear here as you communicate with
                        contacts.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Paperclip className="text-designer-violet h-5 w-5" />
                    <h3 className="text-designer-violet text-lg font-semibold">
                      Documents
                    </h3>
                  </div>

                  {mockDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="rounded-lg bg-gray-800/50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-designer-violet text-lg font-medium">
                            {document.name}
                          </h4>
                          <p className="text-sm text-gray-400">
                            Uploaded: {getTimeAgo(document.uploadedAt)}
                          </p>
                        </div>
                        <Button className="text-white hover:text-gray-300">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="border-designer-violet/50 rounded-lg border-2 border-dashed p-8 text-center">
                    <Button className="border-designer-violet text-designer-violet hover:bg-designer-violet/20 w-full bg-transparent">
                      <Paperclip className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                </div>
              )}

              {/* Meetings Tab */}
              {activeTab === 'meetings' && (
                <div className="space-y-4">
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarIcon className="text-designer-violet h-5 w-5" />
                    <h3 className="text-designer-violet text-lg font-semibold">
                      Meetings
                    </h3>
                  </div>

                  <div className="text-gray-300">
                    <p className="mb-4">
                      Meeting integration components (Analytics, Transcript,
                      Summary) would go here.
                    </p>

                    <p className="mb-4 text-sm text-gray-400">
                      Last Meeting Summary: Discussed integration challenges and
                      proposed a custom solution. Key takeaways included the
                      need for a phased rollout and dedicated support during
                      onboarding. John seemed receptive to the proposed
                      timeline.
                    </p>

                    <div className="border-designer-violet/50 rounded-lg border-2 border-dashed p-8 text-center">
                      <Button className="border-designer-violet text-designer-violet hover:bg-designer-violet/20 w-full bg-transparent">
                        <Plus className="mr-2 h-4 w-4" />
                        Log New Meeting
                      </Button>
                    </div>

                    {/* Manual Analysis Trigger - Only for real deals */}
                    {enhancedDeal.id &&
                      !enhancedDeal.id.startsWith('mock-') && (
                        <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="mb-1 text-sm font-medium text-orange-400">
                                Transcript Analysis
                              </h4>
                              <p className="text-xs text-gray-400">
                                Manually trigger analysis of meeting transcripts
                                to update deal insights
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                console.log(
                                  '🤖 Manually triggering transcript analysis...',
                                );
                                setIsTyping(true);

                                try {
                                  // First, check if there are meetings with transcripts for this deal
                                  const meetingsResponse = await fetch(
                                    `/api/meetings?dealId=${enhancedDeal.id}&accountId=${accountId}`,
                                  );
                                  if (!meetingsResponse.ok) {
                                    throw new Error('Failed to fetch meetings');
                                  }

                                  const meetingsData =
                                    await meetingsResponse.json();
                                  const meetings = meetingsData.meetings || [];

                                  if (meetings.length === 0) {
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content:
                                          'No meetings found for this deal yet. Once you have meeting transcripts, I can analyze them to extract insights.',
                                        timestamp: new Date(),
                                      },
                                    ]);
                                    return;
                                  }

                                  // Get the most recent meeting
                                  const latestMeeting = meetings[0];
                                  console.log(
                                    '📅 Latest meeting found:',
                                    latestMeeting.id,
                                  );

                                  // Trigger comprehensive analysis
                                  const analysisResponse = await fetch(
                                    `/api/analyze-comprehensive?accountId=${accountId}`,
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        meetingId: latestMeeting.id,
                                        accountId: accountId,
                                      }),
                                    },
                                  );

                                  if (!analysisResponse.ok) {
                                    const errorData =
                                      await analysisResponse.text();
                                    throw new Error(
                                      `Analysis failed: ${errorData}`,
                                    );
                                  }

                                  const analysisResult =
                                    await analysisResponse.json();
                                  console.log(
                                    '✅ Analysis completed:',
                                    analysisResult,
                                  );

                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: Date.now().toString(),
                                      role: 'assistant',
                                      content: `🤖 **Analysis Complete!**\n\nI've analyzed the latest meeting transcript and updated the deal with:\n\n• **${analysisResult.analysis?.painPoints?.length || 0}** pain points identified\n• **${analysisResult.analysis?.nextSteps?.length || 0}** next steps extracted\n• **${analysisResult.analysis?.greenFlags?.length || 0}** positive signals found\n• **${analysisResult.analysis?.redFlags?.length || 0}** concerns noted\n\nThe deal insights, meeting summary, and other fields have been updated. The page will refresh in 3 seconds to show the changes.`,
                                      timestamp: new Date(),
                                    },
                                  ]);

                                  // Force a refresh of the page data after successful analysis
                                  setTimeout(() => {
                                    console.log(
                                      '🔄 Refreshing page after analysis...',
                                    );
                                    window.location.reload();
                                  }, 3000);
                                } catch (error) {
                                  console.error('❌ Analysis failed:', error);
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: Date.now().toString(),
                                      role: 'assistant',
                                      content: `❌ **Analysis Failed**\n\nI encountered an error while analyzing the transcript: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again, or check if there are recent meeting transcripts available for this deal.`,
                                      timestamp: new Date(),
                                    },
                                  ]);
                                } finally {
                                  setIsTyping(false);
                                }
                              }}
                              disabled={isTyping}
                              className="border-orange-500/50 bg-transparent text-orange-400 hover:bg-orange-500/20"
                            >
                              {isTyping ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Bot className="mr-2 h-3 w-3" />
                                  Analyze Transcripts
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* AI Notetaker Meeting Insights - Only for real deals */}
                    {enhancedDeal.id &&
                      !enhancedDeal.id.startsWith('mock-') && (
                        <MeetingSummary
                          dealId={enhancedDeal.id}
                          accountId={accountId}
                        />
                      )}

                    {/* Meeting Timeline - Only for real deals */}
                    {enhancedDeal.id &&
                      !enhancedDeal.id.startsWith('mock-') && (
                        <MeetingTimeline
                          dealId={enhancedDeal.id}
                          accountId={accountId}
                        />
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - AI-Deal */}
          <div className="flex w-1/2 flex-col overflow-hidden bg-gray-800/30">
            {/* AI Header */}
            <div className="border-b border-gray-700 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Bot className="text-designer-violet h-4 w-4" />
                AI-Deal
              </h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-designer-violet/20">
                        <Bot className="text-designer-violet h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      message.role === 'assistant'
                        ? 'bg-gray-800 text-white'
                        : 'bg-designer-violet/20 text-white',
                    )}
                  >
                    {message.showEmailProviderSelector &&
                      message.availableProviders &&
                      message.dealInfo && (
                        <div className="mt-3 space-y-3">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3">
                              {' '}
                              {/* Changed from grid-cols-1 to grid-cols-2 */}
                              {message.availableProviders.includes('gmail') && (
                                <Button
                                  variant="outline"
                                  className="flex items-center justify-center gap-2 border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                  onClick={async () => {
                                    setSelectedEmailProvider('gmail');
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        id: (Date.now() + 1).toString(),
                                        role: 'user',
                                        content: 'Gmail',
                                        timestamp: new Date(),
                                      },
                                    ]);
                                    await sendMessageWithText(
                                      'Draft a follow-up email using Gmail',
                                    );
                                  }}
                                >
                                  <GmailLogo className="h-4 w-4" />{' '}
                                  {/* Replaced Mail with GmailLogo */}
                                  Gmail
                                </Button>
                              )}
                              {message.availableProviders.includes(
                                'outlook',
                              ) && (
                                <Button
                                  variant="outline"
                                  className="flex items-center justify-center gap-2 border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                                  onClick={async () => {
                                    setSelectedEmailProvider('outlook');
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        id: (Date.now() + 1).toString(),
                                        role: 'user',
                                        content: 'Outlook',
                                        timestamp: new Date(),
                                      },
                                    ]);
                                    await sendMessageWithText(
                                      'Draft a follow-up email using Outlook',
                                    );
                                  }}
                                >
                                  <OutlookLogo className="h-5 w-5" />{' '}
                                  {/* Replaced Mail with OutlookLogo */}
                                  Outlook
                                </Button>
                              )}
                            </div>
                            <div className="text-center text-xs text-gray-400">
                              Choose your preferred email provider to continue
                            </div>
                          </div>
                        </div>
                      )}
                    {/* Regular message content - hide for scheduling responses */}
                    {!message.isSchedulingResponse && (
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}

                    {/* Debug email components */}
                    {message.emailComponents &&
                      console.log('📧 Email components found:', {
                        hasSubject: !!message.emailComponents.subject,
                        hasBody: !!message.emailComponents.body,
                        hasTo: !!message.emailComponents.to,
                        subject: message.emailComponents.subject,
                        role: message.role,
                        hasDeal: !!deal,
                      })}

                    {/* Inline Email Editor for email responses */}
                    {message.emailComponents &&
                      message.emailComponents.subject &&
                      message.emailComponents.body &&
                      message.role === 'assistant' &&
                      deal && (
                        <InlineEmailEditor
                          emailComponents={message.emailComponents}
                          dealId={deal.id}
                          accountId={accountId}
                          companyName={deal.companyName}
                          emailProvider={
                            message.emailProvider || selectedEmailProvider!
                          }
                          onSent={() => {
                            // Refresh activities to show sent email
                            fetchRealActivities();

                            // Refresh email summary after a delay to allow sync to complete
                            setTimeout(() => {
                              refreshEmailSummary();
                            }, 5000);

                            toast.success('Email sent successfully!');
                          }}
                          onEmailSyncNeeded={() => {
                            // Trigger manual email sync if available
                            console.log('📧 Email sync needed after sending');

                            // Refresh deal data to show updated email summary
                            setTimeout(async () => {
                              try {
                                const response = await fetch(
                                  `/api/deals?accountId=${accountId}`,
                                );
                                if (response.ok) {
                                  const dealsData = await response.json();
                                  console.log(
                                    '✅ Refreshed deals data after email send',
                                  );

                                  // Find and update the current deal if it exists in the updated data
                                  const updatedDeal = dealsData.find(
                                    (d: any) => d.id === deal.id,
                                  );
                                  if (updatedDeal && onUpdate) {
                                    onUpdate(updatedDeal);
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  '❌ Error refreshing deals after email:',
                                  error,
                                );
                              }
                            }, 8000); // 8 second delay to allow full sync and summary generation
                          }}
                        />
                      )}
                    {/* Platform selector in chat */}
                    {message.showPlatformSelector && message.dealInfo && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              className="flex items-center justify-center gap-2 border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                              onClick={async () => {
                                setMeetingProvider('google');
                                // Send scheduling request with Google Meet
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    id: (Date.now() + 1).toString(),
                                    role: 'user',
                                    content: 'Google Meet',
                                    timestamp: new Date(),
                                  },
                                ]);

                                // Trigger AI scheduling with Google Meet
                                setTimeout(async () => {
                                  await sendMessageWithText(
                                    'Help me schedule a meeting using Google Meet',
                                  );
                                }, 500);
                              }}
                            >
                              <GoogleMeetIcon className="h-4 w-4" />
                              Google Meet
                            </Button>

                            <Button
                              variant="outline"
                              className="flex items-center justify-center gap-2 border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                              onClick={async () => {
                                setMeetingProvider('microsoft');
                                // Send scheduling request with Microsoft Teams
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    id: (Date.now() + 1).toString(),
                                    role: 'user',
                                    content: 'Microsoft Teams',
                                    timestamp: new Date(),
                                  },
                                ]);

                                // Trigger AI scheduling with Microsoft Teams
                                setTimeout(async () => {
                                  await sendMessageWithText(
                                    'Help me schedule a meeting using Microsoft Teams',
                                  );
                                }, 500);
                              }}
                            >
                              <TeamsIcon className="h-4 w-4" />
                              Microsoft Teams
                            </Button>
                          </div>

                          <div className="text-center text-xs text-gray-400">
                            Choose your preferred meeting platform to continue
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive time slots for scheduling responses */}
                    {message.isSchedulingResponse &&
                      message.dealInfo &&
                      (() => {
                        // Check if this is an error message (no calendar access)
                        if (
                          message.content.includes('No calendar access') ||
                          message.content.includes(
                            'No Google Calendar access available',
                          ) ||
                          message.content.includes('Calendar access expired') ||
                          message.content.includes(
                            'Unable to fetch calendar',
                          ) ||
                          message.content.includes(
                            "couldn't fetch your calendar",
                          )
                        ) {
                          return (
                            <div className="space-y-3">
                              <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                                {message.content}
                              </div>
                            </div>
                          );
                        }
                        const timeSlots = parseAvailableTimesFromResponse(
                          message.content,
                        );
                        return timeSlots.length > 0 ? (
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-gray-300">
                              Here are your available times:
                            </div>
                            {timeSlots.map((daySlot, dayIdx) => (
                              <div key={dayIdx} className="space-y-2">
                                <div className="text-xs font-medium text-gray-300">
                                  {daySlot.day}, {daySlot.date}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {daySlot.times.map((time, timeIdx) => {
                                    const timeSlotKey = `${daySlot.day}-${time}`;
                                    const isScheduling =
                                      schedulingTimeSlot === timeSlotKey;

                                    return (
                                      <Button
                                        key={timeIdx}
                                        variant="outline"
                                        size="sm"
                                        className="hover:border-designer-violet hover:bg-designer-violet/20 hover:text-designer-violet h-6 border-gray-600 px-2 text-xs disabled:opacity-50"
                                        disabled={
                                          isScheduling ||
                                          schedulingTimeSlot !== null
                                        }
                                        onClick={() => {
                                          // Parse the date properly for scheduling
                                          const currentYear =
                                            new Date().getFullYear();
                                          const dateWithYear = `${daySlot.date}, ${currentYear}`;
                                          scheduleFromTimeSlot(
                                            daySlot.day,
                                            dateWithYear,
                                            time,
                                            message.dealInfo!,
                                          );
                                        }}
                                      >
                                        {isScheduling ? (
                                          <div className="flex items-center gap-1">
                                            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                                            <span>...</span>
                                          </div>
                                        ) : (
                                          time
                                        )}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-designer-blue/20">
                        <User className="text-designer-blue h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-designer-violet/20">
                      <Bot className="text-designer-violet h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg bg-gray-800 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Next Steps Button - Only show for welcome message when next steps exist */}
            {messages.length === 1 &&
              messages[0]?.id === '1' &&
              deal?.nextSteps &&
              deal.nextSteps.length > 0 && (
                <div className="border-t border-gray-700 px-4 py-3">
                  <Button
                    variant="outline"
                    className="bg-designer-violet hover:bg-designer-violet/80 border-designer-violet w-full justify-start text-white"
                    onClick={async () => {
                      // Execute the first next step or most relevant step
                      const firstStep = deal.nextSteps[0];
                      const stepLower = firstStep.toLowerCase();

                      // Check if it's a scheduling step
                      const isSchedulingStep =
                        (stepLower.includes('schedule') &&
                          stepLower.includes('meeting')) ||
                        (stepLower.includes('schedule') &&
                          stepLower.includes('call')) ||
                        (stepLower.includes('book') &&
                          stepLower.includes('meeting')) ||
                        (stepLower.includes('set up') &&
                          stepLower.includes('meeting')) ||
                        stepLower.includes('schedule a meeting');

                      if (isSchedulingStep) {
                        const schedulingMessage = `Help me schedule a meeting with ${deal.companyName}`;
                        await sendMessageWithText(schedulingMessage);
                      } else {
                        const message = `Help me with: ${firstStep}`;
                        await sendMessageWithText(message);
                      }
                    }}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    🎯 Execute Next Step: {deal?.nextSteps[0]?.substring(0, 40)}
                    {deal?.nextSteps[0]?.length > 40 ? '...' : ''}
                  </Button>
                </div>
              )}

            {/* Quick Prompts */}
            <div className="border-t border-gray-700 px-4 py-2">
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () =>
                    await sendMessageWithText('Draft a follow-up email')
                  }
                >
                  Draft Email
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () =>
                    await sendMessageWithText('Help me schedule a meeting')
                  }
                >
                  Schedule Meeting
                </Button> */}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    // Add platform selection message to chat
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content:
                          "I'd be happy to help you schedule a meeting! First, please choose your preferred meeting platform:",
                        timestamp: new Date(),
                        showPlatformSelector: true,
                        dealInfo: {
                          dealId: deal?.id || '',
                          companyName: deal?.companyName || '',
                          contactName: deal?.contact?.name || 'Contact',
                          contactEmail: deal?.contact?.email || '',
                        },
                      },
                    ]);
                  }}
                >
                  Schedule Meeting
                </Button>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask AI to help execute next steps..."
                  className="max-h-[80px] min-h-[40px] flex-1 resize-none border-gray-700 bg-gray-800 text-sm"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="bg-designer-violet hover:bg-designer-violet/90 h-[40px]"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Compose Modal */}
        {showEmailCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative mx-4 w-full max-w-2xl rounded-lg bg-gray-900 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmailCompose(false)}
                className="absolute top-4 right-4 h-8 w-8 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
              <GmailCompose
                accountId={accountId || ''}
                initialTo={deal.email}
                initialSubject={`${deal.companyName} - Follow Up`}
                onEmailSent={() => {
                  setShowEmailCompose(false);
                }}
                onClose={() => setShowEmailCompose(false)}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
