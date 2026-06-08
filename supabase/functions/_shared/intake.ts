/**
 * 공통 intake 유틸리티 — 모든 커넥터 Edge Function이 import 해서 사용
 *
 * 역할:
 *  1) 텍스트 정규화 (공백·제어문자 정리)
 *  2) source + source_ref 기반 중복 제거
 *  3) inquiries INSERT
 *  4) connector_logs 기록
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type InquirySource =
  | 'manual'
  | 'google_form'
  | 'email'
  | 'slack'
  | 'kakao'
  | 'sms'
  | 'csv_import'
  | 'wiki_import'

export interface NormalizeInput {
  rawText: string
  clientSlug?: string | null
  source: InquirySource
  sourceRef: string              // 채널 내 유일 ID (dedup 키)
  intakeRaw?: Record<string, unknown>
}

export interface IntakeResult {
  status: 'ok' | 'duplicate' | 'error'
  inquiryId?: string
  errorMsg?: string
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 비인쇄 제어문자
    .replace(/\n{3,}/g, '\n\n')                          // 연속 빈줄 압축
    .trim()
}

function makeClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function resolveClientId(
  supabase: SupabaseClient,
  slug: string | null | undefined,
): Promise<string | null> {
  if (!slug) return null
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  return data?.id ?? null
}

export async function intakeOne(input: NormalizeInput): Promise<IntakeResult> {
  const supabase = makeClient()

  const rawText = normalize(input.rawText)
  if (!rawText) {
    return { status: 'error', errorMsg: 'raw_text 비어있음' }
  }

  try {
    const clientId = await resolveClientId(supabase, input.clientSlug)

    const { data: existing } = await supabase
      .from('inquiries')
      .select('id')
      .eq('source', input.source)
      .eq('source_ref', input.sourceRef)
      .maybeSingle()

    if (existing) {
      await logConnector(supabase, input.source, input.sourceRef, 'duplicate')
      return { status: 'duplicate', inquiryId: existing.id }
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        raw_text: rawText,
        client_id: clientId,
        source: input.source,
        source_ref: input.sourceRef,
        intake_raw: input.intakeRaw ?? null,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) {
      // source+source_ref unique 제약 레이스 처리
      if (error.code === '23505') {
        await logConnector(supabase, input.source, input.sourceRef, 'duplicate')
        return { status: 'duplicate' }
      }
      await logConnector(supabase, input.source, input.sourceRef, 'error', error.message, input.intakeRaw)
      return { status: 'error', errorMsg: error.message }
    }

    await logConnector(supabase, input.source, input.sourceRef, 'ok')
    return { status: 'ok', inquiryId: data.id }
  } catch (e) {
    const msg = String(e)
    await logConnector(supabase, input.source, input.sourceRef, 'error', msg, input.intakeRaw).catch(() => {})
    return { status: 'error', errorMsg: msg }
  }
}

async function logConnector(
  supabase: SupabaseClient,
  source: string,
  eventRef: string | null,
  status: 'ok' | 'duplicate' | 'error',
  errorMsg?: string,
  payload?: Record<string, unknown>,
) {
  await supabase.from('connector_logs').insert({
    source,
    event_ref: eventRef,
    status,
    error_msg: errorMsg ?? null,
    payload: payload ?? null,
  })
}

/** 공통 CORS 헤더 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

/** 웹훅 시크릿 검증 */
export function verifySecret(req: Request, envKey: string): boolean {
  const secret = Deno.env.get(envKey)
  if (!secret) return true // 환경변수 미설정 시 검증 스킵 (개발용)
  const provided = req.headers.get('x-webhook-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  return provided === secret
}
