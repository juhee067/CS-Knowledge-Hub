/**
 * embed-faq Edge Function
 *
 * 큐(embed_queue)에서 FAQ를 가져와 OpenAI text-embedding-3-small 로 임베딩 생성 후 저장.
 * POST /functions/v1/embed-faq  — Supabase 크론 or FAQ 저장 직후 호출
 * Body: { faq_id?: string }  — 단건 지정, 없으면 큐 전체 처리
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 10

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 단건 or 큐 전체 처리
    let faqIds: string[]
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    if (body.faq_id) {
      faqIds = [body.faq_id]
    } else {
      const { data: queue, error: qErr } = await supabase
        .from('embed_queue')
        .select('faq_id')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)

      if (qErr) throw qErr
      faqIds = (queue ?? []).map((r: { faq_id: string }) => r.faq_id)
    }

    if (faqIds.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // FAQ 본문 가져오기
    const { data: faqs, error: fErr } = await supabase
      .from('faqs')
      .select('id, question, answer')
      .in('id', faqIds)
      .is('deleted_at', null)

    if (fErr) throw fErr

    let processed = 0
    const errors: string[] = []

    for (const faq of faqs ?? []) {
      try {
        const input = `${faq.question}\n\n${faq.answer}`.slice(0, 8000)

        const oRes = await fetch(OPENAI_EMBED_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({ model: EMBED_MODEL, input }),
        })

        if (!oRes.ok) {
          const errText = await oRes.text()
          errors.push(`faq ${faq.id}: ${errText}`)
          continue
        }

        const oData = await oRes.json()
        const embedding: number[] = oData.data[0].embedding

        const { error: uErr } = await supabase
          .from('faqs')
          .update({ embedding })
          .eq('id', faq.id)

        if (uErr) {
          errors.push(`faq ${faq.id}: ${uErr.message}`)
          continue
        }

        // 큐에서 제거
        await supabase.from('embed_queue').delete().eq('faq_id', faq.id)
        processed++
      } catch (e) {
        errors.push(`faq ${faq.id}: ${String(e)}`)
      }
    }

    return new Response(JSON.stringify({ processed, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
