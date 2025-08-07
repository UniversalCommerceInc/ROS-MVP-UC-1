'use client';

import type React from 'react';
import { memo } from 'react';

import {
  ActivityIcon,
  ChevronRight,
  MinusCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

// Assuming DealCard is imported from the main page or a shared location
// For this example, we'll define a minimal DealCard if not provided
// Ideally, this would be the same DealCard component used in app/dealflow/page.tsx

// Re-using the Deal interface from the main dealflow page
interface MomentumMarker {
  type: 'stakeholder_intro' | 'buying_question' | 'prospect_next_step';
  timestamp: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface Deal {
  id: string;
  companyName: string;
  industry: string;
  value: string;
  contact: string;
  email: string;
  stage: // | 'interested'
  // | 'qualified'
  // | 'demo'
  // | 'proposal'
  // | 'closed-won'
  // | 'closed-lost'
  // | 'follow-up-later';
  | 'interested'
    | 'contacted' // Changed from 'qualified'
    | 'demo'
    | 'proposal'
    | 'negotiation' // New stage
    | 'won' // Changed from 'closed-won'
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
  last_meeting_summary?: string;
  momentum: number;
  momentumTrend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  momentumMarkers: MomentumMarker[];
  lastMomentumChange?: string;
  blockers?: string[];
  opportunities?: string[];
}

// Minimal DealCard for Momentum Stream (adapt from app/dealflow/page.tsx if needed)
const MomentumDealCard = memo(
  ({ deal, onClick }: { deal: Deal; onClick: (deal: Deal) => void }) => {
    const getMomentumColor = () => {
      if (deal.momentum > 50) return 'border-green-500';
      if (deal.momentum < 0) return 'border-red-500';
      if (deal.momentumTrend === 'decelerating') return 'border-red-500';
      if (deal.momentumTrend === 'stalled') return 'border-yellow-500';
      return 'border-gray-600';
    };

    const renderMomentumIcon = () => {
      switch (deal.momentumTrend) {
        case 'accelerating':
          return <TrendingUp className="h-4 w-4 text-green-400" />;
        case 'decelerating':
          return <TrendingDown className="h-4 w-4 text-red-400" />;
        case 'stalled':
          return <MinusCircle className="h-4 w-4 text-yellow-400" />;
        default:
          return <ActivityIcon className="h-4 w-4 text-gray-400" />;
      }
    };

    return (
      <Card
        className={cn(
          'min-w-[280px] cursor-pointer snap-start border-l-4 bg-gray-800/50 transition-all duration-200 hover:bg-gray-700/70',
          getMomentumColor(),
        )}
        onClick={() => onClick(deal)}
      >
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="truncate text-sm font-medium text-white">
              {deal.companyName}
            </CardTitle>
            <span
              className={cn(
                'text-xs font-bold',
                deal.momentum > 50
                  ? 'text-green-400'
                  : deal.momentum < 0
                    ? 'text-red-400'
                    : 'text-yellow-400',
              )}
            >
              {deal.momentum}
            </span>
          </div>
          <p className="truncate text-xs text-gray-400">
            {deal.dealTitle || deal.industry}
          </p>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>{deal.value}</span>
            <span>Stage: {deal.stage}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {renderMomentumIcon()}
            <span>{deal.momentumTrend}</span>
            {deal.lastMomentumChange && (
              <span className="ml-auto">Last: {deal.lastMomentumChange}</span>
            )}
          </div>
          {deal.nextAction && (
            <p className="text-designer-violet mt-1 truncate text-xs">
              Next: {deal.nextAction}
            </p>
          )}
        </CardContent>
      </Card>
    );
  },
);
MomentumDealCard.displayName = 'MomentumDealCard';

interface MomentumStreamProps {
  title: string;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onDragStart?: (e: React.DragEvent, deal: Deal) => void; // Optional for future drag support
  onDragEnd?: (e: React.DragEvent) => void; // Optional
  onDragOver?: (e: React.DragEvent, stage: any) => void; // Optional
  onDrop?: (e: React.DragEvent, stage: any) => void; // Optional
  variant?: 'default' | 'warning' | 'highlight';
}

const MomentumStream: React.FC<MomentumStreamProps> = ({
  title,
  deals,
  onDealClick,
  variant = 'default',
}) => {
  if (!deals || deals.length === 0) {
    return (
      <Card className="border-gray-700/50 bg-gray-800/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No deals in this stream currently.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant === 'warning'
          ? 'border-red-700/50 bg-red-900/20'
          : variant === 'highlight'
            ? 'bg-designer-violet/10 border-designer-violet/50'
            : 'border-gray-700/50 bg-gray-800/30',
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className={cn(
            'text-lg font-semibold',
            variant === 'warning' ? 'text-red-300' : 'text-white',
          )}
        >
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="hover:text-designer-violet text-xs text-gray-400"
        >
          View All <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      <div className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50 flex snap-x snap-mandatory space-x-4 overflow-x-auto pb-4">
        {deals.map((deal) => (
          <MomentumDealCard key={deal.id} deal={deal} onClick={onDealClick} />
        ))}
        {deals.length === 0 && (
          <p className="pl-2 text-sm text-gray-500">
            No deals to display in this stream.
          </p>
        )}
      </div>
    </div>
  );
};

export default memo(MomentumStream);
