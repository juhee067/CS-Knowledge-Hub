import type { Database } from './lib/database.types'

type T = Database['public']['Tables']

export type UserProfile = T['users']['Row']
export type Client = T['clients']['Row']
export type ClientConfig = T['client_configs']['Row']
export type Faq = T['faqs']['Row']
export type FaqVersion = T['faq_versions']['Row']
export type AuditLog = T['audit_logs']['Row']

export type {
  Role,
  FaqStatus,
  RuleType,
  Severity,
  AuditAction,
} from './lib/database.types'
