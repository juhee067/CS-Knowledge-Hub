/**
 * ProcessInquiryPage — 문의 처리 한 화면 완결 (Sprint 4 DoD)
 *
 * 좌: 원문 / 중: 분류·유사 추천 / 우: 답변 작성 + 클라이언트 override
 * 문의 → 분류 → 답변 → 자산화 가 이 화면에서 끝난다.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Wand2, AlertTriangle, Info, FileUp, GitMerge,
  CheckCircle2, Clock, ChevronRight,
} from 'lucide-react'
import {
  classifyInquiry, assetizeInquiry, recordClassificationFeedback,
  type ClassifyResult, type SimilarFaq,
} from '@/api/classify'
import { getInquiry, saveClassification, type Inquiry } from '@/api/inquiries'
import { listClients, findOverrides } from '@/api/clients'
import type { Client, ClientConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Markdown } from '@/components/Markdown'
import { formatDate } from '@/lib/utils'

const CATEGORIES = [
  '계정/인증', '결제', '배송', '반품/환불', '상품', '기술지원', '기타',
]

const SOURCE_LABEL: Record<string, string> = {
  google_form: 'Google Forms', email: 'Gmail', slack: 'Slack', kakao: '카카오',
  sms: 'SMS', phone: '전화', csv_import: 'CSV', wiki_import: '위키', manual: '직접입력',
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

function SimilarFaqCard({
  faq, isMergeTarget, selected, onUse,
}: {
  faq: SimilarFaq
  isMergeTarget: boolean
  selected: boolean
  onUse: () => void
}) {
  const pct = Math.round(faq.similarity * 100)
  return (
    <div
      className={`rounded-md border p-3 text-sm transition-colors ${
        selected ? 'border-primary bg-primary/5'
          : isMergeTarget ? 'border-yellow-300 bg-yellow-50'
          : 'hover:bg-accent/40'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isMergeTarget && <GitMerge className="h-3.5 w-3.5 text-yellow-600" />}
          유사도 <strong className="text-foreground">{pct}%</strong>
          {faq.category && <Badge variant="outline" className="text-[10px]">{faq.category}</Badge>}
        </span>
        <Link
          to={`/faqs/${faq.id}`}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          target="_blank"
        >
          원본
        </Link>
      </div>
      <p className="font-medium">{faq.question}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{faq.answer}</p>
      <Button
        variant={selected ? 'default' : 'secondary'}
        size="sm"
        className="mt-2 h-7 text-xs"
        onClick={onUse}
      >
        {selected ? '선택됨' : isMergeTarget ? '이 FAQ에 병합' : '이 답변 사용'}
      </Button>
    </div>
  )
}

export function ProcessInquiryPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [classify, setClassify] = useState<ClassifyResult | null>(null)
  const [classifying, setClassifying] = useState(false)

  // 편집 상태
  const [category, setCategory] = useState('')
  const [clientId, setClientId] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [tags, setTags] = useState('')
  const [mode, setMode] = useState<'new' | 'merge'>('new')
  const [mergeFaqId, setMergeFaqId] = useState<string | null>(null)

  const [overrides, setOverrides] = useState<ClientConfig[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // 1) 문의 로딩 + 자동 분류
  useEffect(() => {
    let alive = true
    listClients().then((c) => alive && setClients(c)).catch(() => {})

    async function run() {
      try {
        const inq = await getInquiry(id)
        if (!alive || !inq) { setError('문의를 찾을 수 없습니다.'); return }
        setInquiry(inq)
        setClientId(inq.client_id ?? '')
        setQuestion(inq.raw_text.split('\n')[0].slice(0, 120))
        setAnswer(inq.answer_text ?? '')

        setClassifying(true)
        const result = await classifyInquiry({
          inquiryId: inq.id,
          text: inq.raw_text,
          clientId: inq.client_id,
        })
        if (!alive) return
        setClassify(result)
        setCategory(inq.predicted_category ?? result.predicted_category ?? '')
        // 분류 결과 영속화 (큐 반영)
        if (result.predicted_category) {
          void saveClassification(inq.id, result.predicted_category, result.prediction_score)
        }
        // 병합 후보 자동 제안
        if (result.merge_candidate_id) {
          const cand = result.similar.find((s) => s.id === result.merge_candidate_id)
          if (cand) {
            setMode('merge')
            setMergeFaqId(cand.id)
            setQuestion(cand.question)
            setAnswer(cand.answer)
          }
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '분류 실패')
      } finally {
        if (alive) setClassifying(false)
      }
    }
    void run()
    return () => { alive = false }
  }, [id])

  // 2) 클라이언트·카테고리 override 경고 (FR-3.3 재사용)
  useEffect(() => {
    if (!clientId || !category) { setOverrides([]); return }
    findOverrides(clientId, category).then(setOverrides).catch(() => setOverrides([]))
  }, [clientId, category])

  function applySimilar(faq: SimilarFaq) {
    if (mergeFaqId === faq.id) {
      // 토글 해제 → 신규 모드
      setMergeFaqId(null)
      setMode('new')
      return
    }
    setMode('merge')
    setMergeFaqId(faq.id)
    setQuestion(faq.question)
    setAnswer(faq.answer)
    if (faq.category) setCategory(faq.category)
  }

  async function handleSave() {
    if (!inquiry) return
    if (mode === 'new' && (!question.trim() || !answer.trim())) {
      setError('질문과 답변을 입력하세요.'); return
    }
    if (mode === 'merge' && (!mergeFaqId || !answer.trim())) {
      setError('병합할 FAQ와 답변을 확인하세요.'); return
    }
    setSaving(true)
    setError(null)
    try {
      if (mode === 'new') {
        await assetizeInquiry({
          inquiryId: inquiry.id,
          mode: 'new',
          question: question.trim(),
          answer: answer.trim(),
          category: category || null,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean) || null,
        })
      } else {
        await assetizeInquiry({
          inquiryId: inquiry.id,
          mode: 'merge',
          faqId: mergeFaqId!,
          mergedAnswer: answer.trim(),
        })
      }

      // 분류 피드백 적립
      const predicted = classify?.predicted_category ?? null
      await recordClassificationFeedback({
        inquiryId: inquiry.id,
        predictedCategory: predicted,
        correctedCategory: category || null,
        predictedClientId: classify?.predicted_client_id ?? null,
        correctedClientId: clientId || null,
        predictionScore: classify?.prediction_score ?? 0,
        accepted: predicted === (category || null),
      }).catch(() => {})

      setDone(true)
      setTimeout(() => navigate('/inbox'), 900)
    } catch (e) {
      setError(e instanceof Error ? e.message : '자산화 실패')
    } finally {
      setSaving(false)
    }
  }

  const mergeCandidate = useMemo(
    () => classify?.similar.find((s) => s.id === classify.merge_candidate_id) ?? null,
    [classify],
  )

  if (error && !inquiry) {
    return (
      <div className="space-y-4">
        <Link to="/inbox" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 수집 현황으로
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/inbox" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 수집 현황
        </Link>
        {done && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" /> 자산화 완료 — 이동 중…
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold">문의 처리</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── 좌: 원문 ─────────────────────────────── */}
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">원문</h2>
            {inquiry && (
              <Badge variant="secondary" className="text-xs">
                {SOURCE_LABEL[inquiry.source] ?? inquiry.source}
              </Badge>
            )}
          </div>
          {inquiry && (
            <>
              <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                {inquiry.raw_text}
              </div>
              <dl className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatDate(inquiry.created_at)}
                </div>
                {inquiry.client_id && (
                  <div>클라이언트: {clients.find((c) => c.id === inquiry.client_id)?.name ?? '—'}</div>
                )}
              </dl>
            </>
          )}
        </section>

        {/* ── 중: 분류·유사 ─────────────────────────── */}
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> 자동 분류
            </h2>
            {classify && (
              <Badge variant="outline" className="text-[10px]">
                {classify.method === 'vector' ? '의미검색' : 'FTS'}
              </Badge>
            )}
          </div>

          {classifying ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wand2 className="h-4 w-4 animate-pulse" /> 분류·추천 중…
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">추정 카테고리</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9">
                  <option value="">미분류</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                {classify && classify.prediction_score > 0 && (
                  <div className="pt-1">
                    <p className="mb-1 text-[11px] text-muted-foreground">신뢰도</p>
                    <ConfidenceBar score={classify.prediction_score} />
                  </div>
                )}
              </div>

              {/* 병합 우선 제안 (FR-5.2) */}
              {mergeCandidate && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-2.5 text-xs">
                  <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                  <span>
                    동일 취지 FAQ가 있습니다 (유사도 {Math.round(mergeCandidate.similarity * 100)}%).
                    <strong> 기존 FAQ 업데이트</strong>를 우선 검토하세요.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">유사 FAQ Top {classify?.similar.length ?? 0}</Label>
                {classify && classify.similar.length > 0 ? (
                  classify.similar.map((f) => (
                    <SimilarFaqCard
                      key={f.id}
                      faq={f}
                      isMergeTarget={f.id === classify.merge_candidate_id}
                      selected={mergeFaqId === f.id}
                      onUse={() => applySimilar(f)}
                    />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">유사한 FAQ가 없습니다. 신규로 자산화하세요.</p>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── 우: 답변 작성 + override ───────────────── */}
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">답변 작성</h2>

          {/* 모드 토글 */}
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => { setMode('new'); setMergeFaqId(null) }}
              className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
                mode === 'new' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
              }`}
            >
              <FileUp className="mr-1 inline h-3.5 w-3.5" /> 신규 FAQ
            </button>
            <button
              type="button"
              onClick={() => mergeFaqId && setMode('merge')}
              disabled={!mergeFaqId}
              className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                mode === 'merge' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
              }`}
            >
              <GitMerge className="mr-1 inline h-3.5 w-3.5" /> 기존 업데이트
            </button>
          </div>

          {/* 클라이언트 override 경고 */}
          {overrides.length > 0 && (
            <div className="space-y-1.5">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs">
                  {o.severity === 'critical'
                    ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    : <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />}
                  <div className="min-w-0">
                    <p className="font-medium">{o.title}</p>
                    <div className="mt-0.5 text-muted-foreground"><Markdown>{o.body}</Markdown></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pi-client" className="text-xs">클라이언트</Label>
            <Select id="pi-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9">
              <option value="">없음</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          {mode === 'new' && (
            <div className="space-y-1.5">
              <Label htmlFor="pi-q" className="text-xs">질문 (FAQ 제목)</Label>
              <Input id="pi-q" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pi-a" className="text-xs">
              {mode === 'merge' ? '병합 답변 (기존 FAQ에 반영)' : '답변'}
            </Label>
            <Textarea
              id="pi-a"
              className="min-h-40 resize-y"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="답변 내용을 작성하세요 (마크다운 지원)"
            />
          </div>

          {mode === 'new' && (
            <div className="space-y-1.5">
              <Label htmlFor="pi-tags" className="text-xs">태그 (쉼표 구분)</Label>
              <Input id="pi-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예) 환불, 정책" />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleSave} disabled={saving || done}>
            {saving ? '저장 중…' : done ? '완료' : (
              <>
                {mode === 'merge'
                  ? <><GitMerge className="mr-1.5 h-4 w-4" /> 기존 FAQ 업데이트</>
                  : <><FileUp className="mr-1.5 h-4 w-4" /> FAQ로 저장</>}
                <ChevronRight className="ml-0.5 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            저장 시 문의가 <strong>자산화</strong> 상태로 전환됩니다.
          </p>
        </section>
      </div>
    </div>
  )
}
