import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Reply, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import type { Message, ConversationWithDetails } from '@/types/messaging';
import TypingIndicator from './TypingIndicator';
import MessageReactions, { type Reaction } from './MessageReactions';

interface MessageThreadProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  conversation: ConversationWithDetails | null;
  isOtherUserTyping?: boolean;
  getReactionsForMessage?: (messageId: string) => Reaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
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
  getReactionsForMessage,
  onToggleReaction,
  onReply,
  onEditMessage,
  onDeleteMessage,
}: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherUserTyping]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  const getReplyMessage = (replyToId: string | null | undefined): Message | undefined => {
    if (!replyToId) return undefined;
    return messages.find((m) => m.id === replyToId);
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim() || !onEditMessage) return;
    try {
      await onEditMessage(editingMessageId, editContent);
      cancelEditing();
    } catch {
      // error handled in hook
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteMessageId || !onDeleteMessage) return;
    try {
      await onDeleteMessage(deleteMessageId);
    } catch {
      // error handled in hook
    }
    setDeleteMessageId(null);
  };

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
    <>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            const messageReactions = getReactionsForMessage?.(message.id) || [];
            const repliedMessage = getReplyMessage(message.reply_to_id);
            const isEditing = editingMessageId === message.id;

            return (
              <div
                key={message.id}
                className={`flex gap-3 group ${isOwn ? 'justify-end' : ''}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={conversation.other_party_image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {conversation.other_party_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-[70%]">
                  {/* Reply quote */}
                  {repliedMessage && (
                    <div
                      className={`flex items-start gap-1.5 mb-1 px-3 py-1.5 rounded-t-xl border-l-2 border-primary/50 bg-muted/50 text-xs text-muted-foreground ${
                        isOwn ? 'ml-auto' : ''
                      }`}
                    >
                      <Reply className="h-3 w-3 mt-0.5 shrink-0 rotate-180" />
                      <p className="line-clamp-2 break-words">
                        {repliedMessage.content || (repliedMessage.image_url ? '📷 Image' : '')}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <div
                      className={`${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${repliedMessage ? 'rounded-b-2xl rounded-t-lg' : 'rounded-2xl'} px-4 py-2`}
                    >
                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Attachment"
                          className="rounded-lg mb-2 max-w-full max-h-64 object-contain cursor-pointer"
                          onClick={() => window.open(message.image_url!, '_blank')}
                        />
                      )}
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={editInputRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-7 text-sm bg-background text-foreground border-border"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleSaveEdit}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditing}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        {message.edited_at && (
                          <span className={`text-xs italic ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                            edited
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatMessageDate(message.created_at)}
                        </span>
                        {isOwn && (
                          message.is_read ? (
                            <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-primary-foreground/70" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Edit/Delete menu for own messages */}
                    {isOwn && !isEditing && (onEditMessage || onDeleteMessage) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -left-8 top-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          {onEditMessage && message.content && (
                            <DropdownMenuItem onClick={() => startEditing(message)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDeleteMessage && (
                            <DropdownMenuItem
                              onClick={() => setDeleteMessageId(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {onToggleReaction && (
                      <MessageReactions
                        reactions={messageReactions}
                        onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
                        isOwn={isOwn}
                      />
                    )}
                    {onReply && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onReply(message)}
                      >
                        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageThread;