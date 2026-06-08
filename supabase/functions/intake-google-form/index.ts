/**
 * intake-google-form Edge Function  — FR-8.2
 *
 * Google Apps Script에서 onFormSubmit 이벤트 발생 시 이 엔드포인트로 POST.
 * Body (Apps Script 전송 형식):
 * {
 *   "formId":    "…",
 *   "responseId":"…",
 *   "values": {
 *     "문의 내용": "...",
 *     "클라이언트": "samsung"   ← 선택 필드
 *   }
 * }
 *
 * 환경변수:
 *   WEBHOOK_SECRET_GOOGLE_FORM  — Apps Script에서 x-webhook-secret 헤더로 전달
 *   GOOGLE_FORM_CONTENT_FIELD   — 문의 내용 필드명 (기본: "문의 내용")
 *   GOOGLE_FORM_CLIENT_FIELD    — 클라이언트 슬러그 필드명 (기본: "클라이언트")
 */

import { intakeOne, verifySecret, json, CORS_HEADERS } from '../_shared/intake.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  if (!verifySecret(req, 'WEBHOOK_SECRET_GOOGLE_FORM')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const formId     = String(body.formId ?? '')
  const responseId = String(body.responseId ?? '')
  const values     = (body.values ?? {}) as Record<string, string>

  const contentField = Deno.env.get('GOOGLE_FORM_CONTENT_FIELD') ?? '문의 내용'
  const clientField  = Deno.env.get('GOOGLE_FORM_CLIENT_FIELD')  ?? '클라이언트'

  const rawText = values[contentField]?.trim()
  if (!rawText) {
    return json({ error: `필드 "${contentField}"가 비어 있습니다` }, 400)
  }

  const sourceRef = responseId || `${formId}_${Date.now()}`

  const result = await intakeOne({
    rawText,
    clientSlug: values[clientField] || null,
    source: 'google_form',
    sourceRef,
    intakeRaw: body,
  })

  return json(result, result.status === 'error' ? 500 : 200)
})
