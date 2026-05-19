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

const TASK_STATUS_PILL: Record<string, string> = {
  'Gözləyir':   'muted',
  'Davam edir': 'indigo',
  'Yoxlanılır': 'warn',
  'Tamamlandı': 'green',
}

const TASK_PRIORITY_PILL: Record<string, string> = {
  'Kritik': 'accent',
  'Yüksək': 'warn',
  'Orta':   'info',
  'Aşağı':  'muted',
}

const PRIORITY_BAR_COLOR: Record<string, string> = {
  'Kritik': 'var(--accent)',
  'Yüksək': 'var(--warn)',
  'Orta':   'var(--info)',
  'Aşağı':  'var(--muted-2)',
}

function statusColorVar(pill: string): string {
  if (pill === 'green')  return 'var(--success)'
  if (pill === 'indigo') return 'var(--primary)'
  if (pill === 'warn')   return 'var(--warn)'
  return 'var(--muted)'
}

function statusSoftVar(pill: string): string {
  if (pill === 'green')  return 'var(--success-soft)'
  if (pill === 'indigo') return 'var(--primary-soft)'
  if (pill === 'warn')   return 'var(--warn-soft)'
  return 'var(--surface-2)'
}

const MONTH_AZ = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
const DAY_AZ   = ['B.e','Ç.a','Ç','C.a','C','Ş','B']

/* ─── Main page ─────────────────────────────────────────────── */

export default function TasksPage() {
  const { tasks, loading, refresh, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()

  const [query,         setQuery]         = useState('')
  const [projectId,     setProjectId]     = useState('all')
  const [assignee,      setAssignee]      = useState('all')
  const [priority,      setPriority]      = useState('all')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [view,          setView]          = useState<'kanban'|'list'|'grid'|'calendar'>('kanban')

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null)
  const [modal,        setModal]        = useState<'create'|'edit'|null>(null)
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

  /* Derived */
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p])),
    [projects]
  )

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (projectId !== 'all' && t.projectId !== projectId) return false
      if (assignee  !== 'all' && t.assignee  !== assignee)  return false
      if (priority  !== 'all' && t.priority  !== priority)  return false
      if (statusFilters.length && !statusFilters.includes(t.status)) return false
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
  }, [tasks, query, projectId, assignee, priority, statusFilters, projectsById])

  const stats = useMemo(() => {
    const total = tasks.length
    const byStatus: Record<string, number> = Object.fromEntries(TASK_STATUSES.map(s => [s, 0]))
    let overdue = 0
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      if (t.status !== 'Tamamlandı' && t.dueDate && daysFromNow(t.dueDate) < 0) overdue++
    }
    return { total, byStatus, overdue }
  }, [tasks])

  const assigneeOptions = useMemo(
    () => Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))),
    [tasks]
  )

  const teamNames = useMemo(() => members.map(m => m.name), [members])

  const toggleStatus = (s: string) =>
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const hasFilters = query || projectId !== 'all' || assignee !== 'all' || priority !== 'all' || statusFilters.length
  const resetFilters = () => {
    setQuery(''); setProjectId('all'); setAssignee('all'); setPriority('all'); setStatusFilters([])
  }

  /* Handlers */
  const handleCreate = async (data: Omit<Task, 'id'|'createdAt'|'updatedAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<Task, 'id'|'createdAt'|'updatedAt'>) => {
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

  const openEdit = (task: Task) => {
    setEditTask(task)
    setModal('edit')
  }

  const openDelete = (task: Task) => {
    setConfirmDel(task)
  }

  const handleComplete = async (task: Task) => {
    const newStatus = task.status === 'Tamamlandı' ? 'Gözləyir' : 'Tamamlandı'
    await update(task.id, { status: newStatus })
  }

  return (
    <div className="pageM fade-in">
      {/* ── Header ── */}
      <div className="team-headM">
        <div>
          <h1>Tapşırıqlar <span className="cnt">{tasks.length}</span></h1>
          <div className="sub">
            {stats.byStatus['Davam edir'] || 0} davam edir
            {' · '}{stats.byStatus['Yoxlanılır'] || 0} yoxlanılır
            {' · '}{stats.byStatus['Tamamlandı'] || 0} tamamlandı
            {stats.overdue > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{stats.overdue} gecikmiş</span></>
            )}
          </div>
        </div>
        <div className="actions">
          <button className="btn-ghostM" onClick={resetFilters}>
            <Icon name="filter_list" size={14} /> Süzgəc
          </button>
          <button className="btn-primaryM" onClick={() => setModal('create')}>
            <Icon name="add_task" size={14} /> Yeni Tapşırıq
          </button>
        </div>
      </div>

      {/* ── Status tiles ── */}
      <div className="task-tiles">
        {TASK_STATUSES.map(s => {
          const n = stats.byStatus[s] || 0
          const pct = stats.total ? Math.round((n / stats.total) * 100) : 0
          const pill = TASK_STATUS_PILL[s]
          const colorVar = statusColorVar(pill)
          const softVar  = statusSoftVar(pill)
          return (
            <div
              key={s}
              className="task-tile"
              onClick={() => toggleStatus(s)}
              style={{ borderColor: statusFilters.includes(s) ? colorVar : 'var(--border)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorVar }}></span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 8 }}>{n}</div>
              <div className="progressM" style={{ marginTop: 10, background: softVar }}>
                <div className="progressM-fill" style={{ width: pct + '%', background: colorVar }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 6, fontWeight: 600 }}>
                <span>{pct}%</span>
                <span>{stats.total} ümumi</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="task-toolbar">
        <div className="searchM" style={{ flex: 1, maxWidth: 360 }}>
          <span className="ico"><Icon name="search" size={16} /></span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tapşırıq, etiket, layihə üzrə axtar..."
          />
          <span className="kbd">⌘ K</span>
        </div>

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

        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2, marginLeft: 'auto' }}>
          {([
            { v: 'kanban',   ico: 'folder_open',     title: 'Kanban' },
            { v: 'list',     ico: 'sort',             title: 'Cədvəl' },
            { v: 'grid',     ico: 'space_dashboard',  title: 'Şəbəkə' },
            { v: 'calendar', ico: 'calendar_month',   title: 'Təqvim' },
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
                cursor: 'pointer',
              }}
            >
              <Icon name={b.ico} size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Status quick-filter chips ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status:</span>
        {TASK_STATUSES.map(s => {
          const pill = TASK_STATUS_PILL[s]
          const colorVar = statusColorVar(pill)
          const on = statusFilters.includes(s)
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                border: '1px solid ' + (on ? colorVar : 'var(--border)'),
                background: on ? colorVar : 'var(--surface)',
                color: on ? 'white' : 'var(--ink-2)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all .1s',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'white' : colorVar }}></span>
              {s}
            </button>
          )
        })}
        {hasFilters && (
          <button
            onClick={resetFilters}
            style={{
              marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
              padding: '5px 10px', display: 'inline-flex', gap: 4, alignItems: 'center',
              background: 'none', border: 'none',
            }}
          >
            <Icon name="close" size={11} /> Filtrləri sıfırla
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Yüklənir...</div>
      ) : (
        <>
          {view === 'kanban'   && <TaskKanban items={filtered} onOpen={setDrawerTaskId} onComplete={handleComplete} />}
          {view === 'list'     && <TaskList   items={filtered} onOpen={setDrawerTaskId} projects={projects} />}
          {view === 'grid'     && <TaskGrid   items={filtered} onOpen={setDrawerTaskId} projects={projects} />}
          {view === 'calendar' && <TaskCalendar items={filtered} onOpen={setDrawerTaskId} />}

          {filtered.length === 0 && !loading && (
            <div style={{
              padding: 60, textAlign: 'center', color: 'var(--muted)',
              background: 'var(--surface)', borderRadius: 16, border: '1px dashed var(--border)',
            }}>
              <Icon name="check_box" size={36} />
              <div style={{ marginTop: 12, fontWeight: 700 }}>Tapşırıq tapılmadı</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Süzgəcləri yumşaldın və ya yeni tapşırıq yaradın.</div>
            </div>
          )}
        </>
      )}

      {/* ── Detail drawer ── */}
      {drawerTaskId && (
        <TaskDrawer
          taskId={drawerTaskId}
          tasks={tasks}
          projects={projects}
          members={members}
          onClose={() => setDrawerTaskId(null)}
          onEdit={(t) => { setDrawerTaskId(null); openEdit(t) }}
          onDelete={(t) => { openDelete(t) }}
          onComplete={handleComplete}
          update={update}
        />
      )}

      {/* ── Modals ── */}
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

interface KanbanProps {
  items: Task[]
  onOpen: (id: string) => void
  onComplete: (t: Task) => void
}

function TaskKanban({ items, onOpen, onComplete }: KanbanProps) {
  return (
    <div className="task-kanban">
      {TASK_STATUSES.map(status => {
        const col = items.filter(t => t.status === status)
        const pill = TASK_STATUS_PILL[status]
        const colorVar = statusColorVar(pill)
        return (
          <div key={status} className="task-kcol">
            <div className="task-kcol-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorVar }}></span>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{status}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, background: 'var(--surface)', padding: '1px 7px', borderRadius: 999 }}>{col.length}</span>
              </div>
            </div>
            <div className="task-kcol-body">
              {col.map(t => (
                <TaskKCard key={t.id} task={t} onOpen={onOpen} onComplete={onComplete} />
              ))}
              {col.length === 0 && (
                <div style={{
                  padding: '20px 12px', textAlign: 'center', color: 'var(--muted-2)',
                  fontSize: 11, border: '1px dashed var(--border)', borderRadius: 10, fontWeight: 600,
                }}>boş</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskKCard({ task, onOpen, onComplete }: { task: Task; onOpen: (id: string) => void; onComplete: (t: Task) => void }) {
  const [a1, a2] = avatarPaletteFor(task.assignee || '')
  const dl = task.dueDate ? daysFromNow(task.dueDate) : 0
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const priColor = PRIORITY_BAR_COLOR[task.priority] || 'var(--muted-2)'
  const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="task-kcard" onClick={() => onOpen(task.id)} style={{ opacity: done ? 0.62 : 1 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: priColor, borderRadius: '12px 0 0 12px' }}></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className={'pill ' + TASK_PRIORITY_PILL[task.priority]} style={{ fontSize: 10, padding: '2px 7px' }}>{task.priority}</span>
        {task.projectName && (
          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Icon name="folder" size={10} />
            <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.projectName}</span>
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--ink)' }}>{task.title}</div>
      {task.description && (
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{task.description}</div>
      )}

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--muted)', fontWeight: 600 }}>#{tag}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        {task.assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `linear-gradient(135deg, ${a1}, ${a2})`,
              color: 'white', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initialsM(task.assignee)}</div>
            <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>{task.assignee.split(' ')[0]}</span>
          </div>
        )}
        {task.dueDate && (
          <div style={{ fontSize: 10, color: late ? 'var(--accent)' : 'var(--muted)', fontWeight: late ? 800 : 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="schedule" size={11} />
            {late ? Math.abs(dl) + 'g gecikdi' : dl + 'g qaldı'}
          </div>
        )}
      </div>

      {task.status !== 'Tamamlandı' && (
        <button
          className="btn-primaryM"
          style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '5px 8px', marginTop: 4 }}
          onClick={e => { e.stopPropagation(); onComplete(task) }}
        >
          <Icon name="check_circle" size={12} /> Tamamla
        </button>
      )}
    </div>
  )
}

/* ─── List ──────────────────────────────────────────────────── */

interface ListProps {
  items: Task[]
  onOpen: (id: string) => void
  projects: { id: string; name: string }[]
}

function TaskList({ items, onOpen, projects }: ListProps) {
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
        const proj = projectsById[t.projectId]
        const [a1, a2] = avatarPaletteFor(t.assignee || '')
        const dl = t.dueDate ? daysFromNow(t.dueDate) : 0
        const late = dl < 0 && t.status !== 'Tamamlandı'
        const done = t.status === 'Tamamlandı'
        return (
          <div
            key={t.id}
            className="task-trow"
            onClick={() => onOpen(t.id)}
            style={{ borderLeftColor: PRIORITY_BAR_COLOR[t.priority], opacity: done ? 0.65 : 1 }}
          >
            <button
              className="task-check"
              onClick={e => e.stopPropagation()}
              title={done ? 'Geri al' : 'Tamamlandı'}
            >
              <Icon name={done ? 'check_circle' : 'add_circle'} size={done ? 18 : 16} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--ink)' }}>{t.title}</div>
              {t.description && <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj?.name || t.projectName || '—'}</span>
            <span className={'pill ' + TASK_STATUS_PILL[t.status]}><span className="dot"></span>{t.status}</span>
            <span className={'pill ' + TASK_PRIORITY_PILL[t.priority]}>{t.priority}</span>
            {t.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${a1}, ${a2})`,
                  color: 'white', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{initialsM(t.assignee)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.assignee.split(' ')[0]}</span>
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
            <span style={{ fontSize: 11, color: late ? 'var(--accent)' : 'var(--ink-2)', fontWeight: late ? 800 : 600, whiteSpace: 'nowrap' }}>
              {t.dueDate ? fmtDateM(t.dueDate) : '—'}
              {t.dueDate && (
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginTop: 1 }}>
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

/* ─── Grid ──────────────────────────────────────────────────── */

interface GridProps {
  items: Task[]
  onOpen: (id: string) => void
  projects: { id: string; name: string }[]
}

function TaskGrid({ items, onOpen, projects }: GridProps) {
  return (
    <div className="task-grid">
      {items.map(t => <TaskGridCard key={t.id} task={t} onOpen={onOpen} projects={projects} />)}
    </div>
  )
}

function TaskGridCard({ task, onOpen, projects }: { task: Task; onOpen: (id: string) => void; projects: { id: string; name: string }[] }) {
  const proj = projects.find(p => p.id === task.projectId)
  const [a1, a2] = avatarPaletteFor(task.assignee || '')
  const dl = task.dueDate ? daysFromNow(task.dueDate) : 0
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="task-card" onClick={() => onOpen(task.id)} style={{ opacity: done ? 0.7 : 1 }}>
      <div className="task-card-stripe" style={{ background: PRIORITY_BAR_COLOR[task.priority] }}></div>
      <div className="task-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className={'pill ' + TASK_STATUS_PILL[task.status]} style={{ fontSize: 10 }}><span className="dot"></span>{task.status}</span>
          <span className={'pill ' + TASK_PRIORITY_PILL[task.priority]} style={{ fontSize: 10 }}>{task.priority}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--ink)' }}>{task.title}</div>
        {task.description && (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{task.description}</div>
        )}

        {(proj || task.projectName) && (
          <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="folder" size={12} />
            {proj?.name || task.projectName}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.slice(0, 4).map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--muted)', fontWeight: 600 }}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-2)' }}>
          {task.assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: `linear-gradient(135deg, ${a1}, ${a2})`,
                color: 'white', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{initialsM(task.assignee)}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{task.assignee.split(' ')[0]}</span>
            </div>
          )}
          {task.dueDate && (
            <span style={{ fontSize: 11, color: late ? 'var(--accent)' : 'var(--muted)', fontWeight: late ? 800 : 600, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <Icon name="schedule" size={12} />
              {late ? Math.abs(dl) + 'g gecikdi' : fmtDateM(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Calendar ───────────────────────────────────────────────── */

function TaskCalendar({ items, onOpen }: { items: Task[]; onOpen: (id: string) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const y = month.getFullYear()
  const m = month.getMonth()
  const firstDay     = new Date(y, m, 1).getDay()
  const daysInMonth  = new Date(y, m + 1, 0).getDate()
  const startOffset  = (firstDay + 6) % 7
  const totalCells   = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const today        = new Date()

  const byDay = useMemo(() => {
    const map: Record<number, Task[]> = {}
    items.forEach(t => {
      if (!t.dueDate) return
      const d = new Date(t.dueDate)
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate();
        (map[day] = map[day] || []).push(t)
      }
    })
    return map
  }, [items, y, m])

  return (
    <div className="task-calendar cardM" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setMonth(new Date(y, m - 1, 1))}>
            <Icon name="arrow_back" size={14} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{MONTH_AZ[m]} {y}</div>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setMonth(new Date(y, m + 1, 1))}>
            <Icon name="arrow_forward" size={14} />
          </button>
        </div>
        <button className="btn-ghostM" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
          <Icon name="calendar_today" size={13} /> Bu gün
        </button>
      </div>
      <div className="task-cal-grid task-cal-days">
        {DAY_AZ.map(d => <div key={d} className="task-cal-dayhead">{d}</div>)}
      </div>
      <div className="task-cal-grid">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum   = i - startOffset + 1
          const inMonth  = dayNum >= 1 && dayNum <= daysInMonth
          const isToday  = inMonth && today.getDate() === dayNum && today.getMonth() === m && today.getFullYear() === y
          const dayTasks = inMonth ? (byDay[dayNum] || []) : []
          return (
            <div key={i} className={'task-cal-cell' + (inMonth ? '' : ' outside')}>
              <div className={'task-cal-num' + (isToday ? ' today' : '')}>{inMonth ? dayNum : ''}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTasks.slice(0, 3).map(t => {
                  const pill     = TASK_STATUS_PILL[t.status]
                  const colorVar = statusColorVar(pill)
                  const softVar  = statusSoftVar(pill)
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t.id)}
                      className="task-cal-evt"
                      style={{ background: softVar, color: colorVar, borderLeft: '3px solid ' + colorVar }}
                    >
                      {t.title}
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: 10, color: 'var(--muted)', paddingLeft: 6, fontWeight: 600 }}>
                    +{dayTasks.length - 3} daha
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
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

function TaskDrawer({ taskId, tasks, projects, members, onClose, onEdit, onDelete, onComplete, update }: DrawerProps) {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return null

  const proj   = projects.find(p => p.id === task.projectId)
  const member = members.find(m => m.name === task.assignee)
  const [ac1, ac2] = avatarPaletteFor(task.assignee || '')
  const [pc1, pc2] = proj ? paletteFor(proj.id) : ['#F8F8F8', '#EEEEEE']
  const dl   = task.dueDate ? daysFromNow(task.dueDate) : 0
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const tags = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  const content = (
    <div onClick={onClose} className="task-drawer-bg">
      <div onClick={e => e.stopPropagation()} className="task-drawer fade-in">
        {/* Cover */}
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={'pill ' + TASK_STATUS_PILL[task.status]}><span className="dot"></span>{task.status}</span>
            <span className={'pill ' + TASK_PRIORITY_PILL[task.priority]}><Icon name="bolt" size={11} />{task.priority}</span>
            {late && (
              <span className="pill accent"><Icon name="warning" size={11} />{Math.abs(dl)} gün gecikdi</span>
            )}
          </div>

          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</h2>
          {task.description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>{task.description}</p>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--ink-2)', fontWeight: 600 }}>#{tag}</span>
              ))}
            </div>
          )}

          <div className="task-drawer-fields">
            <div className="task-field">
              <span className="k"><Icon name="person" size={11} />İcraçı</span>
              {task.assignee ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{initialsM(task.assignee)}</div>
                  <span style={{ fontWeight: 700 }}>{member?.name || task.assignee}</span>
                </span>
              ) : '—'}
            </div>
            <div className="task-field">
              <span className="k"><Icon name="schedule" size={11} />Son tarix</span>
              <span style={{ fontWeight: 700, color: late ? 'var(--accent)' : 'var(--ink)' }}>
                {task.dueDate ? `${fmtDateM(task.dueDate)} · ${late ? Math.abs(dl) + 'g gecikdi' : dl + 'g qaldı'}` : '—'}
              </span>
            </div>
            <div className="task-field">
              <span className="k"><Icon name="sync" size={11} />Yenilənmə</span>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{fmtDateM(task.updatedAt)}</span>
            </div>
            <div className="task-field">
              <span className="k"><Icon name="task" size={11} />ID</span>
              <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{task.id.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }}
              onClick={() => onEdit(task)}
            >
              <Icon name="edit" size={13} /> Düzəlt
            </button>
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12, color: 'var(--accent)' }}
              onClick={() => onDelete(task)}
            >
              <Icon name="delete" size={13} /> Sil
            </button>
            <button
              className={done ? 'btn-ghostM' : 'btn-primaryM'}
              style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }}
              onClick={() => onComplete(task)}
            >
              <Icon name={done ? 'autorenew' : 'check_circle'} size={13} /> {done ? 'Geri al' : 'Tamamla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return ReactDOM.createPortal(content, document.body)
}
