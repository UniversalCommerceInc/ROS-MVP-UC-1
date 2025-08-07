'use client';

import type React from 'react';
import { memo, useMemo, useState, useTransition } from 'react';

import {
  AlertTriangle,
  BarChart2,
  CheckCircle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

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
  // ... other fields
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
  momentum: number;
  momentumTrend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  momentumMarkers: MomentumMarker[];
  blockers?: string[];
  opportunities?: string[];
  probability?: number;
}

interface MomentumInsightsProps {
  deals: Deal[];
  accountId: string;
  onRefresh?: () => void;
}

const InsightCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  description?: string;
}> = ({
  title,
  value,
  icon: Icon,
  trend,
  colorClass = 'text-white',
  description,
}) => (
  <Card className="min-w-[180px] flex-1 border-gray-700/50 bg-gray-800/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-sm font-medium text-gray-400">
        {title}
      </CardTitle>
      <Icon
        className={cn(
          'h-5 w-5',
          trend === 'up'
            ? 'text-green-400'
            : trend === 'down'
              ? 'text-red-400'
              : 'text-designer-violet',
        )}
      />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className={cn('text-2xl font-bold', colorClass)}>{value}</div>
      {description && (
        <p className="pt-1 text-xs text-gray-500">{description}</p>
      )}
    </CardContent>
  </Card>
);

const MomentumInsights: React.FC<MomentumInsightsProps> = ({ deals, accountId, onRefresh }) => {
  const [isPending, startTransition] = useTransition();

  const handleBulkScoring = async () => {
    startTransition(async () => {
      try {
        console.log('🎯 Starting bulk momentum scoring...');
        const response = await fetch(`/api/momentum-scoring?accountId=${accountId}`);
        
        if (!response.ok) {
          throw new Error('Failed to score deals');
        }
        
        const result = await response.json();
        console.log('✅ Bulk scoring completed:', result);
        
        toast.success(`Successfully scored ${result.results?.filter((r: any) => r.success).length || 0} deals!`);
        
        // Refresh the deals data
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('❌ Bulk scoring failed:', error);
        toast.error('Failed to score deals. Please try again.');
      }
    });
  };

  const insights = useMemo(() => {
    if (!deals || deals.length === 0) {
      return {
        totalDeals: 0,
        avgMomentum: 0,
        acceleratingCount: 0,
        deceleratingCount: 0,
        stalledCount: 0,
        totalOpportunities: 0,
        totalBlockers: 0,
        dealsWon: 0,
        dealsLost: 0,
      };
    }

    const activeDeals = deals.filter(
      (d) => d.stage !== 'won' && d.stage !== 'lost',
    );
    const totalMomentum = activeDeals.reduce(
      (sum, deal) => sum + deal.momentum,
      0,
    );

    return {
      totalDeals: activeDeals.length,
      avgMomentum:
        activeDeals.length > 0
          ? Math.round(totalMomentum / activeDeals.length)
          : 0,
      acceleratingCount: activeDeals.filter(
        (d) => d.momentumTrend === 'accelerating',
      ).length,
      deceleratingCount: activeDeals.filter(
        (d) => d.momentumTrend === 'decelerating',
      ).length,
      stalledCount: activeDeals.filter((d) => d.momentumTrend === 'stalled')
        .length,
      totalOpportunities: activeDeals.reduce(
        (sum, deal) => sum + (deal.opportunities?.length || 0),
        0,
      ),
      totalBlockers: activeDeals.reduce(
        (sum, deal) => sum + (deal.blockers?.length || 0),
        0,
      ),
      dealsWon: deals.filter((d) => d.stage === 'won').length,
      dealsLost: deals.filter((d) => d.stage === 'lost').length,
    };
  }, [deals]);

  const getAvgMomentumTrend = () => {
    if (insights.avgMomentum > 20) return 'up';
    if (insights.avgMomentum < -20) return 'down';
    return 'neutral';
  };

  const getAvgMomentumColor = () => {
    if (insights.avgMomentum > 50) return 'text-green-400';
    if (insights.avgMomentum < 0) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="rounded-xl border border-gray-700/70 bg-gray-900/30 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center text-xl font-semibold text-white">
          <BarChart2 className="text-designer-violet mr-2 h-6 w-6" />
          Momentum Overview
        </h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBulkScoring}
            disabled={isPending}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isPending && "animate-spin")} />
            {isPending ? 'Scoring...' : 'Score All'}
          </Button>
          <div className="text-xs text-white/60">
            Auto-updated with AI scoring
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <InsightCard
          title="Avg. Momentum"
          value={`${insights.avgMomentum}`}
          icon={BarChart2}
          trend={getAvgMomentumTrend()}
          colorClass={getAvgMomentumColor()}
          description={`Across ${insights.totalDeals} active deals`}
        />
        <InsightCard
          title="Accelerating"
          value={insights.acceleratingCount}
          icon={TrendingUp}
          colorClass="text-green-400"
          description="Deals gaining speed"
        />
        <InsightCard
          title="Decelerating"
          value={insights.deceleratingCount}
          icon={TrendingDown}
          colorClass="text-red-400"
          description="Deals losing speed"
        />
        <InsightCard
          title="Stalled"
          value={insights.stalledCount}
          icon={AlertTriangle}
          colorClass="text-yellow-400"
          description="Deals needing attention"
        />
        <InsightCard
          title="Opportunities"
          value={insights.totalOpportunities}
          icon={Lightbulb}
          colorClass="text-blue-400"
          description="Identified positive factors"
        />
        <InsightCard
          title="Blockers"
          value={insights.totalBlockers}
          icon={AlertTriangle}
          colorClass="text-orange-400"
          description="Identified risks/issues"
        />
        <InsightCard
          title="Deals Won"
          value={insights.dealsWon}
          icon={CheckCircle}
          colorClass="text-green-500"
          description="Total closed-won deals"
        />
        <InsightCard
          title="Deals Lost"
          value={insights.dealsLost}
          icon={XCircle}
          colorClass="text-red-500"
          description="Total closed-lost deals"
        />
      </div>
    </div>
  );
};

export default memo(MomentumInsights);
