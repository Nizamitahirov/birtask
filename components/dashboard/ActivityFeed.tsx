import { Activity } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Plus, CheckCircle, Edit2, Trash2, Clock } from 'lucide-react'

const typeConfig = {
  create:   { icon: Plus,         color: 'text-accent-blue',   bg: 'bg-accent-blue/10' },
  complete: { icon: CheckCircle,  color: 'text-accent-green',  bg: 'bg-accent-green/10' },
  update:   { icon: Edit2,        color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  delete:   { icon: Trash2,       color: 'text-accent-red',    bg: 'bg-accent-red/10' },
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <Clock size={24} className="text-text-muted" />
        <p className="text-text-muted text-sm">Hələ aktivlik yoxdur</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((item, idx) => {
        const cfg = typeConfig[item.type] || typeConfig.update
        const Icon = cfg.icon
        return (
          <div key={item.id || idx} className="flex items-start gap-3 group">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
              <Icon size={13} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm leading-snug">{item.message}</p>
              <p className="text-text-muted text-xs mt-0.5">{formatDate(item.createdAt)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
