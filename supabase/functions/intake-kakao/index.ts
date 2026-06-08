/**
 * intake-kakao Edge Function  — FR-8.5 (채널 개설 전제)
 *
 * 카카오 비즈니스 채널 웹훅 수신.
 * 채널 개설 전이므로 현재는 수동 폼(QuickInputPage)으로 대체됨.
 * 채널 개설 후 아래 payload 형식으로 연동 가능.
 *
 * 환경변수:
 *   WEBHOOK_SECRET_KAKAO   — 카카오 채널 검증 토큰
 *
 * 카카오 비즈 채널 웹훅 payload 예시:
 * { "userKey": "...", "type": "text", "content": "..." }
 */

import { intakeOne, verifySecret, json, CORS_HEADERS } from '../_shared/intake.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  // 채널 미개설 안내 (개설 후 아래 주석 해제)
  const kakaoSecret = Deno.env.get('WEBHOOK_SECRET_KAKAO')
  if (!kakaoSecret) {
    return json({
      error: 'Kakao channel not configured',
      guide: 'WEBHOOK_SECRET_KAKAO 환경변수 설정 후 사용 가능합니다.',
    }, 501)
  }

  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)
  if (!verifySecret(req, 'WEBHOOK_SECRET_KAKAO')) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const userKey = String(body.userKey ?? '')
  const content = String(body.content ?? body.text ?? '').trim()
  const msgId   = String(body.messageId ?? `${userKey}_${Date.now()}`)

  if (!content) return json({ error: 'content 비어있음' }, 400)

  const result = await intakeOne({
    rawText: content,
    source: 'kakao',
    sourceRef: msgId,
    intakeRaw: body,
  })

  return json(result)
})
