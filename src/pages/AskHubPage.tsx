/**
 * AskHubPage — Ask the Hub (대화형 RAG 어시스턴트, FR-7)
 *
 * 좌: 세션 목록(멀티턴) / 우: 대화 + 입력
 * 질문 → grounded 답변(스트리밍) → 출처 인용 → 피드백·복사·FAQ저장.
 * 근거 부족 시 단정하지 않고 자산화 큐 등록을 유도한다.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, Plus, Trash2, Copy, Check, BookmarkPlus, ThumbsUp, ThumbsDown,
  AlertTriangle, MessageCircle, FileText, Sparkles,
} from 'lucide-react'
import {
  listSessions, createSession, deleteSession,
  listMessages, addUserMessage, saveAssistantMessage, saveRetrieval,
  submitFeedback, saveAnswerAsFaq, streamAnswer,
  type ChatMeta,
} from '@/api/chat'
import type { ChatSession, ChatMessage, Citation, ChatFeedback } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/utils'

// 화면에 그리는 메시지 (DB row 또는 스트리밍 중 임시)
interface ViewMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[] | null
  feedback: ChatFeedback | null
  grounded?: boolean
  pending?: boolean
}

function toView(m: ChatMessage): ViewMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations ?? null,
    feedback: m.feedback ?? null,
  }
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null
  return (
    <div className="mt-3 space-y-1.5 border-t pt-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">출처</p>
      {citations.map((c, i) => (
        <Link
          key={c.id}
          to={`/faqs/${c.id}`}
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-info hover:underline"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-foreground">
            {i + 1}
          </span>
          <FileText className="h-3 w-3 shrink-0 opacity-60" />
          <span className="line-clamp-1">{c.title}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {Math.round(c.score * 100)}%
          </span>
        </Link>
      ))}
    </div>
  )
}

function FeedbackBar({
  message, onFeedback,
}: {
  message: ViewMessage
  onFeedback: (f: ChatFeedback) => void
}) {
  const opts: { value: ChatFeedback; label: string; icon: typeof ThumbsUp }[] = [
    { value: 'helpful', label: '도움됨', icon: ThumbsUp },
    { value: 'insufficient', label: '근거부족', icon: AlertTriangle },
    { value: 'wrong', label: '틀림', icon: ThumbsDown },
  ]
  return (
    <div className="mt-2 flex items-center gap-1">
      {opts.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onFeedback(value)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
            message.feedback === value
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          <Icon className="h-3 w-3" /> {label}
        </button>
      ))}
    </div>
  )
}

export function AskHubPage() {
  const { canEdit } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ViewMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedFaq, setSavedFaq] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listSessions().then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    listMessages(activeId).then((m) => setMessages(m.map(toView))).catch(() => {})
  }, [activeId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function selectSession(id: string) {
    setActiveId(id)
    setError(null)
  }

  function newSession() {
    setActiveId(null)
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }

  async function removeSession(id: string) {
    if (!confirm('이 대화를 삭제할까요?')) return
    try {
      await deleteSession(id)
      setSessions((s) => s.filter((x) => x.id !== id))
      if (activeId === id) newSession()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  async function handleSend() {
    const query = input.trim()
    if (!query || busy) return
    setBusy(true)
    setError(null)
    setInput('')

    try {
      // 1) 세션 확보
      let sessionId = activeId
      if (!sessionId) {
        const s = await createSession(query.slice(0, 60))
        sessionId = s.id
        setActiveId(s.id)
        setSessions((prev) => [s, ...prev])
      }

      // 2) 사용자 메시지
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const userMsg = await addUserMessage(sessionId, query)
      setMessages((prev) => [...prev, toView(userMsg)])

      // 3) 답변 스트리밍 (임시 메시지)
      const tempId = `pending-${userMsg.id}`
      let meta: ChatMeta | null = null
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: 'assistant', content: '', citations: null, feedback: null, pending: true },
      ])

      const { content, meta: finalMeta } = await streamAnswer(
        { query, history },
        {
          onMeta: (m) => {
            meta = m
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempId
                  ? { ...x, citations: m.citations, grounded: m.grounded }
                  : x,
              ),
            )
          },
          onToken: (delta) => {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempId ? { ...x, content: x.content + delta } : x,
              ),
            )
          },
        },
      )
      meta = finalMeta ?? meta

      // 4) 어시스턴트 메시지 영속화 + 검색 로그
      const citations = meta?.citations ?? []
      const saved = await saveAssistantMessage(sessionId, content, citations)
      if (meta) await saveRetrieval(saved.id, query, meta).catch(() => {})

      setMessages((prev) =>
        prev.map((x) =>
          x.id === tempId
            ? { ...toView(saved), grounded: meta?.grounded, citations }
            : x,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '답변 생성 실패')
      setMessages((prev) => prev.filter((x) => !x.pending))
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  async function handleFeedback(messageId: string, f: ChatFeedback) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: f } : m)),
    )
    await submitFeedback(messageId, f).catch(() => {})
  }

  async function handleCopy(m: ViewMessage) {
    await navigator.clipboard.writeText(m.content).catch(() => {})
    setCopiedId(m.id)
    setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500)
  }

  async function handleSaveFaq(m: ViewMessage, index: number) {
    // 직전 사용자 메시지를 질문으로 사용
    const prevUser = [...messages.slice(0, index)].reverse().find((x) => x.role === 'user')
    const question = prevUser?.content.slice(0, 200) ?? m.content.slice(0, 80)
    try {
      const { faq_id } = await saveAnswerAsFaq({ question, answer: m.content })
      setSavedFaq((s) => ({ ...s, [m.id]: faq_id }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'FAQ 저장 실패')
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* ── 세션 사이드바 ─────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col rounded-xl border bg-card">
        <div className="border-b p-3">
          <Button onClick={newSession} className="w-full" size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> 새 대화
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              대화 내역이 없습니다.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-2 text-sm transition-colors',
                activeId === s.id ? 'bg-secondary' : 'hover:bg-accent',
              )}
            >
              <button
                type="button"
                onClick={() => selectSession(s.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1">{s.title ?? '제목 없음'}</span>
              </button>
              <button
                type="button"
                onClick={() => removeSession(s.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── 대화 영역 ─────────────────────────────── */}
      <section className="flex flex-1 flex-col rounded-xl border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">Ask the Hub</p>
              <p className="mt-1 text-sm opacity-70">
                지식 베이스 기반으로 답변합니다. 모든 답변에는 출처가 표시됩니다.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={m.id}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'user' ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border bg-background px-4 py-3">
                  {/* 근거 부족 경고 (FR-7.5) */}
                  {m.grounded === false && (
                    <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="space-y-1.5">
                        <p>근거가 부족해 단정하지 않았습니다.</p>
                        <Link to="/assetize">
                          <Button size="sm" variant="outline" className="h-7 text-[11px]">
                            자산화 큐로 등록 요청
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {m.content ? (
                    <Markdown>{m.content}</Markdown>
                  ) : m.pending ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-pulse" /> 검색·답변 중…
                    </p>
                  ) : null}

                  {m.citations && m.citations.length > 0 && (
                    <CitationList citations={m.citations} />
                  )}

                  {/* 액션 (스트리밍 완료 후) */}
                  {!m.pending && m.content && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(m)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
                      >
                        {copiedId === m.id
                          ? <><Check className="h-3 w-3 text-green-600" /> 복사됨</>
                          : <><Copy className="h-3 w-3" /> 복사</>}
                      </button>
                      {canEdit && (
                        savedFaq[m.id] ? (
                          <Link
                            to={`/faqs/${savedFaq[m.id]}`}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-green-600 hover:underline"
                          >
                            <Check className="h-3 w-3" /> FAQ 저장됨 — 열기
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSaveFaq(m, i)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
                          >
                            <BookmarkPlus className="h-3 w-3" /> FAQ로 저장
                          </button>
                        )
                      )}
                      <FeedbackBar message={m} onFeedback={(f) => handleFeedback(m.id, f)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="px-5 pb-1 text-sm text-destructive">{error}</p>
        )}

        {/* ── 입력 ─────────────────────────────────── */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="무엇이든 물어보세요  (Enter 전송 · Shift+Enter 줄바꿈)"
              className="max-h-40 min-h-[2.75rem] resize-none"
              rows={1}
            />
            <Button onClick={handleSend} disabled={busy || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[11px] text-muted-foreground">
            지식 베이스에 근거한 답변만 제공합니다 · 출처 없는 주장은 표시되지 않습니다
          </p>
        </div>
      </section>
    </div>
  )
}
