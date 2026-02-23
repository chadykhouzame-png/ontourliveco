import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types/messaging';

interface SearchResult {
  message: Message;
  conversationId: string;
  matchedText: string;
}

export const useMessageSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .ilike('content', `%${searchQuery.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const searchResults: SearchResult[] = (data || []).map((msg) => ({
        message: msg as Message,
        conversationId: msg.conversation_id,
        matchedText: msg.content,
      }));

      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    searching,
    clearSearch,
  };
};
