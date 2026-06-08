import { supabase } from '@/lib/supabase'
import type { Client, ClientConfig, RuleType, Severity } from '@/types'
import { logAudit } from './audit'

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface ClientInput {
  name: string
  slug: string
  description: string | null
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  await logAudit('client', data.id, 'create', { name: input.name })
  return data
}

export async function updateClient(
  id: string,
  input: ClientInput,
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logAudit('client', id, 'update', { name: input.name })
  return data
}

// ── 설정 카드 (override 규칙) ──────────────────────────────────

export async function listConfigs(clientId: string): Promise<ClientConfig[]> {
  const { data, error } = await supabase
    .from('client_configs')
    .select('*')
    .eq('client_id', clientId)
    .order('severity', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 키워드에 해당하는 override 규칙 조회 (답변 화면 경고 배너용, FR-3.3) */
export async function findOverrides(
  clientId: string,
  keyword: string,
): Promise<ClientConfig[]> {
  const { data, error } = await supabase
    .from('client_configs')
    .select('*')
    .eq('client_id', clientId)
    .eq('rule_type', 'override')
    .ilike('applies_to', `%${keyword}%`)
  if (error) throw error
  return data ?? []
}

export interface ConfigInput {
  title: string
  body: string
  rule_type: RuleType
  applies_to: string | null
  severity: Severity
}

export async function createConfig(
  clientId: string,
  input: ConfigInput,
): Promise<ClientConfig> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('client_configs')
    .insert({ ...input, client_id: clientId, updated_by: userData.user?.id })
    .select()
    .single()
  if (error) throw error
  await logAudit('client_config', data.id, 'create', { title: input.title })
  return data
}

export async function updateConfig(
  id: string,
  input: ConfigInput,
): Promise<ClientConfig> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('client_configs')
    .update({
      ...input,
      updated_by: userData.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logAudit('client_config', id, 'update', { title: input.title })
  return data
}

export async function deleteConfig(id: string): Promise<void> {
  const { error } = await supabase.from('client_configs').delete().eq('id', id)
  if (error) throw error
  await logAudit('client_config', id, 'delete', {})
}
