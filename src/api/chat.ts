import { supabase } from '@/lib/supabase'
import type { ChatSession, ChatMessage, Citation, ChatFeedback } from '@/types'

// ─── 검색 출처 메타 ─────────────────────────────────────────────────────────

export interface ChatSource {
  id: string
  question: string
  category: string | null
  similarity: number
}

export interface ChatMeta {
  grounded: boolean
  citations: Citation[]
  sources: ChatSource[]
}

// ─── 세션 (FR-7.1) ──────────────────────────────────────────────────────────

export async function listSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ChatSession[]
}

export async function createSession(
  title: string | null = null,
  clientId: string | null = null,
): Promise<ChatSession> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userData.user?.id ?? null, client_id: clientId, title } as never)
    .select()
    .single()
  if (error) throw error
  return data as ChatSession
}

export async function renameSession(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title } as never)
    .eq('id', id)
  if (error) throw error
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
  if (error) throw error
}

// ─── 메시지 (FR-7.1) ────────────────────────────────────────────────────────

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

export async function addUserMessage(
  sessionId: string,
  content: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role: 'user', content } as never)
    .select()
    .single()
  if (error) throw error
  return data as ChatMessage
}

export async function saveAssistantMessage(
  sessionId: string,
  content: string,
  citations: Citation[],
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content,
      citations: citations.length ? citations : null,
    } as never)
    .select()
    .single()
  if (error) throw error
  return data as ChatMessage
}

// ─── 검색 로그 (FR-7.1) ─────────────────────────────────────────────────────

export async function saveRetrieval(
  messageId: string,
  queryText: string,
  meta: ChatMeta,
): Promise<void> {
  const { error } = await supabase.from('retrievals').insert({
    message_id: messageId,
    query_text: queryText,
    results: meta.sources as never,
    grounded: meta.grounded,
  } as never)
  if (error) throw error
}

// ─── 답변별 피드백 (FR-7.7) ─────────────────────────────────────────────────

export async function submitFeedback(
  messageId: string,
  feedback: ChatFeedback,
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ feedback } as never)
    .eq('id', messageId)
  if (error) throw error
}

// ─── FAQ 자가 적립 (FR-7.6) ─────────────────────────────────────────────────

/** 답변 초안을 신규 FAQ(draft)로 저장. assetize 와 달리 inquiry 비종속. */
export async function saveAnswerAsFaq(input: {
  question: string
  answer: string
  category?: string | null
  tags?: string[] | null
}): Promise<{ faq_id: string }> {
  const { data: userData } = await supabase.auth.getUser()
  const actorId = userData.user?.id ?? null
  const { data, error } = await supabase
    .from('faqs')
    .insert({
      question: input.question,
      answer: input.answer,
      category: input.category ?? null,
      tags: input.tags ?? null,
      status: 'draft',
      created_by: actorId,
      updated_by: actorId,
    } as never)
    .select('id')
    .single()
  if (error) throw error
  return { faq_id: (data as { id: string }).id }
}

// ─── grounded 답변 스트리밍 (FR-7.2) ────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export interface StreamCallbacks {
  onMeta?: (meta: ChatMeta) => void
  onToken?: (delta: string) => void
}

/**
 * chat Edge Function 을 SSE 로 호출해 답변 토큰을 스트리밍한다.
 * 반환: 누적 답변 본문 + 메타(grounded/citations/sources).
 */
export async function streamAnswer(
  params: {
    query: string
    history?: { role: 'user' | 'assistant'; content: string }[]
    clientId?: string | null
    limit?: number
  },
  cb: StreamCallbacks = {},
): Promise<{ content: string; meta: ChatMeta | null }> {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? ANON_KEY

  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      query: params.query,
      history: params.history ?? [],
      client_id: params.clientId ?? null,
      limit: params.limit,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`답변 생성 실패 (${res.status}): ${text}`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let content = ''
  let meta: ChatMeta | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      let evt: { type: string; value?: string } & Partial<ChatMeta>
      try {
        evt = JSON.parse(payload)
      } catch {
        continue
      }
      if (evt.type === 'meta') {
        meta = {
          grounded: Boolean(evt.grounded),
          citations: evt.citations ?? [],
          sources: evt.sources ?? [],
        }
        cb.onMeta?.(meta)
      } else if (evt.type === 'token' && evt.value) {
        content += evt.value
        cb.onToken?.(evt.value)
      }
    }
  }

  return { content, meta }
}
