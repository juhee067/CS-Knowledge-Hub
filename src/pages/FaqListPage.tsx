import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { listFaqs, type FaqFilter } from '@/api/faqs'
import type { Faq, FaqStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { cn, formatDate } from '@/lib/utils'

export function FaqListPage() {
  const { canEdit } = useAuth()
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FaqStatus | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  async function load(filter: FaqFilter) {
    setLoading(true)
    setError(null)
    try {
      setFaqs(await listFaqs(filter))
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ status })
  }, [status])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ</h1>
        {canEdit && (
          <Link to="/faqs/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />새 FAQ
          </Link>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void load({ status, search })
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="질문·답변 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-36"
          value={status}
          onChange={(e) => setStatus(e.target.value as FaqStatus | 'all')}
        >
          <option value="all">전체 상태</option>
          <option value="verified">검증됨</option>
          <option value="draft">초안</option>
          <option value="deprecated">폐기</option>
        </Select>
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">불러오는 중…</p>
      ) : faqs.length === 0 ? (
        <p className="text-muted-foreground">FAQ가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Link key={faq.id} to={`/faqs/${faq.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <StatusBadge status={faq.status} />
                      {faq.category && (
                        <Badge variant="outline">{faq.category}</Badge>
                      )}
                    </div>
                    <p className="truncate font-medium">{faq.question}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(faq.updated_at)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
