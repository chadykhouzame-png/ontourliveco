import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import type { ConversationWithDetails } from '@/types/messaging';

interface ConversationsListProps {
  conversations: ConversationWithDetails[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: ConversationWithDetails) => void;
}

const ConversationsList = ({
  conversations,
  loading,
  selectedId,
  onSelect,
}: ConversationsListProps) => {
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

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation by messaging an artist or venue</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-accent ${
              selectedId === conversation.id ? 'bg-accent' : ''
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
        ))}
      </div>
    </ScrollArea>
  );
};

export default ConversationsList;
