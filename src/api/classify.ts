import { supabase } from '@/lib/supabase'
import type { FaqStatus } from '@/types'
import { searchKnowledge } from './search'

// ─── 분류·추천 ─────────────────────────────────────────────────────────────

export interface SimilarFaq {
  id: string
  question: string
  answer: string
  category: string | null
  tags: string[] | null
  status: FaqStatus
  similarity: number          // 0~1 (vector) 또는 정규화 점수 (fts)
}

export interface ClassifyResult {
  predicted_category: string | null
  predicted_client_id: string | null
  prediction_score: number
  merge_candidate_id: string | null   // 유사도 임계치 초과 → 기존 FAQ 업데이트 우선
  similar: SimilarFaq[]
  method: 'vector' | 'fts'             // 분류에 사용된 경로
}

const MERGE_THRESHOLD = 0.88

/**
 * 문의 분류 + 유사 FAQ 추천.
 * 우선 classify-inquiry Edge Function(임베딩 기반)을 호출하고,
 * 미배포·오류 시 search_knowledge(FTS) 기반 클라이언트 폴백으로 동작.
 */
export async function classifyInquiry(params: {
  inquiryId?: string
  text: string
  clientId?: string | null
  limit?: number
}): Promise<ClassifyResult> {
  const limit = params.limit ?? 5

  // 1) Edge Function (임베딩 경로)
  try {
    const { data, error } = await supabase.functions.invoke('classify-inquiry', {
      body: {
        inquiry_id: params.inquiryId,
        text: params.text,
        limit,
      },
    })
    if (!error && data && !data.error) {
      return {
        predicted_category: data.predicted_category ?? null,
        predicted_client_id: data.predicted_client_id ?? params.clientId ?? null,
        prediction_score: data.prediction_score ?? 0,
        merge_candidate_id: data.merge_candidate_id ?? null,
        similar: (data.similar ?? []) as SimilarFaq[],
        method: 'vector',
      }
    }
  } catch {
    // 폴백으로 진행
  }

  // 2) FTS 폴백 — search_knowledge 로 유사 후보 확보
  const results = await searchKnowledge({
    query: params.text.slice(0, 300),
    client_id: params.clientId ?? null,
    status: 'all',
  })

  const similar: SimilarFaq[] = results.slice(0, limit).map((r, i) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    category: r.category,
    tags: r.tags,
    status: r.status,
    // FTS 순위를 0~1 점수로 근사 (1위=가장 높음)
    similarity: Number((1 - i / Math.max(results.length, limit)).toFixed(3)),
  }))

  // 카테고리 추정 — 점수 가중 다수결
  const catWeight = new Map<string, number>()
  for (const s of similar) {
    if (!s.category) continue
    catWeight.set(s.category, (catWeight.get(s.category) ?? 0) + s.similarity)
  }
  let predictedCategory: string | null = null
  let best = 0
  for (const [cat, w] of catWeight) {
    if (w > best) { best = w; predictedCategory = cat }
  }

  const topScore = similar.length > 0 ? similar[0].similarity : 0
  // FTS 폴백은 의미 유사도가 아니므로 병합 제안은 보수적으로 (정확 매칭 가까울 때만)
  const merge = similar.find((s) => s.similarity >= MERGE_THRESHOLD) ?? null

  return {
    predicted_category: predictedCategory,
    predicted_client_id: params.clientId ?? null,
    prediction_score: topScore,
    merge_candidate_id: merge?.id ?? null,
    similar,
    method: 'fts',
  }
}

// ─── 분류 피드백 적립 (FR-4.3) ────────────────────────────────────────────

export async function recordClassificationFeedback(input: {
  inquiryId: string
  predictedCategory: string | null
  correctedCategory: string | null
  predictedClientId: string | null
  correctedClientId: string | null
  predictionScore: number
  accepted: boolean
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('classification_feedback').insert({
    inquiry_id: input.inquiryId,
    predicted_category: input.predictedCategory,
    corrected_category: input.correctedCategory,
    predicted_client_id: input.predictedClientId,
    corrected_client_id: input.correctedClientId,
    prediction_score: input.predictionScore,
    accepted: input.accepted,
    actor_id: userData.user?.id ?? null,
  } as never)
  if (error) throw error
}

// ─── 자산화 (FR-5.1 / FR-5.2) ─────────────────────────────────────────────

export interface AssetizeNewInput {
  inquiryId: string
  mode: 'new'
  question: string
  answer: string
  category: string | null
  tags: string[] | null
}

export interface AssetizeMergeInput {
  inquiryId: string
  mode: 'merge'
  faqId: string
  mergedAnswer: string
}

export type AssetizeInput = AssetizeNewInput | AssetizeMergeInput

/**
 * 답변을 지식으로 자산화.
 * assetize Edge Function 우선, 미배포 시 클라이언트 측 직접 처리로 폴백.
 */
export async function assetizeInquiry(input: AssetizeInput): Promise<{ faq_id: string }> {
  const { data: userData } = await supabase.auth.getUser()
  const actorId = userData.user?.id ?? null

  // 1) Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('assetize', {
      body:
        input.mode === 'new'
          ? {
              inquiry_id: input.inquiryId,
              mode: 'new',
              actor_id: actorId,
              question: input.question,
              answer: input.answer,
              category: input.category,
              tags: input.tags,
            }
          : {
              inquiry_id: input.inquiryId,
              mode: 'merge',
              actor_id: actorId,
              faq_id: input.faqId,
              merged_answer: input.mergedAnswer,
            },
    })
    if (!error && data?.faq_id) return { faq_id: data.faq_id as string }
  } catch {
    // 폴백
  }

  // 2) 클라이언트 폴백 (RLS: editor+ 권한)
  let faqId: string
  let answerText: string

  if (input.mode === 'new') {
    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question: input.question,
        answer: input.answer,
        category: input.category,
        tags: input.tags,
        status: 'draft',
        created_by: actorId,
        updated_by: actorId,
      } as never)
      .select('id')
      .single()
    if (error) throw error
    faqId = (data as { id: string }).id
    answerText = input.answer
  } else {
    const { data, error } = await supabase
      .from('faqs')
      .update({ answer: input.mergedAnswer, updated_by: actorId } as never)
      .eq('id', input.faqId)
      .select('id')
      .single()
    if (error) throw error
    faqId = (data as { id: string }).id
    answerText = input.mergedAnswer
  }

  const { error: uErr } = await supabase
    .from('inquiries')
    .update({
      status: 'assetized',
      linked_faq_id: faqId,
      answer_text: answerText,
      answered_by: actorId,
    } as never)
    .eq('id', input.inquiryId)
  if (uErr) throw uErr

  return { faq_id: faqId }
}

// ─── 자산화 큐 (FR-5.3) ────────────────────────────────────────────────────

export interface AssetizeCandidate {
  category: string
  open_count: number
  avg_score: number
  first_seen: string
  last_seen: string
  latest_inquiry_id: string
  sample_text: string
}

export async function getAssetizeCandidates(minCount = 1): Promise<AssetizeCandidate[]> {
  const { data, error } = await supabase
    .from('assetize_candidates')
    .select('*')
    .gte('open_count', minCount)
    .order('open_count', { ascending: false })
  if (error) throw error
  return (data ?? []) as AssetizeCandidate[]
}
