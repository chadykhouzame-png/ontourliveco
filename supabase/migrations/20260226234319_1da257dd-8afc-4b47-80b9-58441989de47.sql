
-- Add edited_at column to track when messages were edited
ALTER TABLE public.messages ADD COLUMN edited_at timestamp with time zone DEFAULT NULL;

-- Allow users to delete their own messages in their conversations
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (user_in_conversation(conversation_id) AND sender_id = auth.uid());
