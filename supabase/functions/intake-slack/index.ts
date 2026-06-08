/**
 * intake-slack Edge Function  — FR-8.4
 *
 * Slack Events API에서 발생하는 message 이벤트를 수신.
 *
 * 환경변수:
 *   SLACK_SIGNING_SECRET   — 요청 서명 검증 (HMAC-SHA256)
 *   SLACK_BOT_TOKEN        — Bot User OAuth Token (스레드 답글 조회용)
 *   SLACK_CHANNEL_ID       — 모니터링할 채널 ID (없으면 전체)
 *
 * 동작:
 *  1) URL verification challenge 응답
 *  2) HMAC 서명 검증
 *  3) message 이벤트 → intakeOne
 *  4) 봇 메시지 / 수정·삭제 이벤트 무시
 */

import { intakeOne, json, CORS_HEADERS } from '../_shared/intake.ts'

async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET')
  if (!signingSecret) return true // 개발 환경에서 스킵

  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const slackSig  = req.headers.get('x-slack-signature') ?? ''

  // 5분 이상 오래된 요청 거부 (리플레이 방지)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const sigBase  = `v0:${timestamp}:${body}`
  const key      = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sigBuf   = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigBase))
  const computed = 'v0=' + Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === slackSig
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  const rawBody = await req.text()

  if (!await verifySlackSignature(req, rawBody)) {
    return json({ error: 'Invalid signature' }, 401)
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(rawBody) } catch { return json({ error: 'Invalid JSON' }, 400) }

  // URL Verification challenge (Slack App 설정 시 1회)
  if (body.type === 'url_verification') {
    return json({ challenge: body.challenge })
  }

  if (body.type !== 'event_callback') {
    return json({ ok: true, note: 'unsupported type' })
  }

  const event = body.event as Record<string, unknown>
  if (!event) return json({ ok: true })

  // 봇 메시지·수정·삭제 무시
  if (event.bot_id || event.subtype) {
    return json({ ok: true, note: 'skipped' })
  }

  if (event.type !== 'message') {
    return json({ ok: true, note: 'not a message' })
  }

  const allowedChannel = Deno.env.get('SLACK_CHANNEL_ID')
  if (allowedChannel && event.channel !== allowedChannel) {
    return json({ ok: true, note: 'channel filtered' })
  }

  const text      = String(event.text ?? '').trim()
  const ts        = String(event.ts ?? Date.now())
  const channel   = String(event.channel ?? '')
  const user      = String(event.user ?? '')
  const threadTs  = String(event.thread_ts ?? ts)

  const sourceRef = `${channel}_${ts}`
  const rawText   = text || '(빈 메시지)'

  const result = await intakeOne({
    rawText,
    source: 'slack',
    sourceRef,
    intakeRaw: { channel, user, ts, thread_ts: threadTs, text },
  })

  return json(result)
})
