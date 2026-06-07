import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  createClient,
  createConfig,
  deleteConfig,
  listClients,
  listConfigs,
  updateConfig,
  type ConfigInput,
} from '@/api/clients'
import type { Client, ClientConfig, RuleType, Severity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { OverrideBanner } from '@/components/OverrideBanner'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/utils'

const EMPTY_CONFIG: ConfigInput = {
  title: '',
  body: '',
  rule_type: 'note',
  applies_to: '',
  severity: 'info',
}

export function ClientsPage() {
  const { canEdit, isLead } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [configs, setConfigs] = useState<ClientConfig[]>([])
  const [error, setError] = useState<string | null>(null)

  // 다이얼로그 상태
  const [clientDialog, setClientDialog] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', slug: '', description: '' })
  const [configDialog, setConfigDialog] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ClientConfig | null>(null)
  const [configForm, setConfigForm] = useState<ConfigInput>(EMPTY_CONFIG)

  async function loadClients() {
    const list = await listClients()
    setClients(list)
    if (!selected && list.length > 0) setSelected(list[0])
  }

  useEffect(() => {
    void loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selected) listConfigs(selected.id).then(setConfigs)
    else setConfigs([])
  }, [selected])

  async function refreshConfigs() {
    if (selected) setConfigs(await listConfigs(selected.id))
  }

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

  function openNewConfig() {
    setEditingConfig(null)
    setConfigForm(EMPTY_CONFIG)
    setConfigDialog(true)
  }

  function openEditConfig(c: ClientConfig) {
    setEditingConfig(c)
    setConfigForm({
      title: c.title,
      body: c.body,
      rule_type: c.rule_type,
      applies_to: c.applies_to ?? '',
      severity: c.severity,
    })
    setConfigDialog(true)
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    const payload: ConfigInput = {
      ...configForm,
      applies_to: configForm.applies_to?.trim() || null,
    }
    try {
      if (editingConfig) await updateConfig(editingConfig.id, payload)
      else await createConfig(selected.id, payload)
      setConfigDialog(false)
      await refreshConfigs()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    }
  }

  async function handleDeleteConfig(c: ClientConfig) {
    if (!confirm(`"${c.title}" 설정을 삭제할까요?`)) return
    await deleteConfig(c.id)
    await refreshConfigs()
  }

  const overrides = configs.filter((c) => c.rule_type === 'override')

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

      {/* 우측: 선택 클라이언트의 설정 카드 */}
      <section className="space-y-6">
        {!selected ? (
          <p className="text-muted-foreground">클라이언트를 선택하세요.</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{selected.name}</h1>
                {selected.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.description}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button onClick={openNewConfig}>
                  <Plus className="h-4 w-4" /> 설정 추가
                </Button>
              )}
            </div>

            {/* 답변 작성 시뮬레이션: override 경고 배너 미리보기 (FR-3.3) */}
            {overrides.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  ⚠ 답변 작성 시 적용되는 override ({overrides.length})
                </p>
                {overrides.map((c) => (
                  <OverrideBanner key={c.id} config={c} />
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-3">
              {configs.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={c.severity}>{c.severity}</Badge>
                        <Badge variant="outline">{c.rule_type}</Badge>
                        <span className="font-medium">{c.title}</span>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditConfig(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isLead && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteConfig(c)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {c.applies_to && (
                      <p className="mb-1 text-xs text-muted-foreground">
                        연결: {c.applies_to}
                      </p>
                    )}
                    <Markdown>{c.body}</Markdown>
                  </CardContent>
                </Card>
              ))}
              {configs.length === 0 && (
                <p className="text-muted-foreground">설정 카드가 없습니다.</p>
              )}
            </div>
          </>
        )}
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
              placeholder="예: samsung"
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

      {/* 설정 카드 생성/수정 다이얼로그 */}
      <Dialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
        title={editingConfig ? '설정 카드 수정' : '새 설정 카드'}
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <Label htmlFor="cfg-title">제목</Label>
            <Input
              id="cfg-title"
              value={configForm.title}
              onChange={(e) =>
                setConfigForm({ ...configForm, title: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="cfg-body">본문 (마크다운)</Label>
            <Textarea
              id="cfg-body"
              className="min-h-28 font-mono text-sm"
              value={configForm.body}
              onChange={(e) =>
                setConfigForm({ ...configForm, body: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cfg-rule">규칙 유형</Label>
              <Select
                id="cfg-rule"
                value={configForm.rule_type}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    rule_type: e.target.value as RuleType,
                  })
                }
              >
                <option value="note">note</option>
                <option value="override">override</option>
                <option value="default">default</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cfg-sev">심각도</Label>
              <Select
                id="cfg-sev"
                value={configForm.severity}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    severity: e.target.value as Severity,
                  })
                }
              >
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="cfg-applies">연결 키워드 (applies_to)</Label>
            <Input
              id="cfg-applies"
              value={configForm.applies_to ?? ''}
              onChange={(e) =>
                setConfigForm({ ...configForm, applies_to: e.target.value })
              }
              placeholder="예: 비밀번호 재설정"
            />
          </div>
          <Button type="submit" className="w-full">
            저장
          </Button>
        </form>
      </Dialog>
    </div>
  )
}
