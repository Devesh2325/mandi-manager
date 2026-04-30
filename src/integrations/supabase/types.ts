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
      challans: {
        Row: {
          challan_no: string
          created_at: string
          data: Json
          date: string
          id: string
          local_id: number | null
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          challan_no: string
          created_at?: string
          data: Json
          date: string
          id?: string
          local_id?: number | null
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          challan_no?: string
          created_at?: string
          data?: Json
          date?: string
          id?: string
          local_id?: number | null
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_accounts: {
        Row: {
          apply_on: string | null
          created_at: string
          data: Json | null
          id: string
          is_preset: boolean | null
          local_id: number | null
          name: string
          operator: string | null
          side: string | null
          tenant_id: string
          value: number | null
          year_label: string | null
        }
        Insert: {
          apply_on?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_preset?: boolean | null
          local_id?: number | null
          name: string
          operator?: string | null
          side?: string | null
          tenant_id: string
          value?: number | null
          year_label?: string | null
        }
        Update: {
          apply_on?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_preset?: boolean | null
          local_id?: number | null
          name?: string
          operator?: string | null
          side?: string | null
          tenant_id?: string
          value?: number | null
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          data: Json | null
          goods_type: string | null
          id: string
          local_id: number | null
          name: string
          short_code: string
          tenant_id: string
          unit: string | null
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          goods_type?: string | null
          id?: string
          local_id?: number | null
          name: string
          short_code: string
          tenant_id: string
          unit?: string | null
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          goods_type?: string | null
          id?: string
          local_id?: number | null
          name?: string
          short_code?: string
          tenant_id?: string
          unit?: string | null
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          local_id: number | null
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          date: string
          id?: string
          local_id?: number | null
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          local_id?: number | null
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      packings: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_returnable: boolean
          local_id: number | null
          name: string
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_returnable?: boolean
          local_id?: number | null
          name: string
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_returnable?: boolean
          local_id?: number | null
          name?: string
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          city: string | null
          created_at: string
          credit_limit: number | null
          data: Json | null
          id: string
          local_id: number | null
          mobile: string | null
          name: string
          opening_balance: number
          opening_type: string
          short_code: string
          tenant_id: string
          type: string
          village: string | null
          year_label: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          data?: Json | null
          id?: string
          local_id?: number | null
          mobile?: string | null
          name: string
          opening_balance?: number
          opening_type?: string
          short_code: string
          tenant_id: string
          type: string
          village?: string | null
          year_label?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          data?: Json | null
          id?: string
          local_id?: number | null
          mobile?: string | null
          name?: string
          opening_balance?: number
          opening_type?: string
          short_code?: string
          tenant_id?: string
          type?: string
          village?: string | null
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_tenant_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_tenant_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_tenant_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_tenant_id_fkey"
            columns: ["default_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qualities: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          item_local_id: number | null
          local_id: number | null
          name: string
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          item_local_id?: number | null
          local_id?: number | null
          name: string
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          item_local_id?: number | null
          local_id?: number | null
          name?: string
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          local_id: number | null
          name: string
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: number | null
          name: string
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: number | null
          name?: string
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sizes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          local_id: number | null
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          date: string
          id?: string
          local_id?: number | null
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          local_id?: number | null
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          data: Json | null
          id: string
          local_id: number | null
          name: string
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: number | null
          name: string
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: number | null
          name?: string
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teeps: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          local_id: number | null
          teep_no: string
          tenant_id: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          date: string
          id?: string
          local_id?: number | null
          teep_no: string
          tenant_id: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          local_id?: number | null
          teep_no?: string
          tenant_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teeps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          gst_number: string | null
          id: string
          license_number: string | null
          owner_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          gst_number?: string | null
          id?: string
          license_number?: string | null
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          gst_number?: string | null
          id?: string
          license_number?: string | null
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          local_id: number | null
          tenant_id: string
          type: string
          voucher_no: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          date: string
          id?: string
          local_id?: number | null
          tenant_id: string
          type: string
          voucher_no: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          local_id?: number | null
          tenant_id?: string
          type?: string
          voucher_no?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      super_admin_stats: {
        Args: never
        Returns: {
          active_tenants: number
          total_challans: number
          total_teeps: number
          total_tenants: number
          total_users: number
          total_vouchers: number
        }[]
      }
      super_admin_tenant_stats: {
        Args: never
        Returns: {
          challan_count: number
          company_name: string
          status: string
          tenant_id: string
          user_count: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "tenant_admin"
        | "operator"
        | "accountant"
        | "viewer"
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
      app_role: [
        "super_admin",
        "tenant_admin",
        "operator",
        "accountant",
        "viewer",
      ],
    },
  },
} as const
