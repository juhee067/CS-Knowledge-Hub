import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  listCategories, createCategory, deleteCategory, type FaqCategory,
} from '@/api/categories'
import {
  listChannels, createChannel, deleteChannel, type Channel,
} from '@/api/channels'
import { listClients, createClient } from '@/api/clients'
import type { Client } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ─── 섹션 래퍼 ──────────────────────────────────────────────────────────────

function Section({
  title, desc, children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </section>
  )
}

// ─── 카테고리 ───────────────────────────────────────────────────────────────

function CategorySection({ canEdit, isLead }: { canEdit: boolean; isLead: boolean }) {
  const [items, setItems] = useState<FaqCategory[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const load = () => listCategories().then(setItems).catch((e) => setError(String(e)))
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = input.trim()
    if (!name) return
    setBusy(true); setError(null)
    try {
      await createCategory(name)
      setInput(''); await load(); ref.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패')
    } finally { setBusy(false) }
  }

  async function remove(c: FaqCategory) {
    if (!confirm(`"${c.name}" 카테고리를 삭제할까요?`)) return
    try { await deleteCategory(c.id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : '삭제 실패') }
  }

  return (
    <Section title="FAQ 카테고리" desc="FAQ·문의 분류에 사용하는 카테고리입니다.">
      <ul className="divide-y rounded-lg border">
        {items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">카테고리가 없습니다.</li>}
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium">{c.name}</span>
            {isLead && (
              <Button size="icon" variant="ghost" onClick={() => remove(c)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {canEdit ? (
        <form onSubmit={add} className="flex gap-2">
          <Input ref={ref} value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="새 카테고리 이름" className="flex-1" />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> 추가
          </Button>
        </form>
      ) : (
        <Badge variant="secondary" className="text-xs">viewer는 수정할 수 없습니다.</Badge>
      )}
    </Section>
  )
}

// ─── 채널 ───────────────────────────────────────────────────────────────────

function ChannelSection({ canEdit, isLead }: { canEdit: boolean; isLead: boolean }) {
  const [items, setItems] = useState<Channel[]>([])
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => listChannels().then(setItems).catch((e) => setError(String(e)))
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const k = key.trim().toLowerCase().replace(/\s+/g, '_')
    const l = label.trim()
    if (!k || !l) return
    setBusy(true); setError(null)
    try {
      await createChannel(k, l)
      setKey(''); setLabel(''); await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패')
    } finally { setBusy(false) }
  }

  async function remove(c: Channel) {
    if (!confirm(`"${c.label}" 채널을 삭제할까요?`)) return
    try { await deleteChannel(c.id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : '삭제 실패') }
  }

  return (
    <Section title="수집 채널" desc="문의가 들어오는 채널입니다. 빠른 입력·문의함에서 사용됩니다.">
      <ul className="divide-y rounded-lg border">
        {items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">채널이 없습니다.</li>}
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm">
              <span className="font-medium">{c.label}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{c.key}</code>
            </span>
            {isLead && (
              <Button size="icon" variant="ghost" onClick={() => remove(c)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {canEdit ? (
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="표시 이름 (예: 인스타그램)" className="min-w-36 flex-1" />
          <Input value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="식별자 (예: instagram)" className="min-w-36 flex-1" />
          <Button type="submit" disabled={busy || !key.trim() || !label.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> 추가
          </Button>
        </form>
      ) : (
        <Badge variant="secondary" className="text-xs">viewer는 수정할 수 없습니다.</Badge>
      )}
    </Section>
  )
}

// ─── 클라이언트 ─────────────────────────────────────────────────────────────

function ClientSection({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Client[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => listClients().then(setItems).catch((e) => setError(String(e)))
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!n || !s) return
    setBusy(true); setError(null)
    try {
      await createClient({ name: n, slug: s, description: desc.trim() || null })
      setName(''); setSlug(''); setDesc(''); await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패')
    } finally { setBusy(false) }
  }

  return (
    <Section title="클라이언트" desc="문의를 분류·연결할 고객사입니다.">
      <ul className="divide-y rounded-lg border">
        {items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">클라이언트가 없습니다.</li>}
        {items.map((c) => (
          <li key={c.id} className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.name}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{c.slug}</code>
            </div>
            {c.description && <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {canEdit ? (
        <form onSubmit={add} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="고객사 이름 (예: 한국대학교)" className="min-w-40 flex-1" />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)}
              placeholder="식별자 (예: korea-univ)" className="min-w-40 flex-1" />
          </div>
          <div className="flex gap-2">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="설명 (선택)" className="flex-1" />
            <Button type="submit" disabled={busy || !name.trim() || !slug.trim()}>
              <Plus className="mr-1.5 h-4 w-4" /> 추가
            </Button>
          </div>
        </form>
      ) : (
        <Badge variant="secondary" className="text-xs">viewer는 수정할 수 없습니다.</Badge>
      )}
    </Section>
  )
}

// ─── 페이지 ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { canEdit, isLead } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          카테고리·수집 채널·클라이언트를 관리합니다.
        </p>
      </div>

      <CategorySection canEdit={canEdit} isLead={isLead} />
      <ChannelSection canEdit={canEdit} isLead={isLead} />
      <ClientSection canEdit={canEdit} />
    </div>
  )
}
