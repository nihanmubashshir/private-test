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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          time_zone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["goal_kind"]
          label: string
          owner_id: string
          start_value: number | null
          status: Database["public"]["Enums"]["goal_status"]
          subject: Database["public"]["Enums"]["goal_subject"]
          target_count: number | null
          target_metric: string | null
          target_value: number | null
          updated_at: string
          window_days: number | null
          workout_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["goal_kind"]
          label: string
          owner_id?: string
          start_value?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          subject: Database["public"]["Enums"]["goal_subject"]
          target_count?: number | null
          target_metric?: string | null
          target_value?: number | null
          updated_at?: string
          window_days?: number | null
          workout_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          label?: string
          owner_id?: string
          start_value?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          subject?: Database["public"]["Enums"]["goal_subject"]
          target_count?: number | null
          target_metric?: string | null
          target_value?: number | null
          updated_at?: string
          window_days?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_sessions: {
        Row: {
          added_workout_ids: string[]
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          name: string
          note: string | null
          owner_id: string
          plan_day_id: string | null
          started_at: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          added_workout_ids?: string[]
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          name: string
          note?: string | null
          owner_id?: string
          plan_day_id?: string | null
          started_at: string
          time_zone: string
          updated_at?: string
        }
        Update: {
          added_workout_ids?: string[]
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          name?: string
          note?: string | null
          owner_id?: string
          plan_day_id?: string | null
          started_at?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_sessions_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_days: {
        Row: {
          created_at: string
          id: string
          is_rest: boolean
          name: string | null
          owner_id: string
          plan_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_rest?: boolean
          name?: string | null
          owner_id?: string
          plan_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          is_rest?: boolean
          name?: string | null
          owner_id?: string
          plan_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          plan_day_id: string
          position: number
          target_reps: number | null
          target_sets: number | null
          target_weight: number | null
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          plan_day_id: string
          position: number
          target_reps?: number | null
          target_sets?: number | null
          target_weight?: number | null
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          plan_day_id?: string
          position?: number
          target_reps?: number | null
          target_sets?: number | null
          target_weight?: number | null
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          owner_id: string
          started_at: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          owner_id?: string
          started_at: string
          time_zone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          owner_id?: string
          started_at?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          completed_at: string
          created_at: string
          distance_m: number | null
          duration_s: number | null
          id: string
          is_warmup: boolean
          owner_id: string
          position: number
          reps: number | null
          session_id: string
          updated_at: string
          weight: number | null
          workout_id: string
        }
        Insert: {
          completed_at: string
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          is_warmup?: boolean
          owner_id?: string
          position: number
          reps?: number | null
          session_id: string
          updated_at?: string
          weight?: number | null
          workout_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          id?: string
          is_warmup?: boolean
          owner_id?: string
          position?: number
          reps?: number | null
          session_id?: string
          updated_at?: string
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gym_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      weigh_ins: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          note: string | null
          owner_id: string
          time_zone: string
          updated_at: string
          value_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at: string
          note?: string | null
          owner_id?: string
          time_zone: string
          updated_at?: string
          value_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          note?: string | null
          owner_id?: string
          time_zone?: string
          updated_at?: string
          value_kg?: number
        }
        Relationships: []
      }
      workouts: {
        Row: {
          archived_at: string | null
          created_at: string
          default_sets: number
          group_name: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          tracks: Database["public"]["Enums"]["tracked_field"][]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_sets?: number
          group_name?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string
          tracks: Database["public"]["Enums"]["tracked_field"][]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_sets?: number
          group_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          tracks?: Database["public"]["Enums"]["tracked_field"][]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_plan: { Args: { target: string }; Returns: undefined }
      create_plan: {
        Args: { activate?: boolean; plan_name: string }
        Returns: string
      }
      seed_gym_defaults: { Args: never; Returns: undefined }
    }
    Enums: {
      goal_kind: "target" | "streak"
      goal_status: "active" | "paused" | "completed"
      goal_subject: "weight" | "running" | "gym" | "workout"
      tracked_field: "reps" | "weight" | "duration" | "distance"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      goal_kind: ["target", "streak"],
      goal_status: ["active", "paused", "completed"],
      goal_subject: ["weight", "running", "gym", "workout"],
      tracked_field: ["reps", "weight", "duration", "distance"],
    },
  },
} as const
