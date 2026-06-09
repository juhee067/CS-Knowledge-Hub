import { supabase } from '@/lib/supabase'

export interface FaqCategory {
  id: number
  name: string
  sort_order: number
  created_at: string
}

export async function listCategories(): Promise<FaqCategory[]> {
  const { data, error } = await supabase
    .from('faq_categories')
    .select('*')
    .order('sort_order')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createCategory(name: string): Promise<FaqCategory> {
  const { data, error } = await supabase
    .from('faq_categories')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from('faq_categories').delete().eq('id', id)
  if (error) throw error
}
