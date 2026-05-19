'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useProjects, useTeam, useTasks, useTeamNames } from '@/hooks/useSheets'
import { Project } from '@/lib/types'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import {
  paletteFor,
  avatarPaletteFor,
  initialsM,
  fmtDateM,
  STATUS_COLORS,
} from '@/lib/design-utils'
import Link from 'next/link'

/* ── helpers ─────────────────────────────────────────────── */

function priorityColor(priority: string): string {
  if (priority === 'Kritik') return 'accent'
  if (priority === 'Yüksək') return 'warn'
  if (priority === 'Orta') return 'info'
  return 'muted'
}

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

/* ── Overview tile ───────────────────────────────────────── */

interface OverviewTileProps {
  label: string
  value: React.ReactNode
  sub: string
  icon: string
  color: 'indigo' | 'info' | 'warn' | 'green' | 'accent'
  pct?: number
  mono?: boolean
}

function OverviewTile({ label, value, sub, icon, color, pct }: OverviewTileProps) {
  const colorVar =
    color === 'indigo' ? 'var(--primary)' :
    color === 'info'   ? 'var(--info)'    :
    color === 'warn'   ? 'var(--warn)'    :
    color === 'green'  ? 'var(--success)' :
                         'var(--accent)'
  const softVar =
    color === 'indigo' ? 'var(--primary-soft)' :
    color === 'info'   ? 'var(--info-soft)'    :
    color === 'warn'   ? 'var(--warn-soft)'    :
    color === 'green'  ? 'var(--success-soft)' :
                         'var(--accent-soft)'
  return (
    <div className="cardM proj-tile">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: softVar, color: colorVar,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={16} />
        </div>
        {pct !== undefined && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{pct}%</span>
        )}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 8 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6, fontWeight: 500 }}>{sub}</div>
      {pct !== undefined && (
        <div className="progressM" style={{ marginTop: 10 }}>
          <div className="progressM-fill" style={{ width: pct + '%', background: colorVar }} />
        </div>
      )}
    </div>
  )
}

/* ── Grid view ───────────────────────────────────────────── */

interface ProjectCardProps {
  p: Project & { totalTasks: number; completedTasks: number; budgetNum: number }
  animate: boolean
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}

function ProjectCard({ p, animate, onEdit, onDelete }: ProjectCardProps) {
  const [pc1, pc2] = paletteFor(p.id)
  const [ac1, ac2] = avatarPaletteFor(p.id)
  const days = daysLeft(p.endDate)
  const late = days < 0 && p.status !== 'Tamamlandı'
  const dim = p.status === 'Dayandırıldı'
  const pc = priorityColor(p.priority)
  const progress = Number(p.progress) || 0

  return (
    <div className="proj-card" style={{ opacity: dim ? 0.7 : 1 }}>
      {/* Cover */}
      <div className="proj-cover" style={{ background: `linear-gradient(135deg, ${pc1}, ${pc2})` }}>
        <div className="proj-cover-meta">
          <span className={`pill ${pc}`}>
            <Icon name="bolt" size={11} />
            {p.priority}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="icon-btn proj-more"
              onClick={() => onEdit(p)}
              title="Düzəlt"
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              className="icon-btn proj-more"
              onClick={() => onDelete(p)}
              title="Sil"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <Icon name="delete_outline" size={13} />
            </button>
          </div>
        </div>
        <div
          className="proj-avatar"
          style={{ background: `linear-gradient(135deg, ${ac1}, ${ac2})` }}
        >
          {p.name.substring(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Body */}
      <div className="proj-body">
        <div className="proj-titlebar">
          <div className="proj-title">{p.name}</div>
          <span className={`pill ${STATUS_COLORS[p.status] || 'muted'}`}>
            <span className="dot" />
            {p.status}
          </span>
        </div>
        <div className="proj-desc">{p.description}</div>

        <div className="proj-progress-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              İrəliləyiş
            </span>
            <span style={{ fontWeight: 800, color: progress >= 100 ? 'var(--success)' : 'var(--ink)' }}>
              {p.completedTasks}/{p.totalTasks} · {progress}%
            </span>
          </div>
          <div className="progressM">
            <div
              className="progressM-fill"
              style={{
                width: animate ? progress + '%' : '0%',
                background: progress >= 100 ? 'var(--success)' : `linear-gradient(90deg, ${ac1}, ${ac2})`,
              }}
            />
          </div>
        </div>

        <div className="proj-meta-row">
          <div className="proj-meta-item">
            <Icon name="schedule" size={13} />
            <span style={{ color: late ? 'var(--accent)' : 'var(--ink-2)', fontWeight: late ? 700 : 600 }}>
              {late ? Math.abs(days) + 'g gecikdi' : days + 'g qaldı'}
            </span>
          </div>
          <div className="proj-meta-item">
            <Icon name="payments" size={13} />
            <span>₼{(p.budgetNum / 1000).toFixed(1)}K</span>
          </div>
          <div className="proj-meta-item" title={p.owner}>
            <Icon name="person" size={13} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.owner || '—'}
            </span>
          </div>
        </div>

        <div className="proj-actions">
          <Link
            href={`/projects/${p.id}`}
            className="btn-ghostM"
            style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12 }}
          >
            <Icon name="folder_open" size={13} /> Aç
          </Link>
          <Link
            href={`/projects/${p.id}`}
            className="btn-primaryM"
            style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12 }}
          >
            <Icon name="check_box" size={13} /> Tapşırıqlar
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── List/Table view ─────────────────────────────────────── */

interface ProjectsTableProps {
  items: Array<Project & { totalTasks: number; completedTasks: number; budgetNum: number }>
  animate: boolean
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}

function ProjectsTable({ items, animate, onEdit, onDelete }: ProjectsTableProps) {
  return (
    <div className="proj-table cardM" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="proj-thead">
        <span>Layihə</span>
        <span>Status</span>
        <span>Prioritet</span>
        <span>Məsul</span>
        <span>Son tarix</span>
        <span>İrəliləyiş</span>
        <span />
      </div>
      {items.map(p => {
        const [ac1, ac2] = avatarPaletteFor(p.id)
        const days = daysLeft(p.endDate)
        const late = days < 0 && p.status !== 'Tamamlandı'
        const pc = priorityColor(p.priority)
        const progress = Number(p.progress) || 0
        return (
          <div key={p.id} className="proj-trow">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
                color: 'white', fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {p.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.description}
                </div>
              </div>
            </div>

            <span className={`pill ${STATUS_COLORS[p.status] || 'muted'}`}>
              <span className="dot" />{p.status}
            </span>

            <span className={`pill ${pc}`}>{p.priority}</span>

            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.owner || '—'}
            </span>

            <span style={{ fontSize: 12, color: late ? 'var(--accent)' : 'var(--ink-2)', fontWeight: late ? 700 : 600 }}>
              {fmtDateM(p.endDate)}
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginTop: 2 }}>
                {late ? Math.abs(days) + 'g gecikdi' : days + 'g qaldı'}
              </div>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div className="progressM" style={{ flex: 1, minWidth: 60 }}>
                <div
                  className="progressM-fill"
                  style={{
                    width: animate ? progress + '%' : '0%',
                    background: progress >= 100 ? 'var(--success)' : `linear-gradient(90deg, ${ac1}, ${ac2})`,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>
                {progress}%
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <Link href={`/projects/${p.id}`} className="icon-btn" style={{ width: 30, height: 30 }} title="Aç">
                <Icon name="folder_open" size={13} />
              </Link>
              <button
                className="icon-btn"
                style={{ width: 30, height: 30 }}
                title="Düzəlt"
                onClick={() => onEdit(p)}
              >
                <Icon name="edit" size={13} />
              </button>
              <button
                className="icon-btn"
                style={{ width: 30, height: 30, color: 'var(--accent)' }}
                title="Sil"
                onClick={() => onDelete(p)}
              >
                <Icon name="delete_outline" size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Kanban view ─────────────────────────────────────────── */

interface KanbanCardProps {
  p: Project & { totalTasks: number; completedTasks: number }
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}

function KanbanCard({ p, onEdit, onDelete }: KanbanCardProps) {
  const [ac1, ac2] = avatarPaletteFor(p.id)
  const days = daysLeft(p.endDate)
  const late = days < 0 && p.status !== 'Tamamlandı'
  const pc = priorityColor(p.priority)
  const progress = Number(p.progress) || 0

  return (
    <div className="proj-kcard">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
          color: 'white', fontWeight: 800, fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {p.name.substring(0, 2).toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span className={`pill ${pc}`} style={{ fontSize: 10, padding: '2px 7px' }}>{p.priority}</span>
          <button
            className="icon-btn"
            style={{ width: 22, height: 22, border: 0 }}
            title="Düzəlt"
            onClick={() => onEdit(p)}
          >
            <Icon name="edit" size={11} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{p.name}</div>
      <div style={{
        fontSize: 11, color: 'var(--muted)', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      } as React.CSSProperties}>
        {p.description}
      </div>

      <div className="progressM" style={{ height: 4 }}>
        <div
          className="progressM-fill"
          style={{
            width: progress + '%',
            background: progress >= 100 ? 'var(--success)' : `linear-gradient(90deg, ${ac1}, ${ac2})`,
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Icon name="check_box" size={11} />
          {p.completedTasks}/{p.totalTasks}
        </span>
        <span style={{ color: late ? 'var(--accent)' : 'var(--muted)', fontWeight: late ? 700 : 600 }}>
          {late ? Math.abs(days) + 'g gecikdi' : days + 'g qaldı'}
        </span>
      </div>

      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>
        <Icon name="person" size={10} /> {p.owner || '—'}
      </div>
    </div>
  )
}

interface ProjectsKanbanProps {
  projects: Array<Project & { totalTasks: number; completedTasks: number }>
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
  onNew: () => void
}

function ProjectsKanban({ projects, onEdit, onDelete, onNew }: ProjectsKanbanProps) {
  const COLUMNS: Array<Project['status']> = [
    'Planlaşdırılır', 'Davam edir', 'Tamamlandı', 'Dayandırıldı',
  ]
  return (
    <div className="proj-kanban">
      {COLUMNS.map(col => {
        const items = projects.filter(p => p.status === col)
        return (
          <div key={col} className="proj-kcol">
            <div className="proj-kcol-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`pill ${STATUS_COLORS[col] || 'muted'}`}><span className="dot" /></span>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{col}</span>
                <span style={{
                  fontSize: 11, color: 'var(--muted)', fontWeight: 700,
                  background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 999,
                }}>
                  {items.length}
                </span>
              </div>
              <button className="icon-btn" style={{ width: 26, height: 26, border: 0 }} onClick={onNew} title="Yeni layihə">
                <Icon name="add" size={14} />
              </button>
            </div>
            <div className="proj-kcol-body">
              {items.map(p => (
                <KanbanCard key={p.id} p={p} onEdit={onEdit} onDelete={onDelete} />
              ))}
              {items.length === 0 && (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--muted-2)',
                  fontSize: 11,
                  border: '1px dashed var(--border)',
                  borderRadius: 10,
                  fontWeight: 600,
                }}>
                  boş
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function ProjectsPage() {
  const { projects, loading, create, update, remove } = useProjects()
  const { tasks } = useTasks()
  const teamNames = useTeamNames()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sortKey, setSortKey] = useState('updated')
  const [view, setView] = useState<'grid' | 'list' | 'kanban'>('grid')
  const [animate, setAnimate] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 60)
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => { clearTimeout(t); window.removeEventListener('keydown', h) }
  }, [])

  // Compute task counts per project
  const taskCountMap = useMemo(() => {
    const total: Record<string, number> = {}
    const done: Record<string, number> = {}
    tasks.forEach(t => {
      total[t.projectId] = (total[t.projectId] || 0) + 1
      if ((t as any).status === 'Tamamlandı' || (t as any).completed) {
        done[t.projectId] = (done[t.projectId] || 0) + 1
      }
    })
    return { total, done }
  }, [tasks])

  // Augment projects with computed fields
  const augmented = useMemo(() => {
    return projects.map(p => ({
      ...p,
      totalTasks: taskCountMap.total[p.id] || 0,
      completedTasks: taskCountMap.done[p.id] || 0,
      budgetNum: parseInt(String(p.budget).replace(/[^\d]/g, '')) || 0,
    }))
  }, [projects, taskCountMap])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: augmented.length }
    for (const p of augmented) c[p.status] = (c[p.status] || 0) + 1
    return c
  }, [augmented])

  const filtered = useMemo(() => {
    let list = augmented.filter(p => {
      if (status !== 'all' && p.status !== status) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.owner.toLowerCase().includes(q)
        )
      }
      return true
    })
    const cmp: Record<string, (a: typeof list[0], b: typeof list[0]) => number> = {
      updated:  (a, b) => b.id.localeCompare(a.id),
      name:     (a, b) => a.name.localeCompare(b.name, 'az'),
      progress: (a, b) => Number(b.progress) - Number(a.progress),
      deadline: (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
    }
    return [...list].sort(cmp[sortKey] || cmp.updated)
  }, [augmented, query, status, sortKey])

  const totals = useMemo(() => {
    const total = augmented.length
    const active = augmented.filter(p => p.status === 'Davam edir').length
    const done = augmented.filter(p => p.status === 'Tamamlandı').length
    const taskCount = augmented.reduce((s, p) => s + p.totalTasks, 0)
    const compl = augmented.reduce((s, p) => s + p.completedTasks, 0)
    const budget = augmented.reduce((s, p) => s + p.budgetNum, 0)
    const overdue = augmented.filter(p => {
      const d = (new Date(p.endDate).getTime() - Date.now()) / 86400000
      return d < 0 && p.status !== 'Tamamlandı'
    }).length
    return { total, active, done, taskCount, compl, budget, overdue }
  }, [augmented])

  /* CRUD handlers */
  const handleCreate = async (data: Omit<Project, 'id' | 'createdAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<Project, 'id' | 'createdAt'>) => {
    if (!selected) return
    setSaving(true)
    await update(selected.id, data)
    setSaving(false)
    setModal(null)
    setSelected(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    await remove(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
  }

  const openEdit = (p: Project) => { setSelected(p); setModal('edit') }
  const openDelete = (p: Project) => setConfirmDelete(p)

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="team-headM">
        <div>
          <h1>
            Layihələr <span className="cnt">{augmented.length}</span>
          </h1>
          <div className="sub">
            {totals.active} aktiv · {totals.done} tamamlandı
            {totals.overdue > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{totals.overdue} gecikmiş</span></>
            )}
          </div>
        </div>
        <div className="actions">
          <button className="btn-ghostM">
            <Icon name="file_download" size={14} /> İxrac
          </button>
          <button className="btn-ghostM">
            <Icon name="filter_list" size={14} /> Süzgəc
          </button>
          <button className="btn-primaryM" onClick={() => setModal('create')}>
            <Icon name="add" size={14} /> Yeni Layihə
          </button>
        </div>
      </div>

      {/* Overview tiles */}
      <div className="proj-overview">
        <OverviewTile
          label="Ümumi tapşırıq"
          value={totals.taskCount}
          sub={totals.compl + ' tamamlandı'}
          icon="check_circle"
          color="indigo"
          pct={totals.taskCount > 0 ? Math.round((totals.compl / totals.taskCount) * 100) : 0}
        />
        <OverviewTile
          label="Aktiv layihə"
          value={totals.active}
          sub="işdə"
          icon="folder_open"
          color="info"
        />
        <OverviewTile
          label="Tamamlandı"
          value={totals.done}
          sub="bitmiş layihə"
          icon="task_alt"
          color="green"
        />
        <OverviewTile
          label="Büdcə"
          value={'₼' + (totals.budget / 1000).toFixed(0) + 'K'}
          sub="ümumi ayrılmış"
          icon="payments"
          color="warn"
          mono
        />
      </div>

      {/* Toolbar */}
      <div className="proj-toolbar">
        <div className="searchM" style={{ minWidth: 280, maxWidth: 420 }}>
          <span className="ico"><Icon name="search" size={16} /></span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ad, təsvir üzrə axtar..."
          />
          <span className="kbd">⌘ K</span>
        </div>

        <div className="team-chips">
          {[
            { id: 'all',            label: 'Hamısı',         count: counts.all || 0 },
            { id: 'Davam edir',     label: 'Davam edir',     count: counts['Davam edir'] || 0 },
            { id: 'Planlaşdırılır', label: 'Planlaşdırılır', count: counts['Planlaşdırılır'] || 0 },
            { id: 'Tamamlandı',     label: 'Tamamlandı',     count: counts['Tamamlandı'] || 0 },
            { id: 'Dayandırıldı',   label: 'Dayandırıldı',   count: counts['Dayandırıldı'] || 0 },
          ].map(c => (
            <button
              key={c.id}
              className={status === c.id ? 'on' : ''}
              onClick={() => setStatus(c.id)}
            >
              {c.label}<span className="cnt">{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="btn-ghostM"
            style={{ padding: '8px 12px', cursor: 'pointer' }}
          >
            <option value="updated">Yenilənmə</option>
            <option value="name">Ad ↓</option>
            <option value="progress">İrəliləyiş</option>
            <option value="deadline">Son tarix</option>
          </select>

          <div style={{
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}>
            {([
              { id: 'grid',   icon: 'space_dashboard', title: 'Şəbəkə' },
              { id: 'list',   icon: 'sort',            title: 'Cədvəl' },
              { id: 'kanban', icon: 'view_kanban',     title: 'Kanban' },
            ] as const).map(v => (
              <button
                key={v.id}
                className="icon-btn"
                onClick={() => setView(v.id)}
                title={v.title}
                style={{
                  width: 30, height: 30, border: 0, borderRadius: 8,
                  background: view === v.id ? 'var(--primary)' : 'transparent',
                  color: view === v.id ? 'white' : 'var(--muted)',
                }}
              >
                <Icon name={v.icon} size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="hourglass_empty" size={32} />
          <div style={{ marginTop: 12, fontWeight: 600 }}>Yüklənir...</div>
        </div>
      )}

      {/* Content */}
      {!loading && view === 'grid' && (
        <div className="proj-grid">
          {filtered.map(p => (
            <ProjectCard key={p.id} p={p} animate={animate} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      {!loading && view === 'list' && (
        <ProjectsTable items={filtered} animate={animate} onEdit={openEdit} onDelete={openDelete} />
      )}

      {!loading && view === 'kanban' && (
        <ProjectsKanban
          projects={filtered}
          onEdit={openEdit}
          onDelete={openDelete}
          onNew={() => setModal('create')}
        />
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && view !== 'kanban' && (
        <div style={{
          padding: 80,
          textAlign: 'center',
          color: 'var(--muted)',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px dashed var(--border)',
        }}>
          <Icon name="folder" size={36} />
          <div style={{ marginTop: 12, fontWeight: 700 }}>Layihə tapılmadı</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Süzgəci dəyişdirin və ya yeni layihə yaradın.</div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Layihə" size="lg">
        <ProjectForm
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={modal === 'edit'}
        onClose={() => { setModal(null); setSelected(null) }}
        title="Layihəni Düzəlt"
        size="lg"
      >
        {selected && (
          <ProjectForm
            initial={selected}
            teamNames={teamNames}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setSelected(null) }}
            loading={saving}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Layihəni sil"
        message={`"${confirmDelete?.name}" layihəsini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        loading={deleting}
      />
    </div>
  )
}
