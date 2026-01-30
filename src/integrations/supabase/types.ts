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
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name: string
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
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          artist_id: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          booking_nights: string[] | null
          capacity_max: number | null
          capacity_min: number | null
          city: string
          created_at: string
          description: string | null
          equipment_notes: string | null
          id: string
          instagram_url: string | null
          is_profile_complete: boolean | null
          music_preferences: Database["public"]["Enums"]["genre"][] | null
          profile_image_url: string | null
          updated_at: string
          user_id: string
          venue_name: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }
        Insert: {
          booking_nights?: string[] | null
          capacity_max?: number | null
          capacity_min?: number | null
          city: string
          created_at?: string
          description?: string | null
          equipment_notes?: string | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          music_preferences?: Database["public"]["Enums"]["genre"][] | null
          profile_image_url?: string | null
          updated_at?: string
          user_id: string
          venue_name: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Update: {
          booking_nights?: string[] | null
          capacity_max?: number | null
          capacity_min?: number | null
          city?: string
          created_at?: string
          description?: string | null
          equipment_notes?: string | null
          id?: string
          instagram_url?: string | null
          is_profile_complete?: boolean | null
          music_preferences?: Database["public"]["Enums"]["genre"][] | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string
          venue_name?: string
          venue_type?: Database["public"]["Enums"]["venue_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      booking_status: "pending" | "accepted" | "declined" | "cancelled"
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
      booking_status: ["pending", "accepted", "declined", "cancelled"],
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
