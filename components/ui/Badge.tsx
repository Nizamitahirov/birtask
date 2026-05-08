import { cn, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_DOT } from '@/lib/utils'
import { Priority, ProjectStatus, TaskStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', STATUS_COLORS[status], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', PRIORITY_COLORS[priority], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[priority])} />
      {priority}
    </span>
  )
}
