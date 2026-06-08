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

export async function intakeBulk(rows: BulkRow[]): Promise<BulkResult> {
  const { data, error } = await supabase.functions.invoke('intake-bulk', {
    body: { rows },
  })
  if (error) throw error
  return data as BulkResult
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

export interface PasteImportInput {
  raw_text: string
  client_slug?: string
}

export async function intakePaste(input: PasteImportInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      raw_text: input.raw_text,
      source: 'manual',
      status: 'open',
    } as never)
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}
