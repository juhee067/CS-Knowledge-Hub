import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  createClient,
  listClients,
} from '@/api/clients'
import type { Client } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function ClientsPage() {
  const { canEdit } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [clientDialog, setClientDialog] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', slug: '', description: '' })

  async function loadClients() {
    const list = await listClients()
    setClients(list)
    if (!selected && list.length > 0) setSelected(list[0])
  }

  useEffect(() => {
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const c = await createClient({
        name: clientForm.name,
        slug: clientForm.slug,
        description: clientForm.description || null,
      })
      setClientDialog(false)
      setClientForm({ name: '', slug: '', description: '' })
      await loadClients()
      setSelected(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
    }
  }

  return (
    <div className="grid grid-cols-[240px_1fr] gap-8">
      {/* 좌측: 클라이언트 목록 */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">클라이언트</h2>
          {canEdit && (
            <Button size="icon" variant="ghost" onClick={() => setClientDialog(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                selected?.id === c.id
                  ? 'bg-secondary font-medium'
                  : 'hover:bg-accent',
              )}
            >
              {c.name}
              <span className="block text-xs text-muted-foreground">
                {c.slug}
              </span>
            </button>
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">클라이언트가 없습니다.</p>
          )}
        </div>
      </aside>

      {/* 우측: 선택 클라이언트 정보 */}
      <section className="space-y-4">
        {!selected ? (
          <p className="text-muted-foreground">클라이언트를 선택하세요.</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{selected.name}</h1>
            <p className="text-sm text-muted-foreground">슬러그: {selected.slug}</p>
            {selected.description && (
              <p className="text-sm text-muted-foreground">{selected.description}</p>
            )}
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {/* 클라이언트 생성 다이얼로그 */}
      <Dialog
        open={clientDialog}
        onClose={() => setClientDialog(false)}
        title="새 클라이언트"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <Label htmlFor="c-name">이름</Label>
            <Input
              id="c-name"
              value={clientForm.name}
              onChange={(e) =>
                setClientForm({ ...clientForm, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="c-slug">슬러그</Label>
            <Input
              id="c-slug"
              value={clientForm.slug}
              onChange={(e) =>
                setClientForm({ ...clientForm, slug: e.target.value })
              }
              placeholder="예: veluga"
              required
            />
          </div>
          <div>
            <Label htmlFor="c-desc">설명</Label>
            <Input
              id="c-desc"
              value={clientForm.description}
              onChange={(e) =>
                setClientForm({ ...clientForm, description: e.target.value })
              }
            />
          </div>
          <Button type="submit" className="w-full">
            생성
          </Button>
        </form>
      </Dialog>
    </div>
  )
}
