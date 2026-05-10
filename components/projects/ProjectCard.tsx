'use client'

import { Project } from '@/lib/types'
import { formatDate, getDaysLeft } from '@/lib/utils'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Calendar, User, Edit2, Trash2, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const daysLeft = getDaysLeft(project.endDate)
  const progress = Number(project.progress) || 0

  return (
    <div className="card p-5 hover:border-white/[0.12] hover:shadow-card-hover transition-all duration-300 group flex flex-col gap-4">
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ background: project.color || '#3B82F6' }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-text-primary font-semibold text-sm truncate">{project.name}</h3>
            <p className="text-text-muted text-xs mt-0.5 truncate">{project.description || 'Təsvir yoxdur'}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(project)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(project)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-text-muted text-xs">İrəliləyiş</span>
          <span className={cn('text-xs font-semibold', progress >= 100 ? 'text-accent-green' : 'text-text-primary')}>
            {progress}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              background: progress >= 100 ? '#10B981' : project.color || '#3B82F6',
            }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1">
          <User size={11} />
          <span className="truncate max-w-[100px]">{project.owner || '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          <span className={cn(daysLeft < 0 && project.status !== 'Tamamlandı' ? 'text-accent-red' : '')}>
            {project.endDate
              ? daysLeft < 0
                ? `${Math.abs(daysLeft)}g gecikdi`
                : `${daysLeft}g qaldı`
              : '—'}
          </span>
        </div>
      </div>

      {/* Footer: budget + View Tasks */}
      <div className="flex items-center gap-2">
        {project.budget && (
          <span className="text-xs text-text-muted">
            ₼{Number(project.budget).toLocaleString()}
          </span>
        )}
        <Link
          href={`/projects/${project.id}`}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all text-accent-blue hover:bg-accent-blue/10 border border-accent-blue/20"
        >
          <CheckSquare size={12} />
          Tapşırıqlar
        </Link>
      </div>
    </div>
  )
}
