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
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import {
  ArrowLeft, Calendar, User, DollarSign, CheckSquare,
  Plus, RefreshCw, Zap, Columns, List, Edit2, Trash2,
  Sparkles, X, Copy, Check
} from 'lucide-react'
import { formatDate, formatDateShort, getDaysLeft, cn } from '@/lib/utils'
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
  const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const handleSummary = async () => {
    if (!project) return
    setSummaryOpen(true)
    setSummaryLoading(true)
    setSummary('')
    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
      if (!apiKey) { setSummary('❌ NEXT_PUBLIC_GROQ_API_KEY təyin edilməyib.'); setSummaryLoading(false); return }

      const totalTasks = tasks.length
      const doneTasks = tasks.filter(t => t.status === 'Tamamlandı').length
      const inProgressTasks = tasks.filter(t => t.status === 'Davam edir').length
      const waitingTasks = tasks.filter(t => t.status === 'Gözləyir').length
      const reviewingTasks = tasks.filter(t => t.status === 'Yoxlanılır').length
      const overdueTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'Tamamlandı') return false
        return new Date(t.dueDate) < new Date()
      }).length
      const taskTitles = tasks.slice(0, 15).map(t => `- ${t.title} [${t.status}, ${t.priority}]`).join('\n') || 'Tapşırıq yoxdur'

      const prompt = `Aşağıdakı layihə haqqında Azərbaycan dilində peşəkar, lakin oxunaqlı bir xülasə yaz.
Xülasə 3-5 abzasdan ibarət olsun: ümumi vəziyyət, irəliləyiş, diqqət tələb edən sahələr, tövsiyələr.
Markdown formatından istifadə et (## başlıqlar, **qalın**, - siyahılar).

**Layihə məlumatları:**
- Ad: ${project.name}
- Təsvir: ${project.description || 'Yoxdur'}
- Status: ${project.status}
- Prioritet: ${project.priority}
- Rəhbər: ${project.owner || 'Təyin edilməyib'}
- Başlanğıc: ${project.startDate || 'Qeyd edilməyib'}
- Son tarix: ${project.endDate || 'Qeyd edilməyib'}
- Büdcə: ${project.budget ? `₼${Number(project.budget).toLocaleString()}` : 'Qeyd edilməyib'}
- İrəliləyiş: ${project.progress}%

**Tapşırıq statistikası:**
- Ümumi: ${totalTasks}
- Tamamlandı: ${doneTasks}
- Davam edir: ${inProgressTasks}
- Gözləyir: ${waitingTasks}
- Yoxlanılır: ${reviewingTasks}
- Gecikmiş: ${overdueTasks}

**Tapşırıqlardan nümunələr:**
${taskTitles}

Xülasəni peşəkar, analitik və Azərbaycan dilinin rəsmi üslubunda yaz.`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })
      const data = await res.json()
      if (res.ok) setSummary(data.choices?.[0]?.message?.content || '')
      else setSummary(`❌ Xəta: ${data.error?.message || JSON.stringify(data.error)}`)
    } catch (err) {
      setSummary(`❌ Şəbəkə xətası: ${err instanceof Error ? err.message : 'Bilinməyən xəta'}`)
    }
    setSummaryLoading(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
                <button
                  onClick={handleSummary}
                  className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all text-accent-purple hover:bg-accent-purple/10 border border-accent-purple/20"
                >
                  <Sparkles size={12} />
                  AI Xülasə
                </button>
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

      {/* Tasks header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">
          Tapşırıqlar
          {tasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted bg-white/[0.05] px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setTaskView('kanban')}
              title="Kanban"
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                taskView === 'kanban' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
            >
              <Columns size={13} />
            </button>
            <button
              onClick={() => setTaskView('list')}
              title="Siyahı"
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                taskView === 'list' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
            >
              <List size={13} />
            </button>
          </div>
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
      ) : taskView === 'kanban' ? (
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
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Tapşırıq', 'Status', 'Prioritet', 'İcraçı', 'Son tarix', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const daysLeft = getDaysLeft(task.dueDate)
                const overdue = task.dueDate && daysLeft < 0 && task.status !== 'Tamamlandı'
                const isDone = task.status === 'Tamamlandı'
                return (
                  <tr key={task.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleComplete(task)}
                          className={cn(
                            'flex-shrink-0 transition-colors',
                            isDone ? 'text-accent-green' : 'text-text-muted hover:text-accent-green'
                          )}
                        >
                          <CheckSquare size={13} className={isDone ? 'fill-accent-green/20' : ''} />
                        </button>
                        <div className="min-w-0">
                          <div className={cn('font-medium truncate', isDone ? 'line-through text-text-muted' : 'text-text-primary')}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-text-muted text-xs mt-0.5 truncate">{task.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
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
      )}

      {/* AI Summary Panel */}
      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSummaryOpen(false)}>
          <div
            className="relative w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ background: 'rgb(var(--bg-card))', borderLeft: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'rgb(var(--bg-card))' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
                  <Sparkles size={14} className="text-accent-purple" />
                </div>
                <div>
                  <div className="text-text-primary text-sm font-semibold">AI Layihə Xülasəsi</div>
                  <div className="text-text-muted text-xs">Groq · Llama 3.3 70B</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {summary && !summaryLoading && (
                  <button
                    onClick={handleCopy}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all"
                    title="Kopyala"
                  >
                    {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  onClick={() => setSummaryOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-5">
              {summaryLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-accent-purple text-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-accent-purple animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-text-secondary text-xs">Xülasə hazırlanır...</span>
                  </div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${70 + i * 8}%` }} />
                      <div className="h-3 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${55 + i * 6}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <MarkdownRenderer content={summary} />
              )}
            </div>

            {/* Footer */}
            {summary && !summaryLoading && (
              <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-text-muted text-xs">Groq API tərəfindən yaradılmışdır</span>
                <button
                  onClick={handleSummary}
                  className="text-xs text-accent-purple hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Yenilə
                </button>
              </div>
            )}
          </div>
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
