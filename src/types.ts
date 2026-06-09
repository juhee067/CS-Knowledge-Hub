import type { Database } from './lib/database.types'

type T = Database['public']['Tables']

export type UserProfile = T['users']['Row']
export type Client = T['clients']['Row']
export type Faq = T['faqs']['Row']
export type FaqVersion = T['faq_versions']['Row']
export type AuditLog = T['audit_logs']['Row']

export type {
  Role,
  FaqStatus,
  AuditAction,
} from './lib/database.types'
