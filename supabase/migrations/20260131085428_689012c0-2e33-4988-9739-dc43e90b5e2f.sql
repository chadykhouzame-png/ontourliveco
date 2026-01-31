-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id, venue_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('artist', 'venue')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_conversations_artist_id ON public.conversations(artist_id);
CREATE INDEX idx_conversations_venue_id ON public.conversations(venue_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user owns artist profile
CREATE OR REPLACE FUNCTION public.user_owns_artist(artist_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artists
    WHERE id = artist_uuid AND user_id = auth.uid()
  )
$$;

-- Helper function to check if user owns venue profile
CREATE OR REPLACE FUNCTION public.user_owns_venue(venue_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues
    WHERE id = venue_uuid AND user_id = auth.uid()
  )
$$;

-- Helper function to check if user is part of conversation
CREATE OR REPLACE FUNCTION public.user_in_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conv_id
    AND (
      public.user_owns_artist(c.artist_id) OR 
      public.user_owns_venue(c.venue_id)
    )
  )
$$;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (
  public.user_owns_artist(artist_id) OR public.user_owns_venue(venue_id)
);

CREATE POLICY "Artists can create conversations with venues"
ON public.conversations FOR INSERT
WITH CHECK (public.user_owns_artist(artist_id));

CREATE POLICY "Venues can create conversations with artists"
ON public.conversations FOR INSERT
WITH CHECK (public.user_owns_venue(venue_id));

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
USING (
  public.user_owns_artist(artist_id) OR public.user_owns_venue(venue_id)
);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (public.user_in_conversation(conversation_id));

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (public.user_in_conversation(conversation_id));

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (
  public.user_in_conversation(conversation_id) AND
  sender_id = auth.uid()
);

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update last_message_at
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;