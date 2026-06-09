import { supabase } from '@/lib/supabase'

export interface Channel {
  id: number
  key: string
  label: string
  sort_order: number
  created_at: string
}

export async function listChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('sort_order')
    .order('label')
  if (error) throw error
  return (data ?? []) as Channel[]
}

export async function createChannel(key: string, label: string): Promise<Channel> {
  const { data, error } = await supabase
    .from('channels')
    .insert({ key, label } as never)
    .select()
    .single()
  if (error) throw error
  return data as Channel
}

export async function deleteChannel(id: number): Promise<void> {
  const { error } = await supabase.from('channels').delete().eq('id', id)
  if (error) throw error
}
