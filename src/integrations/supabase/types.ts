export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_data: {
        Row: {
          agent_id: string | null
          collected_at: string | null
          error_message: string | null
          id: string
          processed_data: Json | null
          raw_response: Json | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          collected_at?: string | null
          error_message?: string | null
          id?: string
          processed_data?: Json | null
          raw_response?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          collected_at?: string | null
          error_message?: string | null
          id?: string
          processed_data?: Json | null
          raw_response?: Json | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_data_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          api_key: string | null
          auth_method: string | null
          category: string | null
          communication_method: string | null
          created_at: string | null
          custom_config: Json | null
          custom_headers: Json | null
          data_types: string[] | null
          description: string | null
          execution_count: number | null
          failure_count: number | null
          id: string
          last_execution: string | null
          name: string
          next_execution: string | null
          payload_format: string | null
          schedule_enabled: boolean | null
          schedule_frequency: number | null
          status: string | null
          success_count: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          version: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          auth_method?: string | null
          category?: string | null
          communication_method?: string | null
          created_at?: string | null
          custom_config?: Json | null
          custom_headers?: Json | null
          data_types?: string[] | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          last_execution?: string | null
          name: string
          next_execution?: string | null
          payload_format?: string | null
          schedule_enabled?: boolean | null
          schedule_frequency?: number | null
          status?: string | null
          success_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          auth_method?: string | null
          category?: string | null
          communication_method?: string | null
          created_at?: string | null
          custom_config?: Json | null
          custom_headers?: Json | null
          data_types?: string[] | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          last_execution?: string | null
          name?: string
          next_execution?: string | null
          payload_format?: string | null
          schedule_enabled?: boolean | null
          schedule_frequency?: number | null
          status?: string | null
          success_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_agents: {
        Row: {
          api_url: string
          body_template: string | null
          collection_interval: number | null
          created_at: string | null
          data_path: string | null
          description: string | null
          headers: Json | null
          http_method: string | null
          id: string
          last_run: string | null
          name: string
          next_run: string | null
          query_params: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_url: string
          body_template?: string | null
          collection_interval?: number | null
          created_at?: string | null
          data_path?: string | null
          description?: string | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          last_run?: string | null
          name: string
          next_run?: string | null
          query_params?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_url?: string
          body_template?: string | null
          collection_interval?: number | null
          created_at?: string | null
          data_path?: string | null
          description?: string | null
          headers?: Json | null
          http_method?: string | null
          id?: string
          last_run?: string | null
          name?: string
          next_run?: string | null
          query_params?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_executions: {
        Row: {
          agent_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          response_data: Json | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          agent_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          response_data?: Json | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          agent_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          response_data?: Json | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "api_agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
