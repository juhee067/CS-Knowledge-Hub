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
    }
    Views: Record<string, never>
    Functions: {
      update_faq_status: {
        Args: { p_faq_id: string; p_new_status: FaqStatus }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
