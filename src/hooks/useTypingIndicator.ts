import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTypingIndicatorOptions {
  conversationId: string | undefined;
  userId: string | undefined;
  userName: string | undefined;
}

interface TypingUser {
  id: string;
  name: string;
}

export function useTypingIndicator({ 
  conversationId, 
  userId, 
  userName 
}: UseTypingIndicatorOptions) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Set up presence subscription
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== userId) {
            const presence = presences[0] as { typing?: boolean; name?: string };
            if (presence?.typing) {
              typing.push({
                id: key,
                name: presence.name || 'Someone',
              });
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== userId) {
          const presence = newPresences[0] as { typing?: boolean; name?: string };
          if (presence?.typing) {
            setTypingUsers(prev => {
              if (prev.some(u => u.id === key)) return prev;
              return [...prev, { id: key, name: presence.name || 'Someone' }];
            });
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setTypingUsers(prev => prev.filter(u => u.id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial non-typing state
          await channel.track({ typing: false, name: userName });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, userName]);

  // Broadcast typing state
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || isTypingRef.current === isTyping) return;
    
    isTypingRef.current = isTyping;
    await channelRef.current.track({ typing: isTyping, name: userName });
  }, [userName]);

  // Start typing with auto-stop after 3 seconds of inactivity
  const startTyping = useCallback(() => {
    setTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing immediately
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isOtherUserTyping: typingUsers.length > 0,
  };
}
