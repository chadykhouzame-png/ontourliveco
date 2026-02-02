import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseUnreadMessagesOptions {
  entityId: string | undefined;
  entityType: 'artist' | 'venue';
}

export function useUnreadMessages({ entityId, entityType }: UseUnreadMessagesOptions) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !entityId) return;

    const fetchUnreadCount = async () => {
      // Get all conversations for this entity
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq(entityType === 'artist' ? 'artist_id' : 'venue_id', entityId);

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages in those conversations that weren't sent by the current user
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages in all conversations
    const channel = supabase
      .channel(`unread-messages-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as { sender_id: string; conversation_id: string };
          
          // Only increment if message is from someone else
          if (newMessage.sender_id !== user.id) {
            // Verify this conversation belongs to our entity
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', newMessage.conversation_id)
              .eq(entityType === 'artist' ? 'artist_id' : 'venue_id', entityId)
              .maybeSingle();

            if (conversation) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const updatedMessage = payload.new as { is_read: boolean; sender_id: string; conversation_id: string };
          const oldMessage = payload.old as { is_read: boolean };
          
          // If message was marked as read and it wasn't from us
          if (updatedMessage.is_read && !oldMessage.is_read && updatedMessage.sender_id !== user.id) {
            // Verify this conversation belongs to our entity
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', updatedMessage.conversation_id)
              .eq(entityType === 'artist' ? 'artist_id' : 'venue_id', entityId)
              .maybeSingle();

            if (conversation) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, entityId, entityType]);

  return { unreadCount };
}
