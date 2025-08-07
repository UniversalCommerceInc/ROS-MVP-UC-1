'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { toast } from '@kit/ui/sonner';

interface DealUpdatesStreamParams {
  onDealUpdate: (deal: any) => void;
  accountId: string;
  dealId?: string;
  enabled: boolean;
}

export function useDealUpdatesStream(params: DealUpdatesStreamParams) {
  const client = useSupabase();

  const { data: subscription } = useQuery({
    enabled: params.enabled,
    queryKey: ['realtime-deal-updates', params.accountId, params.dealId],
    queryFn: () => {
      console.log('🔌 Setting up real-time subscription for deal updates', {
        accountId: params.accountId,
        dealId: params.dealId,
      });
      
      const channel = client.channel('deal-updates-channel');

      // Build filter based on whether we're filtering by specific deal
      const filter = params.dealId 
        ? `account_id=eq.${params.accountId}.and.id=eq.${params.dealId}`
        : `account_id=eq.${params.accountId}`;

      return channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', // Only listen to UPDATE events for deals
            schema: 'public',
            table: 'deals',
            filter,
          },
          async (payload: any) => {
            console.log('📡 Real-time deal update received:', {
              eventType: payload.eventType,
              dealId: payload.new?.id,
              companyName: payload.new?.company_name,
              lastAnalysisDate: payload.new?.last_analysis_date,
              momentum: payload.new?.momentum,
            });
            
            const updatedDeal = payload.new;
            
            if (updatedDeal) {
              // Check if this update was from transcript analysis
              const isFromTranscriptAnalysis = 
                payload.new?.last_analysis_date && 
                payload.old?.last_analysis_date !== payload.new?.last_analysis_date;

              const isMomentumUpdate = 
                payload.new?.momentum !== payload.old?.momentum ||
                payload.new?.momentum_trend !== payload.old?.momentum_trend;

              if (isFromTranscriptAnalysis) {
                console.log('🤖 Deal updated from transcript analysis, showing notification');
                toast.success('Meeting Analysis Complete', {
                  description: `${updatedDeal.company_name}: Deal insights updated from latest transcript analysis.`,
                });
              } else if (isMomentumUpdate) {
                console.log('🎯 Deal momentum updated');
                toast.success('Momentum Updated', {
                  description: `${updatedDeal.company_name}: Momentum score and trend have been updated.`,
                });
              }

              // Notify the parent component about the deal update
              params.onDealUpdate(updatedDeal);
            }
          },
        )
        .on('subscribe', (status: any) => {
          console.log('📡 Deal updates subscription status:', status);
        })
        .on('error', (error: any) => {
          console.error('📡 Deal updates subscription error:', error);
        })
        .subscribe();
    },
  });

  useEffect(() => {
    return () => {
      void subscription?.unsubscribe();
    };
  }, [subscription]);

  return { subscription };
} 