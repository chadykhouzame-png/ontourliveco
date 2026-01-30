import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Maximum rounds of back-and-forth before requiring a decision
export const MAX_NEGOTIATION_ROUNDS = 5;

interface UseNegotiationLimitResult {
  roundCount: number;
  isLoading: boolean;
  hasReachedLimit: boolean;
  remainingRounds: number;
}

export function useNegotiationLimit(bookingRequestId: string | undefined): UseNegotiationLimitResult {
  const [roundCount, setRoundCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!bookingRequestId) {
      setIsLoading(false);
      return;
    }

    const fetchNegotiationCount = async () => {
      try {
        // Count only offer-related actions (not accept/decline which end negotiation)
        const { count, error } = await supabase
          .from('booking_negotiations')
          .select('*', { count: 'exact', head: true })
          .eq('booking_request_id', bookingRequestId)
          .in('action_type', ['initial_offer', 'counter_offer', 'update_offer']);

        if (error) throw error;
        setRoundCount(count || 0);
      } catch (error) {
        console.error('Error fetching negotiation count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNegotiationCount();
  }, [bookingRequestId]);

  const hasReachedLimit = roundCount >= MAX_NEGOTIATION_ROUNDS;
  const remainingRounds = Math.max(0, MAX_NEGOTIATION_ROUNDS - roundCount);

  return {
    roundCount,
    isLoading,
    hasReachedLimit,
    remainingRounds,
  };
}
