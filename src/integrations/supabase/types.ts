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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          bucket_url: string | null
          captured_at: string | null
          created_at: string | null
          file_hash: string
          filename: string
          gps_lat: number | null
          gps_lon: number | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["photo_role"] | null
          stage: Database["public"]["Enums"]["service_stage"] | null
          uploader_id: string | null
          work_order_id: string | null
        }
        Insert: {
          bucket_url?: string | null
          captured_at?: string | null
          created_at?: string | null
          file_hash: string
          filename: string
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["photo_role"] | null
          stage?: Database["public"]["Enums"]["service_stage"] | null
          uploader_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          bucket_url?: string | null
          captured_at?: string | null
          created_at?: string | null
          file_hash?: string
          filename?: string
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["photo_role"] | null
          stage?: Database["public"]["Enums"]["service_stage"] | null
          uploader_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          correlation_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          anomaly_type: Database["public"]["Enums"]["anomaly_type"]
          confidence_score: number | null
          created_at: string | null
          description: string | null
          detection_model: string | null
          id: string
          investigation_status:
            | Database["public"]["Enums"]["investigation_status"]
            | null
          investigator_id: string | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resource_id: string
          resource_type: string
          severity: string
          updated_at: string | null
        }
        Insert: {
          anomaly_type: Database["public"]["Enums"]["anomaly_type"]
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          detection_model?: string | null
          id?: string
          investigation_status?:
            | Database["public"]["Enums"]["investigation_status"]
            | null
          investigator_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resource_id: string
          resource_type: string
          severity: string
          updated_at?: string | null
        }
        Update: {
          anomaly_type?: Database["public"]["Enums"]["anomaly_type"]
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          detection_model?: string | null
          id?: string
          investigation_status?:
            | Database["public"]["Enums"]["investigation_status"]
            | null
          investigator_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resource_id?: string
          resource_type?: string
          severity?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          consumable: boolean | null
          created_at: string | null
          description: string
          id: string
          lead_time_days: number | null
          sku: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          consumable?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          lead_time_days?: number | null
          sku: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          consumable?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          lead_time_days?: number | null
          sku?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          customer_id: string | null
          hold_reason: string | null
          id: string
          invoice_number: string | null
          penalties: number | null
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          total_amount: number
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          hold_reason?: string | null
          id?: string
          invoice_number?: string | null
          penalties?: number | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          total_amount: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          hold_reason?: string | null
          id?: string
          invoice_number?: string | null
          penalties?: number | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_tokens: {
        Row: {
          action_type: string
          created_at: string | null
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      penalty_applications: {
        Row: {
          amount: number
          created_at: string | null
          dispute_reason: string | null
          disputed: boolean | null
          id: string
          invoice_id: string | null
          penalty_code: string
          reason: string
          resolved_at: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          dispute_reason?: string | null
          disputed?: boolean | null
          id?: string
          invoice_id?: string | null
          penalty_code: string
          reason: string
          resolved_at?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          dispute_reason?: string | null
          disputed?: boolean | null
          id?: string
          invoice_id?: string | null
          penalty_code?: string
          reason?: string
          resolved_at?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penalty_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_applications_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_matrix: {
        Row: {
          active: boolean | null
          auto_bill: boolean | null
          base_reference: string
          calculation_method: string | null
          created_at: string | null
          description: string | null
          dispute_allowed: boolean | null
          id: number
          mfa_required: boolean | null
          penalty_code: string
          percentage_value: number
          rate_card_entry_code: string | null
          severity_level: string
          updated_at: string | null
          violation_type: string
        }
        Insert: {
          active?: boolean | null
          auto_bill?: boolean | null
          base_reference: string
          calculation_method?: string | null
          created_at?: string | null
          description?: string | null
          dispute_allowed?: boolean | null
          id?: number
          mfa_required?: boolean | null
          penalty_code: string
          percentage_value: number
          rate_card_entry_code?: string | null
          severity_level: string
          updated_at?: string | null
          violation_type: string
        }
        Update: {
          active?: boolean | null
          auto_bill?: boolean | null
          base_reference?: string
          calculation_method?: string | null
          created_at?: string | null
          description?: string | null
          dispute_allowed?: boolean | null
          id?: number
          mfa_required?: boolean | null
          penalty_code?: string
          percentage_value?: number
          rate_card_entry_code?: string | null
          severity_level?: string
          updated_at?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      photo_validations: {
        Row: {
          anomaly_details: Json | null
          anomaly_detected: boolean | null
          created_at: string | null
          id: string
          mfa_override_token: string | null
          override_reason: string | null
          photos_validated: boolean | null
          stage: Database["public"]["Enums"]["service_stage"]
          validated_at: string | null
          validated_by: string | null
          validation_result: Json | null
          work_order_id: string | null
        }
        Insert: {
          anomaly_details?: Json | null
          anomaly_detected?: boolean | null
          created_at?: string | null
          id?: string
          mfa_override_token?: string | null
          override_reason?: string | null
          photos_validated?: boolean | null
          stage: Database["public"]["Enums"]["service_stage"]
          validated_at?: string | null
          validated_by?: string | null
          validation_result?: Json | null
          work_order_id?: string | null
        }
        Update: {
          anomaly_details?: Json | null
          anomaly_detected?: boolean | null
          created_at?: string | null
          id?: string
          mfa_override_token?: string | null
          override_reason?: string | null
          photos_validated?: boolean | null
          stage?: Database["public"]["Enums"]["service_stage"]
          validated_at?: string | null
          validated_by?: string | null
          validation_result?: Json | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_validations_mfa_override_token_fkey"
            columns: ["mfa_override_token"]
            isOneToOne: false
            referencedRelation: "mfa_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_validations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          quote_number: string | null
          sapos_offer_id: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          total_amount: number
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          quote_number?: string | null
          sapos_offer_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          quote_number?: string | null
          sapos_offer_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_sapos_offer_id_fkey"
            columns: ["sapos_offer_id"]
            isOneToOne: false
            referencedRelation: "sapos_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      sapos_offers: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          model_version: string | null
          offer_type: string
          price: number
          prompt_template_id: string | null
          status: Database["public"]["Enums"]["sapos_offer_status"] | null
          title: string
          updated_at: string | null
          warranty_conflicts: boolean | null
          work_order_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          offer_type: string
          price: number
          prompt_template_id?: string | null
          status?: Database["public"]["Enums"]["sapos_offer_status"] | null
          title: string
          updated_at?: string | null
          warranty_conflicts?: boolean | null
          work_order_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          offer_type?: string
          price?: number
          prompt_template_id?: string | null
          status?: Database["public"]["Enums"]["sapos_offer_status"] | null
          title?: string
          updated_at?: string | null
          warranty_conflicts?: boolean | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sapos_offers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          oem_id: string | null
          template_content: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          oem_id?: string | null
          template_content: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          oem_id?: string | null
          template_content?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          created_at: string | null
          customer_signature: string | null
          html_content: string | null
          id: string
          pdf_url: string | null
          qr_code_url: string | null
          rendered_data: Json | null
          signed_at: string | null
          so_number: string | null
          technician_signature: string | null
          template_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_signature?: string | null
          html_content?: string | null
          id?: string
          pdf_url?: string | null
          qr_code_url?: string | null
          rendered_data?: Json | null
          signed_at?: string | null
          so_number?: string | null
          technician_signature?: string | null
          template_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_signature?: string | null
          html_content?: string | null
          id?: string
          pdf_url?: string | null
          qr_code_url?: string | null
          rendered_data?: Json | null
          signed_at?: string | null
          so_number?: string | null
          technician_signature?: string | null
          template_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          hub_id: string | null
          id: string
          item_id: string | null
          location: string | null
          min_threshold: number | null
          qty_available: number | null
          qty_reserved: number | null
          updated_at: string | null
        }
        Insert: {
          hub_id?: string | null
          id?: string
          item_id?: string | null
          location?: string | null
          min_threshold?: number | null
          qty_available?: number | null
          qty_reserved?: number | null
          updated_at?: string | null
        }
        Update: {
          hub_id?: string | null
          id?: string
          item_id?: string | null
          location?: string | null
          min_threshold?: number | null
          qty_available?: number | null
          qty_reserved?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          provisional_sla: unknown | null
          site_address: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          symptom: string
          tenant_id: string | null
          unit_serial: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          provisional_sla?: unknown | null
          site_address?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          symptom: string
          tenant_id?: string | null
          unit_serial: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          provisional_sla?: unknown | null
          site_address?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          symptom?: string
          tenant_id?: string | null
          unit_serial?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warranty_records: {
        Row: {
          coverage_type: string | null
          created_at: string | null
          id: string
          model: string | null
          terms_json: Json | null
          unit_serial: string
          updated_at: string | null
          warranty_end: string
          warranty_start: string
        }
        Insert: {
          coverage_type?: string | null
          created_at?: string | null
          id?: string
          model?: string | null
          terms_json?: Json | null
          unit_serial: string
          updated_at?: string | null
          warranty_end: string
          warranty_start: string
        }
        Update: {
          coverage_type?: string | null
          created_at?: string | null
          id?: string
          model?: string | null
          terms_json?: Json | null
          unit_serial?: string
          updated_at?: string | null
          warranty_end?: string
          warranty_start?: string
        }
        Relationships: []
      }
      work_order_prechecks: {
        Row: {
          can_release: boolean | null
          created_at: string | null
          id: string
          inventory_result: Json | null
          inventory_status:
            | Database["public"]["Enums"]["precheck_status"]
            | null
          override_by: string | null
          override_mfa_token: string | null
          override_reason: string | null
          photo_result: Json | null
          photo_status: Database["public"]["Enums"]["precheck_status"] | null
          updated_at: string | null
          warranty_result: Json | null
          warranty_status: Database["public"]["Enums"]["precheck_status"] | null
          work_order_id: string | null
        }
        Insert: {
          can_release?: boolean | null
          created_at?: string | null
          id?: string
          inventory_result?: Json | null
          inventory_status?:
            | Database["public"]["Enums"]["precheck_status"]
            | null
          override_by?: string | null
          override_mfa_token?: string | null
          override_reason?: string | null
          photo_result?: Json | null
          photo_status?: Database["public"]["Enums"]["precheck_status"] | null
          updated_at?: string | null
          warranty_result?: Json | null
          warranty_status?:
            | Database["public"]["Enums"]["precheck_status"]
            | null
          work_order_id?: string | null
        }
        Update: {
          can_release?: boolean | null
          created_at?: string | null
          id?: string
          inventory_result?: Json | null
          inventory_status?:
            | Database["public"]["Enums"]["precheck_status"]
            | null
          override_by?: string | null
          override_mfa_token?: string | null
          override_reason?: string | null
          photo_result?: Json | null
          photo_status?: Database["public"]["Enums"]["precheck_status"] | null
          updated_at?: string | null
          warranty_result?: Json | null
          warranty_status?:
            | Database["public"]["Enums"]["precheck_status"]
            | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_prechecks_override_mfa_token_fkey"
            columns: ["override_mfa_token"]
            isOneToOne: false
            referencedRelation: "mfa_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_prechecks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          completed_at: string | null
          cost_to_customer: number | null
          created_at: string | null
          hub_id: string | null
          id: string
          parts_reserved: boolean | null
          released_at: string | null
          status: Database["public"]["Enums"]["work_order_status"] | null
          technician_id: string | null
          ticket_id: string | null
          updated_at: string | null
          warranty_checked: boolean | null
          warranty_result: Json | null
          wo_number: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_to_customer?: number | null
          created_at?: string | null
          hub_id?: string | null
          id?: string
          parts_reserved?: boolean | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          technician_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
          warranty_checked?: boolean | null
          warranty_result?: Json | null
          wo_number?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_to_customer?: number | null
          created_at?: string | null
          hub_id?: string | null
          id?: string
          parts_reserved?: boolean | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          technician_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
          warranty_checked?: boolean | null
          warranty_result?: Json | null
          wo_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_wo_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      anomaly_type:
        | "photo_tampering"
        | "duplicate_photo"
        | "part_mismatch"
        | "suspicious_usage"
        | "data_breach"
      app_role: "admin" | "manager" | "technician" | "customer"
      investigation_status: "open" | "in_progress" | "resolved" | "escalated"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
        | "on_hold"
      photo_role: "context_wide" | "pre_closeup" | "serial" | "replacement_part"
      precheck_status: "pending" | "passed" | "failed" | "overridden"
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      sapos_offer_status:
        | "generated"
        | "presented"
        | "accepted"
        | "declined"
        | "expired"
      service_stage: "replacement" | "post_repair" | "pickup"
      ticket_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      work_order_status:
        | "draft"
        | "pending_validation"
        | "released"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      anomaly_type: [
        "photo_tampering",
        "duplicate_photo",
        "part_mismatch",
        "suspicious_usage",
        "data_breach",
      ],
      app_role: ["admin", "manager", "technician", "customer"],
      investigation_status: ["open", "in_progress", "resolved", "escalated"],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "on_hold",
      ],
      photo_role: ["context_wide", "pre_closeup", "serial", "replacement_part"],
      precheck_status: ["pending", "passed", "failed", "overridden"],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      sapos_offer_status: [
        "generated",
        "presented",
        "accepted",
        "declined",
        "expired",
      ],
      service_stage: ["replacement", "post_repair", "pickup"],
      ticket_status: [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      work_order_status: [
        "draft",
        "pending_validation",
        "released",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
