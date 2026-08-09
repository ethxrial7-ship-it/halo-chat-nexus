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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          server_id: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          server_id: string
          topic?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          server_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          attachment_type: string | null
          author_id: string
          channel_id: string | null
          content: string
          conversation_id: string | null
          created_at: string
          edited_at: string | null
          id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          author_id: string
          channel_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          author_id?: string
          channel_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          id: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          accent_color?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          accent_color?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      server_members: {
        Row: {
          joined_at: string
          role: string
          server_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          server_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_attachment: { Args: { _path: string }; Returns: boolean }
      channel_server: { Args: { _channel_id: string }; Returns: string }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      join_server_by_invite: { Args: { _code: string }; Returns: string }
      server_preview_by_invite: {
        Args: { _code: string }
        Returns: {
          icon_url: string
          id: string
          member_count: number
          name: string
        }[]
      }
      server_role: {
        Args: { _server_id: string; _user_id: string }
        Returns: string
      }
      start_direct_message: { Args: { _other_user: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
