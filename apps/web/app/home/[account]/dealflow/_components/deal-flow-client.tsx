'use client';

import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Edit,
  ExternalLink,
  Filter,
  LayoutGrid,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Waves,
} from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { AutoEmailConnection } from '../../../_components/auto-gmail-connection';
import { TimezoneWelcomeModal } from '../../../_components/timezone-welcome-modal';
import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { useAutoEmailSync } from '../_lib/hooks/use-auto-email-sync';
import { useDealsStream } from '../_lib/hooks/use-deals-stream';
import { useEnhancedAutoSync } from '../_lib/hooks/use-enhanced-auto-sync';
import { useTranscriptsStream } from '../_lib/hooks/use-transcripts-stream';
import { mockDeals } from '../_lib/mock';
import DailyFocusPath from './daily-focus-path';
import { DealAssignment } from './deal-assignment';
import {
  DealAssignmentFilter,
  filterDealsByAssignment,
} from './deal-assignment-filter';
import { EditStagesModal } from './edit-stages-modal';
import EnhancedDealDetail from './enhanced-deal-detail';
import HubSpotImportModal from './hubspot-import-modal';
import MomentumInsights from './momentum-insights';
import MomentumStream from './momentum-stream';
import NewDealModal from './new-deal-modal';

type AssignmentFilter = 'all' | 'assigned' | 'unassigned' | 'mine' | string;

export interface MomentumMarker {
  type: 'stakeholder_intro' | 'buying_question' | 'prospect_next_step';
  timestamp: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface Deal {
  id: string;
  companyName: string;
  industry: string;
  value: string;
  contact: string;
  email: string;
  source: string;
  //   stage:
  //     | 'interested'
  //     | 'qualified'
  //     | 'demo'
  //     | 'proposal'
  //     | 'closed-won'
  //     | 'closed-lost'
  //     | 'follow-up-later';
  stage:
    | 'interested'
    | 'contacted' // Changed from 'qualified'
    | 'demo'
    | 'proposal'
    | 'negotiation' // New stage
    | 'won' // Changed from 'closed-won'
    | 'lost'; // Changed from 'closed-lost'
  // Remove 'follow-up-later' as it's not in your enum
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
  last_meeting_summary?: string;
  momentum: number;
  momentumTrend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  momentumMarkers: MomentumMarker[];
  lastMomentumChange?: string;
  blockers?: string[];
  opportunities?: string[];
}

interface DragState {
  isDragging: boolean;
  draggedDeal: Deal | null;
  dragOffset: { x: number; y: number };
  dragStartPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  ghostElement: HTMLElement | null;
}

const SOURCE_CONFIG = {
  pipedrive: {
    label: 'Pipedrive',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" r="16" fill="#28a745" />
        <path
          d="M24.9842 13.4564C24.9842 17.8851 22.1247 20.914 18.036 20.914C16.0923 20.914 14.4903 20.1136 13.8906 19.1134L13.9189 20.142V26.4847H9.74512V10.0846C9.74512 9.85644 9.68836 9.79843 9.4304 9.79843H8V6.31321H11.4889C13.0896 6.31321 13.4907 7.68461 13.6042 8.28525C14.2337 7.22834 15.8911 6 18.2359 6C22.2679 5.99871 24.9842 8.99802 24.9842 13.4564ZM20.724 13.4847C20.724 11.1131 19.1801 9.48523 17.2351 9.48523C15.6344 9.48523 13.8325 10.5421 13.8325 13.5144C13.8325 15.4568 14.9186 17.4855 17.1783 17.4855C18.837 17.4842 20.724 16.2843 20.724 13.4847Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
  },
  hubspot: {
    label: 'HubSpot',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 27 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.6142 20.1771C17.5228 20.1771 15.8274 18.4993 15.8274 16.43C15.8274 14.3603 17.5228 12.6825 19.6142 12.6825C21.7057 12.6825 23.401 14.3603 23.401 16.43C23.401 18.4993 21.7057 20.1771 19.6142 20.1771ZM20.7479 9.21551V5.88191C21.6272 5.47091 22.2431 4.59068 22.2431 3.56913V3.49218C22.2431 2.08229 21.0774 0.928781 19.6527 0.928781H19.5754C18.1507 0.928781 16.985 2.08229 16.985 3.49218V3.56913C16.985 4.59068 17.6009 5.47127 18.4802 5.88227V9.21551C17.1711 9.4158 15.9749 9.95012 14.9885 10.7365L5.73944 3.61659C5.80048 3.38467 5.84336 3.14591 5.84372 2.89493C5.84518 1.29842 4.5393 0.00215931 2.92531 1.87311e-06C1.31205 -0.0018 0.00181863 1.29087 1.8933e-06 2.88774C-0.00181848 4.4846 1.30406 5.78087 2.91805 5.78266C3.44381 5.78338 3.9307 5.6356 4.35727 5.3954L13.4551 12.3995C12.6816 13.5552 12.2281 14.9396 12.2281 16.43C12.2281 17.9902 12.7263 19.4335 13.5678 20.6205L10.8012 23.3586C10.5825 23.2935 10.3558 23.2482 10.1152 23.2482C8.78938 23.2482 7.71424 24.3119 7.71424 25.6239C7.71424 26.9364 8.78938 28 10.1152 28C11.4415 28 12.5162 26.9364 12.5162 25.6239C12.5162 25.3866 12.4705 25.1619 12.4047 24.9454L15.1414 22.2371C16.3837 23.1752 17.9308 23.7391 19.6142 23.7391C23.6935 23.7391 27 20.4666 27 16.43C27 12.7757 24.2872 9.75667 20.7479 9.21551Z"
          fill="#f95c35"
        />
      </svg>
    ),
  },
  zoho: {
    label: 'Zoho',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 300 300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#006eb9"
          d="m204.26,239.24c-24.19,0-46.98-9.37-64.17-26.38l-50.24-50.24c-5.85-5.85-9.06-13.63-9.03-21.9.03-8.27,3.28-16.03,9.16-21.84,12.02-11.88,31.53-11.82,43.48.13l46.01,46.01c5.39,5.39,14.18,5.41,19.59.05,2.65-2.62,4.11-6.11,4.12-9.84.01-3.72-1.43-7.23-4.07-9.86l-50.17-50.17c-14.02-13.87-32.64-21.51-52.38-21.45-20.14.05-38.94,7.96-52.94,22.27-14.02,14.33-21.52,33.32-21.12,53.47.79,40.11,34.09,72.75,74.23,72.75,7.18,0,14.27-1.02,21.08-3.03,4.5-1.33,9.23,1.24,10.55,5.74,1.33,4.5-1.24,9.23-5.74,10.56-8.37,2.47-17.08,3.73-25.89,3.73-49.33,0-90.25-40.11-91.22-89.41-.49-24.75,8.73-48.08,25.96-65.69,17.22-17.6,40.32-27.33,65.05-27.38,24.15-.06,47.14,9.31,64.39,26.38l50.22,50.22c5.85,5.86,9.07,13.64,9.05,21.92-.02,8.28-3.28,16.05-9.16,21.87-12.04,11.91-31.58,11.86-43.56-.12l-46.01-46.01c-5.37-5.37-14.12-5.39-19.52-.06-2.64,2.61-4.1,6.09-4.11,9.81-.01,3.71,1.43,7.21,4.05,9.83l50.19,50.2c13.97,13.82,32.52,21.45,52.2,21.45,40.9,0,74.21-33.27,74.25-74.17.02-19.82-7.7-38.48-21.74-52.54-14.04-14.06-32.69-21.8-52.51-21.8-6.32,0-12.59.79-18.65,2.36-.88.23-1.76.47-2.63.73-4.5,1.34-9.23-1.22-10.57-5.71-1.34-4.5,1.22-9.23,5.71-10.57,1.07-.32,2.15-.62,3.23-.9,7.44-1.92,15.15-2.9,22.9-2.9,24.36,0,47.28,9.51,64.53,26.78,17.25,17.27,26.74,40.2,26.71,64.56-.05,50.26-40.99,91.14-91.24,91.14Z"
        />
      </svg>
    ),
  },
  salesforce: {
    label: 'Salesforce',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 92 64"
      >
        <path
          fill="#0d9dda"
          d="m38.33,6.98c2.95-3.07,7.05-4.98,11.59-4.98,6.04,0,11.3,3.37,14.1,8.36,2.44-1.09,5.13-1.7,7.97-1.7,10.89,0,19.71,8.9,19.71,19.88s-8.82,19.88-19.71,19.88c-1.33,0-2.63-.13-3.88-.39-2.47,4.4-7.18,7.38-12.58,7.38-2.26,0-4.4-.52-6.3-1.45-2.5,5.89-8.34,10.02-15.13,10.02s-13.11-4.48-15.43-10.76c-1.01.21-2.06.33-3.14.33-8.43,0-15.26-6.9-15.26-15.42,0-5.71,3.07-10.69,7.63-13.36-.94-2.16-1.46-4.55-1.46-7.05C6.45,7.94,14.41,0,24.21,0C29.97,0,35.09,2.74,38.33,6.98Z"
        />
      </svg>
    ),
  },
  folk: {
    label: 'Folk',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M11.8 18h0.4c3.2 0 5.8-2.5 5.9-5.5 0-0.2-0.1-0.3-0.3-0.3H6.3c-0.2 0-0.3 0.1-0.3 0.3 0.1 3 2.6 5.5 5.8 5.5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  manual: {
    label: 'Manual',
    icon: <ExternalLink className="h-4 w-4" />,
  },
};

const DealCard = memo(
  ({
    deal,
    onDragStart,
    onDragEnd,
    onClick,
    onDelete,
    dragState,
    style,
  }: {
    deal: Deal;
    onDragStart: (e: React.DragEvent, deal: Deal) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onClick: (deal: Deal) => void;
    onDelete: (deal: Deal) => void;
    dragState: DragState;
    style?: React.CSSProperties;
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const isDragged = dragState.draggedDeal?.id === deal.id;
    const [isHovered, setIsHovered] = useState(false);
    const [touchStarted, setTouchStarted] = useState(false);
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Get source configuration
    const getSourceConfig = (source: string) => {
      const sourceKey = source?.toLowerCase();
      return SOURCE_CONFIG[sourceKey as keyof typeof SOURCE_CONFIG] || null;
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      setTouchStarted(true);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = setTimeout(() => setTouchStarted(false), 300);
    }, []);

    const handleTouchEnd = useCallback(() => {
      if (touchStarted) onClick(deal);
      setTouchStarted(false);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
    }, [deal, onClick, touchStarted]);

    useEffect(() => {
      return () => {
        if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      };
    }, []);

    const handleDragStartInternal = useCallback(
      (e: React.DragEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillRect(0, 0, 1, 1);
        }
        e.dataTransfer.setDragImage(canvas, 0, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', deal.id);
        onDragStart(e, deal);
      },
      [deal, onDragStart],
    );

    return (
      <Card
        ref={cardRef}
        draggable
        onDragStart={handleDragStartInternal}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={style}
        className={cn(
          'cursor-grab border border-white/25 bg-black/40 select-none active:cursor-grabbing',
          'transition-all duration-300 ease-out will-change-transform',
          'hover:border-white/50 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]',
          isDragged
            ? 'border-designer-violet/50 scale-95 rotate-1 opacity-40 shadow-2xl'
            : isHovered
              ? '-translate-y-1 scale-[1.02] transform shadow-[0_8px_30px_rgba(0,0,0,0.3)]'
              : 'scale-100 transform shadow-lg',
          'backdrop-blur-sm',
        )}
        onClick={() => !dragState.isDragging && onClick(deal)}
      >
        <CardHeader className="flex flex-col space-y-1.5 p-6 pb-2">
          <div className="flex items-start justify-end gap-2">
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-xs whitespace-nowrap text-white/50">
                {getTimeAgo(deal.createdAt)}
              </span>
            </div>
          </div>
          <CardTitle className="text-base font-bold text-white">
            {deal.companyName?.replace(/^https?:\/\//, '') || 'Untitled Deal'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 pb-2">
          <div className="mb-2 text-sm">
            <span className="font-medium">{deal.value}</span>
          </div>

          {deal.nextSteps && deal.nextSteps.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>Next Steps</span>
              </div>
              <ul className="space-y-1 text-xs text-white/70">
                {deal.nextSteps.slice(0, 2).map((step, index) => (
                  <li key={index} className="truncate">
                    • {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {deal.last_meeting_summary && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="text-designer-violet mb-1 flex items-center gap-1 text-xs">
                <Mic className="h-3 w-3" />
                <span>Meeting Summary Available</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between p-6 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-accent hover:text-accent-foreground h-auto rounded-md p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageSquare className="text-designer-violet h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-accent hover:text-accent-foreground h-auto rounded-md p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-white/10 bg-black/95"
            >
              <DropdownMenuItem
                className="cursor-pointer text-red-400 hover:bg-red-400/10 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(deal);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    );
  },
);
DealCard.displayName = 'DealCard';

const StageColumn = memo(
  ({
    stage,
    deals,
    onDragOver,
    onDragLeave,
    onDrop,
    dragState,
    onDealClick,
    onDragStart,
    onDragEnd,
    onDeleteDeal,
    getStageDisplayName,
  }: {
    stage: Deal['stage'];
    deals: Deal[];
    onDragOver: (e: React.DragEvent, stage: Deal['stage']) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, stage: Deal['stage']) => void;
    dragState: DragState;
    onDealClick: (deal: Deal) => void;
    onDragStart: (e: React.DragEvent, deal: Deal) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDeleteDeal: (deal: Deal) => void;
    getStageDisplayName: (stage: Deal['stage']) => string;
  }) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const [dropIndicatorPosition, setDropIndicatorPosition] = useState<
      number | null
    >(null);

    // const getStageDisplayName = (s: Deal['stage']) =>
    //   ({
    //     interested: 'Interested',
    //     qualified: 'Qualified',
    //     demo: 'Demo',
    //     proposal: 'Proposal',
    //     'closed-won': 'Closed Won',
    //     'closed-lost': 'Closed Lost',
    //     'follow-up-later': 'Follow Up Later',
    //   })[s] || s;

    // const getStageColor = (s: Deal['stage']) =>
    //   s === 'closed-won'
    //     ? 'text-green-400'
    //     : s === 'closed-lost'
    //       ? 'text-red-400'
    //       : 'text-white';

    // const getStageProgressionPercentage = (s: Deal['stage']) =>
    //   ({
    //     interested: 65,
    //     qualified: 78,
    //     demo: 82,
    //     proposal: 90,
    //     'closed-won': 100,
    //     'closed-lost': 0,
    //     'follow-up-later': 0,
    //   })[s];

    // const getStageTrend = (s: Deal['stage']) =>
    //   ({
    //     interested: 'up',
    //     qualified: 'down',
    //     demo: 'up',
    //     proposal: 'up',
    //     'closed-won': 'up',
    //     'closed-lost': 'down',
    //     'follow-up-later': 'down',
    //   })[s] as 'up' | 'down';

    // 4. Update the getStageColor function
    const getStageColor = (s: Deal['stage']) =>
      s === 'won' // Changed from 'closed-won'
        ? 'text-green-400'
        : s === 'lost' // Changed from 'closed-lost'
          ? 'text-red-400'
          : 'text-white';

    // 5. Calculate real progression percentage based on deal data
    const getStageProgressionPercentage = useMemo(() => {
      return (s: Deal['stage']) => {
        // If no deals, return 0%
        if (!deals || deals.length === 0) {
          return 0;
        }

        // Define stage order for progression calculation
        const stageOrder = [
          'interested',
          'contacted',
          'demo',
          'proposal',
          'negotiation',
          'won',
          'lost',
        ];

        const currentStageIndex = stageOrder.indexOf(s);

        // For 'lost' stage, return 0% (no progression)
        if (s === 'lost') {
          return 0;
        }

        // For 'won' stage, return 100% (complete progression)
        if (s === 'won') {
          return 100;
        }

        // Calculate how many deals have progressed beyond the current stage
        const dealsProgressedBeyond = deals.filter((deal) => {
          const dealStageIndex = stageOrder.indexOf(deal.stage);
          // Count deals that are in later stages (higher index) than current stage
          return dealStageIndex > currentStageIndex;
        }).length;

        // Calculate percentage: deals that progressed beyond this stage / total deals
        const progressPercentage = Math.round(
          (dealsProgressedBeyond / deals.length) * 100,
        );

        return progressPercentage;
      };
    }, [deals]);

    // 6. Update the getStageTrend function
    const getStageTrend = (s: Deal['stage']) =>
      ({
        interested: 'up',
        contacted: 'up', // Changed from qualified: 'down'
        demo: 'up',
        proposal: 'up',
        negotiation: 'up', // New stage
        won: 'up', // Changed from 'closed-won': 'up'
        lost: 'down', // Changed from 'closed-lost': 'down'
        // Removed 'follow-up-later': 'down'
      })[s] as 'up' | 'down';

    const handleDragOverInternal = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDropTarget(true);
        if (columnRef.current) {
          const rect = columnRef.current.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const cardHeight = 200;
          const position = Math.floor(y / cardHeight);
          setDropIndicatorPosition(
            Math.max(0, Math.min(position, deals.length)),
          );
        }
        onDragOver(e, stage);
      },
      [onDragOver, stage, deals.length],
    );

    const handleDragLeaveInternal = useCallback(
      (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDropTarget(false);
          setDropIndicatorPosition(null);
        }
        onDragLeave(e);
      },
      [onDragLeave],
    );

    const handleDropInternal = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDropTarget(false);
        setDropIndicatorPosition(null);
        onDrop(e, stage);
      },
      [onDrop, stage],
    );

    const progressionPercentage = getStageProgressionPercentage(stage);

    return (
      <div
        ref={columnRef}
        className={cn(
          'flex min-h-[500px] flex-col gap-4 rounded-xl p-3 transition-all duration-300 ease-out',
          'border border-white/10 backdrop-blur-sm',
          isDropTarget
            ? 'from-designer-violet/20 to-designer-violet/10 border-designer-violet/50 scale-[1.02] bg-gradient-to-b shadow-[0_0_30px_rgba(139,92,246,0.3)]'
            : 'bg-black/20 hover:bg-black/30',
        )}
        onDragOver={handleDragOverInternal}
        onDragLeave={handleDragLeaveInternal}
        onDrop={handleDropInternal}
      >
        <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/90 px-2 py-3 backdrop-blur-md">
          <div className="flex flex-col">
            <h3
              className={cn(
                'text-sm font-semibold xl:text-base',
                getStageColor(stage),
              )}
            >
              {getStageDisplayName(stage)}
            </h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-white/50">
                {progressionPercentage}% progress
              </span>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/70 backdrop-blur-sm">
            {deals.length}
          </span>
        </div>
        {isDropTarget && dragState.draggedDeal && (
          <div className="relative h-20">
            {' '}
            {/* Placeholder for drop indicator content */}
            <div className="from-designer-violet/30 via-designer-violet/20 to-designer-violet/30 border-designer-violet/50 absolute inset-0 animate-pulse rounded-lg border-2 border-dashed bg-gradient-to-r">
              <div className="flex h-full items-center justify-center">
                <div className="bg-designer-violet/90 rounded-lg px-4 py-2 font-medium text-white shadow-lg backdrop-blur-sm">
                  <span className="text-sm">
                    Drop {dragState.draggedDeal.companyName} here
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="relative flex-1 space-y-3">
          {deals.map((deal, index) => (
            <div key={deal.id} className="relative">
              {isDropTarget && dropIndicatorPosition === index && (
                <div className="via-designer-violet absolute -top-1.5 right-0 left-0 z-10 h-1 rounded-full bg-gradient-to-r from-transparent to-transparent shadow-lg" />
              )}
              <DealCard
                deal={deal}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={onDealClick}
                onDelete={onDeleteDeal}
                dragState={dragState}
                style={{
                  transform:
                    dragState.draggedDeal?.id === deal.id
                      ? 'scale(0.95) rotate(1deg)'
                      : isDropTarget
                        ? 'translateY(2px)'
                        : 'translateY(0)',
                }}
              />
            </div>
          ))}
          {isDropTarget && dropIndicatorPosition === deals.length && (
            <div className="via-designer-violet h-1 rounded-full bg-gradient-to-r from-transparent to-transparent shadow-lg" />
          )}
        </div>
      </div>
    );
  },
);
StageColumn.displayName = 'StageColumn';

const DragGhost = ({ dragState }: { dragState: DragState }) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging && ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX - dragState.dragOffset.x}px`;
        ghostRef.current.style.top = `${e.clientY - dragState.dragOffset.y}px`;
      }
    };
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragState]);

  if (!dragState.isDragging || !dragState.draggedDeal) return null;

  return (
    <div
      ref={ghostRef}
      className="pointer-events-none fixed z-[9999] transition-none"
      style={{
        left: dragState.currentPosition.x,
        top: dragState.currentPosition.y,
        transform: 'rotate(3deg) scale(1.05)',
        width: '280px',
      }}
    >
      <Card className="border-designer-violet/50 border-2 bg-black/90 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-white">
            {dragState.draggedDeal.companyName}
          </CardTitle>
          <CardDescription className="text-xs text-white/70">
            {dragState.draggedDeal.industry}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xs text-white/70">
            <span className="font-medium text-green-400">
              {dragState.draggedDeal.value}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function DealFlowClient({
  accountId,
  userId,
}: {
  accountId: string;
  userId: string;
}) {
  const router = useRouter();
  const params = useParams();
  const account = params.account as string;

  const searchParams = useSearchParams();
  const [hasEmailConnected, setHasEmailConnected] = useState<boolean>(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState<boolean>(true);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isHubSpotModalOpen, setIsHubSpotModalOpen] = useState(false);
  const [hasProcessedHubspotQueryParam, setHasProcessedHubspotQueryParam] =
    useState(false); // New state
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>('all');
  const [viewMode, setViewMode] = useState<'traditional' | 'momentum'>(
    'traditional',
  );
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedDeal: null,
    dragOffset: { x: 0, y: 0 },
    dragStartPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    ghostElement: null,
  });

  const [deals, setDeals] = useState<Deal[]>([]);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDealDetailOpen, setIsDealDetailOpen] = useState(false);
  const [isEditStagesModalOpen, setIsEditStagesModalOpen] = useState(false);
  const [customStageNames, setCustomStageNames] = useState<
    Record<string, string>
  >({});

  // Load custom stage names from localStorage on mount
  useEffect(() => {
    const savedStageNames = localStorage.getItem(
      `custom-stage-names-${accountId}`,
    );
    if (savedStageNames) {
      try {
        setCustomStageNames(JSON.parse(savedStageNames));
      } catch (error) {
        console.error('Error loading custom stage names:', error);
      }
    }
  }, [accountId]);

  // Save custom stage names to localStorage
  const handleSaveStageNames = (stageNames: Record<string, string>) => {
    setCustomStageNames(stageNames);
    localStorage.setItem(
      `custom-stage-names-${accountId}`,
      JSON.stringify(stageNames),
    );
  };

  // Create stage display function with access to customStageNames
  const getStageDisplayNameWithCustom = useCallback(
    (stage: Deal['stage']) => {
      const defaultNames: Record<Deal['stage'], string> = {
        interested: 'Interested',
        contacted: 'Contacted',
        demo: 'Demo',
        proposal: 'Proposal',
        negotiation: 'Negotiation',
        won: 'Closed Won',
        lost: 'Closed Lost',
      };

      return customStageNames[stage] || defaultNames[stage] || stage;
    },
    [customStageNames],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        setDragState((prev) => ({
          ...prev,
          currentPosition: {
            x: e.clientX - prev.dragOffset.x,
            y: e.clientY - prev.dragOffset.y,
          },
        }));
      }
    };
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragState.isDragging]);

  // Show success message for auto-setup completion
  useEffect(() => {
    const autoSetupComplete = searchParams.get('auto_setup');
    const gmailConnected = searchParams.get('gmail_connected');

    if (autoSetupComplete === 'complete' && gmailConnected === 'true') {
      toast.success(
        '🎉 Gmail & Calendar connected successfully! Your account is now fully set up.',
      );

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auto_setup');
      newUrl.searchParams.delete('gmail_connected');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [searchParams]);

  useEffect(() => {
    const autoSetupComplete = searchParams.get('auto_setup');
    const microsoftConnected = searchParams.get('microsoft_connected');

    if (autoSetupComplete === 'complete' && microsoftConnected === 'true') {
      toast.success(
        '🎉 Microsoft Email & Calendar connected successfully! Your account is now fully set up.',
      );

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auto_setup');
      newUrl.searchParams.delete('microsoft_connected');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkProviderConnections = async () => {
      try {
        const response = await fetch(
          `/api/calendar/provider-status?accountId=${accountId}`,
        );
        if (response.ok) {
          const data = await response.json();
          // Set email connected if either Google or Microsoft is connected
          setHasEmailConnected(data.google || data.microsoft);
          console.log('📧 Email provider status:', {
            google: data.google,
            microsoft: data.microsoft,
            hasAnyEmailConnected: data.google || data.microsoft,
          });
        }
      } catch (error) {
        console.error('Error checking provider connections:', error);
        setHasEmailConnected(false);
      } finally {
        setEmailCheckLoading(false);
      }
    };

    checkProviderConnections();
  }, [accountId]);

  useEffect(() => {
    const showImportParam = searchParams.get('showHubspotImport');
    if (showImportParam === 'true' && !hasProcessedHubspotQueryParam) {
      setIsHubSpotModalOpen(true);
      setViewMode('traditional');
      setHasProcessedHubspotQueryParam(true); // Mark as processed for this instance of the param
    }
    // If the param is removed or not 'true', reset the flag
    // so it can be processed again if the user navigates back with the param.
    if (showImportParam !== 'true' && hasProcessedHubspotQueryParam) {
      setHasProcessedHubspotQueryParam(false);
    }
  }, [searchParams, hasProcessedHubspotQueryParam, setViewMode]);

  const handleCloseHubspotModal = useCallback(() => {
    setIsHubSpotModalOpen(false);
    // This will trigger the useEffect above.
    // The useEffect will see showHubspotImport is no longer 'true' (or absent)
    // and will reset hasProcessedHubspotQueryParam to false.
    router.replace('/dealflow', { scroll: false });
  }, [router]);

  const filteredDeals = useMemo(() => {
    let filtered = deals;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (deal) =>
          deal.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deal.contact.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply assignment filter
    filtered = filterDealsByAssignment(filtered, assignmentFilter, userId);

    return filtered;
  }, [deals, searchTerm, assignmentFilter, userId]);

  const parseValueAmount = (value: any): number => {
    if (typeof value === 'string') {
      return Number.parseInt(value.replace(/[^0-9]/g, '') || '0');
    } else if (typeof value === 'number') {
      return value;
    } else if (value && typeof value === 'object' && value.amount) {
      return value.amount;
    }
    return 0;
  };

  const dealsByStage = useMemo(() => {
    const s: Deal['stage'][] = [
      //   'interested',
      //   'qualified',
      //   'demo',
      //   'proposal',
      //   'closed-won',
      //   'closed-lost',
      //   'follow-up-later',

      'interested',
      'contacted', // Changed from 'qualified'
      'demo',
      'proposal',
      'negotiation', // New stage
      'won', // Changed from 'closed-won'
      'lost',
    ];
    return s.reduce(
      (acc, stage) => {
        acc[stage] = filteredDeals.filter((deal) => deal.stage === stage);
        return acc;
      },
      {} as Record<Deal['stage'], Deal[]>,
    );
  }, [filteredDeals]);

  const highMomentumDeals = useMemo(() => {
    return filteredDeals
      .filter(
        (deal) =>
          deal.momentum > 60 &&
          //   deal.stage !== 'closed-won' &&
          //   deal.stage !== 'closed-lost',
          deal.stage !== 'won' && // Changed from 'closed-won'
          deal.stage !== 'lost',
      )
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 5);
  }, [filteredDeals]);

  const handleDragStart = useCallback((e: React.DragEvent, deal: Deal) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragState({
      isDragging: true,
      draggedDeal: deal,
      dragOffset: { x: offsetX, y: offsetY },
      dragStartPosition: { x: e.clientX, y: e.clientY },
      currentPosition: { x: e.clientX - offsetX, y: e.clientY - offsetY },
      ghostElement: null,
    });
    document.body.style.cursor = 'grabbing';
    document.body.classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedDeal: null,
      dragOffset: { x: 0, y: 0 },
      dragStartPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      ghostElement: null,
    });
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, stage: Deal['stage']) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    [],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {}, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStage: Deal['stage']) => {
      e.preventDefault();
      if (!dragState.draggedDeal || dragState.draggedDeal.stage === newStage)
        return;

      //   const stageProbabilities = {
      //     interested: 15,
      //     qualified: 35,
      //     demo: 55,
      //     proposal: 75,
      //     'closed-won': 100,
      //     'closed-lost': 0,
      //     'follow-up-later': 20,
      //   };

      const stageProbabilities = {
        interested: 15,
        contacted: 35, // Changed from qualified: 35
        demo: 55,
        proposal: 75,
        negotiation: 85, // New stage
        won: 100, // Changed from 'closed-won': 100
        lost: 0, // Changed from 'closed-lost': 0
        // Removed 'follow-up-later': 20
      };

      try {
        // Update the deal in the database
        const response = await fetch(
          `/api/deals/${dragState.draggedDeal.id}?accountId=${accountId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stage: newStage,
              probability: stageProbabilities[newStage],
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update deal');
        }

        const updatedDeal = await response.json();

        // Update the local state
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dragState.draggedDeal!.id ? updatedDeal : d,
          ),
        );

        // Show success toast
        toast.success('Deal Moved', {
          description: `${
            dragState.draggedDeal.companyName
          } moved to ${getStageDisplayNameWithCustom(newStage)}`,
        });
      } catch (error) {
        console.error('Error updating deal:', error);
        toast.error('Error Moving Deal', {
          description:
            error instanceof Error
              ? error.message
              : 'There was an error moving the deal. Please try again.',
        });
      }
    },
    [dragState.draggedDeal, toast],
  );

  const handleNewDealCreated = useCallback(
    async (dealData: any) => {
      try {
        const response = await fetch(`/api/deals?accountId=${accountId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dealData),
        });

        if (!response.ok) {
          throw new Error('Failed to create deal');
        }

        const result = await response.json();
        const newDeal = result.deal;

        // Update the local state with the new deal
        setDeals((prev) => [newDeal, ...prev]);

        // Also refresh the full deals list to ensure consistency
        setTimeout(() => {
          window.location.reload();
        }, 100);

        // Show success toast
        toast.success('Deal Created Successfully', {
          description: `New deal for ${dealData.companyName} has been added to your pipeline.`,
        });
      } catch (error) {
        console.error('Error creating deal:', error);
        toast.error('Error Creating Deal', {
          description:
            'There was an error creating the deal. Please try again.',
        });
      }
    },
    [toast],
  );

  const handleDeleteDeal = useCallback(
    async (deal: Deal) => {
      try {
        const response = await fetch(
          `/api/deals/${deal.id}?accountId=${accountId}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          throw new Error('Failed to delete deal');
        }

        // Remove the deal from local state
        setDeals((prev) => prev.filter((d) => d.id !== deal.id));

        // Show success toast
        toast.success('Deal Deleted', {
          description: `${deal.companyName} has been deleted from your pipeline.`,
        });
      } catch (error) {
        console.error('Error deleting deal:', error);
        toast.error('Error Deleting Deal', {
          description:
            'There was an error deleting the deal. Please try again.',
        });
      }
    },
    [toast],
  );

  const handleDealClick = useCallback(
    (deal: Deal) => {
      if (!dragState.isDragging) {
        setSelectedDeal(deal);
        setIsDealDetailOpen(true);
      }
    },
    [dragState.isDragging],
  );

  const handleImportMockDeals = useCallback(() => {
    setTimeout(() => {
      setDeals(mockDeals);
      toast('Deals Imported!', {
        description: '10 mock deals have been added to your pipeline.',
      });
    }, 100);
    // The modal's onClose prop (handleCloseHubspotModal) will handle closing and URL update.
  }, [toast]);

  //   const stages: Deal['stage'][] = [
  //     'interested',
  //     'qualified',
  //     'demo',
  //     'proposal',
  //     'closed-won',
  //     'closed-lost',
  //     'follow-up-later',
  //   ];

  const stages: Deal['stage'][] = [
    'interested',
    'contacted', // Changed from 'qualified'
    'demo',
    'proposal',
    'negotiation', // New stage
    'won', // Changed from 'closed-won'
    'lost', // Changed from 'closed-lost'
    // Removed 'follow-up-later'
  ];

  const dailyFocusPathElement = (
    <DailyFocusPath
      deals={highMomentumDeals}
      onDealClick={handleDealClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );
  const activeOpportunitiesStreamElement = (
    <MomentumStream
      title="Active Opportunities"
      deals={filteredDeals.filter(
        (d) =>
          //   d.stage !== 'closed-won' &&
          //   d.stage !== 'closed-lost' &&
          //   d.stage !== 'follow-up-later',

          d.stage !== 'won' && // Changed from 'closed-won'
          d.stage !== 'lost',
      )}
      onDealClick={handleDealClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
  const highValueStreamElement = (
    <MomentumStream
      title="High Value Deals"
      deals={filteredDeals
        .filter((d) => parseValueAmount(d.value) > 50000)
        .sort((a, b) => parseValueAmount(b.value) - parseValueAmount(a.value))}
      onDealClick={handleDealClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
  const stalledDealsStreamElement = (
    <MomentumStream
      title="Needs Attention"
      deals={filteredDeals.filter(
        (d) => d.momentum < 0 || (d.blockers && d.blockers.length > 0),
      )}
      onDealClick={handleDealClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      variant="warning"
    />
  );

  const fetchDeals = async () => {
    try {
      console.log('🔄 Fetching deals from API...');
      const response = await fetch(`/api/deals?accountId=${accountId}`);

      if (!response.ok) {
        console.error(
          '❌ API response not ok:',
          response.status,
          response.statusText,
        );
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log('✅ Received deals from API:', data.length, 'deals');

      // Debug: Check for deals with missing value fields
      const dealsWithoutValue = data.filter((deal: any) => !deal.value);
      if (dealsWithoutValue.length > 0) {
        console.warn(
          '⚠️ Found deals without value field:',
          dealsWithoutValue.map((d: any) => ({
            id: d.id,
            companyName: d.companyName,
          })),
        );
      }

      setDeals(data);
      console.log('✅ Deals state updated');
    } catch (error) {
      console.error('❌ Failed to fetch deals:', error);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [accountId]);

  // Set up real-time subscription for deals
  useDealsStream({
    accountId,
    enabled: true,
    onDealsChange: (event, deal) => {
      console.log(`📡 Real-time ${event} event for deal:`, deal.companyName);

      if (event === 'INSERT') {
        // Refetch deals to get the latest data with correct formatting
        // This ensures consistency with the existing data structure
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/deals?accountId=${accountId}`);
            if (response.ok) {
              const data = await response.json();
              setDeals(data);

              toast.success('New Deal Added', {
                description: `${deal.companyName} has been added to your pipeline.`,
              });
            }
          } catch (error) {
            console.error('Error refetching deals:', error);
          }
        }, 100);
      } else if (event === 'UPDATE') {
        // Refetch deals for updates to ensure data consistency
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/deals?accountId=${accountId}`);
            if (response.ok) {
              const data = await response.json();
              setDeals(data);

              toast.success('Deal Updated', {
                description: `${deal.companyName} has been updated.`,
              });
            }
          } catch (error) {
            console.error('Error refetching deals:', error);
          }
        }, 100);
      } else if (event === 'DELETE') {
        // Remove deal from list immediately
        setDeals((prevDeals) => prevDeals.filter((d) => d.id !== deal.id));

        toast.success('Deal Removed', {
          description: `${deal.companyName} has been removed from your pipeline.`,
        });
      }
    },
  });

  // Set up real-time subscription for transcripts
  useTranscriptsStream({
    accountId,
    enabled: true,
    onTranscriptChange: (event, transcript) => {
      console.log(`📡 Real-time transcript ${event} event:`, transcript);

      if (event === 'INSERT') {
        toast.success('New Transcript Available', {
          description: 'Automatic AI analysis is being processed...',
        });

        // Refresh deals to show updated analysis
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/deals?accountId=${accountId}`);
            if (response.ok) {
              const data = await response.json();
              setDeals(data);
            }
          } catch (error) {
            console.error('Error refreshing deals after transcript:', error);
          }
        }, 2000); // Wait 2 seconds for AI analysis to complete
      }
    },
  });

  // Set up enhanced auto-sync for manual transcript checking (disabled automatic polling)
  const {
    status: autoSyncStatus,
    startIntensivePolling,
    triggerManualSync: triggerTranscriptSync,
  } = useEnhancedAutoSync({
    accountId,
    enabled: false, // Disabled automatic polling
    onSyncSuccess: (data) => {
      console.log('✅ Auto-sync success:', data);
      if (data.hasNewTranscripts) {
        toast.success('New Transcripts Found', {
          description: `Found ${data.uniqueMeetingsCount} meetings with new transcripts`,
        });

        // Refresh deals to show updated data
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/deals?accountId=${accountId}`);
            if (response.ok) {
              const data = await response.json();
              setDeals(data);
            }
          } catch (error) {
            console.error('Error refreshing deals after auto-sync:', error);
          }
        }, 1000);
      }
    },
    onSyncError: (error) => {
      console.error('❌ Auto-sync error:', error);
    },
  });

  // Set up manual email syncing (disabled automatic polling)
  const { status: emailSyncStatus, triggerManualSync: triggerEmailSync } =
    useAutoEmailSync({
      accountId,
      enabled: false, // Disabled automatic polling
      syncInterval: 5 * 60 * 1000, // Keep interval for when manually enabled
      onSyncSuccess: (data) => {
        console.log('✅ Manual email sync success:', data);
        if (data.newEmailsFound > 0) {
          toast.success('New Emails Found', {
            description: `Found ${data.newEmailsFound} new emails`,
          });
        }
      },
      onSyncError: (error) => {
        console.error('❌ Email sync error:', error);
        toast.error('Email sync failed', {
          description: error,
        });
      },
    });

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:dealflow'} />}
        description={<AppBreadcrumbs />}
      />

      {/* Auto Gmail Connection Dialog */}
      {!emailCheckLoading && (
        <AutoEmailConnection
          accountId={accountId}
          hasEmailConnected={hasEmailConnected}
        />
      )}

      {/* Timezone Welcome Modal for First-Time Users */}
      <TimezoneWelcomeModal userId={userId} />

      {/* Auto-Sync Status Indicator */}
      {(autoSyncStatus && autoSyncStatus !== 'idle') ||
      (emailSyncStatus && emailSyncStatus !== 'idle') ? (
        <div className="fixed right-4 bottom-4 z-50">
          <div className="bg-background border-border flex min-w-[200px] items-center gap-2 rounded-lg border p-3 shadow-lg">
            <div className="flex items-center gap-2">
              {autoSyncStatus === 'syncing' || emailSyncStatus === 'syncing' ? (
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              ) : (
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
              <span className="text-sm font-medium">
                {emailSyncStatus === 'syncing'
                  ? 'Syncing emails...'
                  : autoSyncStatus === 'syncing'
                    ? 'Checking for transcripts...'
                    : 'Auto-sync active'}
              </span>
            </div>
            <Waves className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
      ) : null}

      <div className="min-h-screen">
        {/* <style jsx global>{`
        .dragging * {
          cursor: grabbing !important;
        }
        .dragging {
          user-select: none;
        }
        * {
          will-change: transform;
        }
        @media (pointer: coarse) {
          .card-touch-target {
            min-height: 44px;
          }
        }
      `}</style> */}
        <DragGhost dragState={dragState} />
        <div className="border-b border-white/10 bg-black/80 py-4 sm:py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h1 className="font-monument text-2xl sm:text-3xl">DealFlow</h1>
                <p className="mt-1 text-sm text-white/70 sm:text-base">
                  {viewMode === 'momentum'
                    ? 'Visualize deal momentum and opportunities'
                    : 'Manage and track your sales pipeline'}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="flex gap-3">
                  <div className="flex rounded-lg border border-white/10 bg-black/40 p-1">
                    <Button
                      variant={viewMode === 'traditional' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('traditional')}
                      className={cn(
                        'gap-2 text-xs transition-all sm:text-sm',
                        viewMode === 'traditional'
                          ? 'bg-designer-violet'
                          : 'hover:bg-white/5',
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" /> Traditional
                    </Button>
                    <Button
                      variant={viewMode === 'momentum' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('momentum')}
                      className={cn(
                        'gap-2 text-xs transition-all sm:text-sm',
                        viewMode === 'momentum'
                          ? 'bg-designer-violet'
                          : 'hover:bg-white/5',
                      )}
                    >
                      <Waves className="h-4 w-4" /> Momentum
                    </Button>
                  </div>
                  <DealAssignmentFilter
                    accountSlug={account}
                    currentUserId={userId}
                    onFilterChange={setAssignmentFilter}
                    className="text-xs sm:text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs sm:text-sm"
                    onClick={() => setIsEditStagesModalOpen(true)}
                  >
                    <Edit className="h-4 w-4" /> Edit Stages
                  </Button>
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-white/50" />
                    <input
                      type="text"
                      placeholder="Search deals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="focus:ring-designer-violet/50 w-full rounded-md border border-white/10 bg-black/40 py-2 pr-4 pl-10 text-xs focus:ring-2 focus:outline-none sm:w-[200px] sm:text-sm lg:w-[250px]"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-designer-violet hover:bg-designer-violet/90 gap-2 text-xs transition-all duration-200 hover:scale-105 active:scale-95 sm:text-sm"
                  onClick={() => setIsNewDealModalOpen(true)}
                >
                  <Plus className="h-4 w-4" /> New Deal
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
          {viewMode === 'momentum' ? (
            <div className="space-y-8">
              {dailyFocusPathElement}
              <MomentumInsights
                deals={filteredDeals}
                accountId={accountId}
                onRefresh={fetchDeals}
              />
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Momentum Streams</h2>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                      <span>Accelerating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                      <span>Steady</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400"></div>
                      <span>Decelerating</span>
                    </div>
                  </div>
                </div>
                {activeOpportunitiesStreamElement}
                {highValueStreamElement}
                {stalledDealsStreamElement}
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="block lg:hidden">
                <div className="space-y-6">
                  {stages.map((stage) => {
                    const stageDeals = dealsByStage[stage] || [];
                    return (
                      <StageColumn
                        key={stage}
                        stage={stage}
                        deals={stageDeals}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        dragState={dragState}
                        onDealClick={handleDealClick}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDeleteDeal={handleDeleteDeal}
                        getStageDisplayName={getStageDisplayNameWithCustom}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <div className="min-w-[1400px] xl:min-w-0">
                    <div className="grid grid-cols-7 gap-4">
                      {stages.map((stage) => {
                        const stageDeals = dealsByStage[stage] || [];
                        return (
                          <StageColumn
                            key={stage}
                            stage={stage}
                            deals={stageDeals}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            dragState={dragState}
                            onDealClick={handleDealClick}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDeleteDeal={handleDeleteDeal}
                            getStageDisplayName={getStageDisplayNameWithCustom}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <NewDealModal
          isOpen={isNewDealModalOpen}
          onClose={() => setIsNewDealModalOpen(false)}
          onDealCreated={handleNewDealCreated}
        />
        <HubSpotImportModal
          isOpen={isHubSpotModalOpen}
          onClose={handleCloseHubspotModal}
          onImportDeals={handleImportMockDeals}
        />
        <EnhancedDealDetail
          deal={selectedDeal}
          accountId={accountId}
          isOpen={isDealDetailOpen}
          onClose={() => {
            setIsDealDetailOpen(false);
            setSelectedDeal(null);
          }}
          onUpdate={(updatedDeal) => {
            setDeals((prev) =>
              prev.map((d) =>
                d.id === updatedDeal.id ? { ...d, ...updatedDeal } : d,
              ),
            );
          }}
          onDelete={(dealId) => {
            setDeals((prev) => prev.filter((d) => d.id !== dealId));
          }}
        />

        {/* Edit Stages Modal */}
        <EditStagesModal
          isOpen={isEditStagesModalOpen}
          onClose={() => setIsEditStagesModalOpen(false)}
          onSave={handleSaveStageNames}
          currentStageNames={customStageNames}
        />
      </div>
    </>
  );
}
