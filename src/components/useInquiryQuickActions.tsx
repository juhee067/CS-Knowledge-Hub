import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Trash2, Sparkles } from 'lucide-react'
import { deleteInquiry, type Inquiry } from '@/api/inquiries'
import { assetizeInquiry } from '@/api/classify'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

/**
 * 수집현황(문의함) 전용 우클릭 메뉴 — 간편 자산화 + 삭제.
 *
 * 자산화는 답변이 필요하므로 인박스를 떠나지 않고 작은 다이얼로그에서
 * 질문(자동 채움)·답변·카테고리만 입력해 신규 FAQ(draft)로 만든다.
 */
export function useInquiryQuickActions({
  categories,
  onAssetized,
  onDeleted,
}: {
  categories: string[]
  onAssetized: (id: string, faqId: string) => void
  onDeleted: (id: string) => void
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; inquiry: Inquiry } | null>(null)

  // 삭제
  const [pendingDelete, setPendingDelete] = useState<Inquiry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  // 자산화
  const [target, setTarget] = useState<Inquiry | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [assetizeErr, setAssetizeErr] = useState<string | null>(null)

  function handleContextMenu(e: MouseEvent, inquiry: Inquiry) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, inquiry })
  }

  // 메뉴 열린 동안 바깥 클릭 / ESC / 스크롤로 닫기
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  function openAssetize(inq: Inquiry) {
    setTarget(inq)
    setQuestion(inq.raw_text.split('\n')[0].slice(0, 120))
    // 답변됨 상태 등 이미 작성해둔 답변이 있으면 가져와 채운다
    setAnswer(inq.answer_text ?? '')
    setCategory(inq.predicted_category ?? '')
    setAssetizeErr(null)
    setMenu(null)
  }

  async function confirmAssetize() {
    if (!target) return
    if (!answer.trim()) { setAssetizeErr('답변을 입력하세요'); return }
    setSaving(true)
    setAssetizeErr(null)
    try {
      const { faq_id } = await assetizeInquiry({
        inquiryId: target.id,
        mode: 'new',
        question: question.trim() || target.raw_text.slice(0, 120),
        answer: answer.trim(),
        category: category.trim() || null,
        tags: null,
      })
      onAssetized(target.id, faq_id)
      setTarget(null)
    } catch (e) {
      setAssetizeErr(e instanceof Error ? e.message : '자산화 실패')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteErr(null)
    try {
      await deleteInquiry(pendingDelete.id)
      onDeleted(pendingDelete.id)
      setPendingDelete(null)
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  const overlay: ReactNode = (
    <>
      {/* 우클릭 메뉴 */}
      {menu && (
        <div
          className="fixed z-50 min-w-[150px] overflow-hidden rounded-md border bg-card py-1 shadow-md"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {menu.inquiry.status !== 'assetized' && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-primary hover:bg-accent"
              onClick={() => openAssetize(menu.inquiry)}
            >
              <Sparkles className="h-4 w-4" /> 자산화
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
            onClick={() => { setPendingDelete(menu.inquiry); setMenu(null) }}
          >
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      )}

      {/* 간편 자산화 */}
      <Dialog
        open={target !== null}
        onClose={() => !saving && setTarget(null)}
        title="간편 자산화 — 신규 FAQ"
      >
        <div className="space-y-3">
          <p className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            원본 문의: {target?.raw_text}
          </p>
          <div>
            <Label htmlFor="qa-question">질문</Label>
            <Input id="qa-question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="qa-answer">답변 <span className="text-destructive">*</span></Label>
            <Textarea
              id="qa-answer"
              className="min-h-32 text-sm"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="이 문의에 대한 표준 답변을 작성하세요"
            />
          </div>
          <div>
            <Label htmlFor="qa-category">카테고리</Label>
            <Select id="qa-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">미분류</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              {category && !categories.includes(category) && <option value={category}>{category}</option>}
            </Select>
          </div>
          {assetizeErr && <p className="text-sm text-destructive">{assetizeErr}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => setTarget(null)}>
            취소
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void confirmAssetize()}>
            {saving ? '자산화 중…' : 'FAQ로 자산화'}
          </Button>
        </div>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => !deleting && setPendingDelete(null)}
        title="문의 삭제"
      >
        <p className="text-sm text-muted-foreground">이 문의를 영구히 삭제할까요? 되돌릴 수 없습니다.</p>
        {pendingDelete && (
          <p className="mt-3 line-clamp-3 rounded-md border bg-muted/40 p-3 text-sm">{pendingDelete.raw_text}</p>
        )}
        {deleteErr && <p className="mt-3 text-sm text-destructive">{deleteErr}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setPendingDelete(null)}>
            취소
          </Button>
          <Button variant="destructive" size="sm" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? '삭제 중…' : '삭제'}
          </Button>
        </div>
      </Dialog>
    </>
  )

  return { handleContextMenu, overlay }
}
