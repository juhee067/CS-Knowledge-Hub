import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, CheckCircle2, FileEdit, Archive, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { listFaqs, softDeleteFaq, setFaqStatus, setFaqCategory, type FaqFilter } from '@/api/faqs'
import { listCategories } from '@/api/categories'
import { listClients } from '@/api/clients'
import type { Faq, FaqStatus, Client } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/StatusBadge'
import { useDeleteContextMenu } from '@/components/useDeleteContextMenu'
import { cn, formatDate } from '@/lib/utils'

const PAGE_SIZE = 10

// ─── 선택/벌크 액션 툴바 ─────────────────────────────────────────────────────

function SelectionToolbar({
  selectedCount,
  totalCount,
  pageCount,
  pageAllSelected,
  pageSomeSelected,
  isLead,
  applying,
  onSelectPage,
  onClear,
  onApply,
  onDelete,
}: {
  selectedCount: number
  totalCount: number
  pageCount: number
  pageAllSelected: boolean
  pageSomeSelected: boolean
  isLead: boolean
  applying: boolean
  onSelectPage: () => void
  onClear: () => void
  onApply: (status: FaqStatus) => void
  onDelete: () => void
}) {
  const hasSelection = selectedCount > 0
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5',
        hasSelection ? 'border-primary/30 bg-primary/5' : 'bg-muted/30',
      )}
    >
      {/* 현재 페이지 선택 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-muted-foreground/40 accent-primary"
          checked={pageAllSelected}
          ref={(el) => { if (el) el.indeterminate = pageSomeSelected && !pageAllSelected }}
          onChange={onSelectPage}
        />
        {hasSelection ? (
          <>
            <span className="font-medium">{selectedCount}개 선택됨</span>
            <span className="text-xs text-muted-foreground">/ 전체 {totalCount}개</span>
          </>
        ) : (
          <span className="font-medium">이 페이지 선택 ({pageCount}개)</span>
        )}
      </label>

      {hasSelection && (
        <>
          <div className="mx-2 h-4 w-px bg-border" />

          {/* 상태 변경 */}
          <Button
            size="sm"
            variant="secondary"
            disabled={applying || !isLead}
            title={!isLead ? 'verified 승격은 lead 권한이 필요합니다' : undefined}
            onClick={() => onApply('verified')}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            검증됨
          </Button>
          <Button size="sm" variant="secondary" disabled={applying} onClick={() => onApply('draft')} className="gap-1.5">
            <FileEdit className="h-3.5 w-3.5 text-blue-500" />
            초안
          </Button>
          <Button size="sm" variant="secondary" disabled={applying} onClick={() => onApply('deprecated')} className="gap-1.5">
            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            폐기
          </Button>

          <div className="mx-2 h-4 w-px bg-border" />

          {/* 삭제 */}
          <Button size="sm" variant="destructive" disabled={applying} onClick={onDelete} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </Button>

          {applying && <span className="text-xs text-muted-foreground">적용 중…</span>}

          <button
            type="button"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" /> 선택 해제
          </button>
        </>
      )}
    </div>
  )
}

// ─── 페이지네이션 ────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  // 현재 페이지 주변 ±2 + 첫/끝, 사이는 줄임표
  const pages: (number | '…')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> 이전
      </Button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="sm"
            className="min-w-9"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onChange(page + 1)} className="gap-1">
        다음 <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ─── 인라인 카테고리 지정 ────────────────────────────────────────────────────

function CategorySelect({
  faq,
  categories,
  onChanged,
}: {
  faq: Faq
  categories: string[]
  onChanged: (id: string, category: string | null) => void
}) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function change(value: string) {
    const category = value || null
    setSaving(true)
    setFailed(false)
    try {
      await setFaqCategory(faq.id, category)
      onChanged(faq.id, category)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select
      value={faq.category ?? ''}
      disabled={saving}
      onChange={(e) => void change(e.target.value)}
      className={cn(
        'h-8 w-32 text-xs',
        !faq.category && 'border-orange-300 text-orange-700',
        failed && 'border-destructive',
      )}
    >
      <option value="">미분류</option>
      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      {/* 목록에 없는 기존 값 보존 */}
      {faq.category && !categories.includes(faq.category) && (
        <option value={faq.category}>{faq.category}</option>
      )}
    </Select>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export function FaqListPage() {
  const { canEdit, isLead } = useAuth()
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FaqStatus | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  // 다중 선택 / 페이지 / 삭제 확인
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [page, setPage] = useState(1)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    listCategories().then((cats) => setCategories(cats.map((c) => c.name))).catch(() => {})
    listClients().then(setClients).catch(() => {})
  }, [])

  const clientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.name ?? null : null

  const { handleContextMenu, overlay } = useDeleteContextMenu<Faq>({
    remove: (f) => softDeleteFaq(f.id),
    onDeleted: (f) => setFaqs((prev) => prev.filter((x) => x.id !== f.id)),
    getPreview: (f) => f.question,
    title: 'FAQ 삭제',
    message: '이 FAQ를 삭제할까요? 목록에서 제거됩니다.',
  })

  async function load(filter: FaqFilter) {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    setPage(1)
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

  // 페이지 슬라이스 (목록 변동 시 범위 보정)
  const totalPages = Math.max(1, Math.ceil(faqs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = faqs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // 현재 페이지 항목만 토글 (다른 페이지 선택은 유지)
  function togglePage() {
    const pageIds = pageItems.map((f) => f.id)
    const everySelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (everySelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function applyBulkStatus(newStatus: FaqStatus) {
    if (selected.size === 0) return
    setApplying(true)
    setError(null)
    const ids = [...selected]
    const failures: string[] = []
    await Promise.all(
      ids.map((id) => setFaqStatus(id, newStatus).catch(() => { failures.push(id) })),
    )
    setFaqs((prev) =>
      prev.map((f) =>
        selected.has(f.id) && !failures.includes(f.id) ? { ...f, status: newStatus } : f,
      ),
    )
    setSelected(new Set())
    setApplying(false)
    if (failures.length > 0) {
      setError(`${failures.length}건 상태 변경 실패 (권한 또는 서버 오류)`)
    }
  }

  async function applyBulkDelete() {
    if (selected.size === 0) return
    setApplying(true)
    setError(null)
    const ids = [...selected]
    const failures: string[] = []
    await Promise.all(
      ids.map((id) => softDeleteFaq(id).catch(() => { failures.push(id) })),
    )
    setFaqs((prev) => prev.filter((f) => !selected.has(f.id) || failures.includes(f.id)))
    setSelected(new Set())
    setApplying(false)
    setConfirmingDelete(false)
    if (failures.length > 0) {
      setError(`${failures.length}건 삭제 실패 (권한 또는 서버 오류)`)
    }
  }

  const pageAllSelected = pageItems.length > 0 && pageItems.every((f) => selected.has(f.id))
  const pageSomeSelected = pageItems.some((f) => selected.has(f.id))

  function handleCategoryChanged(id: string, category: string | null) {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, category } : f)))
  }

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

      {/* 선택/벌크 툴바 — 편집 권한자 + 항목이 있을 때 항상 표시 */}
      {canEdit && faqs.length > 0 && (
        <SelectionToolbar
          selectedCount={selected.size}
          totalCount={faqs.length}
          pageCount={pageItems.length}
          pageAllSelected={pageAllSelected}
          pageSomeSelected={pageSomeSelected}
          isLead={isLead}
          applying={applying}
          onSelectPage={togglePage}
          onClear={() => setSelected(new Set())}
          onApply={(s) => void applyBulkStatus(s)}
          onDelete={() => setConfirmingDelete(true)}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">불러오는 중…</p>
      ) : faqs.length === 0 ? (
        <p className="text-muted-foreground">FAQ가 없습니다.</p>
      ) : (
        <>
          <div className="space-y-4">
            {pageItems.map((faq) => (
              <div key={faq.id} className="relative flex items-center gap-3">
                {/* 체크박스 — 편집 권한자만 */}
                {canEdit && (
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded border-muted-foreground/40 accent-primary"
                    checked={selected.has(faq.id)}
                    onChange={() => toggleOne(faq.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <Card className={cn(
                  'min-w-0 flex-1 transition-colors',
                  selected.has(faq.id) && 'border-primary/50 bg-primary/5',
                )}>
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <Link
                      to={`/faqs/${faq.id}`}
                      className="min-w-0 flex-1 rounded-sm transition-colors hover:opacity-80"
                      onContextMenu={canEdit ? (e) => handleContextMenu(e, faq) : undefined}
                    >
                      <div className="mb-1">
                        <StatusBadge status={faq.status} />
                      </div>
                      <p className="truncate font-medium">{faq.question}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {canEdit ? (
                        <CategorySelect faq={faq} categories={categories} onChanged={handleCategoryChanged} />
                      ) : faq.category ? (
                        <Badge variant="outline">{faq.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">미분류</span>
                      )}
                      {clientName(faq.client_id) && (
                        <Badge variant="secondary" className="max-w-36 truncate">
                          {clientName(faq.client_id)}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(faq.updated_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {/* 벌크 삭제 확인 */}
      <Dialog
        open={confirmingDelete}
        onClose={() => !applying && setConfirmingDelete(false)}
        title="FAQ 삭제"
      >
        <p className="text-sm text-muted-foreground">
          선택한 <strong className="text-foreground">{selected.size}개</strong>의 FAQ를 삭제할까요? 목록에서 제거됩니다.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={applying} onClick={() => setConfirmingDelete(false)}>
            취소
          </Button>
          <Button variant="destructive" size="sm" disabled={applying} onClick={() => void applyBulkDelete()}>
            {applying ? '삭제 중…' : `${selected.size}개 삭제`}
          </Button>
        </div>
      </Dialog>

      {overlay}
    </div>
  )
}
