import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createFaq, getFaq, updateFaq, type FaqInput } from '@/api/faqs'
import { listCategories } from '@/api/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FaqEditPage() {
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FaqInput>({
    question: '',
    answer: '',
    category: '',
    tags: [],
  })
  const [tagsText, setTagsText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCategories().then((cats) => setCategories(cats.map((c) => c.name))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    getFaq(id)
      .then((faq) => {
        if (faq) {
          setForm({
            question: faq.question,
            answer: faq.answer,
            category: faq.category ?? '',
            tags: faq.tags ?? [],
          })
          setTagsText((faq.tags ?? []).join(', '))
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload: FaqInput = {
      ...form,
      category: form.category?.trim() || null,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    try {
      const saved = editing
        ? await updateFaq(id!, payload)
        : await createFaq(payload)
      navigate(`/faqs/${saved.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
      setBusy(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">불러오는 중…</p>

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{editing ? 'FAQ 수정' : '새 FAQ'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question">질문</Label>
            <Input
              id="question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="answer">답변 (마크다운)</Label>
            <Textarea
              id="answer"
              className="min-h-48 font-mono text-sm"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">카테고리</Label>
              <Select
                id="category"
                value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">미분류</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tags">태그 (쉼표 구분)</Label>
              <Input
                id="tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="예: 로그인, 비밀번호"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? '저장 중…' : '저장'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
