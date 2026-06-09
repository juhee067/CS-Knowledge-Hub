import { supabase } from '@/lib/supabase'
import type { Client } from '@/types'
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

