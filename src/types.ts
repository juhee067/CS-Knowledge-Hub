import type { Database } from './lib/database.types'

type T = Database['public']['Tables']

export type UserProfile = T['users']['Row']
export type Client = T['clients']['Row']
export type Faq = T['faqs']['Row']
export type FaqVersion = T['faq_versions']['Row']
export type AuditLog = T['audit_logs']['Row']
export type ChatSession = T['chat_sessions']['Row']
export type ChatMessage = T['chat_messages']['Row']

export type {
  Role,
  FaqStatus,
  AuditAction,
  ChatFeedback,
  Citation,
} from './lib/database.types'
