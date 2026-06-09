import { supabase } from '@/lib/supabase'
import type { FaqStatus } from '@/types'

export interface SearchResult {
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
}

export interface SearchFilter {
  query: string
  client_id?: string | null
  category?: string | null
  status?: FaqStatus | 'all'
}

export async function searchKnowledge(filter: SearchFilter): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_knowledge', {
    p_query: filter.query,
    p_embedding: null,
    p_client_id: filter.client_id ?? null,
    p_category: filter.category ?? null,
    p_status: filter.status === 'all' ? 'all' : (filter.status ?? 'verified'),
    p_limit: 30,
  })

  if (error) throw error
  return (data ?? []) as unknown as SearchResult[]
}
