import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Reaction } from '@/components/messaging/MessageReactions';

interface RawReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const useMessageReactions = (conversationId: string | null) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<RawReaction[]>([]);

  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error fetching reactions:', error);
      return;
    }
    setReactions(data as RawReaction[]);
  }, []);

  // Realtime subscription for reactions
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const newReaction = payload.new as RawReaction;
          setReactions((prev) => {
            if (prev.some((r) => r.id === newReaction.id)) return prev;
            return [...prev, newReaction];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setReactions((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const getReactionsForMessage = useCallback(
    (messageId: string): Reaction[] => {
      const messageReactions = reactions.filter((r) => r.message_id === messageId);
      const emojiMap = new Map<string, { count: number; reacted: boolean }>();

      messageReactions.forEach((r) => {
        const existing = emojiMap.get(r.emoji) || { count: 0, reacted: false };
        existing.count++;
        if (r.user_id === user?.id) existing.reacted = true;
        emojiMap.set(r.emoji, existing);
      });

      return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reacted: data.reacted,
      }));
    },
    [reactions, user?.id]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
      );

      if (existing) {
        // Optimistic remove
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) {
          console.error('Error removing reaction:', error);
          setReactions((prev) => [...prev, existing]);
        }
      } else {
        // Optimistic add
        const tempId = crypto.randomUUID();
        const tempReaction: RawReaction = {
          id: tempId,
          message_id: messageId,
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        };
        setReactions((prev) => [...prev, tempReaction]);

        const { data, error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji })
          .select()
          .single();

        if (error) {
          console.error('Error adding reaction:', error);
          setReactions((prev) => prev.filter((r) => r.id !== tempId));
        } else {
          // Replace temp with real
          setReactions((prev) =>
            prev.map((r) => (r.id === tempId ? (data as RawReaction) : r))
          );
        }
      }
    },
    [user, reactions]
  );

  return { fetchReactions, getReactionsForMessage, toggleReaction };
};
