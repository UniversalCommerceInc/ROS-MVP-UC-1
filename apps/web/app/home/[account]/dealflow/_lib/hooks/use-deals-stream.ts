import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';

import { transformDealFromDbClient, type TransformedDeal } from '../utils/deal-transformer';

// Use the client-safe transformed deal type
type ComponentDeal = TransformedDeal;

export function useDealsStream(params: {
  onDealsChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', deal: ComponentDeal) => void;
  accountId: string;
  enabled: boolean;
}) {
  const client = useSupabase();

  const { data: subscription } = useQuery({
    enabled: params.enabled,
    queryKey: ['realtime-deals', params.accountId],
    queryFn: () => {
      console.log('🔌 Setting up real-time subscription for deals', params.accountId);
      
      const channel = client.channel('deals-channel');

      return channel
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            filter: `account_id=eq.${params.accountId}`,
            table: 'deals',
          },
          (payload) => {
            console.log('📡 Real-time event received:', {
              eventType: payload.eventType,
              table: payload.table,
              schema: payload.schema,
              new: payload.new,
              old: payload.old
            });
            
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            
            // For DELETE events, we need to use the old record
            const dealData = eventType === 'DELETE' ? payload.old : payload.new;
            
            if (dealData) {
              // Use the client-safe transformation logic
              const transformedDeal = transformDealFromDbClient(dealData);
              console.log('📡 Transformed deal:', transformedDeal);
              params.onDealsChange(eventType, transformedDeal);
            }
          },
        )
        .on('subscribe', (status) => {
          console.log('📡 Subscription status:', status);
        })
        .on('error', (error) => {
          console.error('📡 Subscription error:', error);
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