/**
 * DashboardPage — CS 워크스페이스 홈
 *
 * 로그인 후 첫 화면. 담당자가 "지금 처리할 일"을 한눈에 본다.
 * 상단 KPI → 처리 대기 문의 → 자산화 추천 → 빠른 시작.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Inbox, Flame, BookText, Sparkles, Zap, Search, Upload,
  ArrowRight, Clock, ChevronRight,
} from 'lucide-react'
import { listInquiries, getChannelSummary, type Inquiry, type ChannelSummary } from '@/api/inquiries'
import { getAssetizeCandidates, type AssetizeCandidate } from '@/api/classify'
import { listFaqs } from '@/api/faqs'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const CHANNEL_LABEL: Record<string, string> = {
  google_form: 'Google Forms', email: 'Gmail', slack: 'Slack', kakao: '카카오',
  sms: 'SMS', csv_import: 'CSV', wiki_import: '위키', manual: '직접입력', phone: '전화',
}

function KpiCard({
  icon: Icon, label, value, tone, to,
}: {
  icon: typeof Inbox
  label: string
  value: number | string
  tone: 'orange' | 'red' | 'blue' | 'green'
  to: string
}) {
  const toneMap = {
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
  }
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

const QUICK_ACTIONS = [
  { to: '/quick',  label: '빠른 입력', desc: '전화·메모 문의 기록', icon: Zap },
  { to: '/ask',    label: 'Ask the Hub', desc: '지식 기반 답변 받기', icon: Sparkles },
  { to: '/search', label: '통합 검색', desc: 'FAQ·지식 검색', icon: Search },
  { to: '/import', label: '이관', desc: 'CSV·위키 일괄 등록', icon: Upload },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [openInquiries, setOpenInquiries] = useState<Inquiry[]>([])
  const [summaries, setSummaries] = useState<ChannelSummary[]>([])
  const [candidates, setCandidates] = useState<AssetizeCandidate[]>([])
  const [faqCount, setFaqCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      listInquiries({ status: 'open' }),
      getChannelSummary(),
      getAssetizeCandidates(2),
      listFaqs({ status: 'verified' }),
    ]).then(([inq, sum, cand, faqs]) => {
      if (inq.status === 'fulfilled') setOpenInquiries(inq.value)
      if (sum.status === 'fulfilled') setSummaries(sum.value)
      if (cand.status === 'fulfilled') setCandidates(cand.value)
      if (faqs.status === 'fulfilled') setFaqCount(faqs.value.length)
      setLoading(false)
    })
  }, [])

  const totalOpen = openInquiries.length
  const repeatCount = candidates.reduce((s, c) => s + c.open_count, 0)
  const errors24h = summaries.reduce((s, c) => s + c.errors_24h, 0)

  return (
    <div className="space-y-7">
      {/* 인사 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {profile?.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            오늘 처리할 문의와 현황을 확인하세요.
          </p>
        </div>
        <Button onClick={() => navigate('/quick')}>
          <Zap className="mr-1.5 h-4 w-4" /> 문의 빠른 입력
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={Inbox} label="미처리 문의" value={loading ? '–' : totalOpen} tone="orange" to="/inbox?status=open" />
        <KpiCard icon={Flame} label="반복 문의(자산화 대기)" value={loading ? '–' : repeatCount} tone="red" to="/assetize" />
        <KpiCard icon={BookText} label="검증된 FAQ" value={loading ? '–' : faqCount} tone="blue" to="/faqs" />
        <KpiCard icon={Sparkles} label="Ask the Hub" value="질문하기" tone="green" to="/ask" />
      </div>

      {errors24h > 0 && (
        <Link to="/inbox" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          ⚠ 최근 24시간 수집 오류 <strong>{errors24h}건</strong> — 확인이 필요합니다.
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 처리 대기 문의 */}
        <section className="lg:col-span-2 space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Inbox className="h-4 w-4 text-orange-500" /> 처리 대기 문의
            </h2>
            <Link to="/inbox?status=open" className="text-xs text-primary hover:underline">
              전체 보기
            </Link>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : openInquiries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-7 w-7 opacity-40" />
              <p className="text-sm">처리 대기 중인 문의가 없습니다. 👍</p>
            </div>
          ) : (
            <div className="divide-y">
              {openInquiries.slice(0, 6).map((inq) => (
                <button
                  key={inq.id}
                  type="button"
                  onClick={() => navigate(`/process/${inq.id}`)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm">{inq.raw_text}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {CHANNEL_LABEL[inq.source] ?? inq.source}
                      </Badge>
                      {inq.predicted_category && (
                        <span className="text-muted-foreground">{inq.predicted_category}</span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {formatDate(inq.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 자산화 추천 */}
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flame className="h-4 w-4 text-red-500" /> 자산화 추천
            </h2>
            <Link to="/assetize" className="text-xs text-primary hover:underline">
              큐 열기
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              반복 문의가 충분히 쌓이지 않았습니다.
            </p>
          ) : (
            <div className="space-y-1.5">
              {candidates.slice(0, 5).map((c) => (
                <Link
                  key={c.category}
                  to={`/inbox?status=open&category=${encodeURIComponent(c.category)}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0 flex-1 truncate">{c.category}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">{c.open_count}건</Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 빠른 시작 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">빠른 시작</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
            >
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
