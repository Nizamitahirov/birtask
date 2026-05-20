'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useTasks, useProjects, useTeam } from '@/hooks/useSheets'
import { Task } from '@/lib/types'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import {
  avatarPaletteFor,
  paletteFor,
  initialsM,
  fmtDateM,
  daysFromNow,
} from '@/lib/design-utils'

/* ─── Constants ─────────────────────────────────────────────── */

const TASK_STATUSES = ['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı'] as const
type TaskStatus = typeof TASK_STATUSES[number]

const TASK_PRIORITIES = ['Kritik', 'Yüksək', 'Orta', 'Aşağı'] as const

const STATUS_DOT: Record<string, string> = {
  'Gözləyir':   'var(--muted-2)',
  'Davam edir': 'var(--primary)',
  'Yoxlanılır': 'var(--warn)',
  'Tamamlandı': 'var(--success)',
}

const STATUS_LABEL: Record<string, string> = {
  'Gözləyir':   'muted',
  'Davam edir': 'indigo',
  'Yoxlanılır': 'warn',
  'Tamamlandı': 'green',
}

const PRIORITY_COLOR: Record<string, string> = {
  'Kritik': 'var(--accent)',
  'Yüksək': 'var(--warn)',
  'Orta':   'var(--info)',
  'Aşağı':  'var(--muted-2)',
}

/* ─── Main page ─────────────────────────────────────────────── */

export default function TasksPage() {
  const { tasks, loading, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()

  const [query,         setQuery]         = useState('')
  const [projectId,     setProjectId]     = useState('all')
  const [assignee,      setAssignee]      = useState('all')
  const [priority,      setPriority]      = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [view,          setView]          = useState<'kanban' | 'list'>('kanban')

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null)
  const [modal,        setModal]        = useState<'create' | 'edit' | null>(null)
  const [editTask,     setEditTask]     = useState<Task | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<Task | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') setDrawerTaskId(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p])),
    [projects]
  )

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (projectId    !== 'all' && t.projectId !== projectId)   return false
      if (assignee     !== 'all' && t.assignee  !== assignee)    return false
      if (priority     !== 'all' && t.priority  !== priority)    return false
      if (statusFilter !== 'all' && t.status    !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        const proj = projectsById[t.projectId]
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.tags || '').toLowerCase().includes(q) ||
          (proj && proj.name.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [tasks, query, projectId, assignee, priority, statusFilter, projectsById])

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = Object.fromEntries(TASK_STATUSES.map(s => [s, 0]))
    let overdue = 0
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      if (t.status !== 'Tamamlandı' && t.dueDate && daysFromNow(t.dueDate) < 0) overdue++
    }
    return { total: tasks.length, byStatus, overdue }
  }, [tasks])

  const assigneeOptions = useMemo(
    () => Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))),
    [tasks]
  )

  const teamNames = useMemo(() => members.map(m => m.name), [members])

  const hasFilters = query || projectId !== 'all' || assignee !== 'all' || priority !== 'all' || statusFilter !== 'all'
  const resetFilters = () => {
    setQuery(''); setProjectId('all'); setAssignee('all'); setPriority('all'); setStatusFilter('all')
  }

  /* Handlers */
  const handleCreate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editTask) return
    setSaving(true)
    await update(editTask.id, data)
    setSaving(false)
    setModal(null)
    setEditTask(null)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    await remove(confirmDel.id)
    setDeleting(false)
    setConfirmDel(null)
    setDrawerTaskId(null)
  }

  const openEdit   = (task: Task) => { setEditTask(task); setModal('edit') }
  const openDelete = (task: Task) => { setConfirmDel(task) }

  const handleComplete = async (task: Task) => {
    const newStatus = task.status === 'Tamamlandı' ? 'Gözləyir' : 'Tamamlandı'
    await update(task.id, { status: newStatus })
  }

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="team-headM">
        <div>
          <h1>Tapşırıqlar <span className="cnt">{tasks.length}</span></h1>
          <div className="sub">
            {stats.byStatus['Davam edir'] || 0} davam edir
            {' · '}{stats.byStatus['Tamamlandı'] || 0} tamamlandı
            {stats.overdue > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{stats.overdue} gecikmiş</span></>
            )}
          </div>
        </div>
        <button className="btn-primaryM" onClick={() => setModal('create')}>
          <Icon name="add_task" size={14} /> Yeni Tapşırıq
        </button>
      </div>

      {/* Toolbar */}
      <div className="task-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="searchM" style={{ flex: 1, minWidth: 220, maxWidth: 340 }}>
          <span className="ico"><Icon name="search" size={16} /></span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tapşırıq axtar... (⌘K)"
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: 'var(--muted)' }}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>

        <select className="task-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Bütün statuslar</option>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="task-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="all">Bütün layihələr</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="task-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
          <option value="all">Bütün icraçılar</option>
          {assigneeOptions.map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        <select className="task-select" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="all">Bütün prioritetlər</option>
          {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {([
            { v: 'kanban', ico: 'view_kanban', title: 'Kanban' },
            { v: 'list',   ico: 'list',        title: 'Cədvəl' },
          ] as const).map(b => (
            <button
              key={b.v}
              title={b.title}
              onClick={() => setView(b.v)}
              style={{
                width: 30, height: 30, border: 0, borderRadius: 8,
                background: view === b.v ? 'var(--primary)' : 'transparent',
                color: view === b.v ? 'white' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .1s',
              }}
            >
              <Icon name={b.ico} size={14} />
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            style={{
              fontSize: 11, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
              padding: '5px 10px', display: 'inline-flex', gap: 4, alignItems: 'center',
              background: 'none', border: '1px solid var(--accent)', borderRadius: 8,
            }}
          >
            <Icon name="filter_list_off" size={13} /> Sıfırla
          </button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Yüklənir...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center', color: 'var(--muted)',
          background: 'var(--surface)', borderRadius: 16, border: '1px dashed var(--border)',
        }}>
          <Icon name="check_box" size={36} />
          <div style={{ marginTop: 12, fontWeight: 700 }}>Tapşırıq tapılmadı</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Süzgəcləri yumşaldın və ya yeni tapşırıq yaradın.</div>
        </div>
      ) : (
        <>
          {view === 'kanban' && <TaskKanban items={filtered} onOpen={setDrawerTaskId} onComplete={handleComplete} />}
          {view === 'list'   && <TaskList   items={filtered} onOpen={setDrawerTaskId} projects={projects} onComplete={handleComplete} />}
        </>
      )}

      {/* Detail drawer */}
      {drawerTaskId && (
        <TaskDrawer
          taskId={drawerTaskId}
          tasks={tasks}
          projects={projects}
          members={members}
          onClose={() => setDrawerTaskId(null)}
          onEdit={t => { setDrawerTaskId(null); openEdit(t) }}
          onDelete={t => { openDelete(t) }}
          onComplete={handleComplete}
          update={update}
        />
      )}

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Tapşırıq">
        <TaskForm
          projects={projects}
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setEditTask(null) }} title="Tapşırığı Düzəlt">
        {editTask && (
          <TaskForm
            initial={editTask}
            projects={projects}
            teamNames={teamNames}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setEditTask(null) }}
            loading={saving}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Tapşırığı sil"
        message={`"${confirmDel?.title}" tapşırığını silmək istədiyinizə əminsiniz?`}
        loading={deleting}
      />
    </div>
  )
}

/* ─── Kanban ─────────────────────────────────────────────────── */

function TaskKanban({ items, onOpen, onComplete }: {
  items: Task[]
  onOpen: (id: string) => void
  onComplete: (t: Task) => void
}) {
  return (
    <div className="task-kanban">
      {TASK_STATUSES.map(status => {
        const col = items.filter(t => t.status === status)
        const dot = STATUS_DOT[status]
        return (
          <div key={status} className="task-kcol">
            <div className="task-kcol-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}></span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{status}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'var(--surface-2)', padding: '1px 8px', borderRadius: 999 }}>{col.length}</span>
              </div>
            </div>
            <div className="task-kcol-body">
              {col.map(t => (
                <KanbanCard key={t.id} task={t} onOpen={onOpen} onComplete={onComplete} />
              ))}
              {col.length === 0 && (
                <div style={{
                  padding: '18px 12px', textAlign: 'center', color: 'var(--muted-2)',
                  fontSize: 11, border: '1px dashed var(--border)', borderRadius: 10,
                }}>boş</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ task, onOpen, onComplete }: { task: Task; onOpen: (id: string) => void; onComplete: (t: Task) => void }) {
  const [a1, a2] = avatarPaletteFor(task.assignee || '')
  const dl   = task.dueDate ? daysFromNow(task.dueDate) : 0
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const priColor = PRIORITY_COLOR[task.priority] || 'var(--muted-2)'
  const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div
      className="task-kcard"
      onClick={() => onOpen(task.id)}
      style={{ opacity: done ? 0.6 : 1 }}
    >
      {/* Priority left strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: priColor, borderRadius: '12px 0 0 12px' }}></div>

      {/* Project name */}
      {task.projectName && (
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="folder" size={10} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{task.projectName}</span>
        </div>
      )}

      {/* Title */}
      <div style={{
        fontSize: 13, fontWeight: 700, lineHeight: 1.35,
        color: done ? 'var(--muted)' : 'var(--ink)',
        textDecoration: done ? 'line-through' : 'none',
      }}>
        {task.title}
      </div>

      {/* Description */}
      {task.description && !done && (
        <div style={{
          fontSize: 11, color: 'var(--muted)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {task.description}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--muted)', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: assignee + due */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid var(--border-2)' }}>
        {task.assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${a1}, ${a2})`,
              color: 'white', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initialsM(task.assignee)}</div>
            <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.assignee.split(' ')[0]}
            </span>
          </div>
        ) : <div />}

        {task.dueDate && (
          <div style={{
            fontSize: 10, fontWeight: late ? 700 : 500,
            color: late ? 'var(--accent)' : 'var(--muted)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Icon name="schedule" size={11} />
            {late ? Math.abs(dl) + 'g gecikdi' : dl + 'g qaldı'}
          </div>
        )}
      </div>

      {/* Complete button — only show on hover via CSS */}
      {task.status !== 'Tamamlandı' && (
        <button
          className="btn-ghostM"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '4px 8px' }}
          onClick={e => { e.stopPropagation(); onComplete(task) }}
        >
          <Icon name="check" size={12} /> Tamamla
        </button>
      )}
    </div>
  )
}

/* ─── List ──────────────────────────────────────────────────── */

function TaskList({ items, onOpen, projects, onComplete }: {
  items: Task[]
  onOpen: (id: string) => void
  projects: { id: string; name: string }[]
  onComplete: (t: Task) => void
}) {
  const projectsById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  return (
    <div className="task-list cardM" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="task-thead">
        <span></span>
        <span>Tapşırıq</span>
        <span>Layihə</span>
        <span>Status</span>
        <span>Prioritet</span>
        <span>İcraçı</span>
        <span>Son tarix</span>
      </div>
      {items.map(t => {
        const proj  = projectsById[t.projectId]
        const [a1, a2] = avatarPaletteFor(t.assignee || '')
        const dl   = t.dueDate ? daysFromNow(t.dueDate) : 0
        const late = dl < 0 && t.status !== 'Tamamlandı'
        const done = t.status === 'Tamamlandı'
        const dot  = STATUS_DOT[t.status]
        return (
          <div
            key={t.id}
            className="task-trow"
            onClick={() => onOpen(t.id)}
            style={{ borderLeftColor: PRIORITY_COLOR[t.priority] || 'transparent', opacity: done ? 0.65 : 1 }}
          >
            <button
              className="task-check"
              style={{ color: done ? 'var(--success)' : 'var(--muted-2)' }}
              onClick={e => { e.stopPropagation(); onComplete(t) }}
              title={done ? 'Geri al' : 'Tamamla'}
            >
              <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={17} />
            </button>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: done ? 'line-through' : 'none',
                color: done ? 'var(--muted)' : 'var(--ink)',
              }}>{t.title}</div>
              {t.description && (
                <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
              )}
            </div>

            <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {proj?.name || t.projectName || '—'}
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}></span>
              {t.status}
            </span>

            <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLOR[t.priority] || 'var(--muted)', whiteSpace: 'nowrap' }}>
              {t.priority}
            </span>

            {t.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${a1}, ${a2})`,
                  color: 'white', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{initialsM(t.assignee)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.assignee.split(' ')[0]}
                </span>
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}

            <span style={{ fontSize: 11, color: late ? 'var(--accent)' : 'var(--ink-2)', fontWeight: late ? 700 : 500, whiteSpace: 'nowrap' }}>
              {t.dueDate ? fmtDateM(t.dueDate) : '—'}
              {t.dueDate && (
                <div style={{ fontSize: 10, color: late ? 'var(--accent)' : 'var(--muted)', marginTop: 2 }}>
                  {late ? Math.abs(dl) + 'g gecikdi' : dl + 'g qaldı'}
                </div>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Detail drawer ──────────────────────────────────────────── */

interface DrawerProps {
  taskId: string
  tasks: Task[]
  projects: { id: string; name: string }[]
  members: { id: string; name: string }[]
  onClose: () => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onComplete: (t: Task) => void
  update: (id: string, data: Partial<Task>) => Promise<unknown>
}

function TaskDrawer({ taskId, tasks, projects, members, onClose, onEdit, onDelete, onComplete }: DrawerProps) {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return null

  const proj   = projects.find(p => p.id === task.projectId)
  const member = members.find(m => m.name === task.assignee)
  const [ac1, ac2] = avatarPaletteFor(task.assignee || '')
  const [pc1, pc2] = proj ? paletteFor(proj.id) : ['#F0F0F0', '#E8E8E8']
  const dl   = task.dueDate ? daysFromNow(task.dueDate) : 0
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  const content = (
    <div onClick={onClose} className="task-drawer-bg">
      <div onClick={e => e.stopPropagation()} className="task-drawer fade-in">
        {/* Cover gradient */}
        <div className="task-drawer-cover" style={{ background: `linear-gradient(135deg, ${pc1}, ${pc2})` }}>
          <button onClick={onClose} className="task-drawer-close">
            <Icon name="close" size={14} />
          </button>
          {(proj || task.projectName) && (
            <div className="task-drawer-projtag">
              <Icon name="folder" size={12} />
              {proj?.name || task.projectName}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="task-drawer-body">
          {/* Status + priority row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[task.status] }}></span>
              {task.status}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: PRIORITY_COLOR[task.priority] || 'var(--muted)',
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
            }}>
              {task.priority}
            </span>
            {late && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                padding: '4px 10px', borderRadius: 999,
                background: 'var(--surface-2)', border: '1px solid var(--accent)',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <Icon name="warning" size={11} />{Math.abs(dl)} gün gecikdi
              </span>
            )}
          </div>

          {/* Title */}
          <h2 style={{
            margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
            lineHeight: 1.25, textDecoration: done ? 'line-through' : 'none',
            color: done ? 'var(--muted)' : 'var(--ink)',
          }}>
            {task.title}
          </h2>

          {/* Description */}
          {task.description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
              {task.description}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6,
                  background: 'var(--surface-2)', color: 'var(--muted)', fontWeight: 600,
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Fields */}
          <div className="task-drawer-fields" style={{ marginTop: 20 }}>
            <div className="task-field">
              <span className="k"><Icon name="person" size={11} />İcraçı</span>
              {task.assignee ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{initialsM(task.assignee)}</div>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{member?.name || task.assignee}</span>
                </span>
              ) : <span style={{ color: 'var(--muted)' }}>—</span>}
            </div>

            <div className="task-field">
              <span className="k"><Icon name="schedule" size={11} />Son tarix</span>
              <span style={{ fontWeight: 700, color: late ? 'var(--accent)' : 'var(--ink)' }}>
                {task.dueDate
                  ? `${fmtDateM(task.dueDate)} · ${late ? Math.abs(dl) + 'g gecikdi' : dl + 'g qaldı'}`
                  : '—'}
              </span>
            </div>

            <div className="task-field">
              <span className="k"><Icon name="sync" size={11} />Yenilənmə</span>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{fmtDateM(task.updatedAt)}</span>
            </div>

            <div className="task-field">
              <span className="k"><Icon name="tag" size={11} />ID</span>
              <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 11, fontFamily: 'monospace' }}>{task.id}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
              onClick={() => onEdit(task)}
            >
              <Icon name="edit" size={13} /> Düzəlt
            </button>
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', fontSize: 12, color: 'var(--accent)' }}
              onClick={() => onDelete(task)}
            >
              <Icon name="delete" size={13} /> Sil
            </button>
            <button
              className={done ? 'btn-ghostM' : 'btn-primaryM'}
              style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
              onClick={() => onComplete(task)}
            >
              <Icon name={done ? 'autorenew' : 'check_circle'} size={13} />
              {done ? 'Geri al' : 'Tamamla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return ReactDOM.createPortal(content, document.body)
}
