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
      artists: {
        Row: {
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
          primary_city: string
          profile_image_url: string | null
          review_status: string
          show_fee_range: boolean | null
          soundcloud_url: string | null
          spotify_url: string | null
          tiktok_url: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
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
          primary_city: string
          profile_image_url?: string | null
          review_status?: string
          show_fee_range?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          tiktok_url?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
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
          primary_city?: string
          profile_image_url?: string | null
          review_status?: string
          show_fee_range?: boolean | null
          soundcloud_url?: string | null
          spotify_url?: string | null
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
          counter_offer: number | null
          created_at: string
          id: string
          message: string | null
          offer_amount: number | null
          requested_date: string
          requested_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          artist_id: string
          counter_offer?: number | null
          created_at?: string
          id?: string
          message?: string | null
          offer_amount?: number | null
          requested_date: string
          requested_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          artist_id?: string
          counter_offer?: number | null
          created_at?: string
          id?: string
          message?: string | null
          offer_amount?: number | null
          requested_date?: string
          requested_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
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
      profiles: {
        Row: {
          created_at: string
          email: string
          email_notifications_enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          email_notifications_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          email_notifications_enabled?: boolean
          id?: string
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
          connected_at: string | null
          created_at: string
          follower_count: number | null
          id: string
          is_connected: boolean
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id: string | null
          platform_username: string | null
          profile_url: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          artist_id: string
          connected_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          profile_url?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          artist_id?: string
          connected_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          profile_url?: string | null
          refresh_token?: string | null
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
          capacity_max: number | null
          capacity_min: number | null
          city: string
          created_at: string
          description: string | null
          equipment_notes: string | null
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
          capacity_max?: number | null
          capacity_min?: number | null
          city: string
          created_at?: string
          description?: string | null
          equipment_notes?: string | null
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
          capacity_max?: number | null
          capacity_min?: number | null
          city?: string
          created_at?: string
          description?: string | null
          equipment_notes?: string | null
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
    }
    Views: {
      social_connections_public: {
        Row: {
          artist_id: string | null
          connected_at: string | null
          created_at: string | null
          follower_count: number | null
          id: string | null
          is_connected: boolean | null
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          platform_username: string | null
          profile_url: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          follower_count?: number | null
          id?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          platform_username?: string | null
          profile_url?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          follower_count?: number | null
          id?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          platform_username?: string | null
          profile_url?: string | null
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
    }
    Functions: {
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
