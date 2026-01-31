import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation, ConversationWithDetails, Message } from '@/types/messaging';

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'artist' | 'venue' | null>(null);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Determine user type and profile ID
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;

      const { data: artistData } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (artistData) {
        setUserType('artist');
        setUserProfileId(artistData.id);
        return;
      }

      const { data: venueData } = await supabase
        .from('venues')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (venueData) {
        setUserType('venue');
        setUserProfileId(venueData.id);
      }
    };

    fetchUserType();
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user || !userType || !userProfileId) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          artist:artists(id, artist_name, profile_image_url),
          venue:venues(id, venue_name, profile_image_url)
        `)
        .order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch last message and unread count for each conversation
      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        (data || []).map(async (conv) => {
          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          const isArtist = userType === 'artist';
          const otherPartyName = isArtist 
            ? (conv.venue as { venue_name: string } | null)?.venue_name 
            : (conv.artist as { artist_name: string } | null)?.artist_name;
          const otherPartyImage = isArtist 
            ? conv.venue?.profile_image_url 
            : conv.artist?.profile_image_url;

          return {
            ...conv,
            last_message: lastMessageData as Message | undefined,
            unread_count: count || 0,
            other_party_name: otherPartyName || 'Unknown',
            other_party_image: otherPartyImage,
            other_party_type: isArtist ? 'venue' : 'artist',
            other_party_id: isArtist ? conv.venue_id : conv.artist_id,
          } as ConversationWithDetails;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user, userType, userProfileId]);

  useEffect(() => {
    if (userType && userProfileId) {
      fetchConversations();
    }
  }, [userType, userProfileId, fetchConversations]);

  // Subscribe to realtime updates for conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const createConversation = async (artistId: string, venueId: string) => {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('artist_id', artistId)
      .eq('venue_id', venueId)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error: createError } = await supabase
      .from('conversations')
      .insert({ artist_id: artistId, venue_id: venueId })
      .select('id')
      .single();

    if (createError) throw createError;
    return data.id;
  };

  return {
    conversations,
    loading,
    error,
    userType,
    userProfileId,
    createConversation,
    refetch: fetchConversations,
  };
};
