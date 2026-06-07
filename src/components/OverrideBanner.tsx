import { useState } from 'react'
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import type { ClientConfig, Severity } from '@/types'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/utils'

const STYLE: Record<
  Severity,
  { wrap: string; icon: typeof Info; label: string }
> = {
  info: {
    wrap: 'border-info/40 bg-blue-50 text-blue-900',
    icon: Info,
    label: '참고',
  },
  warning: {
    wrap: 'border-warning/50 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
    label: '주의',
  },
  critical: {
    wrap: 'border-critical/60 bg-red-50 text-red-900',
    icon: ShieldAlert,
    label: '필수 확인',
  },
}

/**
 * 답변 작성 시 클라이언트 override 경고 배너 (FR-3.3).
 * critical 은 "확인했습니다" 체크 전까지 강조 유지.
 */
export function OverrideBanner({ config }: { config: ClientConfig }) {
  const [ack, setAck] = useState(false)
  const s = STYLE[config.severity]
  const Icon = s.icon
  const needsAck = config.severity === 'critical'

  return (
    <div
      className={cn(
        'rounded-md border-l-4 p-3',
        s.wrap,
        needsAck && !ack && 'ring-2 ring-critical/40',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>[{s.label}]</span>
            <span>{config.title}</span>
            {config.applies_to && (
              <span className="font-normal opacity-70">
                · {config.applies_to}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm">
            <Markdown>{config.body}</Markdown>
          </div>
          {needsAck && (
            <label className="mt-2 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              이 override 규칙을 확인했습니다
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
