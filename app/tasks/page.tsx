'use client'

import { useState } from 'react'
import { useTasks, useProjects, useTeamNames } from '@/hooks/useSheets'
import { Task } from '@/lib/types'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Plus, Search, CheckSquare, RefreshCw, LayoutGrid, Columns } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLUMNS = ['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı'] as const
const PRIORITY_FILTERS = ['Hamısı', 'Kritik', 'Yüksək', 'Orta', 'Aşağı']

export default function TasksPage() {
  const { tasks, loading, refresh, create, update, remove } = useTasks()
  const { projects } = useProjects()
  const teamNames = useTeamNames()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('Hamısı')
  const [projectFilter, setProjectFilter] = useState('Hamısı')
  const [view, setView] = useState<'kanban' | 'grid'>('kanban')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
          <button
            onClick={() => setView('kanban')}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'kanban' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <Columns size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'grid' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <LayoutGrid size={15} />
          </button>
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
            const colors: Record<string, string> = {
              'Gözləyir': '#94A3B8',
              'Davam edir': '#3B82F6',
              'Yoxlanılır': '#F59E0B',
              'Tamamlandı': '#10B981',
            }
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: colors[status] }} />
                  <span className="text-text-primary text-sm font-semibold">{status}</span>
                  <span className="text-xs text-text-muted bg-white/[0.05] px-1.5 py-0.5 rounded-full ml-auto">
                    {col.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {col.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={t => { setSelectedTask(t); setModal('edit') }}
                      onDelete={setConfirmDelete}
                    />
                  ))}
                  {col.length === 0 && (
                    <div className="border border-dashed border-white/[0.06] rounded-xl p-6 text-center text-text-muted text-xs">
                      Boş
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={t => { setSelectedTask(t); setModal('edit') }}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
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
