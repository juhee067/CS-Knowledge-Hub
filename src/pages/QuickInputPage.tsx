/**
 * QuickInputPage — 전화·기타 채널 빠른 입력 (FR-8.7)
 *
 * 3필드: 채널 선택 / 클라이언트 / 문의 내용
 * 전화·카카오·SMS 채널이 미개설일 때의 대체 수단.
 */

import { useEffect, useRef, useState } from 'react'
import { Phone, MessageSquare, Mail, Mic, Send, CheckCircle2, FileText } from 'lucide-react'
import { intakePaste } from '@/api/intake'
import { listClients } from '@/api/clients'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const CHANNELS = [
  { value: 'manual',      label: '직접 입력',    icon: MessageSquare },
  { value: 'phone',       label: '전화',          icon: Phone },
  { value: 'email',       label: '이메일',        icon: Mail },
  { value: 'kakao',       label: '카카오',        icon: Mic },
  { value: 'sms',         label: 'SMS',           icon: MessageSquare },
  { value: 'google_form', label: 'Google Forms',  icon: FileText },
]

interface SubmittedItem {
  id: string
  channel: string
  content: string
  ts: string
}

export function QuickInputPage() {
  const [channel, setChannel] = useState('manual')
  const [clientSlug, setClientSlug] = useState('')
  const [content, setContent] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SubmittedItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { id } = await intakePaste({
        raw_text: `[${channel}] ${content.trim()}`,
        client_slug: clientSlug || undefined,
      })
      setHistory((prev) => [
        {
          id,
          channel: CHANNELS.find((c) => c.value === channel)?.label ?? channel,
          content: content.trim(),
          ts: new Date().toLocaleTimeString('ko-KR'),
        },
        ...prev.slice(0, 9),
      ])
      setContent('')
      textareaRef.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  const selectedMeta = CHANNELS.find((c) => c.value === channel)
  const Icon = selectedMeta?.icon ?? MessageSquare

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">빠른 입력</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전화·기타 채널로 접수된 문의를 빠르게 기록합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        {/* 채널 선택 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="qi-channel">채널</Label>
            <Select
              id="qi-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qi-client">클라이언트</Label>
            <Select
              id="qi-client"
              value={clientSlug}
              onChange={(e) => setClientSlug(e.target.value)}
            >
              <option value="">없음</option>
              {clients.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* 문의 내용 */}
        <div>
          <Label htmlFor="qi-content">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              문의 내용
            </span>
          </Label>
          <Textarea
            id="qi-content"
            ref={textareaRef}
            className="mt-1 min-h-32 resize-none"
            placeholder={`${selectedMeta?.label ?? '채널'} 문의 내용을 입력하세요…`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                void handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            Ctrl+Enter 로 빠른 저장
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !content.trim()}
        >
          {loading ? '저장 중…' : (
            <>
              <Send className="mr-2 h-4 w-4" /> 저장
            </>
          )}
        </Button>
      </form>

      {/* 방금 저장된 목록 */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">이 세션 저장 목록</p>
          <div className="space-y-1.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{item.channel}</Badge>
                    <span className="text-xs text-muted-foreground">{item.ts}</span>
                  </div>
                  <p className="truncate text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
