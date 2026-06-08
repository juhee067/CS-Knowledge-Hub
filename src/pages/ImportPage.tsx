import { useRef, useState } from 'react'
import { Upload, Link2, FileText, CheckCircle2, XCircle, Download } from 'lucide-react'
import { intakeBulk, intakePaste, type BulkRow, type BulkResult } from '@/api/intake'
import { listClients } from '@/api/clients'
import type { Client } from '@/types'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── 탭 타입 ───────────────────────────────────────────────────────────────

type Tab = 'csv' | 'wiki' | 'paste'

// ─── CSV 파싱 (의존성 없이) ──────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// ─── 오류 행 CSV 다운로드 ─────────────────────────────────────────────────

function downloadErrorCSV(result: BulkResult) {
  const lines = ['index,reason,raw_text']
  for (const e of result.errorRows) {
    const raw = String(e.row.raw_text ?? '').replace(/"/g, '""')
    const reason = e.reason.replace(/"/g, '""')
    lines.push(`${e.index},"${reason}","${raw}"`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'import_errors.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── CSV 탭 ───────────────────────────────────────────────────────────────

function CsvTab({ clients }: { clients: Client[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<{
    raw_text: string; client_slug: string; source_ref: string
  }>({ raw_text: '', client_slug: '', source_ref: '' })
  const [defaultClientSlug, setDefaultClientSlug] = useState('')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) { setError('데이터 행이 없습니다'); return }
      setHeaders(parsed[0])
      setRows(parsed.slice(1))
      setMapping({ raw_text: '', client_slug: '', source_ref: '' })
      setResult(null)
      setError(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleUpload() {
    if (!mapping.raw_text) { setError('raw_text 컬럼을 선택하세요'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const rawTextIdx = headers.indexOf(mapping.raw_text)
      const slugIdx = mapping.client_slug ? headers.indexOf(mapping.client_slug) : -1
      const refIdx = mapping.source_ref ? headers.indexOf(mapping.source_ref) : -1

      const bulkRows: BulkRow[] = rows.map((r) => ({
        raw_text: r[rawTextIdx] ?? '',
        client_slug: (slugIdx >= 0 ? r[slugIdx] : '') || defaultClientSlug || undefined,
        source: 'csv_import',
        source_ref: refIdx >= 0 ? r[refIdx] || undefined : undefined,
      }))

      setResult(await intakeBulk(bulkRows))
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 파일 선택 */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 p-10 text-center transition hover:border-primary/50"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">CSV 파일을 클릭하여 선택</p>
        <p className="mt-1 text-xs text-muted-foreground">UTF-8 인코딩 권장</p>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
      </div>

      {/* 컬럼 매핑 */}
      {headers.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">컬럼 매핑 ({rows.length}행 감지됨)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>raw_text <span className="text-destructive">*</span></Label>
              <Select value={mapping.raw_text} onChange={(e) => setMapping({ ...mapping, raw_text: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <Label>client_slug (선택)</Label>
              <Select value={mapping.client_slug} onChange={(e) => setMapping({ ...mapping, client_slug: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <Label>source_ref (선택)</Label>
              <Select value={mapping.source_ref} onChange={(e) => setMapping({ ...mapping, source_ref: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
          </div>

          {/* 기본 클라이언트 */}
          <div className="max-w-xs">
            <Label>기본 클라이언트 (client_slug 컬럼 없을 때)</Label>
            <Select value={defaultClientSlug} onChange={(e) => setDefaultClientSlug(e.target.value)}>
              <option value="">없음</option>
              {clients.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </Select>
          </div>

          {/* 미리보기 */}
          <div className="overflow-x-auto rounded border text-xs">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i} className="border-t">
                    {r.map((cell, j) => <td key={j} className="max-w-xs truncate px-3 py-1.5">{cell}</td>)}
                  </tr>
                ))}
                {rows.length > 3 && (
                  <tr className="border-t">
                    <td colSpan={headers.length} className="px-3 py-1.5 text-muted-foreground">
                      … 외 {rows.length - 3}행
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleUpload} disabled={loading || !mapping.raw_text}>
            {loading ? '업로드 중…' : `${rows.length}행 일괄 적재`}
          </Button>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {result.errors === 0
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <XCircle className="h-5 w-5 text-destructive" />}
              <div>
                <p className="font-medium">
                  {result.inserted}건 적재 완료 / 총 {result.total}건
                </p>
                {result.errors > 0 && (
                  <p className="text-sm text-destructive">{result.errors}건 오류</p>
                )}
              </div>
              {result.errors > 0 && (
                <Button variant="secondary" size="sm" className="ml-auto" onClick={() => downloadErrorCSV(result)}>
                  <Download className="mr-1 h-4 w-4" /> 오류 목록 다운로드
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── 위키 URL 탭 ──────────────────────────────────────────────────────────

function WikiTab() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setError(null); setDone(false)
    try {
      const { importFromWikiUrl } = await import('@/api/intake')
      await importFromWikiUrl(url.trim())
      setDone(true)
      setUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '임포트 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleImport} className="space-y-4">
      <div>
        <Label htmlFor="wiki-url">Notion / Confluence 페이지 URL</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wiki-url"
              className="pl-9"
              placeholder="https://notion.so/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
          </div>
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? '가져오는 중…' : '초안 생성'}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        페이지 내용을 분석해 FAQ 초안을 생성합니다. 공개 접근 가능한 URL이어야 합니다.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> FAQ 초안이 생성되었습니다.
        </div>
      )}
    </form>
  )
}

// ─── 수동 복붙 탭 ─────────────────────────────────────────────────────────

function PasteTab({ clients }: { clients: Client[] }) {
  const [text, setText] = useState('')
  const [clientSlug, setClientSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true); setError(null); setDone(false)
    try {
      await intakePaste({ raw_text: text.trim(), client_slug: clientSlug || undefined })
      setDone(true)
      setText(''); setClientSlug('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="paste-text">문의 내용</Label>
        <Textarea
          id="paste-text"
          className="mt-1 min-h-40"
          placeholder="문의 내용을 붙여넣거나 직접 입력하세요…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="paste-client">클라이언트 (선택)</Label>
        <Select
          id="paste-client"
          value={clientSlug}
          onChange={(e) => setClientSlug(e.target.value)}
        >
          <option value="">없음</option>
          {clients.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> 문의가 저장되었습니다.
        </div>
      )}
      <Button type="submit" disabled={loading || !text.trim()}>
        {loading ? '저장 중…' : '문의 저장'}
      </Button>
    </form>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof Upload }[] = [
  { id: 'csv', label: 'CSV/Excel 업로드', icon: Upload },
  { id: 'wiki', label: '위키 URL 임포트', icon: Link2 },
  { id: 'paste', label: '수동 복붙 입력', icon: FileText },
]

export function ImportPage() {
  const [tab, setTab] = useState<Tab>('csv')
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">데이터 이관</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV 파일, 위키 페이지, 또는 직접 입력으로 문의·FAQ 초안을 가져옵니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <Card>
        <CardContent className="p-6">
          {tab === 'csv' && <CsvTab clients={clients} />}
          {tab === 'wiki' && <WikiTab />}
          {tab === 'paste' && <PasteTab clients={clients} />}
        </CardContent>
      </Card>

      {/* 안내 */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">CSV: 100행 / 30초 내 처리</Badge>
        <Badge variant="outline">중복(source+ref) 자동 제거</Badge>
        <Badge variant="outline">오류 행 CSV 다운로드 지원</Badge>
      </div>
    </div>
  )
}
