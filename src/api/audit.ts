import { supabase } from '@/lib/supabase'
import type { AuditAction } from '@/types'

/**
 * 감사 로그 기록 (FR-6.2). 실패해도 본 작업을 막지 않도록 조용히 경고만 남긴다.
 * (RLS: editor/lead 만 INSERT 가능, actor_id = 본인)
 */
export async function logAudit(
  entity: string,
  entityId: string,
  action: AuditAction,
  diff: Record<string, unknown>,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return

  const { error } = await supabase.from('audit_logs').insert({
    actor_id: uid,
    entity,
    entity_id: entityId,
    action,
    diff,
  })
  if (error) console.warn('[audit] 기록 실패:', error.message)
}
