import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        // FAQ 상태
        draft: 'border-transparent bg-muted text-muted-foreground',
        verified: 'border-transparent bg-emerald-100 text-emerald-800',
        deprecated: 'border-transparent bg-zinc-200 text-zinc-500 line-through',
        // severity
        info: 'border-transparent bg-blue-100 text-blue-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        critical: 'border-transparent bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { badgeVariants }
