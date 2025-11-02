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
      ab_test_experiments: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string | null
          variants: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          variants: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          variants?: Json
        }
        Relationships: []
      }
      ab_test_results: {
        Row: {
          conversion_value: number | null
          converted: boolean | null
          converted_at: string | null
          created_at: string | null
          experiment_id: string | null
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          experiment_id?: string | null
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          experiment_id?: string | null
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_test_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory_pointers: {
        Row: {
          access_count: number | null
          agent_id: string
          created_at: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          importance_score: number | null
          last_accessed_at: string | null
          memory_type: string
          summary: string | null
        }
        Insert: {
          access_count?: number | null
          agent_id: string
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type: string
          summary?: string | null
        }
        Update: {
          access_count?: number | null
          agent_id?: string
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          importance_score?: number | null
          last_accessed_at?: string | null
          memory_type?: string
          summary?: string | null
        }
        Relationships: []
      }
      agent_policy_bindings: {
        Row: {
          active: boolean | null
          agent_id: string
          created_at: string | null
          id: string
          policy_id: string
          priority: number | null
        }
        Insert: {
          active?: boolean | null
          agent_id: string
          created_at?: string | null
          id?: string
          policy_id: string
          priority?: number | null
        }
        Update: {
          active?: boolean | null
          agent_id?: string
          created_at?: string | null
          id?: string
          policy_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_policy_bindings_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_registry"
            referencedColumns: ["policy_id"]
          },
        ]
      }
      agent_queue: {
        Row: {
          action_type: string
          agent_id: string
          completed_at: string | null
          correlation_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          payload: Json
          priority: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          action_type: string
          agent_id: string
          completed_at?: string | null
          correlation_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          payload: Json
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          action_type?: string
          agent_id?: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      agent_trace_logs: {
        Row: {
          agent_id: string
          correlation_id: string
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          status: string
          step: string
        }
        Insert: {
          agent_id: string
          correlation_id: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          status: string
          step: string
        }
        Update: {
          agent_id?: string
          correlation_id?: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          status?: string
          step?: string
        }
        Relationships: []
      }
      analytics_anomalies: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          anomaly_type: string
          confidence_score: number
          context: Json | null
          created_at: string
          data_source_id: string | null
          detected_at: string
          detected_value: number | null
          deviation_score: number
          expected_value: number | null
          id: string
          metric_name: string
          resolution_notes: string | null
          severity: string
          workspace_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type: string
          confidence_score: number
          context?: Json | null
          created_at?: string
          data_source_id?: string | null
          detected_at?: string
          detected_value?: number | null
          deviation_score: number
          expected_value?: number | null
          id?: string
          metric_name: string
          resolution_notes?: string | null
          severity?: string
          workspace_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type?: string
          confidence_score?: number
          context?: Json | null
          created_at?: string
          data_source_id?: string | null
          detected_at?: string
          detected_value?: number | null
          deviation_score?: number
          expected_value?: number | null
          id?: string
          metric_name?: string
          resolution_notes?: string | null
          severity?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_anomalies_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_anomalies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      analytics_compliance_checks: {
        Row: {
          control_id: string
          created_at: string
          evidence: Json | null
          framework: string
          id: string
          last_checked_at: string
          next_check_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          control_id: string
          created_at?: string
          evidence?: Json | null
          framework: string
          id?: string
          last_checked_at?: string
          next_check_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          control_id?: string
          created_at?: string
          evidence?: Json | null
          framework?: string
          id?: string
          last_checked_at?: string
          next_check_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_compliance_checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_dashboards: {
        Row: {
          created_at: string | null
          dashboard_config: Json
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dashboard_config?: Json
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dashboard_config?: Json
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_data_profiles: {
        Row: {
          avg_value: number | null
          column_name: string | null
          created_at: string
          data_source_id: string | null
          data_type: string | null
          distinct_count: number | null
          distinct_percentage: number | null
          id: string
          max_value: string | null
          min_value: string | null
          null_count: number | null
          null_percentage: number | null
          pattern_analysis: Json | null
          profiled_at: string
          row_count: number | null
          table_name: string
          value_distribution: Json | null
          workspace_id: string
        }
        Insert: {
          avg_value?: number | null
          column_name?: string | null
          created_at?: string
          data_source_id?: string | null
          data_type?: string | null
          distinct_count?: number | null
          distinct_percentage?: number | null
          id?: string
          max_value?: string | null
          min_value?: string | null
          null_count?: number | null
          null_percentage?: number | null
          pattern_analysis?: Json | null
          profiled_at?: string
          row_count?: number | null
          table_name: string
          value_distribution?: Json | null
          workspace_id: string
        }
        Update: {
          avg_value?: number | null
          column_name?: string | null
          created_at?: string
          data_source_id?: string | null
          data_type?: string | null
          distinct_count?: number | null
          distinct_percentage?: number | null
          id?: string
          max_value?: string | null
          min_value?: string | null
          null_count?: number | null
          null_percentage?: number | null
          pattern_analysis?: Json | null
          profiled_at?: string
          row_count?: number | null
          table_name?: string
          value_distribution?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_profiles_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_data_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_data_quality_results: {
        Row: {
          created_at: string
          details: Json | null
          error_samples: Json | null
          execution_time: string
          id: string
          passed: boolean
          records_failed: number | null
          records_tested: number | null
          remediation_suggestions: string | null
          rule_id: string
          score: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_samples?: Json | null
          execution_time?: string
          id?: string
          passed: boolean
          records_failed?: number | null
          records_tested?: number | null
          remediation_suggestions?: string | null
          rule_id: string
          score?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_samples?: Json | null
          execution_time?: string
          id?: string
          passed?: boolean
          records_failed?: number | null
          records_tested?: number | null
          remediation_suggestions?: string | null
          rule_id?: string
          score?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_quality_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_quality_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_data_quality_results_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_data_quality_rules: {
        Row: {
          column_name: string | null
          created_at: string
          created_by: string
          data_source_id: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          rule_definition: Json
          rule_type: string
          schedule_cron: string | null
          severity: string
          table_name: string
          tenant_id: string
          threshold_value: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          column_name?: string | null
          created_at?: string
          created_by: string
          data_source_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          rule_definition?: Json
          rule_type: string
          schedule_cron?: string | null
          severity?: string
          table_name: string
          tenant_id: string
          threshold_value?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          column_name?: string | null
          created_at?: string
          created_by?: string
          data_source_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          rule_definition?: Json
          rule_type?: string
          schedule_cron?: string | null
          severity?: string
          table_name?: string
          tenant_id?: string
          threshold_value?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_quality_rules_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_data_quality_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_data_sources: {
        Row: {
          connection_config: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_sync_at: string | null
          name: string
          source_type: string
          status: string
          sync_frequency: string | null
          tenant_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          source_type: string
          status?: string
          sync_frequency?: string | null
          tenant_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          source_type?: string
          status?: string
          sync_frequency?: string | null
          tenant_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          properties: Json
          source: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          properties: Json
          source?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          properties?: Json
          source?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_exports: {
        Row: {
          correlation_id: string | null
          created_at: string | null
          dataset: string
          format: string
          id: string
          record_count: number
          tenant_id: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string | null
          dataset: string
          format: string
          id?: string
          record_count?: number
          tenant_id: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string | null
          dataset?: string
          format?: string
          id?: string
          record_count?: number
          tenant_id?: string
        }
        Relationships: []
      }
      analytics_jit_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          duration_hours: number
          expires_at: string | null
          id: string
          justification: string
          requested_permissions: string[]
          requester_id: string
          resource_id: string
          resource_type: string
          revoked_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_hours?: number
          expires_at?: string | null
          id?: string
          justification: string
          requested_permissions: string[]
          requester_id: string
          resource_id: string
          resource_type: string
          revoked_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_hours?: number
          expires_at?: string | null
          id?: string
          justification?: string
          requested_permissions?: string[]
          requester_id?: string
          resource_id?: string
          resource_type?: string
          revoked_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_jit_access_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_ml_models: {
        Row: {
          artifact_uri: string | null
          config: Json
          created_at: string
          created_by: string
          deployed_at: string | null
          description: string | null
          framework: string
          id: string
          metrics: Json | null
          model_type: string
          name: string
          status: string
          tenant_id: string
          training_data_source_id: string | null
          updated_at: string
          version: string
          workspace_id: string
        }
        Insert: {
          artifact_uri?: string | null
          config?: Json
          created_at?: string
          created_by: string
          deployed_at?: string | null
          description?: string | null
          framework: string
          id?: string
          metrics?: Json | null
          model_type: string
          name: string
          status?: string
          tenant_id: string
          training_data_source_id?: string | null
          updated_at?: string
          version?: string
          workspace_id: string
        }
        Update: {
          artifact_uri?: string | null
          config?: Json
          created_at?: string
          created_by?: string
          deployed_at?: string | null
          description?: string | null
          framework?: string
          id?: string
          metrics?: Json | null
          model_type?: string
          name?: string
          status?: string
          tenant_id?: string
          training_data_source_id?: string | null
          updated_at?: string
          version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_ml_models_training_data_source_id_fkey"
            columns: ["training_data_source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_ml_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_logs: Json | null
          id: string
          pipeline_id: string
          records_processed: number | null
          started_at: string
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_logs?: Json | null
          id?: string
          pipeline_id: string
          records_processed?: number | null
          started_at?: string
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_logs?: Json | null
          id?: string
          pipeline_id?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "analytics_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_pipeline_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pipelines: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          schedule: string | null
          source_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          schedule?: string | null
          source_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          schedule?: string | null
          source_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pipelines_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_query_history: {
        Row: {
          data_source_id: string | null
          error_message: string | null
          executed_at: string
          execution_time_ms: number | null
          id: string
          query_text: string
          rows_returned: number | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          data_source_id?: string | null
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          query_text: string
          rows_returned?: number | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          data_source_id?: string | null
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          query_text?: string
          rows_returned?: number | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_query_history_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "analytics_data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_query_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_security_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          findings: Json | null
          id: string
          risk_score: number | null
          scan_type: string
          started_at: string
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          findings?: Json | null
          id?: string
          risk_score?: number | null
          scan_type: string
          started_at?: string
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          findings?: Json | null
          id?: string
          risk_score?: number | null
          scan_type?: string
          started_at?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_security_scans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "analytics_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          query_quota_per_day: number
          status: string
          storage_quota_gb: number
          tenant_id: string
          updated_at: string
          workspace_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          query_quota_per_day?: number
          status?: string
          storage_quota_gb?: number
          tenant_id: string
          updated_at?: string
          workspace_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          query_quota_per_day?: number
          status?: string
          storage_quota_gb?: number
          tenant_id?: string
          updated_at?: string
          workspace_type?: string
        }
        Relationships: []
      }
      api_overage_logs: {
        Row: {
          actual_usage: number
          api_key_id: string | null
          daily_limit: number
          id: string
          overage_count: number
          tenant_id: string
          timestamp: string | null
        }
        Insert: {
          actual_usage: number
          api_key_id?: string | null
          daily_limit: number
          id?: string
          overage_count: number
          tenant_id: string
          timestamp?: string | null
        }
        Update: {
          actual_usage?: number
          api_key_id?: string | null
          daily_limit?: number
          id?: string
          overage_count?: number
          tenant_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_overage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "tenant_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_overage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          correlation_id: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          request_size: number | null
          response_time: number | null
          status_code: number
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          correlation_id?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          request_size?: number | null
          response_time?: number | null
          status_code: number
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          correlation_id?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          request_size?: number | null
          response_time?: number | null
          status_code?: number
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "tenant_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_metrics: {
        Row: {
          api_endpoint: string
          billing_tier: string | null
          cost_incurred: number | null
          data_transferred_kb: number | null
          error_count: number | null
          http_method: string
          id: string
          metadata: Json | null
          partner_id: string | null
          recorded_at: string
          request_count: number | null
          response_time_ms: number | null
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          api_endpoint: string
          billing_tier?: string | null
          cost_incurred?: number | null
          data_transferred_kb?: number | null
          error_count?: number | null
          http_method: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          recorded_at?: string
          request_count?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          api_endpoint?: string
          billing_tier?: string | null
          cost_incurred?: number | null
          data_transferred_kb?: number | null
          error_count?: number | null
          http_method?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          recorded_at?: string
          request_count?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_metrics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      applied_penalties: {
        Row: {
          auto_applied: boolean | null
          base_amount: number
          created_at: string | null
          dispute_allowed: boolean | null
          disputed_at: string | null
          id: string
          metadata: Json | null
          penalty_amount: number
          penalty_code: string
          penalty_percentage: number
          resolved_at: string | null
          severity_level: string
          status: string | null
          technician_id: string | null
          violation_type: string
          work_order_id: string | null
        }
        Insert: {
          auto_applied?: boolean | null
          base_amount?: number
          created_at?: string | null
          dispute_allowed?: boolean | null
          disputed_at?: string | null
          id?: string
          metadata?: Json | null
          penalty_amount: number
          penalty_code: string
          penalty_percentage: number
          resolved_at?: string | null
          severity_level: string
          status?: string | null
          technician_id?: string | null
          violation_type: string
          work_order_id?: string | null
        }
        Update: {
          auto_applied?: boolean | null
          base_amount?: number
          created_at?: string | null
          dispute_allowed?: boolean | null
          disputed_at?: string | null
          id?: string
          metadata?: Json | null
          penalty_amount?: number
          penalty_code?: string
          penalty_percentage?: number
          resolved_at?: string | null
          severity_level?: string
          status?: string | null
          technician_id?: string | null
          violation_type?: string
          work_order_id?: string | null
        }
        Relationships: []
      }
      asset_lifecycle_events: {
        Row: {
          asset_id: string
          details: Json | null
          event_time: string | null
          event_type: string
          id: string
        }
        Insert: {
          asset_id: string
          details?: Json | null
          event_time?: string | null
          event_type: string
          id?: string
        }
        Update: {
          asset_id?: string
          details?: Json | null
          event_time?: string | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          location: Json | null
          metadata: Json | null
          name: string
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          name: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          name?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
          actor_role: string | null
          changes: Json | null
          correlation_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          mfa_verified: boolean | null
          reason: string | null
          resource_id: string | null
          resource_type: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          changes?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mfa_verified?: boolean | null
          reason?: string | null
          resource_id?: string | null
          resource_type: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          changes?: Json | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mfa_verified?: boolean | null
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_connectors: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          name: string
          provider: string
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          name: string
          provider: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          name?: string
          provider?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_usage: {
        Row: {
          amount_due: number
          api_calls: number
          billing_cycle_end: string
          billing_cycle_start: string
          created_at: string | null
          endpoint: string
          id: string
          rate_per_call: number
          status: string
          stripe_invoice_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount_due?: number
          api_calls?: number
          billing_cycle_end: string
          billing_cycle_start: string
          created_at?: string | null
          endpoint: string
          id?: string
          rate_per_call?: number
          status?: string
          stripe_invoice_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount_due?: number
          api_calls?: number
          billing_cycle_end?: string
          billing_cycle_start?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          rate_per_call?: number
          status?: string
          stripe_invoice_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          calendar_name: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          calendar_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          calendar_connection_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          external_event_id: string | null
          id: string
          last_synced_at: string | null
          location: string | null
          start_time: string
          sync_status: string | null
          title: string
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          attendees?: Json | null
          calendar_connection_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          external_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          start_time: string
          sync_status?: string | null
          title: string
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          attendees?: Json | null
          calendar_connection_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          external_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          start_time?: string
          sync_status?: string | null
          title?: string
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean | null
          commission_percentage: number
          created_at: string | null
          id: string
          max_amount: number | null
          min_amount: number | null
          organization_id: string | null
          partner_id: string | null
          priority: number | null
          rule_name: string
          service_type: string | null
        }
        Insert: {
          active?: boolean | null
          commission_percentage: number
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          organization_id?: string | null
          partner_id?: string | null
          priority?: number | null
          rule_name: string
          service_type?: string | null
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          organization_id?: string | null
          partner_id?: string | null
          priority?: number | null
          rule_name?: string
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_controls: {
        Row: {
          control_id: string
          description: string | null
          framework_id: string
          id: string
          status: string
          title: string
        }
        Insert: {
          control_id: string
          description?: string | null
          framework_id: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          control_id?: string
          description?: string | null
          framework_id?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      compliance_evidence: {
        Row: {
          control_id: string
          framework_id: string
          id: string
          metadata: Json | null
          notes: string | null
          record_date: string | null
          status: string
        }
        Insert: {
          control_id: string
          framework_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          record_date?: string | null
          status?: string
        }
        Update: {
          control_id?: string
          framework_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          record_date?: string | null
          status?: string
        }
        Relationships: []
      }
      compliance_frameworks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          compliance_score: number | null
          findings: Json | null
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          tenant_id: string | null
        }
        Insert: {
          compliance_score?: number | null
          findings?: Json | null
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          tenant_id?: string | null
        }
        Update: {
          compliance_score?: number | null
          findings?: Json | null
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      contract_invoices: {
        Row: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          contract_id: string | null
          due_date: string | null
          generated_at: string | null
          id: string
          invoice_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          contract_id?: string | null
          due_date?: string | null
          generated_at?: string | null
          id?: string
          invoice_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string
          billing_period_start?: string
          contract_id?: string | null
          due_date?: string | null
          generated_at?: string | null
          id?: string
          invoice_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_line_items: {
        Row: {
          billing_frequency: string | null
          contract_id: string | null
          description: string
          id: string
          item_type: string
          metadata: Json | null
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          billing_frequency?: string | null
          contract_id?: string | null
          description: string
          id?: string
          item_type: string
          metadata?: Json | null
          quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          billing_frequency?: string | null
          contract_id?: string | null
          description?: string
          id?: string
          item_type?: string
          metadata?: Json | null
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "service_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          state: string | null
          street: string | null
        }
        Insert: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
        }
        Update: {
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communication_preferences: {
        Row: {
          email_enabled: boolean | null
          id: string
          preferred_channel: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          email_enabled?: boolean | null
          id?: string
          preferred_channel?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          email_enabled?: boolean | null
          id?: string
          preferred_channel?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          created_at: string | null
          customer_id: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          note: string
          note_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          note: string
          note_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          note?: string
          note_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access: {
        Row: {
          accepted_at: string | null
          access_level: string | null
          active: boolean | null
          created_at: string | null
          customer_id: string | null
          id: string
          invitation_expires_at: string | null
          invitation_token: string | null
          last_login_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string | null
          active?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          last_login_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_level?: string | null
          active?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          last_login_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_users: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_surveys: {
        Row: {
          customer_id: string
          id: string
          rating: number | null
          responses: Json
          submitted_at: string | null
          survey_type: string
          work_order_id: string | null
        }
        Insert: {
          customer_id: string
          id?: string
          rating?: number | null
          responses: Json
          submitted_at?: string | null
          survey_type: string
          work_order_id?: string | null
        }
        Update: {
          customer_id?: string
          id?: string
          rating?: number | null
          responses?: Json
          submitted_at?: string | null
          survey_type?: string
          work_order_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          company_name: string | null
          created_at: string | null
          credit_limit: number | null
          customer_number: string | null
          customer_type: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          organization_id: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tags: string[] | null
          tax_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_number?: string | null
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          organization_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tags?: string[] | null
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_number?: string | null
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          organization_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tags?: string[] | null
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string | null
          dashboard_id: string | null
          id: string
          position: Json
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          position: Json
          widget_type: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          position?: Json
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "analytics_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          customer_id: string
          evidence: string | null
          id: string
          invoice_id: string | null
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          evidence?: string | null
          id?: string
          invoice_id?: string | null
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          evidence?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      document_extractions: {
        Row: {
          bounding_box: Json | null
          confidence_score: number | null
          created_at: string | null
          document_id: string | null
          field_name: string
          field_type: string | null
          field_value: string | null
          id: string
          page_number: number | null
        }
        Insert: {
          bounding_box?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_id?: string | null
          field_name: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          page_number?: number | null
        }
        Update: {
          bounding_box?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_id?: string | null
          field_name?: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          created_by: string | null
          file_format: string
          id: string
          is_active: boolean
          placeholders: Json
          preview_data: Json | null
          storage_path: string
          template_name: string
          template_type: string
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_format: string
          id?: string
          is_active?: boolean
          placeholders?: Json
          preview_data?: Json | null
          storage_path: string
          template_name: string
          template_type: string
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_format?: string
          id?: string
          is_active?: boolean
          placeholders?: Json
          preview_data?: Json | null
          storage_path?: string
          template_name?: string
          template_type?: string
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_number: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string | null
          ocr_confidence: number | null
          ocr_status: string | null
          organization_id: string | null
          tags: string[] | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_number?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_status?: string | null
          organization_id?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_number?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_status?: string | null
          organization_id?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          created_at: string | null
          customer_id: string | null
          equipment_number: string | null
          id: string
          installation_date: string | null
          location: Json | null
          manufacturer: string | null
          metadata: Json | null
          model: string | null
          name: string
          organization_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          qr_code: string | null
          serial_number: string | null
          specifications: Json | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          customer_id?: string | null
          equipment_number?: string | null
          id?: string
          installation_date?: string | null
          location?: Json | null
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          name: string
          organization_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          customer_id?: string | null
          equipment_number?: string | null
          id?: string
          installation_date?: string | null
          location?: Json | null
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          name?: string
          organization_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_history: {
        Row: {
          cost: number | null
          description: string | null
          downtime_hours: number | null
          equipment_id: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          parts_used: Json | null
          technician_id: string | null
          work_order_id: string | null
        }
        Insert: {
          cost?: number | null
          description?: string | null
          downtime_hours?: number | null
          equipment_id?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          parts_used?: Json | null
          technician_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          cost?: number | null
          description?: string | null
          downtime_hours?: number | null
          equipment_id?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          parts_used?: Json | null
          technician_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance_schedule: {
        Row: {
          active: boolean | null
          assigned_to: string | null
          created_at: string | null
          equipment_id: string | null
          frequency_days: number
          id: string
          last_maintenance_date: string | null
          next_maintenance_date: string
          priority: string | null
          schedule_type: string
          task_description: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          equipment_id?: string | null
          frequency_days: number
          id?: string
          last_maintenance_date?: string | null
          next_maintenance_date: string
          priority?: string | null
          schedule_type: string
          task_description?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          equipment_id?: string | null
          frequency_days?: number
          id?: string
          last_maintenance_date?: string | null
          next_maintenance_date?: string
          priority?: string | null
          schedule_type?: string
          task_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_schedule_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_schedule_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_sensors: {
        Row: {
          equipment_id: string | null
          id: string
          recorded_at: string | null
          sensor_type: string
          sensor_value: number
          status: string | null
          threshold_max: number | null
          threshold_min: number | null
          unit: string | null
        }
        Insert: {
          equipment_id?: string | null
          id?: string
          recorded_at?: string | null
          sensor_type: string
          sensor_value: number
          status?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
          unit?: string | null
        }
        Update: {
          equipment_id?: string | null
          id?: string
          recorded_at?: string | null
          sensor_type?: string
          sensor_value?: number
          status?: string | null
          threshold_max?: number | null
          threshold_min?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_sensors_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      events_log: {
        Row: {
          agent_id: string | null
          correlation_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_id: string
          event_type: string
          id: string
          metadata: Json | null
          payload: Json
          tenant_id: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          payload: Json
          tenant_id?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          payload?: Json
          tenant_id?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      extension_installations: {
        Row: {
          config: Json | null
          extension_id: string | null
          id: string
          installed_at: string | null
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          extension_id?: string | null
          id?: string
          installed_at?: string | null
          status?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          extension_id?: string | null
          id?: string
          installed_at?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_installations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "marketplace_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_reviews: {
        Row: {
          created_at: string | null
          extension_id: string | null
          id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extension_id?: string | null
          id?: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          extension_id?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_reviews_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "marketplace_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_data_feeds: {
        Row: {
          created_at: string | null
          data: Json
          feed_date: string
          feed_type: string
          id: string
          region: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          feed_date: string
          feed_type: string
          id?: string
          region?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          feed_date?: string
          feed_type?: string
          id?: string
          region?: string | null
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          feature_key: string
          id: string
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          tenant_allowlist: string[] | null
          tenant_blocklist: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          feature_key: string
          id?: string
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          tenant_allowlist?: string[] | null
          tenant_blocklist?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          feature_key?: string
          id?: string
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          tenant_allowlist?: string[] | null
          tenant_blocklist?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forecast_history: {
        Row: {
          actual_value: number | null
          created_at: string | null
          error_pct: number | null
          forecast_date: string
          id: string
          model_id: string | null
          predicted_value: number
          tenant_id: string | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          error_pct?: number | null
          forecast_date: string
          id?: string
          model_id?: string | null
          predicted_value: number
          tenant_id?: string | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          error_pct?: number | null
          forecast_date?: string
          id?: string
          model_id?: string | null
          predicted_value?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "forecast_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_models: {
        Row: {
          accuracy_score: number | null
          active: boolean | null
          algorithm: string
          artifact_uri: string | null
          config: Json | null
          created_at: string | null
          features: Json
          frequency: string
          hierarchy_level: string | null
          hyperparams: Json | null
          id: string
          last_trained_at: string | null
          metrics: Json | null
          model_key: string | null
          model_name: string
          model_type: string
          model_version: number | null
          product_scope: string | null
          training_data_range: Json | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          active?: boolean | null
          algorithm: string
          artifact_uri?: string | null
          config?: Json | null
          created_at?: string | null
          features?: Json
          frequency: string
          hierarchy_level?: string | null
          hyperparams?: Json | null
          id?: string
          last_trained_at?: string | null
          metrics?: Json | null
          model_key?: string | null
          model_name: string
          model_type: string
          model_version?: number | null
          product_scope?: string | null
          training_data_range?: Json | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          active?: boolean | null
          algorithm?: string
          artifact_uri?: string | null
          config?: Json | null
          created_at?: string | null
          features?: Json
          frequency?: string
          hierarchy_level?: string | null
          hyperparams?: Json | null
          id?: string
          last_trained_at?: string | null
          metrics?: Json | null
          model_key?: string | null
          model_name?: string
          model_type?: string
          model_version?: number | null
          product_scope?: string | null
          training_data_range?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forecast_outputs: {
        Row: {
          attributes: Json | null
          city: string | null
          confidence_lower: number | null
          confidence_upper: number | null
          country: string | null
          created_at: string | null
          district: string | null
          forecast_type: string
          geography_key: string | null
          geography_level: string | null
          id: string
          lower_bound: number | null
          metadata: Json | null
          model_id: string | null
          partner_hub: string | null
          pin_code: string | null
          product_id: string | null
          region: string | null
          state: string | null
          target_date: string
          tenant_id: string | null
          upper_bound: number | null
          value: number
        }
        Insert: {
          attributes?: Json | null
          city?: string | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          forecast_type: string
          geography_key?: string | null
          geography_level?: string | null
          id?: string
          lower_bound?: number | null
          metadata?: Json | null
          model_id?: string | null
          partner_hub?: string | null
          pin_code?: string | null
          product_id?: string | null
          region?: string | null
          state?: string | null
          target_date: string
          tenant_id?: string | null
          upper_bound?: number | null
          value: number
        }
        Update: {
          attributes?: Json | null
          city?: string | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          forecast_type?: string
          geography_key?: string | null
          geography_level?: string | null
          id?: string
          lower_bound?: number | null
          metadata?: Json | null
          model_id?: string | null
          partner_hub?: string | null
          pin_code?: string | null
          product_id?: string | null
          region?: string | null
          state?: string | null
          target_date?: string
          tenant_id?: string | null
          upper_bound?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "forecast_outputs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "forecast_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_outputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          payload: Json
          started_at: string | null
          status: string | null
          tenant_id: string | null
          trace_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload: Json
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trace_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload?: Json
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trace_id?: string | null
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
      frontend_errors: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          route: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      function_telemetry: {
        Row: {
          cold_start: boolean | null
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          request_id: string | null
          status: string
          tenant_id: string | null
          timestamp: string
        }
        Insert: {
          cold_start?: boolean | null
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status: string
          tenant_id?: string | null
          timestamp?: string
        }
        Update: {
          cold_start?: boolean | null
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status?: string
          tenant_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      geography_hierarchy: {
        Row: {
          city: string | null
          country: string
          created_at: string | null
          district: string | null
          geography_key: string | null
          id: string
          partner_hub: string | null
          pin_code: string | null
          region: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string | null
          district?: string | null
          geography_key?: string | null
          id?: string
          partner_hub?: string | null
          pin_code?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string | null
          district?: string | null
          geography_key?: string | null
          id?: string
          partner_hub?: string | null
          pin_code?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          active: boolean | null
          created_at: string | null
          credentials: Json
          id: string
          integration_name: string
          integration_type: string
          last_sync_at: string | null
          organization_id: string | null
          settings: Json | null
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          credentials: Json
          id?: string
          integration_name: string
          integration_type: string
          last_sync_at?: string | null
          organization_id?: string | null
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          credentials?: Json
          id?: string
          integration_name?: string
          integration_type?: string
          last_sync_at?: string | null
          organization_id?: string | null
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      maintenance_predictions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          confidence_score: number | null
          contributing_factors: Json | null
          created_at: string | null
          equipment_id: string | null
          failure_probability: number
          id: string
          model_version: string | null
          predicted_failure_date: string | null
          prediction_type: string
          recommended_action: string | null
          risk_level: string | null
          status: string | null
          work_order_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence_score?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          equipment_id?: string | null
          failure_probability: number
          id?: string
          model_version?: string | null
          predicted_failure_date?: string | null
          prediction_type: string
          recommended_action?: string | null
          risk_level?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence_score?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          equipment_id?: string | null
          failure_probability?: number
          id?: string
          model_version?: string | null
          predicted_failure_date?: string | null
          prediction_type?: string
          recommended_action?: string | null
          risk_level?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_predictions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_predictions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_analytics: {
        Row: {
          event_data: Json | null
          event_type: string
          extension_id: string | null
          id: string
          partner_id: string | null
          recorded_at: string
          revenue_amount: number | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          extension_id?: string | null
          id?: string
          partner_id?: string | null
          recorded_at?: string
          revenue_amount?: number | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          extension_id?: string | null
          id?: string
          partner_id?: string | null
          recorded_at?: string
          revenue_amount?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_extensions: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          install_count: number | null
          name: string
          price: number | null
          pricing_model: string
          rating: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          category: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          install_count?: number | null
          name: string
          price?: number | null
          pricing_model: string
          rating?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          install_count?: number | null
          name?: string
          price?: number | null
          pricing_model?: string
          rating?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          extension_id: string | null
          id: string
          payment_status: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          extension_id?: string | null
          id?: string
          payment_status: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          extension_id?: string | null
          id?: string
          payment_status?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "marketplace_extensions"
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
      ml_models: {
        Row: {
          accuracy_score: number | null
          created_at: string
          created_by: string | null
          deployed_at: string | null
          explainability_enabled: boolean | null
          f1_score: number | null
          features: Json | null
          framework: string
          hyperparameters: Json | null
          id: string
          last_retrained_at: string | null
          model_metadata: Json | null
          model_name: string
          model_type: string
          model_version: string
          next_retrain_at: string | null
          precision_score: number | null
          recall_score: number | null
          status: string
          tenant_id: string | null
          training_data_size: number | null
          updated_at: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          explainability_enabled?: boolean | null
          f1_score?: number | null
          features?: Json | null
          framework: string
          hyperparameters?: Json | null
          id?: string
          last_retrained_at?: string | null
          model_metadata?: Json | null
          model_name: string
          model_type: string
          model_version: string
          next_retrain_at?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string
          tenant_id?: string | null
          training_data_size?: number | null
          updated_at?: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          explainability_enabled?: boolean | null
          f1_score?: number | null
          features?: Json | null
          framework?: string
          hyperparameters?: Json | null
          id?: string
          last_retrained_at?: string | null
          model_metadata?: Json | null
          model_name?: string
          model_type?: string
          model_version?: string
          next_retrain_at?: string | null
          precision_score?: number | null
          recall_score?: number | null
          status?: string
          tenant_id?: string | null
          training_data_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          actual_outcome: Json | null
          confidence_score: number | null
          created_at: string
          feedback_correct: boolean | null
          feedback_provided: boolean | null
          id: string
          input_data: Json
          metadata: Json | null
          model_id: string | null
          outcome_time: string | null
          prediction_output: Json
          prediction_time: string
          prediction_type: string
          tenant_id: string
        }
        Insert: {
          actual_outcome?: Json | null
          confidence_score?: number | null
          created_at?: string
          feedback_correct?: boolean | null
          feedback_provided?: boolean | null
          id?: string
          input_data: Json
          metadata?: Json | null
          model_id?: string | null
          outcome_time?: string | null
          prediction_output: Json
          prediction_time?: string
          prediction_type: string
          tenant_id: string
        }
        Update: {
          actual_outcome?: Json | null
          confidence_score?: number | null
          created_at?: string
          feedback_correct?: boolean | null
          feedback_provided?: boolean | null
          id?: string
          input_data?: Json
          metadata?: Json | null
          model_id?: string | null
          outcome_time?: string | null
          prediction_output?: Json
          prediction_time?: string
          prediction_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_sync_queue: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          payload: Json
          sync_status: string | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          payload: Json
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          payload?: Json
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      model_performance_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          model_id: string
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          model_id: string
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          model_id?: string
          recorded_at?: string | null
        }
        Relationships: []
      }
      model_registry: {
        Row: {
          accuracy_score: number | null
          active: boolean | null
          avg_cost_per_1k_tokens: number | null
          avg_latency_ms: number | null
          capabilities: string[] | null
          created_at: string | null
          id: string
          metadata: Json | null
          model_id: string
          model_name: string
          provider: string
          success_rate: number | null
          target_sla_ms: number | null
          task_types: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          accuracy_score?: number | null
          active?: boolean | null
          avg_cost_per_1k_tokens?: number | null
          avg_latency_ms?: number | null
          capabilities?: string[] | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_id: string
          model_name: string
          provider: string
          success_rate?: number | null
          target_sla_ms?: number | null
          task_types?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          accuracy_score?: number | null
          active?: boolean | null
          avg_cost_per_1k_tokens?: number | null
          avg_latency_ms?: number | null
          capabilities?: string[] | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_id?: string
          model_name?: string
          provider?: string
          success_rate?: number | null
          target_sla_ms?: number | null
          task_types?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      module_data_sources: {
        Row: {
          id: string
          ingested_at: string | null
          ingested_by: string | null
          metadata: Json | null
          module_context: string
          record_count: number | null
          source_name: string
          source_type: string
          tenant_id: string
        }
        Insert: {
          id?: string
          ingested_at?: string | null
          ingested_by?: string | null
          metadata?: Json | null
          module_context: string
          record_count?: number | null
          source_name: string
          source_type: string
          tenant_id: string
        }
        Update: {
          id?: string
          ingested_at?: string | null
          ingested_by?: string | null
          metadata?: Json | null
          module_context?: string
          record_count?: number | null
          source_name?: string
          source_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_data_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nlp_query_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          is_helpful: boolean
          query_history_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          is_helpful: boolean
          query_history_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean
          query_history_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nlp_query_feedback_query_history_id_fkey"
            columns: ["query_history_id"]
            isOneToOne: false
            referencedRelation: "nlp_query_history"
            referencedColumns: ["id"]
          },
        ]
      }
      nlp_query_history: {
        Row: {
          created_at: string | null
          executed_successfully: boolean | null
          execution_time_ms: number | null
          generated_sql: string
          id: string
          natural_language_query: string
          result_count: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          executed_successfully?: boolean | null
          execution_time_ms?: number | null
          generated_sql: string
          id?: string
          natural_language_query: string
          result_count?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          executed_successfully?: boolean | null
          execution_time_ms?: number | null
          generated_sql?: string
          id?: string
          natural_language_query?: string
          result_count?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          delivered_at: string | null
          delivery_status: string
          id: string
          notification_id: string | null
          provider_response: Json | null
        }
        Insert: {
          delivered_at?: string | null
          delivery_status: string
          id?: string
          notification_id?: string | null
          provider_response?: Json | null
        }
        Update: {
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          notification_id?: string | null
          provider_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          recipient: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          active: boolean | null
          channel: string
          created_at: string | null
          id: string
          message_template: string
          organization_id: string | null
          template_key: string
          title_template: string
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          channel: string
          created_at?: string | null
          id?: string
          message_template: string
          organization_id?: string | null
          template_key: string
          title_template: string
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          channel?: string
          created_at?: string | null
          id?: string
          message_template?: string
          organization_id?: string | null
          template_key?: string
          title_template?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          channel: string | null
          created_at: string | null
          delivery_status: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          organization_id: string | null
          priority: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          channel?: string | null
          created_at?: string | null
          delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          channel?: string | null
          created_at?: string | null
          delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          organization_id?: string | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_providers: {
        Row: {
          client_id: string | null
          config: Json | null
          created_at: string | null
          enabled: boolean
          id: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          config?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          config?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      observability_traces: {
        Row: {
          agent_id: string | null
          attributes: Json | null
          created_at: string | null
          duration_ms: number | null
          end_time: string | null
          error_message: string | null
          events: Json | null
          id: string
          operation_name: string
          parent_span_id: string | null
          service_name: string | null
          span_id: string
          start_time: string
          status: string | null
          trace_id: string
        }
        Insert: {
          agent_id?: string | null
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          events?: Json | null
          id?: string
          operation_name: string
          parent_span_id?: string | null
          service_name?: string | null
          span_id: string
          start_time: string
          status?: string | null
          trace_id: string
        }
        Update: {
          agent_id?: string | null
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          events?: Json | null
          id?: string
          operation_name?: string
          parent_span_id?: string | null
          service_name?: string | null
          span_id?: string
          start_time?: string
          status?: string | null
          trace_id?: string
        }
        Relationships: []
      }
      offline_actions: {
        Row: {
          action_data: Json
          action_type: string
          created_offline_at: string
          entity_id: string | null
          entity_type: string
          id: string
          sync_status: string | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          action_data: Json
          action_type: string
          created_offline_at: string
          entity_id?: string | null
          entity_type: string
          id?: string
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_offline_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          sync_status?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      offline_cache_metadata: {
        Row: {
          entity_type: string
          id: string
          last_sync_at: string
          sync_version: number | null
          user_id: string
        }
        Insert: {
          entity_type: string
          id?: string
          last_sync_at: string
          sync_version?: number | null
          user_id: string
        }
        Update: {
          entity_type?: string
          id?: string
          last_sync_at?: string
          sync_version?: number | null
          user_id?: string
        }
        Relationships: []
      }
      offline_queue: {
        Row: {
          action_type: string
          attempts: number | null
          created_at: string | null
          id: string
          payload: Json
          resource_type: string
          synced: boolean | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          payload: Json
          resource_type: string
          synced?: boolean | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          payload?: Json
          resource_type?: string
          synced?: boolean | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offline_sync_queue: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          operation: string | null
          payload: Json
          retry_count: number | null
          status: string | null
          synced_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          operation?: string | null
          payload: Json
          retry_count?: number | null
          status?: string | null
          synced_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          operation?: string | null
          payload?: Json
          retry_count?: number | null
          status?: string | null
          synced_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      optimized_schedule_assignments: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          id: string
          optimization_run_id: string
          priority_score: number | null
          scheduled_end: string
          scheduled_start: string
          skill_match_score: number | null
          technician_id: string
          travel_time_minutes: number | null
          work_order_id: string
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          id?: string
          optimization_run_id: string
          priority_score?: number | null
          scheduled_end: string
          scheduled_start: string
          skill_match_score?: number | null
          technician_id: string
          travel_time_minutes?: number | null
          work_order_id: string
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          id?: string
          optimization_run_id?: string
          priority_score?: number | null
          scheduled_end?: string
          scheduled_start?: string
          skill_match_score?: number | null
          technician_id?: string
          travel_time_minutes?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimized_schedule_assignments_optimization_run_id_fkey"
            columns: ["optimization_run_id"]
            isOneToOne: false
            referencedRelation: "schedule_optimization_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_schedule_assignments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_schedule_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          settings: Json | null
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      override_requests: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          expires_at: string
          id: string
          mfa_verified: boolean | null
          mfa_verified_at: string | null
          reason: string
          requester_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          expires_at: string
          id?: string
          mfa_verified?: boolean | null
          mfa_verified_at?: string | null
          reason: string
          requester_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string
          id?: string
          mfa_verified?: boolean | null
          mfa_verified_at?: string | null
          reason?: string
          requester_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "override_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "override_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_keys: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          billing_tier: string
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          monthly_quota: number | null
          name: string
          partner_id: string
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          revoked: boolean | null
          revoked_at: string | null
          scopes: Json | null
          updated_at: string
          usage_this_month: number | null
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          billing_tier?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          monthly_quota?: number | null
          name: string
          partner_id: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked?: boolean | null
          revoked_at?: string | null
          scopes?: Json | null
          updated_at?: string
          usage_this_month?: number | null
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          billing_tier?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          monthly_quota?: number | null
          name?: string
          partner_id?: string
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked?: boolean | null
          revoked_at?: string | null
          scopes?: Json | null
          updated_at?: string
          usage_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_usage: {
        Row: {
          avg_latency_ms: number | null
          day: string
          error_count: number
          id: string
          request_count: number
          tenant_id: string
        }
        Insert: {
          avg_latency_ms?: number | null
          day: string
          error_count?: number
          id?: string
          request_count?: number
          tenant_id: string
        }
        Update: {
          avg_latency_ms?: number | null
          day?: string
          error_count?: number
          id?: string
          request_count?: number
          tenant_id?: string
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          base_amount: number
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          invoice_id: string | null
          paid_at: string | null
          partner_id: string | null
          payment_reference: string | null
          status: string | null
          work_order_id: string | null
        }
        Insert: {
          base_amount: number
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          payment_reference?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Update: {
          base_amount?: number
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          partner_id?: string | null
          payment_reference?: string | null
          status?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: Json | null
          bank_details: Json | null
          commission_rate: number | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          partner_number: string | null
          partner_type: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          bank_details?: Json | null
          commission_rate?: number | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          partner_number?: string | null
          partner_type?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          bank_details?: Json | null
          commission_rate?: number | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          partner_number?: string | null
          partner_type?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
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
      policy_registry: {
        Row: {
          actions: Json
          active: boolean | null
          category: string
          conditions: Json
          created_at: string | null
          id: string
          name: string
          policy_id: string
          policy_type: string
          priority: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          active?: boolean | null
          category: string
          conditions: Json
          created_at?: string | null
          id?: string
          name: string
          policy_id: string
          policy_type: string
          priority?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          active?: boolean | null
          category?: string
          conditions?: Json
          created_at?: string | null
          id?: string
          name?: string
          policy_id?: string
          policy_type?: string
          priority?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_activity: {
        Row: {
          activity: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          activity: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activity?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portal_sessions: {
        Row: {
          ended_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          session_type: string
          started_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_type: string
          started_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_type?: string
          started_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          current_module_context: string | null
          email: string | null
          full_name: string | null
          id: string
          mfa_enabled: boolean | null
          mfa_secret: string | null
          organization_id: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_module_context?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          organization_id?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_module_context?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          organization_id?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      rate_limit_config: {
        Row: {
          burst_limit: number
          daily_limit: number
          tenant_id: string
          updated_at: string | null
          window_seconds: number
        }
        Insert: {
          burst_limit?: number
          daily_limit?: number
          tenant_id: string
          updated_at?: string | null
          window_seconds?: number
        }
        Update: {
          burst_limit?: number
          daily_limit?: number
          tenant_id?: string
          updated_at?: string | null
          window_seconds?: number
        }
        Relationships: []
      }
      report_audit: {
        Row: {
          created_at: string | null
          file_path: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          report_type: string
          rows_count: number | null
          status: string
          tenant_id: string | null
          trace_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_type: string
          rows_count?: number | null
          status: string
          tenant_id?: string | null
          trace_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_type?: string
          rows_count?: number | null
          status?: string
          tenant_id?: string | null
          trace_id?: string | null
        }
        Relationships: []
      }
      report_subscriptions: {
        Row: {
          active: boolean | null
          cadence: string
          config: Json | null
          created_at: string | null
          id: string
          last_sent_at: string | null
          report_type: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          cadence: string
          config?: Json | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          report_type: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          cadence?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          report_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      request_context: {
        Row: {
          correlation_id: string
          created_at: string | null
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          correlation_id?: string
          created_at?: string | null
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string | null
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_tenants: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sapos_feedback: {
        Row: {
          accepted: boolean
          created_at: string | null
          customer_id: string | null
          feedback_type: string | null
          id: string
          notes: string | null
          offer_id: string
          ticket_id: string | null
        }
        Insert: {
          accepted: boolean
          created_at?: string | null
          customer_id?: string | null
          feedback_type?: string | null
          id?: string
          notes?: string | null
          offer_id: string
          ticket_id?: string | null
        }
        Update: {
          accepted?: boolean
          created_at?: string | null
          customer_id?: string | null
          feedback_type?: string | null
          id?: string
          notes?: string | null
          offer_id?: string
          ticket_id?: string | null
        }
        Relationships: []
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
      schedule_optimization_runs: {
        Row: {
          algorithm_version: string
          completed_at: string | null
          constraints: Json
          created_at: string | null
          created_by: string | null
          id: string
          run_date: string
          started_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          algorithm_version: string
          completed_at?: string | null
          constraints: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          run_date: string
          started_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          algorithm_version?: string
          completed_at?: string | null
          constraints?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          run_date?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          recipients: string[]
          report_type: string
          schedule_cron: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          recipients: string[]
          report_type: string
          schedule_cron: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          schedule_cron?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      scheduling_recommendations: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          recommendation_score: number | null
          technician_id: string | null
          tenant_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          recommendation_score?: number | null
          technician_id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          recommendation_score?: number | null
          technician_id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          severity: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          severity?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          severity?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seed_info: {
        Row: {
          created_at: string | null
          end_date: string
          geography_coverage: Json
          id: string
          metadata: Json | null
          months_covered: number
          product_splits: Json
          seed_type: string
          start_date: string
          status: string
          tenant_id: string | null
          total_records: number
          updated_at: string | null
          validation_notes: Json | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          geography_coverage: Json
          id?: string
          metadata?: Json | null
          months_covered: number
          product_splits: Json
          seed_type: string
          start_date: string
          status?: string
          tenant_id?: string | null
          total_records: number
          updated_at?: string | null
          validation_notes?: Json | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          geography_coverage?: Json
          id?: string
          metadata?: Json | null
          months_covered?: number
          product_splits?: Json
          seed_type?: string
          start_date?: string
          status?: string
          tenant_id?: string | null
          total_records?: number
          updated_at?: string | null
          validation_notes?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seed_info_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_metadata: {
        Row: {
          applied_at: string | null
          details: Json | null
          id: string
          seed_name: string
          version: string | null
        }
        Insert: {
          applied_at?: string | null
          details?: Json | null
          id?: string
          seed_name: string
          version?: string | null
        }
        Update: {
          applied_at?: string | null
          details?: Json | null
          id?: string
          seed_name?: string
          version?: string | null
        }
        Relationships: []
      }
      seed_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          job_id: string
          payload: Json
          rows_processed: number | null
          seed_type: string
          started_at: string | null
          status: string | null
          tenant_id: string | null
          trace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          job_id?: string
          payload?: Json
          rows_processed?: number | null
          seed_type: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          job_id?: string
          payload?: Json
          rows_processed?: number | null
          seed_type?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trace_id?: string | null
        }
        Relationships: []
      }
      service_contracts: {
        Row: {
          auto_renew: boolean | null
          billing_day: number | null
          billing_frequency: string | null
          contract_number: string | null
          contract_type: string
          contract_value: number
          created_at: string | null
          currency: string | null
          customer_id: string
          end_date: string
          id: string
          metadata: Json | null
          organization_id: string | null
          payment_terms: string | null
          signed_at: string | null
          signed_by: string | null
          sla_terms: Json | null
          start_date: string
          status: string | null
          tenant_id: string | null
          terms_conditions: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_day?: number | null
          billing_frequency?: string | null
          contract_number?: string | null
          contract_type: string
          contract_value: number
          created_at?: string | null
          currency?: string | null
          customer_id: string
          end_date: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_terms?: string | null
          signed_at?: string | null
          signed_by?: string | null
          sla_terms?: Json | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          terms_conditions?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_day?: number | null
          billing_frequency?: string | null
          contract_number?: string | null
          contract_type?: string
          contract_value?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          end_date?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_terms?: string | null
          signed_at?: string | null
          signed_by?: string | null
          sla_terms?: Json | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      service_requests: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          converted_to_ticket_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          equipment_id: string | null
          id: string
          location: Json | null
          photos: string[] | null
          preferred_date: string | null
          preferred_time_slot: string | null
          priority: string | null
          request_number: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_to_ticket_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          equipment_id?: string | null
          id?: string
          location?: Json | null
          photos?: string[] | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          priority?: string | null
          request_number?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_to_ticket_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          equipment_id?: string | null
          id?: string
          location?: Json | null
          photos?: string[] | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          priority?: string | null
          request_number?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_converted_to_ticket_id_fkey"
            columns: ["converted_to_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_alerts: {
        Row: {
          alert_time: string | null
          alert_type: string
          details: Json | null
          id: string
          resolved_at: string | null
          status: string
          work_order_id: string
        }
        Insert: {
          alert_time?: string | null
          alert_type: string
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status?: string
          work_order_id: string
        }
        Update: {
          alert_time?: string | null
          alert_type?: string
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status?: string
          work_order_id?: string
        }
        Relationships: []
      }
      sla_predictions: {
        Row: {
          breach_probability: number | null
          details: Json | null
          id: string
          predicted_at: string | null
          predicted_breach: boolean
          work_order_id: string
        }
        Insert: {
          breach_probability?: number | null
          details?: Json | null
          id?: string
          predicted_at?: string | null
          predicted_breach?: boolean
          work_order_id: string
        }
        Update: {
          breach_probability?: number | null
          details?: Json | null
          id?: string
          predicted_at?: string | null
          predicted_breach?: boolean
          work_order_id?: string
        }
        Relationships: []
      }
      sla_thresholds: {
        Row: {
          active: boolean | null
          alert_enabled: boolean | null
          applies_to: Json | null
          created_at: string
          escalation_rules: Json | null
          id: string
          metric_type: string
          name: string
          tenant_id: string
          threshold_value: number
          unit: string
          updated_at: string
          warning_value: number | null
        }
        Insert: {
          active?: boolean | null
          alert_enabled?: boolean | null
          applies_to?: Json | null
          created_at?: string
          escalation_rules?: Json | null
          id?: string
          metric_type: string
          name: string
          tenant_id: string
          threshold_value: number
          unit: string
          updated_at?: string
          warning_value?: number | null
        }
        Update: {
          active?: boolean | null
          alert_enabled?: boolean | null
          applies_to?: Json | null
          created_at?: string
          escalation_rules?: Json | null
          id?: string
          metric_type?: string
          name?: string
          tenant_id?: string
          threshold_value?: number
          unit?: string
          updated_at?: string
          warning_value?: number | null
        }
        Relationships: []
      }
      sla_violations: {
        Row: {
          actual_value: number
          created_at: string
          detected_at: string
          id: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          tenant_id: string
          threshold_value: number
          updated_at: string
          violation_type: string
          work_order_id: string | null
        }
        Insert: {
          actual_value: number
          created_at?: string
          detected_at?: string
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          tenant_id: string
          threshold_value: number
          updated_at?: string
          violation_type: string
          work_order_id?: string | null
        }
        Update: {
          actual_value?: number
          created_at?: string
          detected_at?: string
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          tenant_id?: string
          threshold_value?: number
          updated_at?: string
          violation_type?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_violations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_work_orders: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          district: string | null
          id: string
          partner_hub: string | null
          pin_code: string | null
          product_category: string | null
          region: string | null
          state: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          wo_number: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          partner_hub?: string | null
          pin_code?: string | null
          product_category?: string | null
          region?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          wo_number?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          partner_hub?: string | null
          pin_code?: string | null
          product_category?: string | null
          region?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          wo_number?: string | null
        }
        Relationships: []
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
      system_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          health_score: number
          id: string
          metrics: Json
          timestamp: string | null
        }
        Insert: {
          health_score: number
          id?: string
          metrics: Json
          timestamp?: string | null
        }
        Update: {
          health_score?: number
          id?: string
          metrics?: Json
          timestamp?: string | null
        }
        Relationships: []
      }
      technician_availability: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          status: string | null
          technician_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          status?: string | null
          technician_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          status?: string | null
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          technician_id: string | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          technician_id?: string | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          technician_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_skills: {
        Row: {
          certification_date: string | null
          certified: boolean | null
          created_at: string | null
          id: string
          proficiency_level: number | null
          skill_name: string
          technician_id: string | null
        }
        Insert: {
          certification_date?: string | null
          certified?: boolean | null
          created_at?: string | null
          id?: string
          proficiency_level?: number | null
          skill_name: string
          technician_id?: string | null
        }
        Update: {
          certification_date?: string | null
          certified?: boolean | null
          created_at?: string | null
          id?: string
          proficiency_level?: number | null
          skill_name?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          certification_level: string | null
          certifications: string[] | null
          created_at: string | null
          current_location: Json | null
          email: string | null
          employee_id: string | null
          first_name: string
          hire_date: string | null
          home_location: Json | null
          id: string
          last_name: string
          metadata: Json | null
          organization_id: string | null
          phone: string
          photo_url: string | null
          specializations: string[] | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_info: Json | null
        }
        Insert: {
          certification_level?: string | null
          certifications?: string[] | null
          created_at?: string | null
          current_location?: Json | null
          email?: string | null
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          home_location?: Json | null
          id?: string
          last_name: string
          metadata?: Json | null
          organization_id?: string | null
          phone: string
          photo_url?: string | null
          specializations?: string[] | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          certification_level?: string | null
          certifications?: string[] | null
          created_at?: string | null
          current_location?: Json | null
          email?: string | null
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          home_location?: Json | null
          id?: string
          last_name?: string
          metadata?: Json | null
          organization_id?: string | null
          phone?: string
          photo_url?: string | null
          specializations?: string[] | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_log: {
        Row: {
          document_type: string
          id: string
          output_format: string | null
          rendered_at: string
          rendered_by: string | null
          rendered_for_entity_id: string | null
          rendering_time_ms: number | null
          template_id: string
          tenant_id: string
        }
        Insert: {
          document_type: string
          id?: string
          output_format?: string | null
          rendered_at?: string
          rendered_by?: string | null
          rendered_for_entity_id?: string | null
          rendering_time_ms?: number | null
          template_id: string
          tenant_id: string
        }
        Update: {
          document_type?: string
          id?: string
          output_format?: string | null
          rendered_at?: string
          rendered_by?: string | null
          rendered_for_entity_id?: string | null
          rendering_time_ms?: number | null
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string | null
          id: string
          placeholders: Json
          storage_path: string
          template_id: string
          version: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          placeholders: Json
          storage_path: string
          template_id: string
          version: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          placeholders?: Json
          storage_path?: string
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          created_by: string | null
          expiry_date: string
          id: string
          last_used_at: string | null
          name: string
          rate_limit: number
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          created_by?: string | null
          expiry_date: string
          id?: string
          last_used_at?: string | null
          name: string
          rate_limit?: number
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string
          id?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_extensions: {
        Row: {
          extension_id: string
          id: string
          installed_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          extension_id: string
          id?: string
          installed_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          extension_id?: string
          id?: string
          installed_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      tenant_localization: {
        Row: {
          currency: string
          locale: string
          tenant_id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          currency?: string
          locale?: string
          tenant_id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          currency?: string
          locale?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          active: boolean | null
          config: Json | null
          created_at: string | null
          id: string
          module_context: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          module_context?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          module_context?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          provisional_sla: unknown
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
          provisional_sla?: unknown
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
          provisional_sla?: unknown
          site_address?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          symptom?: string
          tenant_id?: string | null
          unit_serial?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_certifications: {
        Row: {
          certificate_number: string
          course_id: string
          created_at: string | null
          enrollment_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          user_id: string
          verification_url: string | null
        }
        Insert: {
          certificate_number: string
          course_id: string
          created_at?: string | null
          enrollment_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          user_id: string
          verification_url?: string | null
        }
        Update: {
          certificate_number?: string
          course_id?: string
          created_at?: string | null
          enrollment_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          user_id?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          id: string
          instructor_name: string | null
          is_published: boolean | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          is_published?: boolean | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          is_published?: boolean | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          last_accessed_at: string | null
          progress_percent: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          enrollment_id: string
          id: string
          last_position_seconds: number | null
          module_id: string
          time_spent_minutes: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          enrollment_id: string
          id?: string
          last_position_seconds?: number | null
          module_id: string
          time_spent_minutes?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          last_position_seconds?: number | null
          module_id?: string
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_module_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          content_markdown: string | null
          course_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          order_index: number
          title: string
          video_url: string | null
        }
        Insert: {
          content_markdown?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index: number
          title: string
          video_url?: string | null
        }
        Update: {
          content_markdown?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completed_at: string
          enrollment_id: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string
          total_points: number
        }
        Insert: {
          answers: Json
          attempt_number: number
          completed_at: string
          enrollment_id: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string
          total_points: number
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completed_at?: string
          enrollment_id?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          locale: string
          tenant_id: string | null
          translation_key: string
          translation_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          locale: string
          tenant_id?: string | null
          translation_key: string
          translation_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          locale?: string
          tenant_id?: string | null
          translation_key?: string
          translation_value?: string
        }
        Relationships: []
      }
      user_behavior_events: {
        Row: {
          anomaly_score: number | null
          event_data: Json | null
          event_type: string
          id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          anomaly_score?: number | null
          event_data?: Json | null
          event_type: string
          id?: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          anomaly_score?: number | null
          event_data?: Json | null
          event_type?: string
          id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes: Json | null
          mfa_enabled: boolean
          preferred_factor: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          mfa_enabled?: boolean
          preferred_factor?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          mfa_enabled?: boolean
          preferred_factor?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_logs: {
        Row: {
          attempt_number: number | null
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean | null
          triggered_at: string | null
          webhook_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          triggered_at?: string | null
          webhook_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean | null
          triggered_at?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[]
          headers: Json | null
          id: string
          name: string
          organization_id: string | null
          retry_count: number | null
          secret_key: string | null
          tenant_id: string | null
          timeout_seconds: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events: string[]
          headers?: Json | null
          id?: string
          name: string
          organization_id?: string | null
          retry_count?: number | null
          secret_key?: string | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          name?: string
          organization_id?: string | null
          retry_count?: number | null
          secret_key?: string | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      white_label_configs: {
        Row: {
          active: boolean | null
          brand_name: string
          created_at: string
          custom_css: string | null
          custom_domain: string | null
          custom_domain_verified: boolean | null
          email_templates: Json | null
          feature_flags: Json | null
          id: string
          logo_url: string | null
          partner_id: string
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string
          theme_config: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          brand_name: string
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          email_templates?: Json | null
          feature_flags?: Json | null
          id?: string
          logo_url?: string | null
          partner_id: string
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id: string
          theme_config?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          brand_name?: string
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          email_templates?: Json | null
          feature_flags?: Json | null
          id?: string
          logo_url?: string | null
          partner_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string
          theme_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "white_label_configs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
          check_in_address: string | null
          check_in_at: string | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_out_address: string | null
          check_out_at: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          city: string | null
          completed_at: string | null
          cost_to_customer: number | null
          country: string | null
          created_at: string | null
          customer_signature_url: string | null
          district: string | null
          hub_id: string | null
          id: string
          part_notes: string | null
          part_status: Database["public"]["Enums"]["part_status"] | null
          partner_hub: string | null
          parts_reserved: boolean | null
          pin_code: string | null
          product_id: string | null
          region: string | null
          released_at: string | null
          repair_type: string | null
          signed_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["work_order_status"] | null
          technician_id: string | null
          technician_signature_url: string | null
          ticket_id: string | null
          travel_distance_km: number | null
          travel_duration_minutes: number | null
          updated_at: string | null
          warranty_checked: boolean | null
          warranty_result: Json | null
          wo_number: string | null
        }
        Insert: {
          check_in_address?: string | null
          check_in_at?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_out_address?: string | null
          check_out_at?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          city?: string | null
          completed_at?: string | null
          cost_to_customer?: number | null
          country?: string | null
          created_at?: string | null
          customer_signature_url?: string | null
          district?: string | null
          hub_id?: string | null
          id?: string
          part_notes?: string | null
          part_status?: Database["public"]["Enums"]["part_status"] | null
          partner_hub?: string | null
          parts_reserved?: boolean | null
          pin_code?: string | null
          product_id?: string | null
          region?: string | null
          released_at?: string | null
          repair_type?: string | null
          signed_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          technician_id?: string | null
          technician_signature_url?: string | null
          ticket_id?: string | null
          travel_distance_km?: number | null
          travel_duration_minutes?: number | null
          updated_at?: string | null
          warranty_checked?: boolean | null
          warranty_result?: Json | null
          wo_number?: string | null
        }
        Update: {
          check_in_address?: string | null
          check_in_at?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_out_address?: string | null
          check_out_at?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          city?: string | null
          completed_at?: string | null
          cost_to_customer?: number | null
          country?: string | null
          created_at?: string | null
          customer_signature_url?: string | null
          district?: string | null
          hub_id?: string | null
          id?: string
          part_notes?: string | null
          part_status?: Database["public"]["Enums"]["part_status"] | null
          partner_hub?: string | null
          parts_reserved?: boolean | null
          pin_code?: string | null
          product_id?: string | null
          region?: string | null
          released_at?: string | null
          repair_type?: string | null
          signed_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          technician_id?: string | null
          technician_signature_url?: string | null
          ticket_id?: string | null
          travel_distance_km?: number | null
          travel_duration_minutes?: number | null
          updated_at?: string | null
          warranty_checked?: boolean | null
          warranty_result?: Json | null
          wo_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          active: boolean | null
          compensation_graph: Json | null
          created_at: string | null
          description: string | null
          graph: Json
          id: string
          input_schema: Json | null
          name: string
          output_schema: Json | null
          retry_policy: Json | null
          tenant_id: string | null
          timeout_seconds: number | null
          trigger_events: string[] | null
          updated_at: string | null
          version: number | null
          workflow_id: string
        }
        Insert: {
          active?: boolean | null
          compensation_graph?: Json | null
          created_at?: string | null
          description?: string | null
          graph: Json
          id?: string
          input_schema?: Json | null
          name: string
          output_schema?: Json | null
          retry_policy?: Json | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          trigger_events?: string[] | null
          updated_at?: string | null
          version?: number | null
          workflow_id: string
        }
        Update: {
          active?: boolean | null
          compensation_graph?: Json | null
          created_at?: string | null
          description?: string | null
          graph?: Json
          id?: string
          input_schema?: Json | null
          name?: string
          output_schema?: Json | null
          retry_policy?: Json | null
          tenant_id?: string | null
          timeout_seconds?: number | null
          trigger_events?: string[] | null
          updated_at?: string | null
          version?: number | null
          workflow_id?: string
        }
        Relationships: []
      }
      workflow_runtime: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          current_node: string | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          output_data: Json | null
          retry_count: number | null
          started_at: string | null
          state: Json | null
          status: string | null
          workflow_id: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          current_node?: string | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          state?: Json | null
          status?: string | null
          workflow_id: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          current_node?: string | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          state?: Json | null
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runtime_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["workflow_id"]
          },
        ]
      }
    }
    Views: {
      trace_spans: {
        Row: {
          agent_id: string | null
          attributes: Json | null
          created_at: string | null
          duration_ms: number | null
          end_time: string | null
          error_message: string | null
          events: Json | null
          id: string | null
          operation_name: string | null
          parent_span_id: string | null
          service_name: string | null
          span_id: string | null
          start_time: string | null
          status: string | null
          trace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          events?: Json | null
          id?: string | null
          operation_name?: string | null
          parent_span_id?: string | null
          service_name?: string | null
          span_id?: string | null
          start_time?: string | null
          status?: string | null
          trace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          attributes?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          events?: Json | null
          id?: string | null
          operation_name?: string | null
          parent_span_id?: string | null
          service_name?: string | null
          span_id?: string | null
          start_time?: string | null
          status?: string | null
          trace_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_wo_number: { Args: never; Returns: string }
      get_currency_symbol: { Args: { currency_code: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_any_permission: {
        Args: { _permissions: string[]; _user_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      raise_insufficient_privileges: { Args: never; Returns: undefined }
      test_tenant_isolation: {
        Args: never
        Returns: {
          message: string
          passed: boolean
          test_name: string
        }[]
      }
    }
    Enums: {
      anomaly_type:
        | "photo_tampering"
        | "duplicate_photo"
        | "part_mismatch"
        | "suspicious_usage"
        | "data_breach"
      app_role:
        | "sys_admin"
        | "tenant_admin"
        | "ops_manager"
        | "finance_manager"
        | "fraud_investigator"
        | "partner_admin"
        | "partner_user"
        | "technician"
        | "dispatcher"
        | "customer"
        | "product_owner"
        | "support_agent"
        | "ml_ops"
        | "billing_agent"
        | "auditor"
        | "guest"
      investigation_status: "open" | "in_progress" | "resolved" | "escalated"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
        | "on_hold"
      part_status:
        | "not_required"
        | "reserved"
        | "issued"
        | "received"
        | "consumed"
        | "unutilized"
        | "buffer_consumption"
        | "buffer_consumed_replacement_requested"
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
      app_role: [
        "sys_admin",
        "tenant_admin",
        "ops_manager",
        "finance_manager",
        "fraud_investigator",
        "partner_admin",
        "partner_user",
        "technician",
        "dispatcher",
        "customer",
        "product_owner",
        "support_agent",
        "ml_ops",
        "billing_agent",
        "auditor",
        "guest",
      ],
      investigation_status: ["open", "in_progress", "resolved", "escalated"],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "on_hold",
      ],
      part_status: [
        "not_required",
        "reserved",
        "issued",
        "received",
        "consumed",
        "unutilized",
        "buffer_consumption",
        "buffer_consumed_replacement_requested",
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
