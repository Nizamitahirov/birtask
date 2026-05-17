'use client'

import { Project } from '@/lib/types'
import { formatDate, getDaysLeft } from '@/lib/utils'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'

const VIBRANT_PALETTES: [string, string][] = [
  ['#5B5BF5', '#B57BFF'],
  ['#FF8B7B', '#FFD466'],
  ['#16C098', '#67E8C5'],
  ['#4DABF7', '#A78BFA'],
  ['#E879C8', '#FF8FB1'],
  ['#F5A524', '#FF8B7B'],
  ['#7C5BF7', '#E879C8'],
  ['#16C098', '#5B5BF5'],
]

function paletteIndexFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 8
}

function avatarPaletteFor(seed: string): [string, string] {
  return VIBRANT_PALETTES[(paletteIndexFor(seed) + 3) % 8]
}

interface ProjectCardProps {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const daysLeft = getDaysLeft(project.endDate)
  const progress = Number(project.progress) || 0
  const [c1, c2] = avatarPaletteFor(project.id)

  const STATUS_COLORS: Record<string, string> = {
    'Davam edir':     'indigo',
    'Tamamlandı':     'green',
    'Yoxlanılır':     'info',
    'Planlaşdırılır': 'muted',
    'Gözləyir':       'warn',
    'Dayandırıldı':   'accent',
  }
  const statusColor = STATUS_COLORS[project.status] || 'muted'

  return (
    <div className="cardM" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'transform .12s, box-shadow .12s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = ''
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
    }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14,
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            {project.name.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description || 'Təsvir yoxdur'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(project)}
            className="icon-btn"
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--surface-2)' }}
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onDelete(project)}
            className="icon-btn"
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span className={`pill ${statusColor}`}>
          <span className="dot" />
          {project.status}
        </span>
        {project.priority && (
          <span className={`pill ${project.priority === 'Yüksək' ? 'accent' : project.priority === 'Orta' ? 'warn' : 'muted'}`}>
            {project.priority}
          </span>
        )}
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>İrəliləyiş</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: progress >= 100 ? 'var(--success)' : 'var(--ink)' }}>
            {progress}%
          </span>
        </div>
        <div className="progressM">
          <div
            className="progressM-fill"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'var(--success)'
                : `linear-gradient(90deg, ${c1}, ${c2})`,
            }}
          />
        </div>
      </div>

      {/* Meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        color: 'var(--muted)',
        paddingTop: 8,
        borderTop: '1px solid var(--border-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>person</span>
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.owner || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>calendar_today</span>
          <span style={{ color: daysLeft < 0 && project.status !== 'Tamamlandı' ? 'var(--accent)' : 'inherit' }}>
            {project.endDate
              ? daysLeft < 0
                ? `${Math.abs(daysLeft)}g gecikdi`
                : `${daysLeft}g qaldı`
              : '—'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {project.budget && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            ₼{Number(project.budget).toLocaleString()}
          </span>
        )}
        <Link
          href={`/projects/${project.id}`}
          className="btn-primaryM"
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            fontSize: 12,
            boxShadow: 'none',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>check_box</span>
          Tapşırıqlar
        </Link>
      </div>
    </div>
  )
}
