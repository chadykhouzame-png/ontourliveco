export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artist_media: {
        Row: {
          artist_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_media_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          age: number | null
          artist_name: string
          average_rating: number | null
          bio: string | null
          created_at: string
          fee_range_max: number | null
          fee_range_min: number | null
          first_name: string | null
          genres: Database["public"]["Enums"]["genre"][] | null
          id: string
          instagram_url: string | null
          is_profile_complete: boolean | null
          last_name: string | null
          mobile: string | null
          primary_city: string
          profile_image_url: string | null
          review_status: string
          show_fee_range: boolean | null
          soundcloud_url: string | null
          spotify_url: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          tiktok_url: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          artist_name: string
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          fee_range_max?: number | null
          fee_range_min?: number | null
          first_name?: string | null
          genres?: Database["public"]["Enums"]["genre"][] | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_name?: string | null
          mobile?: string | null
          primary_city: string
          profile_image_url?: string | null
          review_status?: string
          show_fee_range?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tiktok_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          artist_name?: string
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          fee_range_max?: number | null
          fee_range_min?: number | null
          first_name?: string | null
          genres?: Database["public"]["Enums"]["genre"][] | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_name?: string | null
          mobile?: string | null
          primary_city?: string
          profile_image_url?: string | null
          review_status?: string
          show_fee_range?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tiktok_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_negotiations: {
        Row: {
          action_type: string
          actor_type: string
          amount: number | null
          booking_request_id: string
          created_at: string
          id: string
          message: string | null
        }
        Insert: {
          action_type: string
          actor_type: string
          amount?: number | null
          booking_request_id: string
          created_at?: string
          id?: string
          message?: string | null
        }
        Update: {
          action_type?: string
          actor_type?: string
          amount?: number | null
          booking_request_id?: string
          created_at?: string
          id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_negotiations_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          artist_id: string
          completion_notes: string | null
          counter_offer: number | null
          created_at: string
          id: string
          message: string | null
          offer_amount: number | null
          payment_amount: number | null
          payment_intent_id: string | null
          payment_status: string | null
          platform_fee: number | null
          requested_date: string
          requested_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          stripe_checkout_session_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          artist_id: string
          completion_notes?: string | null
          counter_offer?: number | null
          created_at?: string
          id?: string
          message?: string | null
          offer_amount?: number | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          requested_date: string
          requested_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_checkout_session_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          artist_id?: string
          completion_notes?: string | null
          counter_offer?: number | null
          created_at?: string
          id?: string
          message?: string | null
          offer_amount?: number | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          requested_date?: string
          requested_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_checkout_session_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          booking_request_id: string | null
          created_at: string
          description: string
          dispute_type: string
          id: string
          reported_artist_id: string | null
          reported_user_id: string | null
          reported_venue_id: string | null
          reporter_user_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_request_id?: string | null
          created_at?: string
          description: string
          dispute_type?: string
          id?: string
          reported_artist_id?: string | null
          reported_user_id?: string | null
          reported_venue_id?: string | null
          reporter_user_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          booking_request_id?: string | null
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          reported_artist_id?: string | null
          reported_user_id?: string | null
          reported_venue_id?: string | null
          reporter_user_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_artist_id_fkey"
            columns: ["reported_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_venue_id_fkey"
            columns: ["reported_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      entertainment_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          preferred_genres: Database["public"]["Enums"]["genre"][] | null
          requested_date: string
          requirements: string | null
          start_time: string
          status: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          preferred_genres?: Database["public"]["Enums"]["genre"][] | null
          requested_date: string
          requirements?: string | null
          start_time: string
          status?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          preferred_genres?: Database["public"]["Enums"]["genre"][] | null
          requested_date?: string
          requirements?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entertainment_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: string | null
          created_at: string
          error_code: string
          error_message: string
          id: string
          metadata: Json | null
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          error_code: string
          error_message: string
          id?: string
          metadata?: Json | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          error_code?: string
          error_message?: string
          id?: string
          metadata?: Json | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          is_read: boolean
          reply_to_id: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          reply_to_id?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          reply_to_id?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_rate_limits: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          requested_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          requested_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          requested_at?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          profile_type: string
          viewed_at: string
          viewer_id: string | null
          viewer_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          profile_type: string
          viewed_at?: string
          viewer_id?: string | null
          viewer_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          profile_type?: string
          viewed_at?: string
          viewer_id?: string | null
          viewer_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          email_notifications_enabled: boolean
          id: string
          sound_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          email_notifications_enabled?: boolean
          id?: string
          sound_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          email_notifications_enabled?: boolean
          id?: string
          sound_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_request_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_artist_id: string | null
          reviewee_type: string
          reviewee_venue_id: string | null
          reviewer_artist_id: string | null
          reviewer_type: string
          reviewer_venue_id: string | null
          updated_at: string
        }
        Insert: {
          booking_request_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_artist_id?: string | null
          reviewee_type: string
          reviewee_venue_id?: string | null
          reviewer_artist_id?: string | null
          reviewer_type: string
          reviewer_venue_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_request_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_artist_id?: string | null
          reviewee_type?: string
          reviewee_venue_id?: string | null
          reviewer_artist_id?: string | null
          reviewer_type?: string
          reviewer_venue_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_artist_id_fkey"
            columns: ["reviewee_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_venue_id_fkey"
            columns: ["reviewee_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_artist_id_fkey"
            columns: ["reviewer_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_venue_id_fkey"
            columns: ["reviewer_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          artist_id: string
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          comments_count: number | null
          connected_at: string | null
          created_at: string
          engagement_rate: number | null
          follower_count: number | null
          id: string
          is_connected: boolean
          last_synced_at: string | null
          likes_count: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id: string | null
          platform_username: string | null
          profile_url: string | null
          refresh_token: string | null
          shares_count: number | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          artist_id: string
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          comments_count?: number | null
          connected_at?: string | null
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          likes_count?: number | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          profile_url?: string | null
          refresh_token?: string | null
          shares_count?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          artist_id?: string
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          comments_count?: number | null
          connected_at?: string | null
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          likes_count?: number | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          profile_url?: string | null
          refresh_token?: string | null
          shares_count?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stats_snapshots: {
        Row: {
          artist_id: string
          created_at: string
          engagement_rate: number | null
          follower_count: number | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          snapshot_date: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          snapshot_date?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_stats_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_dates: {
        Row: {
          artist_id: string
          city: string
          created_at: string
          end_date: string
          id: string
          is_available: boolean | null
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          city: string
          created_at?: string
          end_date: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          city?: string
          created_at?: string
          end_date?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_dates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          average_rating: number | null
          booking_nights: string[] | null
          capacity_max: number
          capacity_min: number
          city: string
          created_at: string
          description: string | null
          equipment_notes: string
          first_name: string | null
          id: string
          instagram_url: string | null
          is_profile_complete: boolean | null
          last_name: string | null
          music_preferences: Database["public"]["Enums"]["genre"][] | null
          profile_image_url: string | null
          review_status: string
          tiktok_url: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          venue_name: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          average_rating?: number | null
          booking_nights?: string[] | null
          capacity_max: number
          capacity_min: number
          city: string
          created_at?: string
          description?: string | null
          equipment_notes?: string
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_name?: string | null
          music_preferences?: Database["public"]["Enums"]["genre"][] | null
          profile_image_url?: string | null
          review_status?: string
          tiktok_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          venue_name: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          average_rating?: number | null
          booking_nights?: string[] | null
          capacity_max?: number
          capacity_min?: number
          city?: string
          created_at?: string
          description?: string | null
          equipment_notes?: string
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          last_name?: string | null
          music_preferences?: Database["public"]["Enums"]["genre"][] | null
          profile_image_url?: string | null
          review_status?: string
          tiktok_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          venue_name?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      social_connections_public: {
        Row: {
          artist_id: string | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          comments_count: number | null
          connected_at: string | null
          created_at: string | null
          engagement_rate: number | null
          follower_count: number | null
          id: string | null
          is_connected: boolean | null
          last_synced_at: string | null
          likes_count: number | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          platform_username: string | null
          profile_url: string | null
          shares_count: number | null
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          comments_count?: number | null
          connected_at?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          platform_username?: string | null
          profile_url?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          comments_count?: number | null
          connected_at?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          platform_username?: string | null
          profile_url?: string | null
          shares_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stats_snapshots_public: {
        Row: {
          artist_id: string | null
          created_at: string | null
          engagement_rate: number | null
          follower_count: number | null
          id: string | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          snapshot_date: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          snapshot_date?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          snapshot_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_stats_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_account_lockout: {
        Args: {
          p_email: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: Json
      }
      cleanup_old_error_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_my_artist_mobile: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_email: string; p_ip_address?: string; p_success: boolean }
        Returns: undefined
      }
      user_in_conversation: { Args: { conv_id: string }; Returns: boolean }
      user_owns_artist: { Args: { artist_uuid: string }; Returns: boolean }
      user_owns_venue: { Args: { venue_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "artist" | "venue" | "admin"
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
      genre:
        | "house"
        | "techno"
        | "disco"
        | "hip_hop"
        | "rnb"
        | "afrobeats"
        | "amapiano"
        | "latin"
        | "pop"
        | "rock"
        | "jazz"
        | "soul"
        | "funk"
        | "drum_and_bass"
        | "uk_garage"
        | "reggae"
        | "dancehall"
        | "other"
      social_platform: "spotify" | "instagram" | "tiktok" | "soundcloud"
      venue_type:
        | "bar"
        | "club"
        | "restaurant"
        | "hotel"
        | "rooftop"
        | "lounge"
        | "festival"
        | "private_event"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["artist", "venue", "admin"],
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
      genre: [
        "house",
        "techno",
        "disco",
        "hip_hop",
        "rnb",
        "afrobeats",
        "amapiano",
        "latin",
        "pop",
        "rock",
        "jazz",
        "soul",
        "funk",
        "drum_and_bass",
        "uk_garage",
        "reggae",
        "dancehall",
        "other",
      ],
      social_platform: ["spotify", "instagram", "tiktok", "soundcloud"],
      venue_type: [
        "bar",
        "club",
        "restaurant",
        "hotel",
        "rooftop",
        "lounge",
        "festival",
        "private_event",
        "other",
      ],
    },
  },
} as const
