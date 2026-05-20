'use client'

import { useState, useMemo } from 'react'
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

const CAL_MONTHS_AZ = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
const CAL_DAY_AZ_SHORT = ['B.e','Ç.a','Ç','C.a','C','Ş','B']
const CAL_DAY_AZ_FULL  = ['Bazar ertəsi','Çərşənbə axşamı','Çərşənbə','Cümə axşamı','Cümə','Şənbə','Bazar']

const CAL_STATUS: Record<string, { fg: string; bg: string; ring: string }> = {
  'Gözləyir':   { fg: 'var(--muted)',   bg: 'var(--surface-2)',    ring: '#CFD1DD' },
  'Davam edir': { fg: 'var(--primary)', bg: 'var(--primary-soft)', ring: '#C5C5FA' },
  'Yoxlanılır': { fg: 'var(--warn)',    bg: 'var(--warn-soft)',    ring: '#F8D69C' },
  'Tamamlandı': { fg: 'var(--success)', bg: 'var(--success-soft)', ring: '#B6E8D6' },
}

const CAL_PRIORITY_DOT: Record<string, string> = {
  'Kritik': 'var(--accent)',
  'Yüksək': 'var(--warn)',
  'Orta':   'var(--info)',
  'Aşağı':  'var(--muted-2)',
}

/* ─── Helpers ───────────────────────────────────────────────── */

function localKey(d: Date): string {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getWeekStart(d: Date): Date {
  const x = new Date(d)
  const offset = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - offset)
  x.setHours(0, 0, 0, 0)
  return x
}

function statusPillClass(status: string): string {
  if (status === 'Davam edir') return 'indigo'
  if (status === 'Yoxlanılır') return 'warn'
  if (status === 'Tamamlandı') return 'green'
  return 'muted'
}

function priorityPillClass(priority: string): string {
  if (priority === 'Kritik') return 'accent'
  if (priority === 'Yüksək') return 'warn'
  if (priority === 'Orta') return 'info'
  return 'muted'
}

type CalView = 'month' | 'week' | 'agenda'

/* ─── Main Page ─────────────────────────────────────────────── */

export default function CalendarPage() {
  const { tasks, loading, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()

  const today = useMemo(() => new Date(), [])

  const [view, setView] = useState<CalView>('month')
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [projectFilter, setProjectFilter] = useState('all')
  const [taskDrawer, setTaskDrawer] = useState<string | null>(null)

  // TaskForm modal state
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [newTaskDate, setNewTaskDate] = useState('')
  const [saving, setSaving] = useState(false)

  // ConfirmDialog state
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* Derived */
  const filtered = useMemo(
    () => tasks.filter(t => projectFilter === 'all' || t.projectId === projectFilter),
    [tasks, projectFilter]
  )

  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {}
    filtered.forEach(t => {
      if (!t.dueDate) return
      const k = localKey(new Date(t.dueDate))
      ;(m[k] = m[k] || []).push(t)
    })
    return m
  }, [filtered])

  const y = cursor.getFullYear()
  const mo = cursor.getMonth()

  const monthStats = useMemo(() => {
    const inMonth = filtered.filter(t => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      return d.getFullYear() === y && d.getMonth() === mo
    })
    const byStatus: Record<string, number> = { 'Gözləyir': 0, 'Davam edir': 0, 'Yoxlanılır': 0, 'Tamamlandı': 0 }
    let overdue = 0
    inMonth.forEach(t => {
      if (byStatus[t.status] !== undefined) byStatus[t.status]++
      if (t.status !== 'Tamamlandı' && new Date(t.dueDate) < today) overdue++
    })
    return { total: inMonth.length, byStatus, overdue }
  }, [cursor, filtered, y, mo, today])

  // Month grid
  const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  // Week
  const weekStart = useMemo(() => getWeekStart(selectedDay), [selectedDay])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  }), [weekStart])

  // Agenda
  const agendaGroups = useMemo(() => {
    const start = new Date(y, mo, 1)
    const end = new Date(y, mo + 1, 0)
    const items = filtered
      .filter(t => {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const groups: { key: string; date: Date; tasks: Task[] }[] = []
    const seen: Record<string, { key: string; date: Date; tasks: Task[] }> = {}
    items.forEach(t => {
      const k = localKey(new Date(t.dueDate))
      if (!seen[k]) {
        seen[k] = { key: k, date: new Date(t.dueDate), tasks: [] }
        groups.push(seen[k])
      }
      seen[k].tasks.push(t)
    })
    return groups
  }, [filtered, y, mo])

  /* Navigation */
  const navigate = (dir: -1 | 1) => {
    if (view === 'week') {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + dir * 7)
      setSelectedDay(d)
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      setCursor(new Date(y, mo + dir, 1))
    }
  }

  const jumpToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(today)
  }

  const headerLabel = view === 'week'
    ? `${weekDays[0].getDate()} ${CAL_MONTHS_AZ[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${CAL_MONTHS_AZ[weekDays[6].getMonth()]}`
    : `${CAL_MONTHS_AZ[mo]} ${y}`

  /* Handlers */
  const openCreateForDay = (date: Date) => {
    setNewTaskDate(localKey(date))
    setEditTask(null)
    setModal('create')
  }

  const handleCreate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
    setNewTaskDate('')
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
    if (!confirmDelete) return
    setDeleting(true)
    await remove(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
  }

  const openEditTask = (task: Task) => {
    setEditTask(task)
    setModal('edit')
    setTaskDrawer(null)
  }

  const teamNames = useMemo(() => members.map(m => m.name), [members])

  /* ─── Render ────────────────────────────────────────────────── */
  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="team-headM">
        <div>
          <h1>Təqvim <span className="cnt">{monthStats.total}</span></h1>
          <div className="sub">
            {CAL_MONTHS_AZ[mo]} {y} üçün {monthStats.total} tapşırıq
            {monthStats.overdue > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{monthStats.overdue} gecikmiş</span></>
            )}
          </div>
        </div>
        <div className="actions">
          <select
            className="task-select"
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="all">Bütün layihələr</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            className="btn-primaryM"
            onClick={() => { setNewTaskDate(localKey(selectedDay)); setEditTask(null); setModal('create') }}
          >
            <Icon name="add_task" size={14} /> Yeni Tapşırıq
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="cal-stat-row">
        {(['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı'] as const).map(s => {
          const c = CAL_STATUS[s]
          return (
            <div key={s} className="cal-stat" style={{ borderColor: c.ring }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.fg, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink-2)' }}>{s}</span>
              <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: c.fg, letterSpacing: '-0.02em' }}>
                {monthStats.byStatus[s] ?? 0}
              </span>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="cal-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <Icon name="arrow_forward" size={14} />
          </button>
          <button className="btn-ghostM" onClick={jumpToday} style={{ padding: '8px 14px', fontSize: 12 }}>
            <Icon name="calendar_today" size={13} /> Bu gün
          </button>
          <button className="icon-btn" onClick={() => navigate(1)} style={{ transform: 'scaleX(-1)' }}>
            <Icon name="arrow_forward" size={14} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em', marginLeft: 12 }}>
            {headerLabel}
          </div>
        </div>

        <div style={{
          display: 'flex', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2,
        }}>
          {([
            { v: 'month',  label: 'Ay',       ico: 'calendar_month' },
            { v: 'week',   label: 'Həftə',    ico: 'space_dashboard' },
            { v: 'agenda', label: 'Gündəlik', ico: 'sort' },
          ] as { v: CalView; label: string; ico: string }[]).map(b => (
            <button
              key={b.v}
              onClick={() => setView(b.v)}
              style={{
                padding: '7px 14px', border: 0, borderRadius: 8,
                background: view === b.v ? 'var(--primary)' : 'transparent',
                color: view === b.v ? 'white' : 'var(--muted)',
                fontSize: 12, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              <Icon name={b.ico} size={13} />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="cal-body">
        <div className="cal-main">

          {/* ── Month view ── */}
          {view === 'month' && (
            <div className="cal-card">
              <div className="cal-month-head">
                {CAL_DAY_AZ_SHORT.map(d => <div key={d}>{d}</div>)}
              </div>
              <div
                className="cal-month-grid"
                style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(96px, 1fr))` }}
              >
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - startOffset + 1
                  const inMonth = dayNum >= 1 && dayNum <= daysInMonth
                  const cellDate = new Date(y, mo, dayNum)
                  const isToday = inMonth && sameDay(cellDate, today)
                  const isSelected = inMonth && sameDay(cellDate, selectedDay)
                  const isWeekend = i % 7 >= 5
                  const items = inMonth ? (tasksByDay[localKey(cellDate)] || []) : []
                  const overflow = Math.max(0, items.length - 3)
                  return (
                    <div
                      key={i}
                      className={
                        'cal-cell' +
                        (inMonth ? '' : ' outside') +
                        (isSelected ? ' selected' : '') +
                        (isToday ? ' today' : '') +
                        (isWeekend ? ' weekend' : '')
                      }
                      onClick={() => inMonth && setSelectedDay(cellDate)}
                    >
                      <div className="cal-cell-head">
                        <span className={'cal-cell-num' + (isToday ? ' today' : '') + (isSelected && !isToday ? ' selected' : '')}>
                          {inMonth ? dayNum : ''}
                        </span>
                        {inMonth && items.length > 0 && (
                          <span className="cal-cell-count">{items.length}</span>
                        )}
                      </div>
                      <div className="cal-cell-items">
                        {items.slice(0, 3).map(t => (
                          <button
                            key={t.id}
                            className="cal-pill"
                            onClick={e => { e.stopPropagation(); setTaskDrawer(t.id) }}
                            style={{
                              background: CAL_STATUS[t.status]?.bg,
                              color: CAL_STATUS[t.status]?.fg,
                              borderLeft: '3px solid ' + CAL_STATUS[t.status]?.fg,
                            }}
                          >
                            <span className="cal-pill-dot" style={{ background: CAL_PRIORITY_DOT[t.priority] }} />
                            <span className="cal-pill-text">{t.title}</span>
                          </button>
                        ))}
                        {overflow > 0 && (
                          <div className="cal-overflow">+{overflow} daha</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Week view ── */}
          {view === 'week' && (
            <div className="cal-card">
              <div className="cal-week-head">
                {weekDays.map((d, i) => {
                  const isToday = sameDay(d, today)
                  const isSelected = sameDay(d, selectedDay)
                  const count = (tasksByDay[localKey(d)] || []).length
                  return (
                    <div
                      key={i}
                      className={'cal-week-dayhead' + (isSelected ? ' selected' : '')}
                      onClick={() => setSelectedDay(d)}
                    >
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {CAL_DAY_AZ_SHORT[i]}
                      </div>
                      <div className={'cal-cell-num large' + (isToday ? ' today' : '') + (isSelected && !isToday ? ' selected' : '')}>
                        {d.getDate()}
                      </div>
                      {count > 0 && <span className="cal-week-pip">{count}</span>}
                    </div>
                  )
                })}
              </div>
              <div className="cal-week-grid">
                {weekDays.map((d, i) => {
                  const items = tasksByDay[localKey(d)] || []
                  const isToday = sameDay(d, today)
                  return (
                    <div
                      key={i}
                      className={'cal-week-col' + (isToday ? ' today' : '')}
                      onClick={() => setSelectedDay(d)}
                    >
                      {items.length === 0 && (
                        <div
                          className="cal-week-empty"
                          onClick={e => { e.stopPropagation(); openCreateForDay(d) }}
                        >
                          <Icon name="add" size={13} />
                        </div>
                      )}
                      {items.map(t => {
                        const c = CAL_STATUS[t.status] || CAL_STATUS['Gözləyir']
                        const overdue = new Date(t.dueDate) < today && t.status !== 'Tamamlandı'
                        const member = members.find(m => m.name === t.assignee)
                        const [a1, a2] = avatarPaletteFor(t.assignee || '')
                        return (
                          <div
                            key={t.id}
                            className="cal-week-task"
                            onClick={e => { e.stopPropagation(); setTaskDrawer(t.id) }}
                            style={{ background: c.bg, borderColor: c.ring }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAL_PRIORITY_DOT[t.priority], marginTop: 5, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: c.fg }}>{t.title}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                              {member && (
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${a1}, ${a2})`,
                                  color: 'white', fontSize: 8, fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {initialsM(member.name)}
                                </div>
                              )}
                              {overdue && <Icon name="warning" size={11} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Agenda view ── */}
          {view === 'agenda' && (
            <div className="cal-agenda">
              {agendaGroups.length === 0 ? (
                <div style={{
                  padding: 60, textAlign: 'center',
                  color: 'var(--muted)',
                  background: 'var(--surface)',
                  borderRadius: 16,
                  border: '1px dashed var(--border)',
                }}>
                  <Icon name="calendar_month" size={36} />
                  <div style={{ marginTop: 12, fontWeight: 700 }}>Bu ay üçün tapşırıq yoxdur</div>
                </div>
              ) : agendaGroups.map(({ key, date, tasks: dayTasks }) => {
                const isToday = sameDay(date, today)
                const dow = (date.getDay() + 6) % 7
                return (
                  <div key={key} className="cal-agenda-group">
                    <div className="cal-agenda-date">
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {CAL_DAY_AZ_SHORT[dow]}
                      </div>
                      <div className={'cal-agenda-num' + (isToday ? ' today' : '')}>{date.getDate()}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        {CAL_MONTHS_AZ[date.getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    <div className="cal-agenda-list">
                      {dayTasks.map(t => {
                        const c = CAL_STATUS[t.status] || CAL_STATUS['Gözləyir']
                        const overdue = new Date(t.dueDate) < today && t.status !== 'Tamamlandı'
                        const done = t.status === 'Tamamlandı'
                        const proj = projects.find(p => p.id === t.projectId)
                        const member = members.find(m => m.name === t.assignee)
                        const [a1, a2] = avatarPaletteFor(t.assignee || '')
                        return (
                          <div key={t.id} className="cal-agenda-row" onClick={() => setTaskDrawer(t.id)}>
                            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 999, background: c.fg }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAL_PRIORITY_DOT[t.priority], flexShrink: 0 }} />
                                <span style={{
                                  fontSize: 13, fontWeight: 700,
                                  textDecoration: done ? 'line-through' : 'none',
                                  color: done ? 'var(--muted)' : 'var(--ink)',
                                }}>
                                  {t.title}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                <span className={'pill ' + statusPillClass(t.status)} style={{ fontSize: 10 }}>
                                  <span className="dot" />{t.status}
                                </span>
                                <span className={'pill ' + priorityPillClass(t.priority)} style={{ fontSize: 10 }}>
                                  {t.priority}
                                </span>
                                {proj && (
                                  <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                    <Icon name="folder" size={11} />{proj.name}
                                  </span>
                                )}
                                {overdue && (
                                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                                    <Icon name="warning" size={11} />Gecikmiş
                                  </span>
                                )}
                              </div>
                            </div>
                            {member && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${a1}, ${a2})`,
                                  color: 'white', fontSize: 10, fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {initialsM(member.name)}
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>
                                  {member.name.split(' ')[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right sidebar — day detail ── */}
        {view !== 'agenda' && (
          <CalDayPanel
            date={selectedDay}
            tasks={tasksByDay[localKey(selectedDay)] || []}
            projects={projects}
            members={members}
            today={today}
            onOpenTask={setTaskDrawer}
            onAddTask={openCreateForDay}
          />
        )}
      </div>

      {/* Task drawer portal */}
      {taskDrawer && (
        <TaskDrawerPortal
          taskId={taskDrawer}
          tasks={tasks}
          projects={projects}
          members={members}
          today={today}
          onClose={() => setTaskDrawer(null)}
          onEdit={task => openEditTask(task)}
          onComplete={async (task) => {
            await update(task.id, { status: 'Tamamlandı' })
            setTaskDrawer(null)
          }}
          onDelete={task => { setConfirmDelete(task); setTaskDrawer(null) }}
        />
      )}

      {/* Create modal */}
      <Modal
        open={modal === 'create'}
        onClose={() => { setModal(null); setNewTaskDate('') }}
        title="Yeni Tapşırıq"
      >
        <TaskForm
          initial={newTaskDate ? { dueDate: newTaskDate } : undefined}
          projects={projects}
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => { setModal(null); setNewTaskDate('') }}
          loading={saving}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={modal === 'edit'}
        onClose={() => { setModal(null); setEditTask(null) }}
        title="Tapşırığı Düzəlt"
      >
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Tapşırığı sil"
        message={`"${confirmDelete?.title}" tapşırığını silmək istədiyinizə əminsiniz?`}
        loading={deleting}
      />
    </div>
  )
}

/* ─── Day detail sidebar ─────────────────────────────────────── */

interface CalDayPanelProps {
  date: Date
  tasks: Task[]
  projects: { id: string; name: string }[]
  members: { id: string; name: string }[]
  today: Date
  onOpenTask: (id: string) => void
  onAddTask: (date: Date) => void
}

function CalDayPanel({ date, tasks, projects, members, today, onOpenTask, onAddTask }: CalDayPanelProps) {
  const isToday = sameDay(date, today)
  const dow = (date.getDay() + 6) % 7

  return (
    <div className="cal-side cardM">
      <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {CAL_DAY_AZ_FULL[dow]}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: isToday ? 'var(--primary)' : 'var(--ink)' }}>
            {date.getDate()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-2)' }}>
            {CAL_MONTHS_AZ[date.getMonth()]} {date.getFullYear()}
          </div>
        </div>
        {isToday && (
          <span className="pill indigo" style={{ marginTop: 8, display: 'inline-flex' }}>
            <span className="dot" />Bu gün
          </span>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{tasks.length} tapşırıq</span>
          <button className="btn-ghostM" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => onAddTask(date)}>
            <Icon name="add" size={12} /> Əlavə et
          </button>
        </div>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
        {tasks.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="calendar_today" size={28} />
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 12 }}>Bu gün üçün tapşırıq yoxdur</div>
          </div>
        ) : tasks.map(t => {
          const c = CAL_STATUS[t.status] || CAL_STATUS['Gözləyir']
          const overdue = new Date(t.dueDate) < today && t.status !== 'Tamamlandı'
          const done = t.status === 'Tamamlandı'
          const proj = projects.find(p => p.id === t.projectId)
          const member = members.find(m => m.name === t.assignee)
          const [a1, a2] = avatarPaletteFor(t.assignee || '')
          const tags = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean)
          return (
            <div
              key={t.id}
              className="cal-side-task"
              onClick={() => onOpenTask(t.id)}
              style={{ background: c.bg, borderColor: c.ring }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAL_PRIORITY_DOT[t.priority], marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: done ? 'var(--muted)' : c.fg, textDecoration: done ? 'line-through' : 'none' }}>
                  {t.title}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                <span className={'pill ' + statusPillClass(t.status)} style={{ fontSize: 9 }}>
                  <span className="dot" />{t.status}
                </span>
                {proj && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>{proj.name}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                {member ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${a1}, ${a2})`,
                      color: 'white', fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {initialsM(member.name)}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 600 }}>
                      {member.name.split(' ')[0]}
                    </span>
                  </div>
                ) : <div />}
                {overdue && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                    <Icon name="warning" size={11} />Gecikmiş
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 8 }}>
                  {tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.65)', color: 'var(--muted)', fontWeight: 600 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Task drawer portal ─────────────────────────────────────── */

interface TaskDrawerPortalProps {
  taskId: string
  tasks: Task[]
  projects: { id: string; name: string }[]
  members: { id: string; name: string }[]
  today: Date
  onClose: () => void
  onEdit: (task: Task) => void
  onComplete: (task: Task) => Promise<void>
  onDelete: (task: Task) => void
}

function TaskDrawerPortal({
  taskId, tasks, projects, members, today,
  onClose, onEdit, onComplete, onDelete,
}: TaskDrawerPortalProps) {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return null

  const proj = projects.find(p => p.id === task.projectId)
  const member = members.find(m => m.name === task.assignee)
  const [ac1, ac2] = avatarPaletteFor(task.assignee || '')
  const [pc1, pc2] = proj ? paletteFor(proj.id) : ['#FFF', '#EEE']

  const dl = daysFromNow(task.dueDate)
  const late = dl < 0 && task.status !== 'Tamamlandı'
  const done = task.status === 'Tamamlandı'
  const tags = (task.tags || '').split(',').map(s => s.trim()).filter(Boolean)

  const spClass = statusPillClass(task.status)
  const ppClass = priorityPillClass(task.priority)

  return ReactDOM.createPortal(
    <div onClick={onClose} className="task-drawer-bg">
      <div onClick={e => e.stopPropagation()} className="task-drawer fade-in">
        <div className="task-drawer-cover" style={{ background: `linear-gradient(135deg, ${pc1}, ${pc2})` }}>
          <button onClick={onClose} className="task-drawer-close">
            <Icon name="close" size={14} />
          </button>
          {proj && (
            <div className="task-drawer-projtag">
              <Icon name="folder" size={12} />
              {proj.name}
            </div>
          )}
        </div>

        <div className="task-drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={'pill ' + spClass}><span className="dot" />{task.status}</span>
            <span className={'pill ' + ppClass}><Icon name="bolt" size={11} />{task.priority}</span>
            {late && (
              <span className="pill accent">
                <Icon name="warning" size={11} />{Math.abs(dl)} gün gecikdi
              </span>
            )}
          </div>

          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, textDecoration: done ? 'line-through' : 'none' }}>
            {task.title}
          </h2>
          {task.description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
              {task.description}
            </p>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--ink-2)', fontWeight: 600 }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="task-drawer-fields">
            <div className="task-field">
              <span className="k"><Icon name="person" size={11} />İcraçı</span>
              {member ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
                    color: 'white', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {initialsM(member.name)}
                  </div>
                  <span style={{ fontWeight: 700 }}>{member.name}</span>
                </span>
              ) : <span>—</span>}
            </div>
            <div className="task-field">
              <span className="k"><Icon name="schedule" size={11} />Son tarix</span>
              <span style={{ fontWeight: 700, color: late ? 'var(--accent)' : 'var(--ink)' }}>
                {fmtDateM(task.dueDate)} · {late ? Math.abs(dl) + 'g gecikdi' : (dl + 'g qaldı')}
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
              style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }}
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
    </div>,
    document.body
  )
}
