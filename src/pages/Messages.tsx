import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useToast } from '@/hooks/use-toast';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import ConversationsList from '@/components/messaging/ConversationsList';
import MessageThread from '@/components/messaging/MessageThread';
import MessageInput from '@/components/messaging/MessageInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import type { ConversationWithDetails, Message } from '@/types/messaging';

const Messages = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const {
    conversations,
    loading: conversationsLoading,
    userType,
    userProfileId,
    createConversation,
  } = useConversations();

  const {
    messages,
    loading: messagesLoading,
    sending,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useMessages(selectedConversation?.id || null);

  const {
    fetchReactions,
    getReactionsForMessage,
    toggleReaction,
  } = useMessageReactions(selectedConversation?.id || null);

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    searching,
    clearSearch,
  } = useMessageSearch();

  // Fetch reactions when messages load
  useEffect(() => {
    if (messages.length > 0) {
      fetchReactions(messages.map((m) => m.id));
    }
  }, [messages, fetchReactions]);

  // Get the current user's name for the typing indicator
  const currentUserName = selectedConversation?.other_party_name 
    ? (userType === 'artist' ? 'Artist' : 'Venue')
    : undefined;

  const {
    isOtherUserTyping,
    startTyping,
    stopTyping,
  } = useTypingIndicator({
    conversationId: selectedConversation?.id,
    userId: user?.id,
    userName: currentUserName,
  });

  // Handle deep linking to a specific conversation
  useEffect(() => {
    const artistId = searchParams.get('artist');
    const venueId = searchParams.get('venue');

    if (artistId && venueId && userProfileId && !conversationsLoading) {
      // Find existing conversation or create new one
      const existing = conversations.find(
        (c) => c.artist_id === artistId && c.venue_id === venueId
      );

      if (existing) {
        setSelectedConversation(existing);
        setShowMobileThread(true);
      } else {
        // Create new conversation
        createConversation(artistId, venueId)
          .then(() => {
            // Conversation will appear in the list after realtime update
          })
          .catch((err) => {
            console.error('Failed to create conversation:', err);
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to start conversation',
            });
          });
      }
    }
  }, [searchParams, userProfileId, conversationsLoading, conversations, createConversation, toast]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setShowMobileThread(true);
    clearSearch();
  };

  const handleSelectSearchResult = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setSelectedConversation(conv);
      setShowMobileThread(true);
      clearSearch();
    }
  };

  const handleSendMessage = async (content: string, imageUrl?: string, replyToId?: string) => {
    if (!userType) return;
    await sendMessage(content, userType, imageUrl, replyToId);
  };

  const handleBack = () => {
    setShowMobileThread(false);
    setSelectedConversation(null);
    setReplyingTo(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-16 px-4">
          {showMobileThread ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">
              {showMobileThread && selectedConversation
                ? selectedConversation.other_party_name
                : 'Messages'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations list - hidden on mobile when viewing thread */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r flex-shrink-0 ${
            showMobileThread ? 'hidden md:flex' : 'flex'
          } flex-col`}
        >
          <ConversationsList
            conversations={conversations}
            loading={conversationsLoading}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            searching={searching}
            onClearSearch={clearSearch}
            onSelectSearchResult={handleSelectSearchResult}
          />
        </div>

        {/* Message thread - hidden on mobile when viewing list */}
        <div
          className={`flex-1 flex flex-col ${
            showMobileThread ? 'flex' : 'hidden md:flex'
          }`}
        >
          <MessageThread
            messages={messages}
            loading={messagesLoading}
            currentUserId={user?.id || ''}
            conversation={selectedConversation}
            isOtherUserTyping={isOtherUserTyping}
            getReactionsForMessage={getReactionsForMessage}
            onToggleReaction={toggleReaction}
            onReply={setReplyingTo}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
          />
          {selectedConversation && (
            <MessageInput
              onSend={handleSendMessage}
              disabled={!selectedConversation}
              sending={sending}
              onTyping={startTyping}
              onStopTyping={stopTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
