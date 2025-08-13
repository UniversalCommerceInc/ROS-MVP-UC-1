'use client';

import React from 'react';
import { memo } from 'react';

import {
  ActivityIcon,
  ChevronRight,
  MinusCircle,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';
import { cleanCompanyName } from '../_lib/utils';

// Re-using the Deal interface
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
  // ... other fields
  momentum: number;
  momentumTrend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  momentumMarkers: MomentumMarker[];
  lastMomentumChange?: string;
  dealTitle?: string;
  nextAction?: string;
}

const FocusDealCard = memo(
  ({ deal, onClick }: { deal: Deal; onClick: (deal: Deal) => void }) => {
    const getMomentumColor = () => {
      if (deal.momentum > 75)
        return 'border-green-400 bg-green-900/30 hover:bg-green-800/40';
      if (deal.momentum > 50)
        return 'border-green-500 bg-green-900/20 hover:bg-green-800/30';
      return 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/70';
    };

    const renderMomentumIcon = () => {
      switch (deal.momentumTrend) {
        case 'accelerating':
          return <TrendingUp className="h-4 w-4 text-green-300" />;
        case 'decelerating':
          return <TrendingDown className="h-4 w-4 text-red-300" />;
        case 'stalled':
          return <MinusCircle className="h-4 w-4 text-yellow-300" />;
        default:
          return <ActivityIcon className="h-4 w-4 text-gray-300" />;
      }
    };

    return (
      <Card
        className={cn(
          'min-w-[260px] cursor-pointer snap-start border-l-4 shadow-lg transition-all duration-200',
          getMomentumColor(),
        )}
        onClick={() => onClick(deal)}
      >
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="truncate text-sm font-semibold text-white">
              {cleanCompanyName(deal.companyName)}
            </CardTitle>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold',
                deal.momentum > 75
                  ? 'bg-green-400/20 text-green-300'
                  : deal.momentum > 50
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-300',
              )}
            >
              {deal.momentum} M
            </span>
          </div>
          <p className="truncate text-xs text-gray-400">
            {deal.dealTitle || deal.industry}
          </p>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span>{deal.value}</span>
            <div className="flex items-center gap-1">
              {renderMomentumIcon()}
              <span className="capitalize">{deal.momentumTrend}</span>
            </div>
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
FocusDealCard.displayName = 'FocusDealCard';

interface DailyFocusPathProps {
  deals: Deal[]; // Typically top 3-5 high momentum deals
  onDealClick: (deal: Deal) => void;
  onDragStart?: (e: React.DragEvent, deal: Deal) => void; // Keep for consistency if needed
  onDragEnd?: (e: React.DragEvent) => void; // Keep for consistency
}

const DailyFocusPath: React.FC<DailyFocusPathProps> = ({
  deals,
  onDealClick,
}) => {
  if (!deals || deals.length === 0) {
    return (
      <Card className="from-designer-violet/20 border-designer-violet/50 bg-gradient-to-br to-black shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold text-white">
            <Zap className="mr-2 h-6 w-6 text-yellow-400" />
            Daily Focus Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            No high-momentum deals identified for today's focus. Time to
            prospect or nurture existing leads!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="from-designer-violet/20 border-designer-violet/50 rounded-xl border bg-gradient-to-br to-black p-4 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center text-xl font-semibold text-white">
          <Zap className="mr-2 h-6 w-6 animate-pulse text-yellow-400" />
          Daily Focus Path
        </h2>
        <Button
          variant="link"
          className="text-designer-violet-hover hover:text-designer-violet text-xs"
        >
          Customize <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Your top {deals.length} deals with the highest momentum. Focus here for
        maximum impact today.
      </p>
      <div className="scrollbar-thin scrollbar-thumb-designer-violet/50 scrollbar-track-transparent flex snap-x snap-mandatory space-x-4 overflow-x-auto pb-2">
        {deals.map((deal, index) => (
          <React.Fragment key={deal.id}>
            <FocusDealCard deal={deal} onClick={onDealClick} />
            {index < deals.length - 1 && (
              <div className="flex min-w-[30px] items-center justify-center">
                <ChevronRight className="text-designer-violet/70 h-6 w-6" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default memo(DailyFocusPath);
