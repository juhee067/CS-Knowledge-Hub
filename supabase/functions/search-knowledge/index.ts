/**
 * search-knowledge Edge Function — 통합 검색 하이브리드 게이트웨이
 *
 * 쿼리 텍스트를 임베딩(text-embedding-3-small)한 뒤 search_knowledge RPC 에
 * 임베딩을 함께 넘겨 FTS + 벡터 하이브리드 검색을 수행한다.
 *
 * OPENAI_API_KEY 가 없거나 임베딩 실패 시 임베딩 없이(p_embedding=null) 호출 →
 * FTS + ILIKE 어휘 검색으로 자연스럽게 폴백(검색이 끊기지 않음).
 *
 * POST /functions/v1/search-knowledge
 * Body: { query, client_id?, category?, status?, limit? }
 * 응답: { results: SearchResult[], hybrid: boolean }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  let body: {
    query?: string
    client_id?: string | null
    category?: string | null
    status?: string | null
    limit?: number
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  const query = (body.query ?? '').toString().trim()
  if (!query) return json({ error: 'query 필요' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1) 질의 임베딩 (키 없거나 실패 시 null → 어휘 검색으로 폴백)
  let embedding: number[] | null = null
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (openaiKey) {
    try {
      const oRes = await fetch(OPENAI_EMBED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: EMBED_MODEL, input: query.slice(0, 8000) }),
      })
      if (oRes.ok) embedding = (await oRes.json()).data[0].embedding
    } catch {
      embedding = null
    }
  }

  // 2) 하이브리드 검색
  const { data, error } = await supabase.rpc('search_knowledge', {
    p_query: query,
    p_embedding: embedding,
    p_client_id: body.client_id ?? null,
    p_category: body.category ?? null,
    p_status: body.status === 'all' ? 'all' : (body.status ?? 'verified'),
    p_limit: Math.min(Math.max(body.limit ?? 30, 1), 50),
  })
  if (error) return json({ error: `검색 실패: ${error.message}` }, 500)

  return json({ results: data ?? [], hybrid: embedding !== null })
})
