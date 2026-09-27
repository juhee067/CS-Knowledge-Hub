import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface DeleteContextMenuOptions<T> {
  /** 삭제 실행 (성공 시 onDeleted 호출) */
  remove: (item: T) => Promise<void>
  /** 삭제 성공 후 로컬 목록 갱신 등 */
  onDeleted: (item: T) => void
  /** 확인창에 보여줄 미리보기 텍스트 */
  getPreview: (item: T) => string
  /** 확인창 제목 (기본: "삭제") */
  title?: string
  /** 확인 문구 (기본: 영구 삭제 경고) */
  message?: string
}

/**
 * 목록 어디서든 재사용하는 "우클릭 → 삭제" 메뉴. 항목 타입에 무관(제네릭).
 *
 * 사용법:
 *   const { handleContextMenu, overlay } = useDeleteContextMenu<Faq>({
 *     remove: (f) => softDeleteFaq(f.id),
 *     onDeleted: (f) => setFaqs((prev) => prev.filter((x) => x.id !== f.id)),
 *     getPreview: (f) => f.question,
 *   })
 *   <tr onContextMenu={(e) => handleContextMenu(e, item)} />
 *   {overlay}   // 컴포넌트 최상단 div 안에 한 번 렌더
 *
 * 삭제 권한은 호출하는 쪽 API/RLS가 결정 — 실패 시 확인창 안에 에러를 표시한다.
 */
export function useDeleteContextMenu<T>({
  remove,
  onDeleted,
  getPreview,
  title = '삭제',
  message = '영구히 삭제할까요? 되돌릴 수 없습니다.',
}: DeleteContextMenuOptions<T>) {
  const [menu, setMenu] = useState<{ x: number; y: number; item: T } | null>(null)
  const [pending, setPending] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleContextMenu(e: MouseEvent, item: T) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, item })
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

  async function confirmDelete() {
    if (pending === null) return
    setDeleting(true)
    setError(null)
    try {
      await remove(pending)
      onDeleted(pending)
      setPending(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setDeleting(false)
    }
  }

  const overlay: ReactNode = (
    <>
      {menu && (
        <div
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-md border bg-card py-1 shadow-md"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
            onClick={() => {
              setPending(menu.item)
              setMenu(null)
            }}
          >
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      )}

      <Dialog
        open={pending !== null}
        onClose={() => !deleting && setPending(null)}
        title={title}
      >
        <p className="text-sm text-muted-foreground">{message}</p>
        {pending && (
          <p className="mt-3 line-clamp-3 rounded-md border bg-muted/40 p-3 text-sm">
            {getPreview(pending)}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setPending(null)}>
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
