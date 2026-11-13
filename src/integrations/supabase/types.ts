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
          id: string
          user_id: string
          title: string
          description: string | null
          year: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          year?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          year?: number | null
          created_at?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string | null
          action: string
          target_user: string | null
          target_video: string | null
          reason: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action: string
          target_user?: string | null
          target_video?: string | null
          reason?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string | null
          action?: string
          target_user?: string | null
          target_video?: string | null
          reason?: string | null
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_profile_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      close_friends: {
        Row: {
          user_id: string
          friend_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          friend_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          friend_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_friends_friend_id_profile_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          subject: string | null
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          subject?: string | null
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          subject?: string | null
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          scout_id: string
          player_id: string
          request_id: string | null
          status: string
          opened_by: string | null
          closed_by: string | null
          closed_reason: string | null
          created_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          scout_id: string
          player_id: string
          request_id?: string | null
          status?: string
          opened_by?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          scout_id?: string
          player_id?: string
          request_id?: string | null
          status?: string
          opened_by?: string | null
          closed_by?: string | null
          closed_reason?: string | null
          created_at?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "scout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      direct_message_removals: {
        Row: {
          message_id: string
          body: string
          removed_by: string | null
          removed_at: string
        }
        Insert: {
          message_id: string
          body: string
          removed_by?: string | null
          removed_at?: string
        }
        Update: {
          message_id?: string
          body?: string
          removed_by?: string | null
          removed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_removals_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          reply_to_id: string | null
          pinned_at: string | null
          pinned_by: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          reply_to_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          body?: string
          reply_to_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          user_id: string
          name: string | null
          url: string | null
          type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          url?: string | null
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          url?: string | null
          type?: string | null
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          user_id: string
          favorite_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          favorite_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          favorite_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_favorite_id_profile_fkey"
            columns: ["favorite_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_rate_limit: {
        Row: {
          user_id: string
          window_start: string
          request_count: number
        }
        Insert: {
          user_id: string
          window_start: string
          request_count?: number
        }
        Update: {
          user_id?: string
          window_start?: string
          request_count?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          followee_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followee_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followee_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hidden_words: {
        Row: {
          id: string
          user_id: string
          word: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          created_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          flagged: boolean
          flag_reason: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content?: string
          flagged?: boolean
          flag_reason?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          flagged?: boolean
          flag_reason?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      moderation_alerts: {
        Row: {
          id: string
          kind: string
          target_id: string
          target_user_id: string | null
          status: string
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          kind: string
          target_id: string
          target_user_id?: string | null
          status?: string
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          kind?: string
          target_id?: string
          target_user_id?: string | null
          status?: string
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      muted_users: {
        Row: {
          user_id: string
          muted_id: string
          mute_posts: boolean
          mute_stories: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          muted_id: string
          mute_posts?: boolean
          mute_stories?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          muted_id?: string
          mute_posts?: boolean
          mute_stories?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_users_muted_id_profile_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      news_posts: {
        Row: {
          id: string
          title: string
          body: string
          tag: string | null
          media_url: string | null
          media_type: string | null
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          tag?: string | null
          media_url?: string | null
          media_type?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          tag?: string | null
          media_url?: string | null
          media_type?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          pause_all_until: string | null
          likes: boolean
          comments: boolean
          new_followers: boolean
          messages: boolean
          scout_requests: boolean
          video_activity: boolean
          from_cholo_kheli: boolean
          email_notifications: boolean
          push_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          pause_all_until?: string | null
          likes?: boolean
          comments?: boolean
          new_followers?: boolean
          messages?: boolean
          scout_requests?: boolean
          video_activity?: boolean
          from_cholo_kheli?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          pause_all_until?: string | null
          likes?: boolean
          comments?: boolean
          new_followers?: boolean
          messages?: boolean
          scout_requests?: boolean
          video_activity?: boolean
          from_cholo_kheli?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: string | null
          read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: string | null
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string | null
          type?: string | null
          read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string
          amount: number
          status: string
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount?: number
          status?: string
          transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          status?: string
          transaction_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          user_id: string
          is_private: boolean
          story_visibility: string
          activity_status: boolean
          read_receipts: boolean
          allow_tags: string
          allow_mentions: string
          comment_control: string
          sharing_allowed: boolean
          hide_like_counts: boolean
          hide_share_counts: boolean
          hidden_words_enabled: boolean
          language: string
          data_saver: boolean
          hd_uploads: boolean
          reduce_motion: boolean
          captions_default: boolean
          daily_limit_minutes: number | null
          break_reminder_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          is_private?: boolean
          story_visibility?: string
          activity_status?: boolean
          read_receipts?: boolean
          allow_tags?: string
          allow_mentions?: string
          comment_control?: string
          sharing_allowed?: boolean
          hide_like_counts?: boolean
          hide_share_counts?: boolean
          hidden_words_enabled?: boolean
          language?: string
          data_saver?: boolean
          hd_uploads?: boolean
          reduce_motion?: boolean
          captions_default?: boolean
          daily_limit_minutes?: number | null
          break_reminder_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          is_private?: boolean
          story_visibility?: string
          activity_status?: boolean
          read_receipts?: boolean
          allow_tags?: string
          allow_mentions?: string
          comment_control?: string
          sharing_allowed?: boolean
          hide_like_counts?: boolean
          hide_share_counts?: boolean
          hidden_words_enabled?: boolean
          language?: string
          data_saver?: boolean
          hd_uploads?: boolean
          reduce_motion?: boolean
          captions_default?: boolean
          daily_limit_minutes?: number | null
          break_reminder_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          user_id: string
          phone: string | null
          date_of_birth: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_email: string | null
          parental_consent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          phone?: string | null
          date_of_birth?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_email?: string | null
          parental_consent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          phone?: string | null
          date_of_birth?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_email?: string | null
          parental_consent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_shares: {
        Row: {
          id: string
          admin_id: string
          scout_id: string
          player_id: string
          message: string | null
          status: string
          viewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          scout_id: string
          player_id: string
          message?: string | null
          status?: string
          viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          scout_id?: string
          player_id?: string
          message?: string | null
          status?: string
          viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          bio: string | null
          sport: string | null
          gender: string | null
          avatar_url: string | null
          is_banned: boolean
          created_at: string
          updated_at: string
          username: string | null
          ban_reason: string | null
          ban_message: string | null
          banned_until: string | null
          banned_by: string | null
          banned_at: string | null
          position_tags: string[]
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string
          bio?: string | null
          sport?: string | null
          gender?: string | null
          avatar_url?: string | null
          is_banned?: boolean
          created_at?: string
          updated_at?: string
          username?: string | null
          ban_reason?: string | null
          ban_message?: string | null
          banned_until?: string | null
          banned_by?: string | null
          banned_at?: string | null
          position_tags?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          bio?: string | null
          sport?: string | null
          gender?: string | null
          avatar_url?: string | null
          is_banned?: boolean
          created_at?: string
          updated_at?: string
          username?: string | null
          ban_reason?: string | null
          ban_message?: string | null
          banned_until?: string | null
          banned_by?: string | null
          banned_at?: string | null
          position_tags?: string[]
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          token: string
          user_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          token: string
          user_id: string
          platform?: string
          updated_at?: string
        }
        Update: {
          token?: string
          user_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      restricted_users: {
        Row: {
          user_id: string
          restricted_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          restricted_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          restricted_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restricted_users_restricted_id_profile_fkey"
            columns: ["restricted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_videos: {
        Row: {
          user_id: string
          video_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          video_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          video_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_profiles: {
        Row: {
          id: string
          user_id: string
          verification_status: string
          created_at: string
          full_name: string
          organization: string | null
          is_banned: boolean
          preferred_sport: string | null
          preferred_positions: string[]
          ban_reason: string | null
          ban_message: string | null
          banned_until: string | null
          banned_by: string | null
          banned_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          verification_status?: string
          created_at?: string
          full_name?: string
          organization?: string | null
          is_banned?: boolean
          preferred_sport?: string | null
          preferred_positions?: string[]
          ban_reason?: string | null
          ban_message?: string | null
          banned_until?: string | null
          banned_by?: string | null
          banned_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          verification_status?: string
          created_at?: string
          full_name?: string
          organization?: string | null
          is_banned?: boolean
          preferred_sport?: string | null
          preferred_positions?: string[]
          ban_reason?: string | null
          ban_message?: string | null
          banned_until?: string | null
          banned_by?: string | null
          banned_at?: string | null
        }
        Relationships: []
      }
      scout_requests: {
        Row: {
          id: string
          scout_id: string
          player_id: string
          status: string
          admin_response: string | null
          created_at: string
          notes: string
        }
        Insert: {
          id?: string
          scout_id: string
          player_id: string
          status?: string
          admin_response?: string | null
          created_at?: string
          notes?: string
        }
        Update: {
          id?: string
          scout_id?: string
          player_id?: string
          status?: string
          admin_response?: string | null
          created_at?: string
          notes?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string
          reason: string
          status: string
          created_at: string
          video_id: string | null
          conversation_id: string | null
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id: string
          reason: string
          status?: string
          created_at?: string
          video_id?: string | null
          conversation_id?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string
          reason?: string
          status?: string
          created_at?: string
          video_id?: string | null
          conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      username_audit: {
        Row: {
          id: string
          user_id: string
          old_username: string | null
          new_username: string | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          old_username?: string | null
          new_username?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          old_username?: string | null
          new_username?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          id: string
          video_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_events: {
        Row: {
          id: string
          video_id: string
          viewer_id: string | null
          watch_ms: number
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          viewer_id?: string | null
          watch_ms?: number
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          viewer_id?: string | null
          watch_ms?: number
          completed?: boolean
          created_at?: string
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
          video_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          video_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          video_id?: string
          user_id?: string
          created_at?: string
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
          id: string
          video_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          created_at?: string
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
          id: string
          user_id: string
          video_url: string
          description: string
          position_tags: string[]
          trait_tags: string[]
          status: string
          flagged: boolean
          flag_reason: string | null
          created_at: string
          title: string
          view_count: number
          like_count: number
          share_count: number
          total_watch_ms: number
          ranking_score: number
          score_updated_at: string | null
          archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          video_url?: string
          description?: string
          position_tags?: string[]
          trait_tags?: string[]
          status?: string
          flagged?: boolean
          flag_reason?: string | null
          created_at?: string
          title?: string
          view_count?: number
          like_count?: number
          share_count?: number
          total_watch_ms?: number
          ranking_score?: number
          score_updated_at?: string | null
          archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          video_url?: string
          description?: string
          position_tags?: string[]
          trait_tags?: string[]
          status?: string
          flagged?: boolean
          flag_reason?: string | null
          created_at?: string
          title?: string
          view_count?: number
          like_count?: number
          share_count?: number
          total_watch_ms?: number
          ranking_score?: number
          score_updated_at?: string | null
          archived?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_moderate_user: {
        Args: { _target: string; _action: string; _reason?: string; _message?: string; _hours?: number }
        Returns: undefined
      }
      admin_open_conversation: {
        Args: { _scout: string; _player: string; _request?: string }
        Returns: string
      }
      admin_remove_video: {
        Args: { _video_id: string; _reason: string; _notify?: boolean }
        Returns: undefined
      }
      admin_restore_video: {
        Args: { _video_id: string; _note?: string }
        Returns: undefined
      }
      admin_send_notice: {
        Args: { _title: string; _message: string; _audience?: string; _user_id?: string; _metadata?: Json }
        Returns: number
      }
      admin_set_ban: {
        Args: { _target_user: string; _scope: string; _banned: boolean; _reason?: string; _message?: string; _duration_hours?: number }
        Returns: undefined
      }
      admin_set_conversation_status: {
        Args: { _conversation_id: string; _open: boolean; _reason?: string }
        Returns: undefined
      }
      can_moderate: {
        Args: never
        Returns: boolean
      }
      can_send_dm: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_talent: {
        Args: { _user_id: string }
        Returns: boolean
      }
      comments_allowed: {
        Args: { _video_id: string }
        Returns: boolean
      }
      display_name: {
        Args: { _user_id: string }
        Returns: string
      }
      dm_delete_message: {
        Args: { _message_id: string }
        Returns: undefined
      }
      dm_mark_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      dm_toggle_pin: {
        Args: { _message_id: string }
        Returns: boolean
      }
      enforce_feed_rate_limit: {
        Args: { _user: string; _max?: number }
        Returns: undefined
      }
      get_admin_stats: {
        Args: { _days?: number }
        Returns: Json
      }
      get_admin_user_emails: {
        Args: never
        Returns: {
            user_id: string
            email: string
          }[]
      }
      get_conversations: {
        Args: never
        Returns: {
            id: string
            status: string
            scout_id: string
            player_id: string
            other_id: string
            other_name: string
            other_username: string
            other_avatar: string
            other_is_scout: boolean
            scout_name: string
            player_name: string
            last_body: string
            last_sender: string
            last_at: string
            unread: number
            closed_reason: string
          }[]
      }
      get_follow_stats: {
        Args: { _user_id: string }
        Returns: {
            followers: number
            following: number
            i_follow: boolean
            follows_me: boolean
          }[]
      }
      get_my_ban_status: {
        Args: never
        Returns: {
            is_banned: boolean
            ban_reason: string
            ban_message: string
            banned_until: string
            banned_at: string
            scope: string
          }[]
      }
      get_my_sessions: {
        Args: never
        Returns: {
            id: string
            created_at: string
            updated_at: string
            user_agent: string
            ip: string
            is_current: boolean
          }[]
      }
      get_player_age: {
        Args: { _user_id: string }
        Returns: number
      }
      get_ranked_feed: {
        Args: { _limit?: number; _offset?: number; _sport?: string; _positions?: string[]; _traits?: string[]; _query?: string; _following_only?: boolean }
        Returns: {
            id: string
            user_id: string
            video_url: string
            title: string
            description: string
            position_tags: string[]
            trait_tags: string[]
            full_name: string
            username: string
            sport: string
            avatar_url: string
            like_count: number
            share_count: number
            view_count: number
            comment_count: number
            liked_by_me: boolean
            following: boolean
            comments_enabled: boolean
            created_at: string
            score: number
            is_test_slot: boolean
          }[]
      }
      get_support_contact: {
        Args: never
        Returns: {
            user_id: string
            display_name: string
          }[]
      }
      get_username_audit: {
        Args: { _limit?: number }
        Returns: {
            id: string
            user_id: string
            old_username: string
            new_username: string
            changed_by: string
            changed_at: string
            user_email: string
            changed_by_email: string
          }[]
      }
      get_video_counts: {
        Args: { _video_id: string }
        Returns: {
            like_count: number
            share_count: number
            view_count: number
            comment_count: number
            liked_by_me: boolean
          }[]
      }
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      in_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_active_scout: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_banned: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_blocked_between: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
      is_private_account: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_username_available: {
        Args: { _username: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: { _action: string; _user: string; _video: string; _reason: string; _details?: Json }
        Returns: undefined
      }
      mfa_satisfied: {
        Args: never
        Returns: boolean
      }
      notify_user: {
        Args: { _user_id: string; _title: string; _message: string; _type: string; _metadata?: Json; _category?: string }
        Returns: string
      }
      prepare_account_deletion: {
        Args: { _user_id: string }
        Returns: undefined
      }
      raise_forbidden: {
        Args: { _what: string }
        Returns: undefined
      }
      refresh_video_scores: {
        Args: never
        Returns: undefined
      }
      register_push_token: {
        Args: { _token: string; _platform?: string }
        Returns: undefined
      }
      report_message: {
        Args: { _message_id: string; _reason: string }
        Returns: string
      }
      report_user: {
        Args: { _reported_user: string; _reason: string }
        Returns: string
      }
      report_video: {
        Args: { _video_id: string; _reason: string }
        Returns: string
      }
      require_admin: {
        Args: never
        Returns: string
      }
      revoke_my_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      try_uuid: {
        Args: { _v: string }
        Returns: string
      }
      verify_notify_secret: {
        Args: { _secret: string }
        Returns: boolean
      }
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
