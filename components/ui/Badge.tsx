import { Priority, ProjectStatus, TaskStatus } from '@/lib/types'

const STATUS_PILL: Record<string, string> = {
  'Davam edir':     'indigo',
  'Tamamlandı':     'green',
  'Yoxlanılır':     'info',
  'Planlaşdırılır': 'muted',
  'Gözləyir':       'warn',
  'Dayandırıldı':   'accent',
}

const PRIORITY_PILL: Record<string, string> = {
  'Yüksək': 'accent',
  'Orta':   'warn',
  'Aşağı':  'muted',
  'High':   'accent',
  'Medium': 'warn',
  'Low':    'muted',
}

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_PILL[status] || 'muted'
  return (
    <span className={`pill ${color} ${className || ''}`}>
      <span className="dot" />
      {status}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const color = PRIORITY_PILL[priority] || 'muted'
  return (
    <span className={`pill ${color} ${className || ''}`}>
      {priority}
    </span>
  )
}
