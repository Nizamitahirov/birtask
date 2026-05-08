import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <Icon size={28} className="text-text-muted" />
      </div>
      <div className="text-center">
        <h3 className="text-text-primary font-semibold">{title}</h3>
        <p className="text-text-secondary text-sm mt-1">{description}</p>
      </div>
      {action}
    </div>
  )
}
