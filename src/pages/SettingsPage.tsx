import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Tags, Radio, Building2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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
      {canEdit ? (
        <form onSubmit={add} className="flex gap-2 rounded-lg border bg-muted/30 p-3">
          <Input ref={ref} value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="새 카테고리 이름" className="flex-1" />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> 추가
          </Button>
        </form>
      ) : (
        <Badge variant="secondary" className="text-xs">viewer는 수정할 수 없습니다.</Badge>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
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
      {canEdit ? (
        <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
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
      {canEdit ? (
        <form onSubmit={add} className="space-y-2 rounded-lg border bg-muted/30 p-3">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
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
    </Section>
  )
}

// ─── 페이지 ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'categories', label: '카테고리', icon: Tags },
  { id: 'channels',   label: '수집 채널', icon: Radio },
  { id: 'clients',    label: '클라이언트', icon: Building2 },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsPage() {
  const { canEdit, isLead } = useAuth()
  const [tab, setTab] = useState<TabId>('categories')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          카테고리·수집 채널·클라이언트를 관리합니다.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* 좌측 탭 네비 */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                tab === id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* 우측 콘텐츠 */}
        <div className="min-w-0 flex-1 md:max-w-2xl">
          {tab === 'categories' && <CategorySection canEdit={canEdit} isLead={isLead} />}
          {tab === 'channels' && <ChannelSection canEdit={canEdit} isLead={isLead} />}
          {tab === 'clients' && <ClientSection canEdit={canEdit} />}
        </div>
      </div>
    </div>
  )
}
