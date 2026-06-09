import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Archive, Sparkles } from 'lucide-react'
import {
  getChannelSummary,
  listInquiries,
  updateInquiryStatus,
  type ChannelSummary,
  type Inquiry,
  type InquiryStatus,
  type InquiryFilter,
} from '@/api/inquiries'
import { listClients } from '@/api/clients'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

// ─── 채널 표시 설정 ───────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  google_form:  { label: 'Google Forms', color: 'bg-blue-100 text-blue-800' },
  email:        { label: 'Gmail',        color: 'bg-red-100 text-red-800' },
  slack:        { label: 'Slack',        color: 'bg-purple-100 text-purple-800' },
  kakao:        { label: '카카오',        color: 'bg-yellow-100 text-yellow-800' },
  sms:          { label: 'SMS',          color: 'bg-green-100 text-green-800' },
  csv_import:   { label: 'CSV',          color: 'bg-gray-100 text-gray-700' },
  wiki_import:  { label: '위키',          color: 'bg-indigo-100 text-indigo-800' },
  manual:       { label: '직접입력',      color: 'bg-orange-100 text-orange-800' },
}

function SourceBadge({ source }: { source: string }) {
  const meta = CHANNEL_META[source] ?? { label: source, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  )
}

// ─── 채널 요약 카드 ────────────────────────────────────────────────────────

function ChannelCard({
  summary,
  selected,
  onClick,
}: {
  summary: ChannelSummary
  selected: boolean
  onClick: () => void
}) {
  const meta = CHANNEL_META[summary.source] ?? { label: summary.source, color: '' }
  const hasError = summary.errors_24h > 0
  const openRate = Number(summary.open_rate ?? 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:bg-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{meta.label}</span>
        {hasError && <span title="24h 오류 있음"><AlertCircle className="h-4 w-4 text-destructive" /></span>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-lg font-bold">{summary.total}</p>
          <p className="text-muted-foreground">전체</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${summary.open_count > 0 ? 'text-orange-600' : ''}`}>
            {summary.open_count}
          </p>
          <p className="text-muted-foreground">미처리</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${openRate > 30 ? 'text-destructive' : ''}`}>
            {openRate}%
          </p>
          <p className="text-muted-foreground">미처리율</p>
        </div>
      </div>
      {summary.last_received_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          마지막: {formatDate(summary.last_received_at)}
        </p>
      )}
      {hasError && (
        <p className="mt-1 text-xs text-destructive">
          ⚠ 24h 오류 {summary.errors_24h}건
        </p>
      )}
    </button>
  )
}

// ─── 문의 행 ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InquiryStatus, { label: string; icon: typeof Clock }> = {
  open:       { label: '미처리', icon: Clock },
  answered:   { label: '답변됨', icon: CheckCircle2 },
  assetized:  { label: '자산화', icon: Archive },
}

function InquiryRow({
  inquiry,
  onStatusChange,
}: {
  inquiry: Inquiry
  onStatusChange: (id: string, status: InquiryStatus) => void
}) {
  const sc = STATUS_CONFIG[inquiry.status]
  const Icon = sc.icon

  return (
    <tr className="border-b last:border-0 hover:bg-accent/30">
      <td className="px-3 py-2 align-top">
        <SourceBadge source={inquiry.source} />
      </td>
      <td className="max-w-sm px-3 py-2 align-top">
        <p className="line-clamp-2 text-sm">{inquiry.raw_text}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
      </td>
      <td className="px-3 py-2 align-middle">
        <Select
          className="h-7 w-28 text-xs"
          value={inquiry.status}
          onChange={(e) => onStatusChange(inquiry.id, e.target.value as InquiryStatus)}
        >
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </Select>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className={`flex items-center gap-1 text-xs ${
          inquiry.status === 'open' ? 'text-orange-600' :
          inquiry.status === 'assetized' ? 'text-green-600' : 'text-muted-foreground'
        }`}>
          <Icon className="h-3 w-3" />
          {sc.label}
        </span>
      </td>
      <td className="px-3 py-2 align-middle">
        <Link
          to={`/process/${inquiry.id}`}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
        >
          <Sparkles className="h-3 w-3" /> 처리
        </Link>
      </td>
    </tr>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────────────

export function InboxPage() {
  const [summaries, setSummaries] = useState<ChannelSummary[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<InquiryFilter>({ status: 'open' })
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadSummaries() {
    try {
      setSummaries(await getChannelSummary())
    } catch {
      // 뷰 미지원 환경에서 무시
    }
  }

  async function loadInquiries(f: InquiryFilter) {
    setLoading(true)
    setError(null)
    try {
      setInquiries(await listInquiries(f))
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
    loadSummaries()
    loadInquiries(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyFilter(partial: Partial<InquiryFilter>) {
    const next = { ...filter, ...partial }
    setFilter(next)
    void loadInquiries(next)
  }

  function handleSourceClick(source: string) {
    const next = selectedSource === source ? '' : source
    setSelectedSource(next)
    applyFilter({ source: next || undefined })
  }

  async function handleStatusChange(id: string, status: InquiryStatus) {
    await updateInquiryStatus(id, status)
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    )
    void loadSummaries()
  }

  const totalOpen = summaries.reduce((s, c) => s + c.open_count, 0)
  const totalErrors = summaries.reduce((s, c) => s + c.errors_24h, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">수집 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            채널별 문의 인입량 · 미처리율 · 오류 현황
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { void loadSummaries(); void loadInquiries(filter) }}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" /> 새로고침
        </Button>
      </div>

      {/* 전체 요약 배너 */}
      {(totalOpen > 0 || totalErrors > 0) && (
        <div className={`flex gap-4 rounded-lg border p-4 ${
          totalErrors > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-orange-200 bg-orange-50'
        }`}>
          {totalErrors > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>24h 오류 <strong>{totalErrors}건</strong></span>
            </div>
          )}
          {totalOpen > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-700">
              <Clock className="h-4 w-4" />
              <span>미처리 문의 <strong>{totalOpen}건</strong></span>
            </div>
          )}
        </div>
      )}

      {/* 채널 카드 그리드 */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summaries.map((s) => (
            <ChannelCard
              key={s.source}
              summary={s}
              selected={selectedSource === s.source}
              onClick={() => handleSourceClick(s.source)}
            />
          ))}
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-32"
          value={filter.status ?? 'all'}
          onChange={(e) => applyFilter({ status: e.target.value as InquiryStatus | 'all' })}
        >
          <option value="open">미처리</option>
          <option value="all">전체</option>
          <option value="answered">답변됨</option>
          <option value="assetized">자산화</option>
        </Select>

        <Select
          className="w-40"
          value={filter.client_id ?? ''}
          onChange={(e) => applyFilter({ client_id: e.target.value || null })}
        >
          <option value="">전체 클라이언트</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        {selectedSource && (
          <Badge variant="secondary" className="gap-1">
            {CHANNEL_META[selectedSource]?.label ?? selectedSource}
            <button
              type="button"
              className="ml-1 opacity-60 hover:opacity-100"
              onClick={() => handleSourceClick(selectedSource)}
            >
              ✕
            </button>
          </Badge>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {inquiries.length}건
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">불러오는 중…</p>
      ) : inquiries.length === 0 ? (
        <p className="text-muted-foreground">문의가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left w-24">채널</th>
                <th className="px-3 py-2 text-left">문의 내용</th>
                <th className="px-3 py-2 text-left w-32">상태 변경</th>
                <th className="px-3 py-2 text-left w-20">현재</th>
                <th className="px-3 py-2 text-left w-20">처리</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <InquiryRow
                  key={inq.id}
                  inquiry={inq}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
