/**
 * AssetizeQueuePage — 자산화 큐 (FR-5.3)
 *
 * 빈출 미해결(open) 문의를 추정 카테고리별로 묶어 빈도순 랭킹.
 * 임계치(N회 이상) 슬라이더로 "반복 문의 자동 큐" 기준을 조정.
 * 각 항목의 최신 문의를 바로 처리 화면으로 연결.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Flame, ChevronRight, Layers, Clock } from 'lucide-react'
import { getAssetizeCandidates, type AssetizeCandidate } from '@/api/classify'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const THRESHOLDS = [1, 2, 3, 5, 10]

export function AssetizeQueuePage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<AssetizeCandidate[]>([])
  const [threshold, setThreshold] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(min: number) {
    setLoading(true)
    setError(null)
    try {
      setCandidates(await getAssetizeCandidates(min))
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(threshold) }, [threshold])

  const totalOpen = candidates.reduce((s, c) => s + c.open_count, 0)
  const maxCount = candidates.reduce((m, c) => Math.max(m, c.open_count), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Layers className="h-6 w-6 text-primary" /> 자산화 큐
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            빈출 미해결 문의를 카테고리별로 모아 우선순위화합니다.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load(threshold)}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> 새로고침
        </Button>
      </div>

      {/* 임계치 + 요약 */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">반복 임계치</span>
          <div className="flex rounded-md border p-0.5">
            {THRESHOLDS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setThreshold(n)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  threshold === n ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {n}회+
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">묶음 <strong className="text-foreground">{candidates.length}</strong></span>
          <span className="text-muted-foreground">미처리 <strong className="text-orange-600">{totalOpen}</strong></span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">불러오는 중…</p>
      ) : candidates.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>{threshold}회 이상 반복된 미해결 문의 묶음이 없습니다.</p>
          <p className="mt-1 text-sm opacity-70">임계치를 낮춰보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c, i) => {
            const barPct = maxCount > 0 ? Math.round((c.open_count / maxCount) * 100) : 0
            const hot = c.open_count >= 5
            return (
              <button
                key={c.category}
                type="button"
                onClick={() => navigate(`/inbox?status=open&category=${encodeURIComponent(c.category)}`)}
                className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/40"
              >
                <span className="w-6 shrink-0 text-center text-lg font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">{c.category}</span>
                    {hot && (
                      <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700">
                        <Flame className="h-3 w-3" /> 빈출
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{c.open_count}건 미처리</Badge>
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{c.sample_text}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-orange-400" style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> 최근 {formatDate(c.last_seen)}
                    </span>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                  목록 <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
