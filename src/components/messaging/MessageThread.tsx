import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isYesterday } from 'date-fns';
import type { Message, ConversationWithDetails } from '@/types/messaging';
import TypingIndicator from './TypingIndicator';

interface MessageThreadProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  conversation: ConversationWithDetails | null;
  isOtherUserTyping?: boolean;
}

const formatMessageDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
};

const MessageThread = ({
  messages,
  loading,
  currentUserId,
  conversation,
  isOtherUserTyping = false,
}: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherUserTyping]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className="h-16 w-2/3 rounded-lg" />
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0 && !isOtherUserTyping) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Avatar className="h-16 w-16 mx-auto mb-4">
            <AvatarImage src={conversation.other_party_image || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {conversation.other_party_name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <p className="font-medium">{conversation.other_party_name}</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwn ? 'justify-end' : ''}`}
            >
              {!isOwn && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={conversation.other_party_image || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {conversation.other_party_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] ${
                  isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                } rounded-2xl px-4 py-2`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {formatMessageDate(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        
        {isOtherUserTyping && (
          <TypingIndicator 
            userName={conversation.other_party_name || 'Someone'}
            userImage={conversation.other_party_image}
          />
        )}
      </div>
    </ScrollArea>
  );
};

export default MessageThread;
