import { Badge } from '@/components/ui/badge'
import type { FaqStatus } from '@/types'

const LABEL: Record<FaqStatus, string> = {
  draft: '초안',
  verified: '검증됨',
  deprecated: '폐기',
}

export function StatusBadge({ status }: { status: FaqStatus }) {
  return <Badge variant={status}>{LABEL[status]}</Badge>
}
