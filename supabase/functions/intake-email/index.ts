/**
 * intake-email Edge Function  — FR-8.3
 *
 * Gmail → Google Cloud Pub/Sub → 이 엔드포인트로 PUSH 구독 알림 수신.
 * Pub/Sub 메시지에는 Gmail historyId가 포함되어 있으며, Gmail API로 실제 메일을 fetch.
 *
 * 환경변수:
 *   GOOGLE_CLIENT_ID            — OAuth2 클라이언트 ID
 *   GOOGLE_CLIENT_SECRET        — OAuth2 클라이언트 시크릿
 *   GOOGLE_REFRESH_TOKEN        — 갱신 토큰 (Gmail 접근용)
 *   GMAIL_USER_EMAIL            — 모니터링할 Gmail 주소
 *   GMAIL_LABEL_ID              — 필터링할 레이블 ID (없으면 INBOX 전체)
 *   WEBHOOK_SECRET_EMAIL        — Pub/Sub 검증 토큰
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *
 * 동작:
 *  1) Pub/Sub 푸시 메시지 파싱 → historyId 추출
 *  2) Gmail History API로 신규 메시지 목록 조회
 *  3) 각 메시지 fetch → 제목+본문 조합 → intakeOne
 *  4) gmail_watch.history_id 업데이트 (다음 호출을 위해)
 */

import { intakeOne, verifySecret, json, CORS_HEADERS } from '../_shared/intake.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_REFRESH_TOKEN')!,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`토큰 갱신 실패: ${JSON.stringify(data)}`)
  return data.access_token
}

function extractBody(payload: Record<string, unknown>): string {
  const parts = (payload.parts as Array<Record<string, unknown>>) ?? []
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && (part.body as Record<string, unknown>)?.data) {
      return atob(String((part.body as Record<string, unknown>).data).replace(/-/g, '+').replace(/_/g, '/'))
    }
  }
  // 단일 파트
  const bodyData = (payload.body as Record<string, unknown>)?.data
  if (bodyData) {
    return atob(String(bodyData).replace(/-/g, '+').replace(/_/g, '/'))
  }
  return ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405)

  // Pub/Sub 검증 토큰
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? req.headers.get('x-webhook-secret')
  const expected = Deno.env.get('WEBHOOK_SECRET_EMAIL')
  if (expected && token !== expected) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  // Pub/Sub 메시지 디코딩
  const msgData = (body.message as Record<string, unknown>)?.data
  if (!msgData) return json({ ok: true, note: 'no message data' })

  let decoded: Record<string, unknown>
  try {
    decoded = JSON.parse(atob(String(msgData).replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return json({ error: 'Pub/Sub 메시지 디코딩 실패' }, 400)
  }

  const newHistoryId = String(decoded.historyId ?? '')
  const userEmail    = Deno.env.get('GMAIL_USER_EMAIL') ?? ''
  const labelId      = Deno.env.get('GMAIL_LABEL_ID')  ?? ''

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 이전 historyId 조회
  const { data: watchRow } = await supabase
    .from('gmail_watch')
    .select('history_id')
    .eq('user_email', userEmail)
    .maybeSingle()

  const startHistoryId = watchRow?.history_id ?? newHistoryId

  try {
    const accessToken = await getAccessToken()

    // History API로 신규 메시지 목록 조회
    const histUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/${userEmail}/history`)
    histUrl.searchParams.set('startHistoryId', startHistoryId)
    histUrl.searchParams.set('historyTypes', 'messageAdded')
    if (labelId) histUrl.searchParams.set('labelId', labelId)

    const histRes = await fetch(histUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const histData = await histRes.json()
    const messageIds: string[] = []
    for (const h of histData.history ?? []) {
      for (const m of h.messagesAdded ?? []) {
        if (m.message?.id) messageIds.push(m.message.id)
      }
    }

    const results = []
    for (const msgId of messageIds) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const msg = await msgRes.json()
      const headers: Record<string, string> = {}
      for (const h of msg.payload?.headers ?? []) {
        headers[h.name.toLowerCase()] = h.value
      }
      const subject = headers['subject'] ?? '(제목 없음)'
      const from    = headers['from']    ?? ''
      const bodyText = extractBody(msg.payload ?? {})
      const rawText  = `[${from}] ${subject}\n\n${bodyText}`.slice(0, 10000)

      const r = await intakeOne({
        rawText,
        source: 'email',
        sourceRef: msgId,
        intakeRaw: { subject, from, msgId },
      })
      results.push(r)
    }

    // historyId 갱신
    await supabase.from('gmail_watch').upsert({
      user_email: userEmail,
      history_id: newHistoryId,
      refreshed_at: new Date().toISOString(),
    }, { onConflict: 'user_email' })

    return json({ processed: results.length, results })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
