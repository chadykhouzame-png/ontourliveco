import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types/messaging';

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data as Message[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    const markAsRead = async () => {
      if (!conversationId || !user) return;

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', user.id);
    };

    if (messages.length > 0) {
      markAsRead();
    }
  }, [conversationId, user, messages.length]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (content: string, senderType: 'artist' | 'venue', imageUrl?: string, replyToId?: string) => {
    if (!conversationId || !user || (!content.trim() && !imageUrl)) return;

    setSending(true);
    try {
      const { error: sendError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: senderType,
        content: content.trim(),
        image_url: imageUrl || null,
        reply_to_id: replyToId || null,
      });

      if (sendError) throw sendError;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refetch: fetchMessages,
  };
};
