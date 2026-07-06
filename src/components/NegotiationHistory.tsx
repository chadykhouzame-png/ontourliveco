import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, ArrowRight, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { MAX_NEGOTIATION_ROUNDS } from '@/hooks/useNegotiationLimit';
interface NegotiationEvent {
  id: string;
  booking_request_id: string;
  actor_type: 'venue' | 'artist';
  action_type: 'initial_offer' | 'counter_offer' | 'accept' | 'decline' | 'update_offer';
  amount: number | null;
  message: string | null;
  created_at: string;
}

interface NegotiationHistoryProps {
  bookingRequestId: string;
  venueName: string;
  artistName: string;
  currentUserType: 'venue' | 'artist';
}

const ACTION_LABELS: Record<string, string> = {
  initial_offer: 'Initial Offer',
  counter_offer: 'Counter-Offer',
  accept: 'Accepted',
  decline: 'Declined',
  update_offer: 'Updated Offer',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  initial_offer: <DollarSign className="w-4 h-4" />,
  counter_offer: <ArrowRight className="w-4 h-4" />,
  accept: <CheckCircle className="w-4 h-4" />,
  decline: <XCircle className="w-4 h-4" />,
  update_offer: <DollarSign className="w-4 h-4" />,
};

export function NegotiationHistory({ 
  bookingRequestId, 
  venueName, 
  artistName,
  currentUserType 
}: NegotiationHistoryProps) {
  const [negotiations, setNegotiations] = useState<NegotiationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNegotiations();
  }, [bookingRequestId]);

  const fetchNegotiations = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_negotiations')
        .select('*')
        .eq('booking_request_id', bookingRequestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNegotiations((data || []) as NegotiationEvent[]);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (negotiations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No negotiation history yet
      </div>
    );
  }

  const getActorName = (actorType: string) => {
    return actorType === 'venue' ? venueName : artistName;
  };

  const getActorColor = (actorType: string) => {
    return actorType === 'venue' ? 'venue' : 'artist';
  };

  const isCurrentUser = (actorType: string) => {
    return actorType === currentUserType;
  };

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-3">
        {negotiations.map((event, index) => {
          const isMe = isCurrentUser(event.actor_type);
          const color = getActorColor(event.actor_type);
          
          return (
            <div 
              key={event.id}
              className={`relative flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Timeline connector */}
              {index < negotiations.length - 1 && (
                <div 
                  className="absolute top-12 w-0.5 h-full bg-border"
                  style={{ left: isMe ? 'auto' : '20px', right: isMe ? '20px' : 'auto' }}
                />
              )}
              
              <div 
                className={`relative max-w-[85%] p-3 rounded-xl border ${
                  isMe 
                    ? `bg-${color}/10 border-${color}/30` 
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full bg-${color}/20 flex items-center justify-center`}>
                    {ACTION_ICONS[event.action_type]}
                  </div>
                  <span className="font-medium text-sm">
                    {isMe ? 'You' : getActorName(event.actor_type)}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      event.action_type === 'accept' 
                        ? 'border-success/50 text-success' 
                        : event.action_type === 'decline'
                          ? 'border-danger/50 text-danger'
                          : `border-${color}/50 text-${color}`
                    }`}
                  >
                    {ACTION_LABELS[event.action_type]}
                  </Badge>
                </div>
                
                {event.amount && (
                  <p className={`text-lg font-bold ${
                    event.action_type === 'accept' 
                      ? 'text-success' 
                      : `text-${color}`
                  }`}>
                    ${event.amount.toLocaleString()}
                  </p>
                )}
                
                {event.message && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {event.message}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(event.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Helper function to add a negotiation event
export async function addNegotiationEvent(
  bookingRequestId: string,
  actorType: 'venue' | 'artist',
  actionType: 'initial_offer' | 'counter_offer' | 'accept' | 'decline' | 'update_offer',
  amount?: number,
  message?: string
) {
  try {
    const { error } = await supabase
      .from('booking_negotiations')
      .insert({
        booking_request_id: bookingRequestId,
        actor_type: actorType,
        action_type: actionType,
        amount: amount || null,
        message: message || null,
      });

    if (error) {
      console.error('Error adding negotiation event:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to log negotiation:', error);
    // Don't throw - this is non-critical logging
  }
}
