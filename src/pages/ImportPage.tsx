import { useRef, useState } from 'react'
import { Upload, Link2, CheckCircle2, XCircle, Download, FileDown } from 'lucide-react'
import { intakeBulkFaq, type BulkFaqRow, type BulkFaqResult } from '@/api/intake'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── 탭 타입 ───────────────────────────────────────────────────────────────

type Tab = 'csv' | 'wiki'

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

// ─── CSV 템플릿 다운로드 ───────────────────────────────────────────────────

function downloadTemplate() {
  const lines = [
    'question,answer,category,client',
    '"비밀번호를 잊어버렸어요. 재설정 방법은요?","로그인 화면 하단 [비밀번호 찾기]를 클릭한 후 이메일 인증을 완료하면 재설정 링크를 받을 수 있습니다.",계정,korea-univ',
    '"환불 규정이 어떻게 되나요?","구매 후 7일 이내, 미사용 시 전액 환불 가능합니다. 이후에는 부분 환불 정책이 적용됩니다.",결제/환불,',
    '"수강 기간 연장이 가능한가요?","고객센터로 문의하시면 1회에 한해 30일 연장이 가능합니다.",수강,veluga',
  ]
  // BOM 추가 — Excel 한글 깨짐 방지
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'faq_import_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── 오류 행 CSV 다운로드 ─────────────────────────────────────────────────

function downloadErrorCSV(result: BulkFaqResult) {
  const lines = ['index,reason,question,answer,category']
  for (const e of result.errorRows) {
    const q = String(e.row.question ?? '').replace(/"/g, '""')
    const a = String(e.row.answer ?? '').replace(/"/g, '""')
    const c = String(e.row.category ?? '').replace(/"/g, '""')
    const reason = e.reason.replace(/"/g, '""')
    lines.push(`${e.index},"${reason}","${q}","${a}","${c}"`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'import_errors.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── CSV 탭 ───────────────────────────────────────────────────────────────

function CsvTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<{ question: string; answer: string; category: string; client: string }>({
    question: '', answer: '', category: '', client: '',
  })
  const [result, setResult] = useState<BulkFaqResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function autoMap(hdrs: string[]) {
    // 헤더 이름이 일치하면 자동 매핑
    const match = (names: string[]) => hdrs.find((h) => names.includes(h.toLowerCase())) ?? ''
    return {
      question: match(['question', '질문']),
      answer: match(['answer', '답변', '답']),
      category: match(['category', '카테고리', '분류']),
      client: match(['client', '클라이언트', '고객사']),
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) { setError('데이터 행이 없습니다'); return }
      const hdrs = parsed[0]
      setHeaders(hdrs)
      setRows(parsed.slice(1))
      setMapping(autoMap(hdrs))
      setResult(null)
      setError(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handleUpload() {
    if (!mapping.question) { setError('question 컬럼을 선택하세요'); return }
    if (!mapping.answer) { setError('answer 컬럼을 선택하세요'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const qIdx = headers.indexOf(mapping.question)
      const aIdx = headers.indexOf(mapping.answer)
      const cIdx = mapping.category ? headers.indexOf(mapping.category) : -1
      const clientIdx = mapping.client ? headers.indexOf(mapping.client) : -1
      const bulkRows: BulkFaqRow[] = rows.map((r) => ({
        question: r[qIdx] ?? '',
        answer: r[aIdx] ?? '',
        category: cIdx >= 0 ? (r[cIdx] || undefined) : undefined,
        client: clientIdx >= 0 ? (r[clientIdx] || undefined) : undefined,
      }))
      setResult(await intakeBulkFaq(bulkRows))
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  // result 가 있으면 이미 제출한 것 — 새 파일을 올려야 다시 활성화
  const canUpload = !loading && !!mapping.question && !!mapping.answer && result === null

  return (
    <div className="space-y-6">
      {/* CSV 구조 안내 + 템플릿 */}
      <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">CSV 구조</p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            <li>• <code className="rounded bg-muted px-1">question</code> <span className="text-destructive">(필수)</span> — 질문</li>
            <li>• <code className="rounded bg-muted px-1">answer</code> <span className="text-destructive">(필수)</span> — 답변</li>
            <li>• <code className="rounded bg-muted px-1">category</code> (선택) — 카테고리</li>
            <li>• <code className="rounded bg-muted px-1">client</code> (선택) — 고객사 slug 또는 이름(일치 시 연결)</li>
          </ul>
          <p className="text-xs text-muted-foreground">첫 행은 헤더, UTF-8 권장. 업로드된 Q&amp;A는 FAQ 초안으로 생성됩니다.</p>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={downloadTemplate}>
          <FileDown className="mr-1.5 h-4 w-4" /> 템플릿 다운로드
        </Button>
      </div>

      {/* 파일 선택 */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 p-10 text-center transition hover:border-primary/50"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">CSV / Excel 파일을 클릭하여 선택</p>
        <p className="mt-1 text-xs text-muted-foreground">UTF-8 인코딩 권장 · .csv / .txt</p>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
      </div>

      {/* 컬럼 매핑 */}
      {headers.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">컬럼 매핑 <span className="text-muted-foreground font-normal">({rows.length}행 감지됨)</span></p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <Label>question <span className="text-destructive">*</span></Label>
              <Select value={mapping.question} onChange={(e) => setMapping({ ...mapping, question: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <Label>answer <span className="text-destructive">*</span></Label>
              <Select value={mapping.answer} onChange={(e) => setMapping({ ...mapping, answer: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <Label>category <span className="text-muted-foreground text-xs">(선택)</span></Label>
              <Select value={mapping.category} onChange={(e) => setMapping({ ...mapping, category: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <Label>client <span className="text-muted-foreground text-xs">(선택)</span></Label>
              <Select value={mapping.client} onChange={(e) => setMapping({ ...mapping, client: e.target.value })}>
                <option value="">선택…</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            </div>
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

          <Button onClick={() => void handleUpload()} disabled={!canUpload}>
            {loading ? '업로드 중…' : `${rows.length}행 FAQ 초안 생성`}
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
                  FAQ 초안 {result.inserted}건 생성 완료 / 총 {result.total}건
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

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof Upload }[] = [
  { id: 'csv', label: 'CSV/Excel 업로드', icon: Upload },
  { id: 'wiki', label: '위키 URL 임포트', icon: Link2 },
]

export function ImportPage() {
  const [tab, setTab] = useState<Tab>('csv')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">데이터 이관</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV 파일 또는 위키 페이지로 문의·FAQ 초안을 가져옵니다.
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
          {tab === 'csv' && <CsvTab />}
          {tab === 'wiki' && <WikiTab />}
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
