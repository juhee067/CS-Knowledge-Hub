/**
 * chat Edge Function — Ask the Hub (FR-7.2 / FR-7.5)
 *
 * 자연어 질문을 임베딩 → 유사 FAQ(match_faqs) 검색 → 근거 기반(grounded) 답변을 SSE 스트리밍.
 * 근거 임계치 미만이면 LLM 호출 없이 "참고 자료 없음" 을 반환해 추측 답변을 차단한다.
 *
 * POST /functions/v1/chat
 * Body: { query: string, history?: {role,content}[], client_id?: string, limit?: number }
 *
 * 응답: text/event-stream
 *   data: {"type":"meta","grounded":bool,"citations":[{type,id,title,score}],"sources":[...]}
 *   data: {"type":"token","value":"..."}      (grounded=true 일 때 반복)
 *   data: {"type":"done"}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const EMBED_MODEL = 'text-embedding-3-small'
const CHAT_MODEL = 'gpt-4o-mini'

// 근거 임계치 — 최상위 유사도가 이 값 미만이면 단정하지 않는다 (FR-7.5)
const GROUND_THRESHOLD = 0.7
// 컨텍스트에 포함할 최대 근거 수
const MAX_CONTEXT = 5

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

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

interface MatchFaq {
  id: string
  question: string
  answer: string
  category: string | null
  tags: string[] | null
  status: string
  similarity: number
}

const SYSTEM_PROMPT = `당신은 사내 지식 어시스턴트입니다. 아래에 번호가 매겨진 참고 FAQ만을 근거로 한국어로 답합니다.

규칙:
- 제공된 참고 자료에 근거가 없는 내용은 절대 추측하거나 지어내지 마세요. 근거가 부족하면 "제공된 자료로는 정확히 답하기 어렵습니다"라고 솔직히 답합니다.
- 답변의 각 핵심 문장 끝에 근거가 된 자료 번호를 [1], [2] 형식으로 표기합니다.
- 간결하고 실무적으로, 마크다운으로 작성합니다.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return json({ error: 'OPENAI_API_KEY not set' }, 500)

  let body: {
    query?: string
    history?: { role: string; content: string }[]
    client_id?: string | null
    limit?: number
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  const query = (body.query ?? '').toString().trim()
  if (!query) return json({ error: 'query 필요' }, 400)

  const limit = Math.min(Math.max(body.limit ?? MAX_CONTEXT, 1), 10)
  const history = Array.isArray(body.history) ? body.history.slice(-6) : []

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1) 질의 임베딩
  let embedding: number[]
  try {
    const oRes = await fetch(OPENAI_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: query.slice(0, 8000) }),
    })
    if (!oRes.ok) return json({ error: `embedding 실패: ${await oRes.text()}` }, 502)
    embedding = (await oRes.json()).data[0].embedding
  } catch (e) {
    return json({ error: `embedding 오류: ${String(e)}` }, 502)
  }

  // 2) 유사 FAQ 검색
  const { data: matches, error: mErr } = await supabase.rpc('match_faqs', {
    p_embedding: embedding,
    p_limit: limit,
    p_client_id: body.client_id ?? null,
  })
  if (mErr) return json({ error: `검색 실패: ${mErr.message}` }, 500)

  const similar = ((matches ?? []) as MatchFaq[]).filter((m) => m.status !== 'deprecated')
  const topScore = similar.length > 0 ? similar[0].similarity : 0
  const grounded = topScore >= GROUND_THRESHOLD

  // 출처/인용 메타 (FR-7.3) — 임계치 이상 근거만 인용으로 제시
  const cited = similar.filter((m) => m.similarity >= GROUND_THRESHOLD)
  const citations = cited.map((m) => ({
    type: 'faq' as const,
    id: m.id,
    title: m.question,
    score: Number(m.similarity.toFixed(4)),
  }))
  const sources = similar.map((m) => ({
    id: m.id,
    question: m.question,
    category: m.category,
    similarity: Number(m.similarity.toFixed(4)),
  }))

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (o: unknown) => controller.enqueue(enc.encode(sse(o)))

      send({ type: 'meta', grounded, citations, sources })

      // 근거 부족 → 단정 금지, 자산화 유도 (FR-7.5)
      if (!grounded) {
        const msg =
          '제공된 지식 베이스에서 이 질문에 대한 충분한 근거를 찾지 못했습니다. ' +
          '추측으로 답변하지 않겠습니다. 아래 **자산화 큐에 등록**해 담당자가 정식 답변을 작성하도록 요청할 수 있습니다.'
        send({ type: 'token', value: msg })
        send({ type: 'done' })
        controller.close()
        return
      }

      // 3) 근거 컨텍스트 구성
      const context = cited
        .map((m, i) => `[${i + 1}] (${m.category ?? '미분류'}) ${m.question}\n${m.answer}`)
        .join('\n\n')

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: `참고 자료:\n\n${context}\n\n---\n질문: ${query}` },
      ]

      // 4) OpenAI 스트리밍
      try {
        const cRes = await fetch(OPENAI_CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages,
            temperature: 0.2,
            stream: true,
          }),
        })

        if (!cRes.ok || !cRes.body) {
          send({ type: 'token', value: `답변 생성 실패: ${await cRes.text()}` })
          send({ type: 'done' })
          controller.close()
          return
        }

        const reader = cRes.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const payload = t.slice(5).trim()
            if (payload === '[DONE]') continue
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content
              if (delta) send({ type: 'token', value: delta })
            } catch {
              // 부분 청크 무시
            }
          }
        }
        send({ type: 'done' })
      } catch (e) {
        send({ type: 'token', value: `오류: ${String(e)}` })
        send({ type: 'done' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS,
    },
  })
})
