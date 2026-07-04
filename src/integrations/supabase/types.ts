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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          id: string
          name: string | null
          type: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_rate_limit: {
        Row: {
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number
          user_id: string
          window_start: string
        }
        Update: {
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          flag_reason: string | null
          flagged: boolean
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          guardian_contact: string | null
          id: string
          is_banned: boolean
          phone: string | null
          sport: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          guardian_contact?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          sport?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          guardian_contact?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          sport?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      scout_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_banned: boolean
          organization: string | null
          preferred_positions: string[]
          preferred_sport: string | null
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          is_banned?: boolean
          organization?: string | null
          preferred_positions?: string[]
          preferred_sport?: string | null
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_banned?: boolean
          organization?: string | null
          preferred_positions?: string[]
          preferred_sport?: string | null
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      scout_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          notes: string
          player_id: string
          scout_id: string
          status: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          notes?: string
          player_id: string
          scout_id: string
          status?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          notes?: string
          player_id?: string
          scout_id?: string
          status?: string
        }
        Relationships: []
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
      username_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_username: string | null
          old_username: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_username?: string | null
          old_username?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_username?: string | null
          old_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_events: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          video_id: string
          viewer_id: string | null
          watch_ms: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          video_id: string
          viewer_id?: string | null
          watch_ms?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          video_id?: string
          viewer_id?: string | null
          watch_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string
          flag_reason: string | null
          flagged: boolean
          id: string
          like_count: number
          position_tags: string[]
          ranking_score: number
          score_updated_at: string | null
          share_count: number
          status: string
          title: string
          total_watch_ms: number
          trait_tags: string[]
          user_id: string
          video_url: string
          view_count: number
        }
        Insert: {
          created_at?: string
          description?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          like_count?: number
          position_tags?: string[]
          ranking_score?: number
          score_updated_at?: string | null
          share_count?: number
          status?: string
          title?: string
          total_watch_ms?: number
          trait_tags?: string[]
          user_id: string
          video_url?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          description?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          like_count?: number
          position_tags?: string[]
          ranking_score?: number
          score_updated_at?: string | null
          share_count?: number
          status?: string
          title?: string
          total_watch_ms?: number
          trait_tags?: string[]
          user_id?: string
          video_url?: string
          view_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enforce_feed_rate_limit: {
        Args: { _max?: number; _user: string }
        Returns: undefined
      }
      get_admin_user_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          is_current: boolean
          updated_at: string
          user_agent: string
        }[]
      }
      get_ranked_feed: {
        Args: { _limit?: number; _offset?: number; _sport?: string }
        Returns: {
          avatar_url: string
          description: string
          full_name: string
          id: string
          is_test_slot: boolean
          like_count: number
          liked_by_me: boolean
          position_tags: string[]
          score: number
          share_count: number
          sport: string
          trait_tags: string[]
          user_id: string
          video_url: string
          view_count: number
        }[]
      }
      get_username_audit: {
        Args: { _limit?: number }
        Returns: {
          changed_at: string
          changed_by: string
          changed_by_email: string
          id: string
          new_username: string
          old_username: string
          user_email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_video_scores: { Args: never; Returns: undefined }
      revoke_my_session: { Args: { _session_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "player" | "scout" | "admin"
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
      app_role: ["player", "scout", "admin"],
    },
  },
} as const
