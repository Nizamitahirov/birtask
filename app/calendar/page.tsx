'use client'

import { useState, useMemo } from 'react'
import { useTasks, useProjects, useTeamNames } from '@/hooks/useSheets'
import { Task, TaskStatus } from '@/lib/types'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw,
  CalendarDays, Calendar, LayoutGrid, X,
  Edit2, Trash2, Tag, User, Clock, AlertCircle
} from 'lucide-react'
import { cn, getDaysLeft, formatDate } from '@/lib/utils'

const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
const DAY_NAMES_SHORT = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B']
const DAY_NAMES_FULL = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar']

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  'Gözləyir':   { bg: '#94A3B822', text: '#94A3B8', border: '#94A3B844' },
  'Davam edir': { bg: '#3B82F622', text: '#3B82F6', border: '#3B82F644' },
  'Yoxlanılır': { bg: '#F59E0B22', text: '#F59E0B', border: '#F59E0B44' },
  'Tamamlandı': { bg: '#10B98122', text: '#10B981', border: '#10B98144' },
}

const PRIORITY_DOT: Record<string, string> = {
  'Kritik': '#EF4444',
  'Yüksək': '#F97316',
  'Orta':   '#F59E0B',
  'Aşağı':  '#94A3B8',
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateStr(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

type CalendarView = 'month' | 'week' | 'agenda'

export default function CalendarPage() {
  const { tasks, loading, refresh, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const teamNames = useTeamNames()

  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)
  const [projectFilter, setProjectFilter] = useState('all')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newTaskDate, setNewTaskDate] = useState<string>('')

  const filteredTasks = useMemo(() =>
    tasks.filter(t => projectFilter === 'all' || t.projectId === projectFilter),
    [tasks, projectFilter]
  )

  // Group tasks by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    filteredTasks.forEach(t => {
      if (!t.dueDate) return
      const d = parseDateStr(t.dueDate)
      if (!d) return
      const key = toLocalDateStr(d)
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [filteredTasks])

  const selectedDayStr = selectedDay ? toLocalDateStr(selectedDay) : ''
  const selectedDayTasks = selectedDay ? (tasksByDate[selectedDayStr] || []) : []

  // Month grid
  const year = currentDate.getFullYear()
  const monthIdx = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, monthIdx, 1)
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7  // Monday first
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  // Week grid (for week view)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = (d.getDay() + 6) % 7  // Monday = 0
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const weekStart = getWeekStart(selectedDay || today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') {
      setCurrentDate(new Date(year, monthIdx + dir, 1))
    } else if (view === 'week') {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + dir * 7)
      setSelectedDay(d)
    } else {
      // agenda: month navigation
      setCurrentDate(new Date(year, monthIdx + dir, 1))
    }
  }

  const jumpToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(today)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    if (view === 'month' && date.getMonth() !== monthIdx) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const openCreateForDay = (date: Date) => {
    setNewTaskDate(toLocalDateStr(date))
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
    if (!selectedTask) return
    setSaving(true)
    await update(selectedTask.id, data)
    setSaving(false)
    setModal(null)
    setSelectedTask(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    await remove(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
  }

  const openEdit = (task: Task) => {
    setSelectedTask(task)
    setModal('edit')
  }

  const headerTitle = view === 'month'
    ? `${MONTH_NAMES[monthIdx]} ${year}`
    : view === 'week'
      ? `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
      : `${MONTH_NAMES[monthIdx]} ${year}`

  // Agenda: flat sorted list of tasks with dates
  const agendaTasks = useMemo(() => {
    const start = new Date(year, monthIdx, 1)
    const end = new Date(year, monthIdx + 1, 0)
    return filteredTasks
      .filter(t => {
        if (!t.dueDate) return false
        const d = parseDateStr(t.dueDate)
        if (!d) return false
        return d >= start && d <= end
      })
      .sort((a, b) => {
        const da = parseDateStr(a.dueDate)
        const db = parseDateStr(b.dueDate)
        if (!da || !db) return 0
        return da.getTime() - db.getTime()
      })
  }, [filteredTasks, year, monthIdx])

  const groupedAgenda = useMemo(() => {
    const groups: { dateStr: string; date: Date; dayTasks: Task[] }[] = []
    const seen = new Set<string>()
    agendaTasks.forEach(t => {
      const d = parseDateStr(t.dueDate)
      if (!d) return
      const key = toLocalDateStr(d)
      if (!seen.has(key)) {
        seen.add(key)
        groups.push({ dateStr: key, date: d, dayTasks: [] })
      }
      groups.find(g => g.dateStr === key)!.dayTasks.push(t)
    })
    return groups
  }, [agendaTasks])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 lg:p-8 gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="page-title">Təqvim</h1>
            <button
              onClick={jumpToToday}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/[0.1] text-text-secondary hover:text-text-primary hover:border-white/[0.2] transition-all"
            >
              Bugün
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="select text-xs !py-1.5 max-w-[160px]"
            >
              <option value="all">Bütün layihələr</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={refresh} className="btn-secondary w-9 h-9 !p-0 justify-center" title="Yenilə">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { setNewTaskDate(selectedDay ? toLocalDateStr(selectedDay) : ''); setModal('create') }} className="btn-primary">
              <Plus size={15} /> Tapşırıq
            </button>
          </div>
        </div>

        {/* View toggle + navigation */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all">
              <ChevronLeft size={15} />
            </button>
            <span className="text-text-primary font-semibold text-sm min-w-[200px] text-center">{headerTitle}</span>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="flex gap-1">
            {([['month', Calendar], ['week', LayoutGrid], ['agenda', CalendarDays]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={v === 'month' ? 'Ay' : v === 'week' ? 'Həftə' : 'Gündəlik'}
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm',
                  view === v ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : view === 'month' ? (
            <div className="card overflow-hidden h-full flex flex-col">
              {/* Day names header */}
              <div className="grid grid-cols-7 border-b border-white/[0.06] flex-shrink-0">
                {DAY_NAMES_SHORT.map(d => (
                  <div key={d} className="py-2 text-center text-[11px] font-medium text-text-muted">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${totalCells / 7}, 1fr)` }}>
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - startOffset + 1
                  const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
                  const cellDate = new Date(year, monthIdx, dayNum)
                  const isToday = isSameDay(cellDate, today)
                  const isSelected = selectedDay ? isSameDay(cellDate, selectedDay) : false
                  const dateKey = toLocalDateStr(cellDate)
                  const dayTasks = isCurrentMonth ? (tasksByDate[dateKey] || []) : []
                  const overflow = Math.max(0, dayTasks.length - 3)

                  return (
                    <div
                      key={i}
                      onClick={() => isCurrentMonth && handleDayClick(cellDate)}
                      className={cn(
                        'border-r border-b border-white/[0.04] p-1.5 cursor-pointer transition-colors',
                        isCurrentMonth ? 'hover:bg-white/[0.02]' : 'opacity-25 pointer-events-none',
                        isSelected && isCurrentMonth && 'bg-accent-blue/5 border-accent-blue/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                          isToday ? 'bg-accent-blue text-white' : isSelected ? 'text-accent-blue font-bold' : 'text-text-muted'
                        )}>
                          {isCurrentMonth ? dayNum : ''}
                        </div>
                        {isCurrentMonth && (
                          <button
                            onClick={e => { e.stopPropagation(); openCreateForDay(cellDate) }}
                            className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent-blue opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all"
                          >
                            <Plus size={11} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(t => {
                          const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Gözləyir']
                          return (
                            <div
                              key={t.id}
                              onClick={e => { e.stopPropagation(); openEdit(t) }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight cursor-pointer hover:opacity-80 transition-opacity truncate"
                              style={{ background: sc.bg, color: sc.text, borderLeft: `2px solid ${sc.text}` }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: PRIORITY_DOT[t.priority] || '#94A3B8' }}
                              />
                              <span className="truncate">{t.title}</span>
                            </div>
                          )
                        })}
                        {overflow > 0 && (
                          <div className="text-[10px] text-text-muted pl-1 hover:text-text-secondary cursor-pointer" onClick={e => { e.stopPropagation(); handleDayClick(cellDate) }}>
                            +{overflow} daha
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-white/[0.06]">
                {weekDays.map((d, i) => {
                  const isToday = isSameDay(d, today)
                  const isSelected = selectedDay ? isSameDay(d, selectedDay) : false
                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(d)}
                      className={cn(
                        'py-3 px-2 text-center cursor-pointer hover:bg-white/[0.02] transition-colors border-r border-white/[0.04]',
                        isSelected && 'bg-accent-blue/5'
                      )}
                    >
                      <div className="text-[11px] text-text-muted mb-1">{DAY_NAMES_SHORT[i]}</div>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mx-auto',
                        isToday ? 'bg-accent-blue text-white' : isSelected ? 'text-accent-blue' : 'text-text-secondary'
                      )}>
                        {d.getDate()}
                      </div>
                      {/* Task count dot */}
                      {(() => {
                        const count = (tasksByDate[toLocalDateStr(d)] || []).length
                        return count > 0 ? (
                          <div className="mt-1 flex justify-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">{count}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )
                })}
              </div>
              {/* Week task columns */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekDays.map((d, i) => {
                  const dateKey = toLocalDateStr(d)
                  const dayTasks = tasksByDate[dateKey] || []
                  const isToday = isSameDay(d, today)
                  const isSelected = selectedDay ? isSameDay(d, selectedDay) : false
                  return (
                    <div
                      key={i}
                      className={cn(
                        'border-r border-white/[0.04] p-2 space-y-1.5 cursor-pointer hover:bg-white/[0.01] transition-colors',
                        (isToday || isSelected) && 'bg-accent-blue/[0.03]'
                      )}
                      onClick={() => handleDayClick(d)}
                    >
                      {dayTasks.length === 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); openCreateForDay(d) }}
                          className="w-full py-3 border border-dashed border-white/[0.06] rounded-lg text-xs text-text-muted hover:border-white/[0.15] hover:text-text-secondary transition-all flex items-center justify-center gap-1"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                      {dayTasks.map(t => {
                        const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Gözləyir']
                        const overdue = t.dueDate && getDaysLeft(t.dueDate) < 0 && t.status !== 'Tamamlandı'
                        return (
                          <div
                            key={t.id}
                            onClick={e => { e.stopPropagation(); openEdit(t) }}
                            className="rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                          >
                            <div className="flex items-start gap-1.5 mb-1">
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                                style={{ background: PRIORITY_DOT[t.priority] || '#94A3B8' }}
                              />
                              <span className="text-[11px] font-medium leading-tight" style={{ color: sc.text }}>{t.title}</span>
                            </div>
                            {t.assignee && (
                              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                <User size={9} /> {t.assignee}
                              </div>
                            )}
                            {overdue && (
                              <div className="flex items-center gap-1 text-[10px] text-accent-red mt-0.5">
                                <AlertCircle size={9} /> Gecikmiş
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Agenda view */
            <div className="space-y-4">
              {groupedAgenda.length === 0 ? (
                <div className="card p-12 text-center">
                  <CalendarDays size={40} className="text-text-muted mx-auto mb-3 opacity-40" />
                  <p className="text-text-secondary text-sm">Bu ay üçün tapşırıq yoxdur</p>
                </div>
              ) : groupedAgenda.map(({ date, dateStr, dayTasks }) => {
                const isToday = isSameDay(date, today)
                const dayOfWeek = (date.getDay() + 6) % 7
                return (
                  <div key={dateStr} className="flex gap-4">
                    <div
                      className={cn(
                        'flex-shrink-0 w-16 text-center pt-1',
                        isToday && 'text-accent-blue'
                      )}
                    >
                      <div className="text-xs text-text-muted">{DAY_NAMES_SHORT[dayOfWeek]}</div>
                      <div className={cn(
                        'text-2xl font-bold mt-0.5',
                        isToday ? 'text-accent-blue' : 'text-text-primary'
                      )}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {dayTasks.map(t => {
                        const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Gözləyir']
                        const overdue = t.dueDate && getDaysLeft(t.dueDate) < 0 && t.status !== 'Tamamlandı'
                        return (
                          <div
                            key={t.id}
                            className="card p-3 flex items-center gap-3 cursor-pointer hover:border-white/[0.12] transition-all group"
                            onClick={() => openEdit(t)}
                          >
                            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: sc.text }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className={cn('text-text-primary text-sm font-medium', t.status === 'Tamamlandı' && 'line-through text-text-muted')}>
                                  {t.title}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button onClick={e => { e.stopPropagation(); openEdit(t) }}
                                    className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all">
                                    <Edit2 size={11} />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(t) }}
                                    className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <StatusBadge status={t.status} />
                                <PriorityBadge priority={t.priority} />
                                {t.assignee && (
                                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <User size={9} /> {t.assignee}
                                  </span>
                                )}
                                {t.projectName && (
                                  <span className="text-[10px] text-text-muted truncate max-w-[120px]">{t.projectName}</span>
                                )}
                                {overdue && (
                                  <span className="flex items-center gap-1 text-[10px] text-accent-red">
                                    <AlertCircle size={9} /> Gecikmiş
                                  </span>
                                )}
                              </div>
                            </div>
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
      </div>

      {/* Day Detail Panel */}
      {selectedDay && view !== 'agenda' && (
        <div className="w-72 flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'rgb(var(--bg-secondary))' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-text-muted text-xs">{DAY_NAMES_FULL[(selectedDay.getDay() + 6) % 7]}</div>
                <div className={cn(
                  'text-2xl font-bold mt-0.5',
                  isSameDay(selectedDay, today) ? 'text-accent-blue' : 'text-text-primary'
                )}>
                  {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]}
                </div>
              </div>
              <button
                onClick={() => openCreateForDay(selectedDay)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 border border-white/[0.08] transition-all"
                title="Bu günə tapşırıq əlavə et"
              >
                <Plus size={14} />
              </button>
            </div>

            {selectedDayTasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={28} className="text-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-text-muted text-xs">Bu gün üçün tapşırıq yoxdur</p>
                <button
                  onClick={() => openCreateForDay(selectedDay)}
                  className="mt-3 text-xs text-accent-blue hover:underline"
                >
                  Əlavə et
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-text-muted text-xs mb-2">{selectedDayTasks.length} tapşırıq</div>
                {selectedDayTasks.map(t => {
                  const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Gözləyir']
                  const overdue = t.dueDate && getDaysLeft(t.dueDate) < 0 && t.status !== 'Tamamlandı'
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl p-3 cursor-pointer hover:opacity-80 transition-opacity group"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                      onClick={() => openEdit(t)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={cn('text-text-primary text-xs font-medium leading-snug flex-1', t.status === 'Tamamlandı' && 'line-through text-text-muted')}>
                          {t.title}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); openEdit(t) }}
                            className="w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                            <Edit2 size={10} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(t) }}
                            className="w-5 h-5 rounded flex items-center justify-center text-text-secondary hover:text-accent-red transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={t.status} />
                          <PriorityBadge priority={t.priority} />
                        </div>
                        {t.assignee && (
                          <div className="flex items-center gap-1 text-[10px] text-text-muted">
                            <User size={9} /> {t.assignee}
                          </div>
                        )}
                        {t.projectName && (
                          <div className="flex items-center gap-1 text-[10px] text-text-muted truncate">
                            <Clock size={9} /> {t.projectName}
                          </div>
                        )}
                        {t.tags && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag size={9} className="text-text-muted" />
                            {t.tags.split(',').map(tg => tg.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] text-text-muted">{tag}</span>
                            ))}
                          </div>
                        )}
                        {overdue && (
                          <div className="flex items-center gap-1 text-[10px] text-accent-red">
                            <AlertCircle size={9} /> Gecikmiş
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={modal === 'create'} onClose={() => { setModal(null); setNewTaskDate('') }} title="Yeni Tapşırıq">
        <TaskForm
          initial={newTaskDate ? { dueDate: newTaskDate } : undefined}
          projects={projects}
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => { setModal(null); setNewTaskDate('') }}
          loading={saving}
        />
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelectedTask(null) }} title="Tapşırığı Düzəlt">
        {selectedTask && (
          <TaskForm
            initial={selectedTask}
            projects={projects}
            teamNames={teamNames}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setSelectedTask(null) }}
            loading={saving}
          />
        )}
      </Modal>

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
