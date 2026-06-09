import { supabase } from '@/lib/supabase'

export type InquiryStatus = 'open' | 'answered' | 'assetized'

export interface Inquiry {
  id: string
  raw_text: string
  client_id: string | null
  source: string
  source_ref: string | null
  status: InquiryStatus
  predicted_category: string | null
  prediction_score: number | null
  answer_text: string | null
  linked_faq_id: string | null
  created_at: string
}

export interface ChannelSummary {
  source: string
  total: number
  open_count: number
  open_rate: number
  last_received_at: string | null
  errors_24h: number
}

export interface ChannelDailyStat {
  source: string
  day: string
  total: number
  open_count: number
  answered_count: number
  assetized_count: number
}

export interface InquiryFilter {
  source?: string
  status?: InquiryStatus | 'all'
  client_id?: string | null
  category?: string | null
}

export async function listInquiries(filter: InquiryFilter = {}): Promise<Inquiry[]> {
  let query = supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter.source) query = query.eq('source', filter.source)
  if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status)
  if (filter.client_id) query = query.eq('client_id', filter.client_id)
  // 자산화 큐의 '미분류' 묶음은 predicted_category IS NULL 을 의미
  if (filter.category === '미분류') query = query.is('predicted_category', null)
  else if (filter.category) query = query.eq('predicted_category', filter.category)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getChannelSummary(): Promise<ChannelSummary[]> {
  const { data, error } = await supabase
    .from('channel_summary')
    .select('*')
    .order('total', { ascending: false })

  if (error) throw error
  return (data ?? []) as ChannelSummary[]
}

export async function getChannelDailyStats(days = 14): Promise<ChannelDailyStat[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabase
    .from('channel_daily_stats')
    .select('*')
    .gte('day', since)
    .order('day', { ascending: false })

  if (error) throw error
  return (data ?? []) as ChannelDailyStat[]
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const { error } = await supabase
    .from('inquiries')
    .update({ status } as never)
    .eq('id', id)
  if (error) throw error
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as Inquiry | null
}

/** 분류 결과(추정 카테고리·신뢰도) 저장 — 자산화 큐 반영용 */
export async function saveClassification(
  id: string,
  predicted_category: string | null,
  prediction_score: number,
): Promise<void> {
  const { error } = await supabase
    .from('inquiries')
    .update({ predicted_category, prediction_score } as never)
    .eq('id', id)
  if (error) throw error
}
