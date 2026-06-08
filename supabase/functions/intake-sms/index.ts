/**
 * intake-sms Edge Function  — FR-8.6 (수신번호 개설 전제)
 *
 * Solapi MMS/SMS 수신 웹훅.
 * 수신번호 미개설 시 수동 폼(QuickInputPage)으로 대체됨.
 *
 * 환경변수:
 *   SOLAPI_WEBHOOK_SECRET   — Solapi 검증 토큰
 *
 * Solapi 수신 웹훅 payload 예시:
 * { "messageId": "...", "from": "01012345678", "text": "...", "receivedAt": "..." }
 */

import { intakeOne, verifySecret, json, CORS_HEADERS } from '../_shared/intake.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const smsSecret = Deno.env.get('SOLAPI_WEBHOOK_SECRET')
  if (!smsSecret) {
    return json({
      error: 'SMS channel not configured',
      guide: 'SOLAPI_WEBHOOK_SECRET 환경변수 및 수신번호 개설 후 사용 가능합니다.',
    }, 501)
  }

  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)
  if (!verifySecret(req, 'SOLAPI_WEBHOOK_SECRET')) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const messageId  = String(body.messageId ?? `sms_${Date.now()}`)
  const from       = String(body.from ?? '')
  const text       = String(body.text ?? body.content ?? '').trim()

  if (!text) return json({ error: 'text 비어있음' }, 400)

  const rawText = from ? `[${from}] ${text}` : text

  const result = await intakeOne({
    rawText,
    source: 'sms',
    sourceRef: messageId,
    intakeRaw: body,
  })

  return json(result)
})
