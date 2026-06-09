import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, History, Pencil, Trash2 } from 'lucide-react'
import {
  getFaq,
  getFaqVersions,
  setFaqStatus,
  softDeleteFaq,
} from '@/api/faqs'
import type { Faq, FaqStatus, FaqVersion } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { Markdown } from '@/components/Markdown'
import { cn, formatDate } from '@/lib/utils'

const NEXT_STATUS: Record<FaqStatus, { to: FaqStatus; label: string }[]> = {
  draft: [{ to: 'verified', label: '검증 승격 (lead)' }],
  verified: [{ to: 'deprecated', label: '폐기' }],
  deprecated: [{ to: 'draft', label: '초안으로 복귀' }],
}

export function FaqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canEdit, isLead } = useAuth()
  const [faq, setFaq] = useState<Faq | null>(null)
  const [versions, setVersions] = useState<FaqVersion[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    if (!id) return
    const [f, v] = await Promise.all([getFaq(id), getFaqVersions(id)])
    setFaq(f)
    setVersions(v)
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatus(to: FaqStatus) {
    setBusy(true)
    setError(null)
    try {
      await setFaqStatus(id!, to)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '상태 변경 실패')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm('이 FAQ를 삭제할까요? (soft delete)')) return
    await softDeleteFaq(id!)
    navigate('/faqs')
  }

  if (!faq) return <p className="text-muted-foreground">불러오는 중…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/faqs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> 목록
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={faq.status} />
              {faq.category && <Badge variant="outline">{faq.category}</Badge>}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Link
                  to={`/faqs/${faq.id}/edit`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  <Pencil className="h-4 w-4" /> 수정
                </Link>
                {isLead && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> 삭제
                  </Button>
                )}
              </div>
            )}
          </div>
          <CardTitle className="mt-2 text-xl">{faq.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Markdown>{faq.answer}</Markdown>

          {faq.tags && faq.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {faq.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  #{t}
                </Badge>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <span className="text-sm text-muted-foreground">상태 전이:</span>
              {NEXT_STATUS[faq.status].map(({ to, label }) => (
                <Button
                  key={to}
                  size="sm"
                  variant="secondary"
                  disabled={busy || (to === 'verified' && !isLead)}
                  onClick={() => handleStatus(to)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">
            최종 수정 {formatDate(faq.updated_at)} · 생성 {formatDate(faq.created_at)}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="h-4 w-4" /> 버전 이력 ({versions.length})
        </Button>
        {showHistory && (
          <div className="mt-2 space-y-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">이력이 없습니다.</p>
            ) : (
              versions.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(v.changed_at)}</span>
                      {v.status && <Badge variant="outline">{v.status}</Badge>}
                    </div>
                    <p className="text-sm font-medium">{v.question}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {v.answer}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
