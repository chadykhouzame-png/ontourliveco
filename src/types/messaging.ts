export interface Conversation {
  id: string;
  artist_id: string;
  venue_id: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  artist?: {
    id: string;
    artist_name: string;
    profile_image_url: string | null;
  };
  venue?: {
    id: string;
    venue_name: string;
    profile_image_url: string | null;
  };
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'artist' | 'venue';
  content: string;
  image_url?: string | null;
  reply_to_id?: string | null;
  is_read: boolean;
  created_at: string;
  edited_at?: string | null;
}

export interface ConversationWithDetails extends Conversation {
  other_party_name: string;
  other_party_image: string | null;
  other_party_type: 'artist' | 'venue';
  other_party_id: string;
}
