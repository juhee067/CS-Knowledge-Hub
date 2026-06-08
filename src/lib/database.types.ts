// PRD 8장 스키마 기반 타입. Sprint 1 범위(users/clients/client_configs/faqs/faq_versions/audit_logs).
// 실제 배포 시 `supabase gen types typescript` 로 자동 생성 권장.

export type Role = 'viewer' | 'editor' | 'lead'
export type FaqStatus = 'draft' | 'verified' | 'deprecated'
export type RuleType = 'override' | 'note' | 'default'
export type Severity = 'info' | 'warning' | 'critical'
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: Role
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: Role
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          owner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          owner_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
        Relationships: []
      }
      client_configs: {
        Row: {
          id: string
          client_id: string
          title: string
          body: string
          rule_type: RuleType
          applies_to: string | null
          severity: Severity
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          body: string
          rule_type?: RuleType
          applies_to?: string | null
          severity?: Severity
          updated_by?: string | null
          updated_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['client_configs']['Insert']
        >
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          category: string | null
          tags: string[] | null
          status: FaqStatus
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category?: string | null
          tags?: string[] | null
          status?: FaqStatus
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>
        Relationships: []
      }
      faq_versions: {
        Row: {
          id: string
          faq_id: string
          question: string | null
          answer: string | null
          status: FaqStatus | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          faq_id: string
          question?: string | null
          answer?: string | null
          status?: FaqStatus | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: Partial<Database['public']['Tables']['faq_versions']['Insert']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          entity: string | null
          entity_id: string | null
          action: AuditAction | null
          diff: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          entity?: string | null
          entity_id?: string | null
          action?: AuditAction | null
          diff?: Record<string, unknown> | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          raw_text: string
          client_id: string | null
          source: string
          source_ref: string | null
          intake_raw: Record<string, unknown> | null
          predicted_category: string | null
          prediction_score: number | null
          status: 'open' | 'answered' | 'assetized'
          answer_text: string | null
          answered_by: string | null
          linked_faq_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          raw_text: string
          client_id?: string | null
          source?: string
          source_ref?: string | null
          intake_raw?: Record<string, unknown> | null
          predicted_category?: string | null
          prediction_score?: number | null
          status?: 'open' | 'answered' | 'assetized'
          answer_text?: string | null
          answered_by?: string | null
          linked_faq_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>
        Relationships: []
      }
      classification_feedback: {
        Row: {
          id: string
          inquiry_id: string | null
          predicted_category: string | null
          corrected_category: string | null
          predicted_client_id: string | null
          corrected_client_id: string | null
          prediction_score: number | null
          accepted: boolean
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          predicted_category?: string | null
          corrected_category?: string | null
          predicted_client_id?: string | null
          corrected_client_id?: string | null
          prediction_score?: number | null
          accepted?: boolean
          actor_id?: string | null
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['classification_feedback']['Insert']
        >
        Relationships: []
      }
    }
    Views: {
      assetize_candidates: {
        Row: {
          category: string
          open_count: number
          avg_score: number
          first_seen: string
          last_seen: string
          latest_inquiry_id: string
          sample_text: string
        }
        Relationships: []
      }
      channel_summary: {
        Row: {
          source: string
          total: number
          open_count: number
          open_rate: number
          last_received_at: string | null
          errors_24h: number
        }
        Relationships: []
      }
      channel_daily_stats: {
        Row: {
          source: string
          day: string
          total: number
          open_count: number
          answered_count: number
          assetized_count: number
        }
        Relationships: []
      }
    }
    Functions: {
      update_faq_status: {
        Args: { p_faq_id: string; p_new_status: FaqStatus }
        Returns: undefined
      }
      match_faqs: {
        Args: {
          p_embedding: number[]
          p_limit?: number
          p_client_id?: string | null
        }
        Returns: Array<{
          id: string
          question: string
          answer: string
          category: string | null
          tags: string[] | null
          status: FaqStatus
          similarity: number
        }>
      }
      search_knowledge: {
        Args: {
          p_query: string
          p_embedding?: number[] | null
          p_client_id?: string | null
          p_category?: string | null
          p_status?: string
          p_limit?: number
          p_rrf_k?: number
        }
        Returns: Array<{
          id: string
          question: string
          answer: string
          category: string | null
          tags: string[] | null
          status: FaqStatus
          updated_at: string
          fts_rank: number
          vec_rank: number
          rrf_score: number
          client_configs: Record<string, unknown>[]
        }>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
