'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { sheetsApi } from '@/lib/sheets'
import { useTeamNames } from '@/hooks/useSheets'
import { Project, Task, TaskStatus } from '@/lib/types'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCard } from '@/components/tasks/TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton'
import {
  ArrowLeft, Calendar, User, DollarSign, CheckSquare,
  Plus, RefreshCw, Zap
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

const TASK_STATUSES: TaskStatus[] = ['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı']

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Gözləyir': '#94A3B8',
  'Davam edir': '#3B82F6',
  'Yoxlanılır': '#F59E0B',
  'Tamamlandı': '#10B981',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const teamNames = useTeamNames()

  const fetchData = async () => {
    setLoading(true)
    const [pRes, tRes] = await Promise.all([
      sheetsApi.projects.getById(id),
      sheetsApi.tasks.getAll(id),
    ])
    if (pRes.success && pRes.data) setProject(pRes.data)
    else { toast.error('Layihə tapılmadı'); router.push('/projects') }
    if (tRes.success && tRes.data) setTasks(tRes.data)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [id])

  const handleCreateTask = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true)
    const res = await sheetsApi.tasks.create({ ...data, projectId: id, projectName: project?.name || '' })
    if (res.success) { toast.success('Tapşırıq yaradıldı'); await fetchData() }
    else toast.error(res.error || 'Xəta')
    setSaving(false)
    setModal(null)
  }

  const handleEditTask = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedTask) return
    setSaving(true)
    const res = await sheetsApi.tasks.update(selectedTask.id, data)
    if (res.success) { toast.success('Tapşırıq yeniləndi'); await fetchData() }
    else toast.error(res.error || 'Xəta')
    setSaving(false)
    setModal(null)
    setSelectedTask(null)
  }

  const handleDeleteTask = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const res = await sheetsApi.tasks.delete(confirmDelete.id)
    if (res.success) { toast.success('Tapşırıq silindi'); await fetchData() }
    else toast.error(res.error || 'Xəta')
    setDeleting(false)
    setConfirmDelete(null)
  }

  const handleAutoProgress = async () => {
    if (!project || tasks.length === 0) return
    const completed = tasks.filter(t => t.status === 'Tamamlandı').length
    const newProgress = Math.round((completed / tasks.length) * 100)
    const res = await sheetsApi.projects.update(project.id, { ...project, progress: newProgress })
    if (res.success) {
      setProject(prev => prev ? { ...prev, progress: newProgress } : prev)
      toast.success(`İrəliləyiş ${newProgress}% olaraq yeniləndi`)
    }
  }

  const handleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'Tamamlandı' ? 'Gözləyir' : 'Tamamlandı'
    const res = await sheetsApi.tasks.update(task.id, { ...task, status: newStatus })
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    }
  }

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const task = tasks.find(t => t.id === taskId)
    if (task && task.status !== status) {
      const res = await sheetsApi.tasks.update(taskId, { ...task, status })
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
        toast.success(`"${task.title}" → ${status}`)
      }
    }
    setDragOverStatus(null)
  }

  const progress = Number(project?.progress) || 0

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors">
        <ArrowLeft size={15} /> Layihələrə qayıt
      </Link>

      {/* Project Header */}
      {loading ? (
        <div className="card p-6 space-y-4">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ) : project && (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: project.color || '#3B82F6' }}
            >
              {project.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary">{project.name}</h1>
              {project.description && (
                <p className="text-text-secondary text-sm mt-1">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-sm">
              <User size={15} className="text-accent-blue flex-shrink-0" />
              <div>
                <div className="text-text-muted text-xs">Rəhbər</div>
                <div className="text-text-primary font-medium">{project.owner || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={15} className="text-accent-purple flex-shrink-0" />
              <div>
                <div className="text-text-muted text-xs">Son tarix</div>
                <div className="text-text-primary font-medium">{formatDate(project.endDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={15} className="text-accent-green flex-shrink-0" />
              <div>
                <div className="text-text-muted text-xs">Büdcə</div>
                <div className="text-text-primary font-medium">
                  {project.budget ? `₼${Number(project.budget).toLocaleString()}` : '—'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare size={15} className="text-accent-cyan flex-shrink-0" />
              <div>
                <div className="text-text-muted text-xs">Tapşırıqlar</div>
                <div className="text-text-primary font-medium">{tasks.length}</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-text-muted text-xs">İrəliləyiş</span>
              <div className="flex items-center gap-2">
                <span className="text-text-primary text-xs font-semibold">{progress}%</span>
                {tasks.length > 0 && (
                  <button
                    onClick={handleAutoProgress}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md text-accent-blue hover:bg-accent-blue/10 border border-accent-blue/20 transition-all"
                    title="Tapşırıqlar əsasında hesabla"
                  >
                    <Zap size={10} /> Hesabla
                  </button>
                )}
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%`, background: project.color }} />
            </div>
          </div>
        </div>
      )}

      {/* Tasks Kanban */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">Tapşırıqlar</h2>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary !py-1.5 !px-3">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setModal('create')} className="btn-primary !py-1.5">
            <Plus size={14} /> Tapşırıq əlavə et
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Tapşırıq yoxdur"
          description="Bu layihəyə ilk tapşırığı əlavə edin"
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus size={15} /> Tapşırıq əlavə et
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TASK_STATUSES.map(status => {
            const statusTasks = tasks.filter(t => t.status === status)
            const isOver = dragOverStatus === status
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[status] }} />
                  <span className="text-text-secondary text-sm font-medium">{status}</span>
                  <span className="text-xs text-text-muted bg-white/[0.05] px-1.5 py-0.5 rounded-full ml-auto">
                    {statusTasks.length}
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
                  {statusTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable
                      onEdit={t => { setSelectedTask(t); setModal('edit') }}
                      onDelete={setConfirmDelete}
                      onComplete={handleComplete}
                    />
                  ))}
                  {statusTasks.length === 0 && (
                    <div className={cn(
                      'border border-dashed rounded-xl p-4 text-center text-xs transition-all',
                      isOver ? 'border-white/[0.25] text-text-secondary' : 'border-white/[0.08] text-text-muted'
                    )}>
                      {isOver ? 'Buraya burax' : 'Boş'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Tapşırıq">
        <TaskForm
          initial={{ projectId: id, projectName: project?.name }}
          teamNames={teamNames}
          onSubmit={handleCreateTask}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelectedTask(null) }} title="Tapşırığı Düzəlt">
        {selectedTask && (
          <TaskForm
            initial={selectedTask}
            teamNames={teamNames}
            onSubmit={handleEditTask}
            onCancel={() => { setModal(null); setSelectedTask(null) }}
            loading={saving}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteTask}
        title="Tapşırığı sil"
        message={`"${confirmDelete?.title}" tapşırığını silmək istədiyinizə əminsiniz?`}
        loading={deleting}
      />
    </div>
  )
}
