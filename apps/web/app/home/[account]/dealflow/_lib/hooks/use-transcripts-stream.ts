'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface TranscriptStreamParams {
  onTranscriptChange: (event: 'INSERT' | 'UPDATE' | 'DELETE', transcript: any) => void;
  accountId: string;
  dealId?: string;
  enabled: boolean;
}

export function useTranscriptsStream(params: TranscriptStreamParams) {
  const client = useSupabase();

  const { data: subscription } = useQuery({
    enabled: params.enabled,
    queryKey: ['realtime-transcripts', params.accountId, params.dealId],
    queryFn: () => {
      console.log('🔌 Setting up real-time subscription for transcripts', {
        accountId: params.accountId,
        dealId: params.dealId,
      });
      
      const channel = client.channel('transcripts-channel');

      // Build filter based on whether we're filtering by deal
      const filter = params.dealId 
        ? `account_id=eq.${params.accountId}.and.deal_id=eq.${params.dealId}`
        : `account_id=eq.${params.accountId}`;

      return channel
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'transcripts',
            filter,
          },
          async (payload: any) => {
            console.log('📡 Real-time transcript event received:', {
              eventType: payload.eventType,
              table: payload.table,
              meetingId: payload.new?.meeting_id || payload.old?.meeting_id,
              dealId: payload.new?.deal_id || payload.old?.deal_id,
            });
            
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const transcriptData = eventType === 'DELETE' ? payload.old : payload.new;
            
            if (transcriptData) {
              params.onTranscriptChange(eventType, transcriptData);
              
              // If this is a new transcript, automatically trigger AI analysis
              if (eventType === 'INSERT' && transcriptData?.meeting_id) {
                console.log('🤖 New transcript detected, triggering automatic AI analysis...');
                await triggerAutomaticAnalysis(transcriptData.meeting_id, transcriptData.deal_id || null, params.accountId);
              }
            }
          },
        )
        .on('subscribe', (status: any) => {
          console.log('📡 Transcript subscription status:', status);
        })
        .on('error', (error: any) => {
          console.error('📡 Transcript subscription error:', error);
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

// Helper function to trigger automatic AI analysis when new transcripts arrive
async function triggerAutomaticAnalysis(meetingId: string, dealId: string | null, accountId: string) {
  try {
    console.log('🤖 Triggering automatic comprehensive analysis for meeting:', meetingId);
    
    const analysisResponse = await fetch(`/api/analyze-comprehensive?accountId=${accountId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: meetingId,
      }),
    });

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      console.log('✅ Automatic AI analysis completed:', {
        meetingId,
        dealId,
        painPoints: analysisResult.analysis?.painPoints?.length || 0,
        nextSteps: analysisResult.analysis?.nextSteps?.length || 0,
        success: analysisResult.success,
      });

      // If analysis was successful and we have a deal ID, trigger momentum scoring
      if (analysisResult.success && dealId) {
        console.log('🎯 Triggering momentum scoring after transcript analysis...');
        try {
          const momentumResponse = await fetch(`/api/momentum-scoring`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dealId: dealId,
              accountId: accountId,
            }),
          });

          if (momentumResponse.ok) {
            const momentumResult = await momentumResponse.json();
            console.log('✅ Momentum scoring completed after transcript analysis:', {
              dealId,
              momentum: momentumResult.momentum,
              trend: momentumResult.trend,
            });
          } else {
            console.error('❌ Momentum scoring failed after transcript analysis');
          }
        } catch (momentumError) {
          console.error('❌ Error triggering momentum scoring:', momentumError);
        }
      }
    } else {
      const errorData = await analysisResponse.json();
      console.error('❌ Automatic analysis failed:', errorData);
    }
  } catch (error) {
    console.error('❌ Error triggering automatic AI analysis:', error);
  }
} 