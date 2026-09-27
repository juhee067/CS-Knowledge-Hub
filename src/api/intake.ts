import { supabase } from '@/lib/supabase'

export interface BulkRow {
  raw_text: string
  client_slug?: string
  source?: string
  source_ref?: string
}

export interface BulkResult {
  total: number
  inserted: number
  errors: number
  errorRows: { index: number; reason: string; row: BulkRow }[]
}

/**
 * CSV 행 배열을 inquiries 에 일괄 적재.
 * Edge Function 미배포 환경에서도 동작하도록 클라이언트에서 직접 upsert.
 * (source, source_ref) 유니크 제약으로 중복은 자동 무시. RLS: editor+ 권한.
 */
export async function intakeBulk(rows: BulkRow[]): Promise<BulkResult> {
  // client_slug → client_id 변환 (캐시)
  const slugCache: Record<string, string | null> = {}
  async function resolveClient(slug?: string): Promise<string | null> {
    if (!slug) return null
    if (slug in slugCache) return slugCache[slug]
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    slugCache[slug] = (data as { id: string } | null)?.id ?? null
    return slugCache[slug]
  }

  const errorRows: BulkResult['errorRows'] = []
  const toInsert: {
    raw_text: string; client_id: string | null
    source: string; source_ref: string | null; status: 'open'
  }[] = []
  const originIndex: number[] = [] // toInsert[k] 의 원본 행 번호

  for (let i = 0; i < rows.length; i++) {
    const raw = (rows[i].raw_text ?? '').trim()
    if (!raw) {
      errorRows.push({ index: i, reason: 'raw_text 비어있음', row: rows[i] })
      continue
    }
    const clientId = await resolveClient(rows[i].client_slug)
    toInsert.push({
      raw_text: raw,
      client_id: clientId,
      source: rows[i].source ?? 'csv_import',
      source_ref: rows[i].source_ref ?? null,
      status: 'open',
    })
    originIndex.push(i)
  }

  let inserted = 0
  const CHUNK = 100
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('inquiries')
      .upsert(chunk as never, { onConflict: 'source,source_ref', ignoreDuplicates: true })
      .select('id')
    if (error) {
      for (let j = 0; j < chunk.length; j++) {
        const idx = originIndex[i + j]
        errorRows.push({ index: idx, reason: error.message, row: rows[idx] })
      }
    } else {
      inserted += data?.length ?? 0
    }
  }

  return { total: rows.length, inserted, errors: errorRows.length, errorRows }
}

export interface BulkFaqRow {
  question: string
  answer: string
  category?: string
  /** 클라이언트 slug 또는 이름 — 매칭되면 faqs.client_id 에 연결 */
  client?: string
}

export interface BulkFaqResult {
  total: number
  inserted: number
  errors: number
  errorRows: { index: number; reason: string; row: BulkFaqRow }[]
}

/**
 * 질문+답변 쌍을 faqs 테이블에 일괄 적재 (status='draft').
 * RLS: editor+ 권한.
 */
export async function intakeBulkFaq(rows: BulkFaqRow[]): Promise<BulkFaqResult> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id ?? null

  // client (slug 또는 이름) → client_id 변환 (캐시)
  const clientCache: Record<string, string | null> = {}
  async function resolveClient(key?: string): Promise<string | null> {
    const k = (key ?? '').trim()
    if (!k) return null
    if (k in clientCache) return clientCache[k]
    const { data } = await supabase
      .from('clients')
      .select('id')
      .or(`slug.eq.${k},name.eq.${k}`)
      .maybeSingle()
    clientCache[k] = (data as { id: string } | null)?.id ?? null
    return clientCache[k]
  }

  const errorRows: BulkFaqResult['errorRows'] = []
  const toInsert: {
    question: string; answer: string; category: string | null; client_id: string | null
    created_by: string | null; updated_by: string | null
  }[] = []
  const originIndex: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const question = (rows[i].question ?? '').trim()
    const answer = (rows[i].answer ?? '').trim()
    const category = (rows[i].category ?? '').trim() || null
    if (!question) {
      errorRows.push({ index: i, reason: 'question 비어있음', row: rows[i] })
      continue
    }
    if (!answer) {
      errorRows.push({ index: i, reason: 'answer 비어있음', row: rows[i] })
      continue
    }
    const client_id = await resolveClient(rows[i].client)
    toInsert.push({ question, answer, category, client_id, created_by: uid, updated_by: uid })
    originIndex.push(i)
  }

  let inserted = 0
  const CHUNK = 100
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('faqs')
      .insert(chunk as never)
      .select('id')
    if (error) {
      for (let j = 0; j < chunk.length; j++) {
        const idx = originIndex[i + j]
        errorRows.push({ index: idx, reason: error.message, row: rows[idx] })
      }
    } else {
      inserted += data?.length ?? 0
    }
  }

  return { total: rows.length, inserted, errors: errorRows.length, errorRows }
}

export interface WikiImportResult {
  faq_id: string
  question: string
}

export async function importFromWikiUrl(url: string): Promise<WikiImportResult> {
  // Edge Function 호출 대신 클라이언트 측에서 URL fetch → FAQ 초안 생성
  // (CORS 제한으로 실제 위키 페이지는 Edge Function 경유가 권장이나 여기선 텍스트 전달 방식으로 처리)
  const { data, error } = await supabase.functions.invoke('wiki-import', {
    body: { url },
  })
  if (error) throw error
  return data as WikiImportResult
}

// inquiries.source check 제약 허용 값
const ALLOWED_SOURCES = new Set([
  'manual', 'google_form', 'email', 'slack', 'kakao', 'sms', 'phone', 'csv_import', 'wiki_import',
])

export interface PasteImportInput {
  raw_text: string
  client_slug?: string
  category?: string | null
  source?: string
}

export async function intakePaste(input: PasteImportInput): Promise<{ id: string }> {
  // client_slug → client_id 변환 (선택)
  let clientId: string | null = null
  if (input.client_slug) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', input.client_slug)
      .maybeSingle()
    clientId = (client as { id: string } | null)?.id ?? null
  }

  // check 제약을 벗어난 신규 채널은 manual 로 폴백
  const source = input.source && ALLOWED_SOURCES.has(input.source) ? input.source : 'manual'

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      raw_text: input.raw_text,
      source,
      status: 'open',
      client_id: clientId,
      predicted_category: input.category ?? null,
    } as never)
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}
