/**
 * intake-bulk Edge Function
 *
 * CSV 행 배열을 받아 inquiries 테이블에 일괄 적재.
 * 오류 행은 건너뛰고 결과 리포트 반환.
 *
 * POST /functions/v1/intake-bulk
 * Body: {
 *   rows: Array<{
 *     raw_text: string
 *     client_slug?: string
 *     source?: string        // 기본 'csv_import'
 *     source_ref?: string
 *   }>
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface IncomingRow {
  raw_text?: string
  client_slug?: string
  source?: string
  source_ref?: string
  [key: string]: unknown
}

interface InsertRow {
  raw_text: string
  client_id: string | null
  source: string
  source_ref: string | null
  status: 'open'
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()
    const rows: IncomingRow[] = body.rows ?? []

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'rows 배열이 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 클라이언트 슬러그 → ID 맵 캐시
    const slugCache: Record<string, string | null> = {}
    async function resolveClient(slug: string | undefined): Promise<string | null> {
      if (!slug) return null
      if (slug in slugCache) return slugCache[slug]
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      slugCache[slug] = data?.id ?? null
      return slugCache[slug]
    }

    const inserted: InsertRow[] = []
    const errorRows: { index: number; reason: string; row: IncomingRow }[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rawText = typeof r.raw_text === 'string' ? r.raw_text.trim() : ''
      if (!rawText) {
        errorRows.push({ index: i, reason: 'raw_text 비어있음', row: r })
        continue
      }

      const clientId = await resolveClient(r.client_slug)
      inserted.push({
        raw_text: rawText,
        client_id: clientId,
        source: r.source ?? 'csv_import',
        source_ref: r.source_ref ?? null,
        status: 'open',
      })
    }

    // 배치 upsert (source + source_ref 중복 시 무시)
    let insertedCount = 0
    if (inserted.length > 0) {
      const CHUNK = 100
      for (let i = 0; i < inserted.length; i += CHUNK) {
        const chunk = inserted.slice(i, i + CHUNK)
        const { error } = await supabase
          .from('inquiries')
          .upsert(chunk, { onConflict: 'source,source_ref', ignoreDuplicates: true })
        if (error) {
          // 청크 오류는 각 행 오류로 기록
          for (let j = 0; j < chunk.length; j++) {
            errorRows.push({ index: i + j, reason: error.message, row: rows[i + j] })
          }
        } else {
          insertedCount += chunk.length
        }
      }
    }

    return new Response(
      JSON.stringify({
        total: rows.length,
        inserted: insertedCount,
        errors: errorRows.length,
        errorRows,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
