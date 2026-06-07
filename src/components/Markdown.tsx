import ReactMarkdown from 'react-markdown'

/** 가벼운 마크다운 렌더러 (FAQ 답변 / 설정 카드 본문용) */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sm max-w-none leading-relaxed [&_a]:text-info [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-warning [&_blockquote]:bg-amber-50 [&_blockquote]:px-3 [&_blockquote]:py-1">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
