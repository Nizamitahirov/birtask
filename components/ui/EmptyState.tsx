import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      gap: 16,
      textAlign: 'center',
      gridColumn: '1 / -1',
    }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: 16,
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={28} color="var(--muted)" />
      </div>
      <div>
        <h3 style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>{title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{description}</p>
      </div>
      {action}
    </div>
  )
}
