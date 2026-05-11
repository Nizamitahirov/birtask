'use client'

import { useState } from 'react'
import { useTasks, useProjects, useTeamNames } from '@/hooks/useSheets'
import { Task, TaskStatus } from '@/lib/types'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Plus, Search, CheckSquare, RefreshCw, LayoutGrid, Columns, List, Edit2, Trash2, Calendar, CalendarDays, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatDateShort, getDaysLeft } from '@/lib/utils'

const STATUS_COLUMNS: TaskStatus[] = ['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı']
const PRIORITY_FILTERS = ['Hamısı', 'Kritik', 'Yüksək', 'Orta', 'Aşağı']

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Gözləyir': '#94A3B8',
  'Davam edir': '#3B82F6',
  'Yoxlanılır': '#F59E0B',
  'Tamamlandı': '#10B981',
}

export default function TasksPage() {
  const { tasks, loading, refresh, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const teamNames = useTeamNames()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('Hamısı')
  const [projectFilter, setProjectFilter] = useState('Hamısı')
  const [view, setView] = useState<'kanban' | 'grid' | 'list' | 'calendar'>('kanban')
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    const matchPriority = priorityFilter === 'Hamısı' || t.priority === priorityFilter
    const matchProject = projectFilter === 'Hamısı' || t.projectId === projectFilter
    return matchSearch && matchPriority && matchProject
  })

  const handleCreate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
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

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const task = tasks.find(t => t.id === taskId)
    if (task && task.status !== status) {
      await update(taskId, { ...task, status })
    }
    setDragOverStatus(null)
  }

  const handleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'Tamamlandı' ? 'Gözləyir' : 'Tamamlandı'
    await update(task.id, { ...task, status: newStatus })
  }

  // Calendar view data
  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const calFirstDay = new Date(calYear, calMonthIdx, 1).getDay()
  const calDaysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()
  const calStartOffset = (calFirstDay + 6) % 7
  const calTotalCells = Math.ceil((calStartOffset + calDaysInMonth) / 7) * 7
  const MONTH_NAMES_AZ = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr']
  const DAY_NAMES_AZ = ['B.e','Ç.a','Ç','C.a','C','Ş','B']
  const calToday = new Date()
  const calTasksByDay: Record<number, Task[]> = {}
  filtered.forEach(t => {
    if (!t.dueDate) return
    const d = new Date(t.dueDate)
    if (d.getFullYear() === calYear && d.getMonth() === calMonthIdx) {
      const day = d.getDate()
      if (!calTasksByDay[day]) calTasksByDay[day] = []
      calTasksByDay[day].push(t)
    }
  })
  const TASK_STATUS_COLORS: Record<string, string> = {
    'Gözləyir': '#94A3B8', 'Davam edir': '#3B82F6',
    'Yoxlanılır': '#F59E0B', 'Tamamlandı': '#10B981',
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Tapşırıqlar</h1>
          <p className="text-text-secondary text-sm mt-1">{tasks.length} tapşırıq</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-secondary w-9 h-9 !p-0 justify-center">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={15} /> Yeni Tapşırıq
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Tapşırıq axtar..."
          />
        </div>

        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="select max-w-[180px]"
        >
          <option value="Hamısı">Bütün layihələr</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex gap-1 flex-wrap">
          {PRIORITY_FILTERS.map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                priorityFilter === p
                  ? 'bg-accent-purple text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {([['kanban', Columns], ['grid', LayoutGrid], ['list', List], ['calendar', CalendarDays]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={v === 'kanban' ? 'Kanban' : v === 'grid' ? 'Grid' : v === 'list' ? 'Siyahı' : 'Təqvim'}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                view === v ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Tapşırıq tapılmadı"
          description="Yeni tapşırıq yaradın"
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus size={15} /> Yeni Tapşırıq
            </button>
          }
        />
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(status => {
            const col = filtered.filter(t => t.status === status)
            const isOver = dragOverStatus === status
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[status] }} />
                  <span className="text-text-primary text-sm font-semibold">{status}</span>
                  <span className="text-xs text-text-muted bg-white/[0.05] px-1.5 py-0.5 rounded-full ml-auto">
                    {col.length}
                  </span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status) }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null)
                  }}
                  onDrop={(e) => handleDrop(e, status)}
                  className={cn(
                    'space-y-2 min-h-[120px] rounded-xl p-1.5 transition-all duration-150',
                    isOver && 'bg-white/[0.04] ring-1 ring-dashed ring-white/[0.2]'
                  )}
                >
                  {col.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable
                      onEdit={t => { setSelectedTask(t); setModal('edit') }}
                      onDelete={setConfirmDelete}
                      onComplete={handleComplete}
                    />
                  ))}
                  {col.length === 0 && (
                    <div className={cn(
                      'border border-dashed rounded-xl p-6 text-center text-xs transition-all',
                      isOver ? 'border-white/[0.25] text-text-secondary' : 'border-white/[0.06] text-text-muted'
                    )}>
                      {isOver ? 'Buraya burax' : 'Boş'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={t => { setSelectedTask(t); setModal('edit') }}
              onDelete={setConfirmDelete}
              onComplete={handleComplete}
            />
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Tapşırıq', 'Layihə', 'Status', 'Prioritet', 'İcraçı', 'Son tarix', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const daysLeft = getDaysLeft(task.dueDate)
                const overdue = task.dueDate && daysLeft < 0 && task.status !== 'Tamamlandı'
                return (
                  <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="font-medium text-text-primary truncate">{task.title}</div>
                      {task.description && (
                        <div className="text-text-muted text-xs mt-0.5 truncate">{task.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs max-w-[140px] truncate">
                      {task.projectName || '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                        <User size={11} className="text-text-muted flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{task.assignee || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={cn('flex items-center gap-1.5 text-xs', overdue ? 'text-accent-red' : 'text-text-secondary')}>
                        <Calendar size={11} className="flex-shrink-0" />
                        {task.dueDate
                          ? overdue ? `${Math.abs(daysLeft)}g gecikdi` : formatDateShort(task.dueDate)
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedTask(task); setModal('edit') }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(task)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : view === 'calendar' ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <button
              onClick={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-semibold text-text-primary text-sm">
              {MONTH_NAMES_AZ[calMonthIdx]} {calYear}
            </span>
            <button
              onClick={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DAY_NAMES_AZ.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-medium text-text-muted">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: calTotalCells }).map((_, i) => {
              const dayNum = i - calStartOffset + 1
              const isCurrentMonth = dayNum >= 1 && dayNum <= calDaysInMonth
              const isToday = isCurrentMonth && calToday.getDate() === dayNum &&
                calToday.getMonth() === calMonthIdx && calToday.getFullYear() === calYear
              const dayTasks = isCurrentMonth ? (calTasksByDay[dayNum] || []) : []
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[80px] p-1.5 border-r border-b border-white/[0.04] last:border-r-0',
                    !isCurrentMonth && 'opacity-30'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 font-medium',
                    isToday ? 'bg-accent-blue text-white' : 'text-text-muted'
                  )}>
                    {isCurrentMonth ? dayNum : ''}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTask(t); setModal('edit') }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate hover:opacity-80 transition-opacity"
                        style={{
                          background: TASK_STATUS_COLORS[t.status] + '22',
                          color: TASK_STATUS_COLORS[t.status],
                          borderLeft: `2px solid ${TASK_STATUS_COLORS[t.status]}`
                        }}
                      >
                        {t.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-text-muted pl-1">+{dayTasks.length - 3} daha</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Tapşırıq">
        <TaskForm
          projects={projects}
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
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
