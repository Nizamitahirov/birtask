import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'cyan'
  trend?: { value: number; positive: boolean }
}

const colorMap = {
  blue:   { icon: 'bg-accent-blue/10 text-accent-blue',   border: 'border-accent-blue/20',   glow: 'shadow-glow-blue' },
  purple: { icon: 'bg-accent-purple/10 text-accent-purple', border: 'border-accent-purple/20', glow: 'shadow-glow-purple' },
  green:  { icon: 'bg-accent-green/10 text-accent-green',  border: 'border-accent-green/20',  glow: '' },
  yellow: { icon: 'bg-accent-yellow/10 text-accent-yellow', border: 'border-accent-yellow/20', glow: '' },
  red:    { icon: 'bg-accent-red/10 text-accent-red',      border: 'border-accent-red/20',    glow: '' },
  cyan:   { icon: 'bg-accent-cyan/10 text-accent-cyan',    border: 'border-accent-cyan/20',   glow: '' },
}

export function StatsCard({ title, value, subtitle, icon: Icon, color, trend }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn('card p-5 hover:border-white/[0.12] transition-all duration-300 group', c.glow && 'hover:' + c.glow)}>
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend.positive ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
          )}>
            {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-sm text-text-secondary mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
      </div>
    </div>
  )
}
