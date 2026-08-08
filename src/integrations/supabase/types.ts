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
      addon_groups: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_required: boolean
          max_select: number
          min_select: number
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          min_select?: number
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          min_select?: number
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          business_id: string
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          actor_role: Database["public"]["Enums"]["staff_role"] | null
          after_state: Json | null
          before_state: Json | null
          business_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          actor_role?: Database["public"]["Enums"]["staff_role"] | null
          after_state?: Json | null
          before_state?: Json | null
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          actor_role?: Database["public"]["Enums"]["staff_role"] | null
          after_state?: Json | null
          before_state?: Json | null
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_id: string
          cash_payment_enabled: boolean
          city: string | null
          created_at: string
          customer_cancel_window_seconds: number
          default_tax_rate: number
          discount_reason_required_above: number
          email: string | null
          gstin: string | null
          invoice_prefix: string
          legal_name: string | null
          locale: string
          online_payment_enabled: boolean
          phone: string | null
          postal_code: string | null
          service_charge_rate: number
          state: string | null
          tax_mode: Database["public"]["Enums"]["tax_mode"]
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_id: string
          cash_payment_enabled?: boolean
          city?: string | null
          created_at?: string
          customer_cancel_window_seconds?: number
          default_tax_rate?: number
          discount_reason_required_above?: number
          email?: string | null
          gstin?: string | null
          invoice_prefix?: string
          legal_name?: string | null
          locale?: string
          online_payment_enabled?: boolean
          phone?: string | null
          postal_code?: string | null
          service_charge_rate?: number
          state?: string | null
          tax_mode?: Database["public"]["Enums"]["tax_mode"]
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_id?: string
          cash_payment_enabled?: boolean
          city?: string | null
          created_at?: string
          customer_cancel_window_seconds?: number
          default_tax_rate?: number
          discount_reason_required_above?: number
          email?: string | null
          gstin?: string | null
          invoice_prefix?: string
          legal_name?: string | null
          locale?: string
          online_payment_enabled?: boolean
          phone?: string | null
          postal_code?: string | null
          service_charge_rate?: number
          state?: string | null
          tax_mode?: Database["public"]["Enums"]["tax_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      carts: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string
          id: string
          session_token: string
          table_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string
          id?: string
          session_token: string
          table_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          session_token?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_authorities: {
        Row: {
          approval_required: boolean
          business_id: string
          id: string
          max_amount: number | null
          max_percent: number | null
          role: Database["public"]["Enums"]["staff_role"]
          unlimited: boolean
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          business_id: string
          id?: string
          max_amount?: number | null
          max_percent?: number | null
          role: Database["public"]["Enums"]["staff_role"]
          unlimited?: boolean
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          business_id?: string
          id?: string
          max_amount?: number | null
          max_percent?: number | null
          role?: Database["public"]["Enums"]["staff_role"]
          unlimited?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_authorities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_requests: {
        Row: {
          approved_by: string | null
          business_id: string
          created_at: string
          decided_at: string | null
          discount_type: string
          discounted_total: number
          id: string
          order_id: string
          original_total: number
          reason: string | null
          requested_by: string
          requested_value: number
          requester_role: Database["public"]["Enums"]["staff_role"] | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          business_id: string
          created_at?: string
          decided_at?: string | null
          discount_type?: string
          discounted_total: number
          id?: string
          order_id: string
          original_total: number
          reason?: string | null
          requested_by: string
          requested_value: number
          requester_role?: Database["public"]["Enums"]["staff_role"] | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          business_id?: string
          created_at?: string
          decided_at?: string | null
          discount_type?: string
          discounted_total?: number
          id?: string
          order_id?: string
          original_total?: number
          reason?: string | null
          requested_by?: string
          requested_value?: number
          requester_role?: Database["public"]["Enums"]["staff_role"] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          snapshot: Json
        }
        Insert: {
          business_id: string
          id?: string
          invoice_number: string
          issued_at?: string
          order_id: string
          snapshot: Json
        }
        Update: {
          business_id?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          state: Database["public"]["Enums"]["publish_state"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          state?: Database["public"]["Enums"]["publish_state"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          state?: Database["public"]["Enums"]["publish_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          business_id: string
          created_at: string
          event: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          metadata: Json | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          business_id: string
          created_at?: string
          event: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          metadata?: Json | null
          order_id: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          business_id?: string
          created_at?: string
          event?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          metadata?: Json | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json
          addons_price: number
          business_id: string
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          special_instructions: string | null
          station: string
          tax_amount: number
          tax_rate: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          addons?: Json
          addons_price?: number
          business_id: string
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          special_instructions?: string | null
          station?: string
          tax_amount?: number
          tax_rate?: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          addons?: Json
          addons_price?: number
          business_id?: string
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          special_instructions?: string | null
          station?: string
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          business_id: string
          channel: Database["public"]["Enums"]["order_channel"]
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount_total: number
          grand_total: number
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_by: string | null
          service_charge: number
          session_token: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          table_label: string | null
          tax_total: number
          updated_at: string
          version: number
        }
        Insert: {
          branch_id: string
          business_id: string
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_by?: string | null
          service_charge?: number
          session_token?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          table_label?: string | null
          tax_total?: number
          updated_at?: string
          version?: number
        }
        Update: {
          branch_id?: string
          business_id?: string
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_by?: string | null
          service_charge?: number
          session_token?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          table_label?: string | null
          tax_total?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          collected_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          business_id: string
          collected_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          collected_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          level?: string
          user_id: string
        }
        Update: {
          created_at?: string
          level?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          business_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_price: number
          old_price: number | null
          product_id: string | null
          variant_id: string | null
        }
        Insert: {
          business_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_price: number
          old_price?: number | null
          product_id?: string | null
          variant_id?: string | null
        }
        Update: {
          business_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_price?: number
          old_price?: number | null
          product_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          attempts: number
          branch_id: string | null
          business_id: string
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          order_id: string | null
          payload: Json | null
          status: Database["public"]["Enums"]["print_job_status"]
          target: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          branch_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["print_job_status"]
          target?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          branch_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["print_job_status"]
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_available: boolean
          is_default: boolean
          name: string
          price: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name: string
          price: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name?: string
          price?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_from: string | null
          available_to: string | null
          base_price: number
          business_id: string
          category_id: string | null
          created_at: string
          description: string | null
          food_tags: string[]
          id: string
          images: string[]
          is_archived: boolean
          is_available: boolean
          name: string
          prep_time_minutes: number
          sku: string | null
          sort_order: number
          state: Database["public"]["Enums"]["publish_state"]
          station: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          base_price?: number
          business_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          food_tags?: string[]
          id?: string
          images?: string[]
          is_archived?: boolean
          is_available?: boolean
          name: string
          prep_time_minutes?: number
          sku?: string | null
          sort_order?: number
          state?: Database["public"]["Enums"]["publish_state"]
          station?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          base_price?: number
          business_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          food_tags?: string[]
          id?: string
          images?: string[]
          is_archived?: boolean
          is_available?: boolean
          name?: string
          prep_time_minutes?: number
          sku?: string | null
          sort_order?: number
          state?: Database["public"]["Enums"]["publish_state"]
          station?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qr_slug_history: {
        Row: {
          business_id: string
          id: string
          old_slug: string
          retired_at: string
          retired_by: string | null
          table_id: string
        }
        Insert: {
          business_id: string
          id?: string
          old_slug: string
          retired_at?: string
          retired_by?: string | null
          table_id: string
        }
        Update: {
          business_id?: string
          id?: string
          old_slug?: string
          retired_at?: string
          retired_by?: string | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_slug_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_slug_history_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          issued_by: string | null
          payment_id: string
          provider_refund_id: string | null
          reason: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          issued_by?: string | null
          payment_id: string
          provider_refund_id?: string | null
          reason?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          issued_by?: string | null
          payment_id?: string
          provider_refund_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          branch_id: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_scanned_at: string | null
          outlet_id: string | null
          qr_slug: string
          qr_version: number
          scan_count: number
          seats: number
          sort_order: number
          state: Database["public"]["Enums"]["table_state"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          last_scanned_at?: string | null
          outlet_id?: string | null
          qr_slug: string
          qr_version?: number
          scan_count?: number
          seats?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["table_state"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_scanned_at?: string | null
          outlet_id?: string | null
          qr_slug?: string
          qr_version?: number
          scan_count?: number
          seats?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["table_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      role_default_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_default_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          business_id: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          business_id: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          business_id?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          id: string
          payload: Json | null
          processed_at: string
          provider: string
        }
        Insert: {
          event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string
          provider: string
        }
        Update: {
          event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_perm: {
        Args: { _business_id: string; _permission: string }
        Returns: boolean
      }
      is_member: { Args: { _business_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      my_branch: { Args: { _business_id: string }; Returns: string }
      my_role: {
        Args: { _business_id: string }
        Returns: Database["public"]["Enums"]["staff_role"]
      }
    }
    Enums: {
      business_type:
        | "restaurant"
        | "cafe"
        | "hotel"
        | "resort"
        | "bar_pub"
        | "cloud_kitchen"
        | "food_outlet"
      order_channel: "qr" | "counter" | "waiter"
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "served"
        | "completed"
        | "cancelled"
        | "refunded"
        | "payment_failed"
      payment_method:
        | "upi"
        | "card"
        | "netbanking"
        | "wallet"
        | "cash"
        | "other"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      print_job_status:
        | "queued"
        | "printing"
        | "printed"
        | "failed"
        | "retrying"
      publish_state: "draft" | "published"
      staff_role:
        | "owner"
        | "business_admin"
        | "general_manager"
        | "branch_manager"
        | "floor_manager"
        | "waiter"
        | "cashier"
        | "chef"
        | "kitchen_staff"
        | "bar_staff"
      table_state:
        | "available"
        | "occupied"
        | "payment_pending"
        | "reserved"
        | "disabled"
      tax_mode: "inclusive" | "exclusive"
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
      business_type: [
        "restaurant",
        "cafe",
        "hotel",
        "resort",
        "bar_pub",
        "cloud_kitchen",
        "food_outlet",
      ],
      order_channel: ["qr", "counter", "waiter"],
      order_status: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "served",
        "completed",
        "cancelled",
        "refunded",
        "payment_failed",
      ],
      payment_method: ["upi", "card", "netbanking", "wallet", "cash", "other"],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      print_job_status: ["queued", "printing", "printed", "failed", "retrying"],
      publish_state: ["draft", "published"],
      staff_role: [
        "owner",
        "business_admin",
        "general_manager",
        "branch_manager",
        "floor_manager",
        "waiter",
        "cashier",
        "chef",
        "kitchen_staff",
        "bar_staff",
      ],
      table_state: [
        "available",
        "occupied",
        "payment_pending",
        "reserved",
        "disabled",
      ],
      tax_mode: ["inclusive", "exclusive"],
    },
  },
} as const
