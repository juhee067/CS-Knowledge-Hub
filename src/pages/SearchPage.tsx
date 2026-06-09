import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchKnowledge, type SearchResult, type SearchFilter } from '@/api/search'
import { listClients } from '@/api/clients'
import type { Client, FaqStatus } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'

const CATEGORIES = [
  '계정/인증', '결제', '배송', '반품/환불', '상품', '기술지원', '기타',
]

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={result.status} />
              {result.category && <Badge variant="outline">{result.category}</Badge>}
              {result.tags?.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
            <Link to={`/faqs/${result.id}`} className="group">
              <p className="font-medium group-hover:underline">{result.question}</p>
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {result.answer}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDate(result.updated_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FaqStatus | 'all'>('verified')
  const [category, setCategory] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listClients().then(setClients).catch(() => {})
    inputRef.current?.focus()
  }, [])

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const filter: SearchFilter = {
        query: query.trim(),
        client_id: clientId || null,
        category: category || null,
        status,
      }
      setResults(await searchKnowledge(filter))
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">통합 검색</h1>

      <form onSubmit={doSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="pl-9 text-base"
              placeholder="검색어 입력…  예) 비밀번호 재설정, 환불 정책"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? '검색 중…' : '검색'}
          </Button>
        </div>

        {/* 필터 행 */}
        <div className="flex flex-wrap gap-2">
          <Select
            className="w-36"
            value={status}
            onChange={(e) => setStatus(e.target.value as FaqStatus | 'all')}
          >
            <option value="verified">검증됨</option>
            <option value="all">전체 상태</option>
            <option value="draft">초안</option>
            <option value="deprecated">폐기</option>
          </Select>

          <Select
            className="w-40"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          <Select
            className="w-44"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">전체 클라이언트</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && <p className="text-muted-foreground">검색 중…</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-muted-foreground">
          <span className="font-medium">"{query}"</span>에 대한 결과가 없습니다.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            검색 결과 {results.length}건
            {clientId && clients.find((c) => c.id === clientId) && (
              <span className="ml-1">
                — <span className="font-medium">{clients.find((c) => c.id === clientId)?.name}</span> 설정 적용
              </span>
            )}
          </p>
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="py-12 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>검색어를 입력하면 FAQ가 표시됩니다.</p>
          <p className="mt-1 text-sm opacity-70">FTS + 의미 검색(pgvector) 하이브리드</p>
        </div>
      )}
    </div>
  )
}
