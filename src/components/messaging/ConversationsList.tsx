import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConversationWithDetails } from '@/types/messaging';

interface SearchResult {
  message: {
    id: string;
    conversation_id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
  conversationId: string;
}

interface ConversationsListProps {
  conversations: ConversationWithDetails[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: ConversationWithDetails) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchResults?: SearchResult[];
  searching?: boolean;
  onClearSearch?: () => void;
  onSelectSearchResult?: (conversationId: string) => void;
}

const ConversationsList = ({
  conversations,
  loading,
  selectedId,
  onSelect,
  searchQuery = '',
  onSearchChange,
  searchResults = [],
  searching = false,
  onClearSearch,
  onSelectSearchResult,
}: ConversationsListProps) => {
  const isSearching = searchQuery.trim().length > 0;

  // Filter conversations by name when searching
  const filteredConversations = isSearching
    ? conversations.filter((c) =>
        c.other_party_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {onSearchChange && (
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages..."
              className="pl-9 pr-9 h-10"
            />
            {isSearching && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={onClearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search results or conversations */}
      {isSearching ? (
        <ScrollArea className="flex-1">
          {searching ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Matching conversations */}
              {filteredConversations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
                    Conversations
                  </p>
                  {filteredConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedId === conversation.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}

              {/* Matching messages */}
              {searchResults.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
                    Messages
                  </p>
                  {searchResults.map((result) => {
                    const conv = conversations.find(
                      (c) => c.id === result.conversationId
                    );
                    if (!conv) return null;

                    return (
                      <button
                        key={result.message.id}
                        onClick={() => onSelectSearchResult?.(result.conversationId)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-accent"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={conv.other_party_image || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {conv.other_party_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {conv.other_party_name}
                          </span>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            <HighlightedText
                              text={result.message.content}
                              highlight={searchQuery}
                            />
                          </p>
                          <span className="text-xs text-muted-foreground/70">
                            {formatDistanceToNow(new Date(result.message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredConversations.length === 0 && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mb-3 opacity-50" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Start a conversation by messaging an artist or venue</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedId === conversation.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
};

const ConversationItem = ({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: ConversationWithDetails;
  isSelected: boolean;
  onSelect: (c: ConversationWithDetails) => void;
}) => (
  <button
    onClick={() => onSelect(conversation)}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-accent ${
      isSelected ? 'bg-accent' : ''
    }`}
  >
    <Avatar className="h-12 w-12">
      <AvatarImage src={conversation.other_party_image || undefined} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {conversation.other_party_name?.charAt(0).toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-medium truncate">
          {conversation.other_party_name}
        </span>
        {conversation.last_message && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(conversation.last_message.created_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground truncate">
          {conversation.last_message?.content || 'No messages yet'}
        </p>
        {(conversation.unread_count || 0) > 0 && (
          <Badge variant="default" className="ml-2 h-5 min-w-[20px] px-1.5">
            {conversation.unread_count}
          </Badge>
        )}
      </div>
    </div>
  </button>
);

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-primary/20 text-foreground font-medium rounded-sm px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default ConversationsList;
