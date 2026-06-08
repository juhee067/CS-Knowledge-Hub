/**
 * assetize Edge Function  (FR-5.1 / FR-5.2)
 *
 * 문의 답변을 지식(FAQ)으로 자산화.
 *   - mode 'new'   : 신규 FAQ 초안(draft) 생성
 *   - mode 'merge' : 기존 FAQ 답변 업데이트(병합) — 중복 방지
 * 처리 후 inquiry 를 'assetized' 로 전환하고 linked_faq_id·answer_text 기록.
 *
 * POST /functions/v1/assetize
 * Body: {
 *   inquiry_id: string,
 *   mode: 'new' | 'merge',
 *   actor_id?: string,
 *   // new
 *   question?: string, answer?: string, category?: string|null, tags?: string[],
 *   // merge
 *   faq_id?: string, merged_answer?: string
 * }
 *
 * faqs INSERT/UPDATE 트리거가 임베딩 큐 등록을 자동 처리한다.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const { inquiry_id, mode, actor_id } = body

    if (!inquiry_id) return json({ error: 'inquiry_id 필요' }, 400)
    if (mode !== 'new' && mode !== 'merge') return json({ error: "mode 는 'new'|'merge'" }, 400)

    // 문의 로딩 (client_id 승계)
    const { data: inq, error: iErr } = await supabase
      .from('inquiries')
      .select('id, client_id, raw_text')
      .eq('id', inquiry_id)
      .maybeSingle()
    if (iErr) throw iErr
    if (!inq) return json({ error: 'inquiry not found' }, 404)

    let faqId: string
    let answerText: string

    if (mode === 'new') {
      const question = (body.question ?? '').toString().trim()
      const answer = (body.answer ?? '').toString().trim()
      if (!question || !answer) return json({ error: 'question·answer 필요' }, 400)

      const { data: faq, error } = await supabase
        .from('faqs')
        .insert({
          question,
          answer,
          category: body.category ?? null,
          tags: Array.isArray(body.tags) ? body.tags : null,
          status: 'draft',
          created_by: actor_id ?? null,
          updated_by: actor_id ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      faqId = faq.id
      answerText = answer
    } else {
      // merge
      const targetId = body.faq_id
      const mergedAnswer = (body.merged_answer ?? body.answer ?? '').toString().trim()
      if (!targetId) return json({ error: 'merge 시 faq_id 필요' }, 400)
      if (!mergedAnswer) return json({ error: 'merged_answer 필요' }, 400)

      const { data: faq, error } = await supabase
        .from('faqs')
        .update({ answer: mergedAnswer, updated_by: actor_id ?? null })
        .eq('id', targetId)
        .select('id')
        .single()
      if (error) throw error
      faqId = faq.id
      answerText = mergedAnswer
    }

    // 문의 자산화 처리
    const { error: uErr } = await supabase
      .from('inquiries')
      .update({
        status: 'assetized',
        linked_faq_id: faqId,
        answer_text: answerText,
        answered_by: actor_id ?? null,
      })
      .eq('id', inquiry_id)
    if (uErr) throw uErr

    return json({ faq_id: faqId, mode, inquiry_id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
