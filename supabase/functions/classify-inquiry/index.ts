/**
 * classify-inquiry Edge Function  (FR-4.1 / FR-4.2)
 *
 * 문의 텍스트를 임베딩 → 유사 FAQ Top-N(match_faqs) 조회 →
 * 추정 카테고리·클라이언트·신뢰도 산출 후 반환.
 * 선택적으로 inquiry 레코드에 predicted_category/prediction_score 를 저장.
 *
 * POST /functions/v1/classify-inquiry
 * Body: { inquiry_id?: string, text?: string, limit?: number, persist?: boolean }
 *   - inquiry_id 가 있으면 DB 에서 raw_text 로딩 + persist 기본 true
 *   - text 만 있으면 즉석 분류 (붙여넣기 미저장 케이스), persist 무시
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

interface SimilarFaq {
  id: string
  question: string
  answer: string
  category: string | null
  tags: string[] | null
  status: string
  similarity: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

    const body = await req.json().catch(() => ({}))
    const limit: number = Math.min(Math.max(body.limit ?? 5, 1), 10)

    // 1) 분류 대상 텍스트 확보
    let text: string = (body.text ?? '').toString()
    let inquiryId: string | null = body.inquiry_id ?? null
    let inquiryClientId: string | null = null

    if (inquiryId) {
      const { data: inq, error } = await supabase
        .from('inquiries')
        .select('raw_text, client_id')
        .eq('id', inquiryId)
        .maybeSingle()
      if (error) throw error
      if (!inq) return json({ error: 'inquiry not found' }, 404)
      text = inq.raw_text
      inquiryClientId = inq.client_id
    }

    text = text.trim()
    if (!text) return json({ error: 'text 또는 inquiry_id 필요' }, 400)

    // 2) 임베딩 생성
    const oRes = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    })
    if (!oRes.ok) return json({ error: `embedding 실패: ${await oRes.text()}` }, 502)
    const embedding: number[] = (await oRes.json()).data[0].embedding

    // 3) 유사 FAQ Top-N
    const { data: matches, error: mErr } = await supabase.rpc('match_faqs', {
      p_embedding: embedding,
      p_limit: limit,
    })
    if (mErr) throw mErr
    const similar = (matches ?? []) as SimilarFaq[]

    // 4) 카테고리 추정 — 유사도 가중 다수결
    const catWeight = new Map<string, number>()
    for (const m of similar) {
      if (!m.category) continue
      catWeight.set(m.category, (catWeight.get(m.category) ?? 0) + m.similarity)
    }
    let predictedCategory: string | null = null
    let bestWeight = 0
    for (const [cat, w] of catWeight) {
      if (w > bestWeight) { bestWeight = w; predictedCategory = cat }
    }

    // 신뢰도 = 최상위 유사도 (0~1)
    const score = similar.length > 0 ? Number(similar[0].similarity.toFixed(4)) : 0

    // 5) 병합 후보 — 유사도 0.88 이상이면 기존 FAQ 업데이트 우선 제안 (FR-5.2)
    const mergeCandidate = similar.find((s) => s.similarity >= 0.88) ?? null

    // 6) 선택적 영속화
    const persist = body.persist ?? Boolean(inquiryId)
    if (inquiryId && persist) {
      await supabase
        .from('inquiries')
        .update({
          predicted_category: predictedCategory,
          prediction_score: score,
        })
        .eq('id', inquiryId)
    }

    return json({
      inquiry_id: inquiryId,
      predicted_category: predictedCategory,
      predicted_client_id: inquiryClientId,
      prediction_score: score,
      merge_candidate_id: mergeCandidate?.id ?? null,
      similar,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
