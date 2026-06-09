import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  listCategories,
  createCategory,
  deleteCategory,
  type FaqCategory,
} from '@/api/categories'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function SettingsPage() {
  const { canEdit, isLead } = useAuth()
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      setCategories(await listCategories())
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    }
  }

  useEffect(() => { void load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = input.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      await createCategory(name)
      setInput('')
      await load()
      inputRef.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(cat: FaqCategory) {
    if (!confirm(`"${cat.name}" 카테고리를 삭제할까요?`)) return
    setError(null)
    try {
      await deleteCategory(cat.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">FAQ 카테고리를 관리합니다.</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold">카테고리 목록</h2>

        <ul className="divide-y rounded-lg border">
          {categories.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">카테고리가 없습니다.</li>
          )}
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{cat.name}</span>
              {isLead && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(cat)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {!isLead && canEdit && (
          <p className="text-xs text-muted-foreground">삭제는 lead 권한이 필요합니다.</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {canEdit && (
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="새 카테고리 이름"
              className="flex-1"
            />
            <Button type="submit" disabled={busy || !input.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              추가
            </Button>
          </form>
        )}

        {!canEdit && (
          <Badge variant="secondary" className="text-xs">viewer는 카테고리를 수정할 수 없습니다.</Badge>
        )}
      </section>
    </div>
  )
}
