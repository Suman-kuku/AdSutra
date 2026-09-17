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
      conversations: {
        Row: {
          active_skill_file_id: string | null
          archived: boolean
          created_at: string
          created_by: string
          episode_id: string | null
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          message_count: number
          skill_file_slug: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active_skill_file_id?: string | null
          archived?: boolean
          created_at?: string
          created_by: string
          episode_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          message_count?: number
          skill_file_slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active_skill_file_id?: string | null
          archived?: boolean
          created_at?: string
          created_by?: string
          episode_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          message_count?: number
          skill_file_slug?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_active_skill_file_id_fkey"
            columns: ["active_skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_file_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_active_skill_file_id_fkey"
            columns: ["active_skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          created_at: string
          created_by: string | null
          digest_model: string | null
          episode_number: number
          extracted_text: string | null
          file_size: number | null
          id: string
          page_count: number | null
          parse_error: string | null
          script_digest: string | null
          script_filename: string | null
          script_mime: string | null
          script_path: string | null
          show_id: string
          status: Database["public"]["Enums"]["episode_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          digest_model?: string | null
          episode_number: number
          extracted_text?: string | null
          file_size?: number | null
          id?: string
          page_count?: number | null
          parse_error?: string | null
          script_digest?: string | null
          script_filename?: string | null
          script_mime?: string | null
          script_path?: string | null
          show_id: string
          status?: Database["public"]["Enums"]["episode_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          digest_model?: string | null
          episode_number?: number
          extracted_text?: string | null
          file_size?: number | null
          id?: string
          page_count?: number | null
          parse_error?: string | null
          script_digest?: string | null
          script_filename?: string | null
          script_mime?: string | null
          script_path?: string | null
          show_id?: string
          status?: Database["public"]["Enums"]["episode_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          error: string | null
          id: string
          input_tokens: number | null
          intent: Database["public"]["Enums"]["message_intent"] | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          promo_id: string | null
          role: Database["public"]["Enums"]["message_role"]
          skill_file_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          intent?: Database["public"]["Enums"]["message_intent"] | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          promo_id?: string | null
          role: Database["public"]["Enums"]["message_role"]
          skill_file_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          intent?: Database["public"]["Enums"]["message_intent"] | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          promo_id?: string | null
          role?: Database["public"]["Enums"]["message_role"]
          skill_file_id?: string | null
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
            foreignKeyName: "messages_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_skill_file_id_fkey"
            columns: ["skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_file_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_skill_file_id_fkey"
            columns: ["skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_files"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          access_status: Database["public"]["Enums"]["access_status"]
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          access_status?: Database["public"]["Enums"]["access_status"]
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          access_status?: Database["public"]["Enums"]["access_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      promo_performance: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          metrics: Json
          notes: string | null
          outcome: Database["public"]["Enums"]["performance_outcome"]
          period_end: string | null
          period_start: string | null
          platform: string | null
          promo_id: string
          reported_by: string
          spend: number | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          metrics?: Json
          notes?: string | null
          outcome: Database["public"]["Enums"]["performance_outcome"]
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          promo_id: string
          reported_by: string
          spend?: number | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          metrics?: Json
          notes?: string | null
          outcome?: Database["public"]["Enums"]["performance_outcome"]
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          promo_id?: string
          reported_by?: string
          spend?: number | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_performance_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_performance_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_performance_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          conversation_id: string | null
          created_at: string
          created_by: string | null
          duration_sec: number | null
          episode_id: string
          human_edit_ratio: number | null
          id: string
          parent_promo_id: string | null
          root_promo_id: string | null
          skill_file_id: string | null
          skill_file_slug: string | null
          skill_file_version: number | null
          source: Database["public"]["Enums"]["promo_source"]
          status: Database["public"]["Enums"]["promo_status"]
          updated_at: string
          version: number
          word_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          episode_id: string
          human_edit_ratio?: number | null
          id?: string
          parent_promo_id?: string | null
          root_promo_id?: string | null
          skill_file_id?: string | null
          skill_file_slug?: string | null
          skill_file_version?: number | null
          source?: Database["public"]["Enums"]["promo_source"]
          status?: Database["public"]["Enums"]["promo_status"]
          updated_at?: string
          version?: number
          word_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          episode_id?: string
          human_edit_ratio?: number | null
          id?: string
          parent_promo_id?: string | null
          root_promo_id?: string | null
          skill_file_id?: string | null
          skill_file_slug?: string | null
          skill_file_version?: number | null
          source?: Database["public"]["Enums"]["promo_source"]
          status?: Database["public"]["Enums"]["promo_status"]
          updated_at?: string
          version?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promos_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_parent_promo_id_fkey"
            columns: ["parent_promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_skill_file_id_fkey"
            columns: ["skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_file_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promos_skill_file_id_fkey"
            columns: ["skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_files"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string
          default_skill_file_id: string | null
          description: string | null
          genre: string | null
          id: string
          language: string | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_skill_file_id?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_skill_file_id?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_default_skill_file_fkey"
            columns: ["default_skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_file_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_default_skill_file_fkey"
            columns: ["default_skill_file_id"]
            isOneToOne: false
            referencedRelation: "skill_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_file_stats: {
        Row: {
          approved_promos: number
          avg_human_edit: number | null
          last_used_at: string | null
          last_win_at: string | null
          ranking_score: number | null
          refreshed_at: string
          reported_outcomes: number
          slug: string
          total_promos: number
          underperformers: number
          unique_creators: number
          win_rate: number | null
          winners: number
        }
        Insert: {
          approved_promos?: number
          avg_human_edit?: number | null
          last_used_at?: string | null
          last_win_at?: string | null
          ranking_score?: number | null
          refreshed_at?: string
          reported_outcomes?: number
          slug: string
          total_promos?: number
          underperformers?: number
          unique_creators?: number
          win_rate?: number | null
          winners?: number
        }
        Update: {
          approved_promos?: number
          avg_human_edit?: number | null
          last_used_at?: string | null
          last_win_at?: string | null
          ranking_score?: number | null
          refreshed_at?: string
          reported_outcomes?: number
          slug?: string
          total_promos?: number
          underperformers?: number
          unique_creators?: number
          win_rate?: number | null
          winners?: number
        }
        Relationships: []
      }
      skill_files: {
        Row: {
          category: string
          changelog: string | null
          created_at: string
          default_duration_sec: number | null
          description: string | null
          frontmatter: Json
          id: string
          is_active: boolean
          language: string | null
          model: string | null
          name: string
          prompt_body: string
          raw_md: string
          slug: string
          storage_path: string
          tags: string[]
          temperature: number | null
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category: string
          changelog?: string | null
          created_at?: string
          default_duration_sec?: number | null
          description?: string | null
          frontmatter?: Json
          id?: string
          is_active?: boolean
          language?: string | null
          model?: string | null
          name: string
          prompt_body: string
          raw_md: string
          slug: string
          storage_path: string
          tags?: string[]
          temperature?: number | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          changelog?: string | null
          created_at?: string
          default_duration_sec?: number | null
          description?: string | null
          frontmatter?: Json
          id?: string
          is_active?: boolean
          language?: string | null
          model?: string | null
          name?: string
          prompt_body?: string
          raw_md?: string
          slug?: string
          storage_path?: string
          tags?: string[]
          temperature?: number | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          person_id: string
          team_id: string
        }
        Insert: {
          added_at?: string
          person_id: string
          team_id: string
        }
        Update: {
          added_at?: string
          person_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      skill_file_leaderboard: {
        Row: {
          avg_human_edit: number | null
          category: string | null
          category_rank: number | null
          default_duration_sec: number | null
          description: string | null
          has_enough_data: boolean | null
          id: string | null
          is_untested: boolean | null
          last_used_at: string | null
          last_win_at: string | null
          name: string | null
          needs_revision: boolean | null
          ranking_score: number | null
          reported_outcomes: number | null
          slug: string | null
          tags: string[] | null
          total_promos: number | null
          unique_creators: number | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: number | null
          win_rate: number | null
          winners: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_use_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      can_use_episode: { Args: { p_episode_id: string }; Returns: boolean }
      can_use_promo: { Args: { p_promo_id: string }; Returns: boolean }
      can_use_show: { Args: { p_show_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      owns_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      owns_episode: { Args: { p_episode_id: string }; Returns: boolean }
      owns_promo: { Args: { p_promo_id: string }; Returns: boolean }
      owns_show: { Args: { p_show_id: string }; Returns: boolean }
      refresh_skill_file_stats: { Args: never; Returns: undefined }
      shares_team_with: { Args: { p_person_id: string }; Returns: boolean }
    }
    Enums: {
      access_status: "pending" | "approved" | "denied"
      conversation_kind: "episode" | "skill_file"
      episode_status: "uploaded" | "parsing" | "ready" | "failed"
      message_intent: "CREATE" | "EDIT" | "QUESTION"
      message_role: "user" | "assistant" | "system"
      performance_outcome: "winner" | "good" | "neutral" | "underperformed"
      promo_source: "generated" | "refined" | "human_edited"
      promo_status: "draft" | "approved" | "archived"
      user_role: "admin" | "creator"
      verification_status: "self_reported" | "verified"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      access_status: ["pending", "approved", "denied"],
      conversation_kind: ["episode", "skill_file"],
      episode_status: ["uploaded", "parsing", "ready", "failed"],
      message_intent: ["CREATE", "EDIT", "QUESTION"],
      message_role: ["user", "assistant", "system"],
      performance_outcome: ["winner", "good", "neutral", "underperformed"],
      promo_source: ["generated", "refined", "human_edited"],
      promo_status: ["draft", "approved", "archived"],
      user_role: ["admin", "creator"],
      verification_status: ["self_reported", "verified"],
    },
  },
} as const
