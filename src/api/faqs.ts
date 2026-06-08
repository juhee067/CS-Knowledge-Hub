import { supabase } from '@/lib/supabase'
import type { Faq, FaqStatus, FaqVersion } from '@/types'
import { logAudit } from './audit'

export interface FaqFilter {
  search?: string
  category?: string
  status?: FaqStatus | 'all'
}

export async function listFaqs(filter: FaqFilter = {}): Promise<Faq[]> {
  let query = supabase
    .from('faqs')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }
  if (filter.category) {
    query = query.eq('category', filter.category)
  }
  if (filter.search) {
    query = query.or(
      `question.ilike.%${filter.search}%,answer.ilike.%${filter.search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getFaq(id: string): Promise<Faq | null> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getFaqVersions(faqId: string): Promise<FaqVersion[]> {
  const { data, error } = await supabase
    .from('faq_versions')
    .select('*')
    .eq('faq_id', faqId)
    .order('changed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface FaqInput {
  question: string
  answer: string
  category: string | null
  tags: string[] | null
}

export async function createFaq(input: FaqInput): Promise<Faq> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id ?? null

  const { data, error } = await supabase
    .from('faqs')
    .insert({ ...input, created_by: uid, updated_by: uid })
    .select()
    .single()
  if (error) throw error
  await logAudit('faq', data.id, 'create', { question: input.question })
  return data
}

export async function updateFaq(id: string, input: FaqInput): Promise<Faq> {
  // updated_at/updated_by/버전 스냅샷은 DB 트리거가 처리
  const { data, error } = await supabase
    .from('faqs')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logAudit('faq', id, 'update', { question: input.question })
  return data
}

export async function setFaqStatus(
  id: string,
  status: FaqStatus,
): Promise<void> {
  // RPC: 권한 검증(editor/lead, verified는 lead) + 버전 트리거 발동
  const { error } = await supabase.rpc('update_faq_status', {
    p_faq_id: id,
    p_new_status: status,
  })
  if (error) throw error
  await logAudit('faq', id, 'status_change', { status })
}

export async function softDeleteFaq(id: string): Promise<void> {
  const { error } = await supabase
    .from('faqs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  await logAudit('faq', id, 'delete', {})
}
