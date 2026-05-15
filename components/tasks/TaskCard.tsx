'use client'

import { Task } from '@/lib/types'
import { formatDate, getDaysLeft, cn } from '@/lib/utils'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Calendar, User, Edit2, Trash2, Tag, CheckCircle2, Circle, FolderKanban } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onComplete?: (t: Task) => void
  draggable?: boolean
}

export function TaskCard({ task, onEdit, onDelete, onComplete, draggable: isDraggable }: TaskCardProps) {
  const daysLeft = getDaysLeft(task.dueDate)
  const overdue = task.dueDate && daysLeft < 0 && task.status !== 'Tamamlandı'
  const isDone = task.status === 'Tamamlandı'

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? (e) => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
      } : undefined}
      className={cn(
        'card p-4 hover:border-white/[0.12] transition-all duration-200 group flex flex-col gap-3',
        overdue && 'border-accent-red/20',
        isDone && 'opacity-70',
        isDraggable && 'cursor-grab active:cursor-grabbing active:opacity-60'
      )}
    >
      {/* Title + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(task) }}
              className={cn(
                'flex-shrink-0 mt-0.5 transition-colors',
                isDone ? 'text-accent-green' : 'text-text-muted hover:text-accent-green'
              )}
              title={isDone ? 'Geri al' : 'Tamamlandı kimi işarələ'}
            >
              {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
            </button>
          )}
          <h4 className={cn('text-text-primary text-sm font-medium leading-snug', isDone && 'line-through text-text-muted')}>
            {task.title}
          </h4>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all"
          >
            <Edit2 size={11} />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {task.projectName && (
        <div className="flex items-center gap-1 text-[10px] text-accent-blue font-medium">
          <FolderKanban size={10} className="flex-shrink-0" />
          <span className="truncate">{task.projectName}</span>
        </div>
      )}

      {task.description && (
        <p className="text-text-muted text-xs leading-relaxed line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>

      {task.tags && (
        <div className="flex items-center gap-1 flex-wrap">
          <Tag size={11} className="text-text-muted" />
          {task.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-muted border-t border-white/[0.04] pt-2">
        <div className="flex items-center gap-1">
          <User size={10} />
          <span>{task.assignee || '—'}</span>
        </div>
        {task.dueDate && (
          <div className={cn('flex items-center gap-1', overdue && 'text-accent-red')}>
            <Calendar size={10} />
            <span>{overdue ? `${Math.abs(daysLeft)}g gecikdi` : formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
