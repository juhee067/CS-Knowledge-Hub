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

/**
 * 통합 검색 — search-knowledge Edge Function(쿼리 임베딩 + 하이브리드) 우선,
 * 함수 미배포·오류 시 RPC 직접 호출(FTS + ILIKE 어휘 검색)로 폴백.
 */
export async function searchKnowledge(filter: SearchFilter): Promise<SearchResult[]> {
  const p_status = filter.status === 'all' ? 'all' : (filter.status ?? 'verified')

  // 1) Edge Function (의미 검색 포함 하이브리드)
  try {
    const { data, error } = await supabase.functions.invoke('search-knowledge', {
      body: {
        query: filter.query,
        client_id: filter.client_id ?? null,
        category: filter.category ?? null,
        status: p_status,
        limit: 30,
      },
    })
    if (!error && data?.results) {
      return data.results as SearchResult[]
    }
  } catch {
    // 폴백
  }

  // 2) 폴백: RPC 직접 (임베딩 없이 = FTS + ILIKE 어휘 검색)
  const { data, error } = await supabase.rpc('search_knowledge', {
    p_query: filter.query,
    p_embedding: null,
    p_client_id: filter.client_id ?? null,
    p_category: filter.category ?? null,
    p_status,
    p_limit: 30,
  })

  if (error) throw error
  return (data ?? []) as unknown as SearchResult[]
}
