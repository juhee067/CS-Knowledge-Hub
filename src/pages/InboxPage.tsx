import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { listCategories } from '@/api/categories'
import { listChannels, type Channel } from '@/api/channels'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'

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

function SourceBadge({ source, label }: { source: string; label: string }) {
  const color = CHANNEL_META[source]?.color ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

// ─── 채널 요약 카드 ────────────────────────────────────────────────────────

function ChannelCard({
  summary,
  label,
  selected,
  onClick,
}: {
  summary: ChannelSummary
  label: string
  selected: boolean
  onClick: () => void
}) {
  const meta = { label }
  const hasError = summary.errors_24h > 0
  const openRate = Number(summary.open_rate ?? 0)
  const lastReceived = summary.last_received_at ? formatDate(summary.last_received_at) : null

  return (
    <button
      type="button"
      onClick={onClick}
      title={lastReceived ? `마지막 수신: ${lastReceived}${hasError ? ` · 24h 오류 ${summary.errors_24h}건` : ''}` : undefined}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-accent/40',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{meta.label}</span>
        {hasError && (
          <span title={`24h 오류 ${summary.errors_24h}건`}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-baseline gap-1 text-xs text-muted-foreground">
        <span className={cn('text-base font-bold tabular-nums', summary.open_count > 0 ? 'text-orange-600' : 'text-foreground/40')}>
          {summary.open_count}
        </span>
        <span>/ {summary.total}</span>
        <span className={cn('ml-0.5', openRate > 30 && 'font-medium text-destructive')}>
          {openRate}%
        </span>
      </span>
    </button>
  )
}

// ─── 문의 행 ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InquiryStatus, { label: string; icon: typeof Clock; cls: string }> = {
  open:       { label: '미처리', icon: Clock,        cls: 'border-orange-300 bg-orange-50 text-orange-700' },
  answered:   { label: '답변됨', icon: CheckCircle2, cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  assetized:  { label: '자산화', icon: Archive,      cls: 'border-green-200 bg-green-50 text-green-700' },
}

function InquiryRow({
  inquiry,
  clientName,
  sourceLabel,
  onStatusChange,
}: {
  inquiry: Inquiry
  clientName: string | null
  sourceLabel: string
  onStatusChange: (id: string, status: InquiryStatus) => void
}) {
  const isOpen = inquiry.status === 'open'

  return (
    <tr className={cn('border-b last:border-0 transition-colors hover:bg-accent/30', isOpen && 'bg-orange-50/40')}>
      <td className="px-3 py-2.5 align-top">
        <SourceBadge source={inquiry.source} label={sourceLabel} />
      </td>
      <td className="max-w-sm px-3 py-2.5 align-top">
        <p className="line-clamp-2 text-sm">{inquiry.raw_text}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</p>
      </td>
      <td className="px-3 py-2.5 align-middle">
        {inquiry.predicted_category
          ? <Badge variant="outline" className="text-xs">{inquiry.predicted_category}</Badge>
          : <span className="text-xs text-muted-foreground/60">미분류</span>}
      </td>
      <td className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
        {clientName ?? '—'}
      </td>
      {/* 상태: 변경 Select 하나로 통합 (현재 상태 = Select 값) */}
      <td className="px-3 py-2.5 align-middle">
        <Select
          className={cn('h-8 w-24 text-xs font-medium', STATUS_CONFIG[inquiry.status].cls)}
          value={inquiry.status}
          onChange={(e) => onStatusChange(inquiry.id, e.target.value as InquiryStatus)}
        >
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </Select>
      </td>
      <td className="px-3 py-2.5 align-middle">
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
  const [searchParams] = useSearchParams()
  const initialStatus = (searchParams.get('status') as InquiryStatus | 'all') || 'open'
  const initialCategory = searchParams.get('category')

  const [summaries, setSummaries] = useState<ChannelSummary[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [filter, setFilter] = useState<InquiryFilter>({
    status: initialStatus,
    category: initialCategory || undefined,
  })
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
    listCategories().then((cats) => setCategories(cats.map((c) => c.name))).catch(() => {})
    listChannels().then(setChannels).catch(() => {})
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
  const clientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.name ?? null : null
  const labelOf = (source: string) =>
    channels.find((c) => c.key === source)?.label ?? CHANNEL_META[source]?.label ?? source

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

      {/* 채널별 현황 (컴팩트) */}
      {summaries.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs font-medium text-muted-foreground">채널별 현황</p>
            <p className="text-[11px] text-muted-foreground/70">미처리 / 전체 · 미처리율</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {summaries.map((s) => (
              <ChannelCard
                key={s.source}
                summary={s}
                label={labelOf(s.source)}
                selected={selectedSource === s.source}
                onClick={() => handleSourceClick(s.source)}
              />
            ))}
          </div>
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

        <Select
          className="w-40"
          value={filter.category ?? ''}
          onChange={(e) => applyFilter({ category: e.target.value || null })}
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="미분류">미분류</option>
        </Select>

        {selectedSource && (
          <Badge variant="secondary" className="gap-1">
            {labelOf(selectedSource)}
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
                <th className="px-3 py-2 text-left w-32">카테고리</th>
                <th className="px-3 py-2 text-left w-28">클라이언트</th>
                <th className="px-3 py-2 text-left w-24">상태</th>
                <th className="px-3 py-2 text-left w-20">처리</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <InquiryRow
                  key={inq.id}
                  inquiry={inq}
                  clientName={clientName(inq.client_id)}
                  sourceLabel={labelOf(inq.source)}
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
