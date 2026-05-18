'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { RecurringTask, Priority, Project } from '@/lib/types'
import { useTeamNames } from '@/hooks/useSheets'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'
import {
  Repeat, Plus, Edit2, Trash2, Play, RefreshCw,
  Loader2, ChevronDown, ToggleLeft, ToggleRight,
  Calendar, FolderKanban, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'

const PRIORITIES: Priority[] = ['Aşağı', 'Orta', 'Yüksək', 'Kritik']
const RECURRENCES: { value: RecurringTask['recurrence']; label: string }[] = [
  { value: 'daily',   label: 'Günlük' },
  { value: 'weekly',  label: 'Həftəlik' },
  { value: 'monthly', label: 'Aylıq' },
]

function recurrenceLabel(r: RecurringTask['recurrence']): string {
  return RECURRENCES.find(x => x.value === r)?.label || r
}

function priorityColor(p: Priority): string {
  return p === 'Kritik' ? 'text-accent-red bg-accent-red/10 border-accent-red/20'
    : p === 'Yüksək' ? 'text-accent-orange bg-accent-orange/10 border-accent-orange/20'
    : p === 'Orta'   ? 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20'
    : 'text-text-secondary bg-[var(--surface-2)] border-[var(--border)]'
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  projectId: string
  title: string
  description: string
  priority: Priority
  assignee: string
  tags: string
  recurrence: RecurringTask['recurrence']
  nextDueDate: string
  isActive: boolean
}

const emptyForm = (): FormState => ({
  projectId: '',
  title: '',
  description: '',
  priority: 'Orta',
  assignee: '',
  tags: '',
  recurrence: 'weekly',
  nextDueDate: new Date().toISOString().split('T')[0],
  isActive: true,
})

interface RecurringFormProps {
  initial?: Partial<FormState>
  projects: Project[]
  teamNames: string[]
  onSubmit: (data: FormState) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

function RecurringForm({ initial, projects, teamNames, onSubmit, onCancel, loading }: RecurringFormProps) {
  const [form, setForm] = useState<FormState>({ ...emptyForm(), ...initial })
  const set = (k: keyof FormState, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Başlıq tələb olunur'); return }
    if (!form.projectId) { toast.error('Layihə seçin'); return }
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Layihə *</label>
        <select
          value={form.projectId}
          onChange={e => set('projectId', e.target.value)}
          className="inputM w-full"
          required
        >
          <option value="">Layihə seçin...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Başlıq *</label>
        <input
          required
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className="inputM w-full"
          placeholder="Tapşırıq başlığı..."
        />
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Açıqlama</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className="input w-full min-h-[70px] resize-none"
          placeholder="Açıqlama..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Prioritet</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} className="inputM w-full">
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Təkrarlama</label>
          <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} className="inputM w-full">
            {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">İcraçı</label>
          {teamNames.length > 0 ? (
            <select value={form.assignee} onChange={e => set('assignee', e.target.value)} className="inputM w-full">
              <option value="">Seçin...</option>
              {teamNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input
              value={form.assignee}
              onChange={e => set('assignee', e.target.value)}
              className="inputM w-full"
              placeholder="Ad Soyad"
            />
          )}
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Növbəti tarix</label>
          <input
            type="date"
            value={form.nextDueDate}
            onChange={e => set('nextDueDate', e.target.value)}
            className="inputM w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Etiketlər</label>
        <input
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          className="inputM w-full"
          placeholder="üst, alt, ..."
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div>
          <div className="text-text-primary text-sm font-medium">Aktiv</div>
          <div className="text-text-muted text-xs">Şablon aktiv olduqda avtomatik yaradılır</div>
        </div>
        <button
          type="button"
          onClick={() => set('isActive', !form.isActive)}
          className="transition-colors"
        >
          {form.isActive
            ? <ToggleRight size={28} className="text-accent-blue" />
            : <ToggleLeft size={28} className="text-text-muted" />}
        </button>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghostM flex-1 justify-center">Ləğv et</button>
        <button type="submit" disabled={loading} className="btn-primaryM flex-1 justify-center disabled:opacity-50">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Saxlanılır...</> : 'Yadda saxla'}
        </button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const { currentWorkspaceId } = useWorkspace()
  const [tasks, setTasks] = useState<RecurringTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<RecurringTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState('')
  const teamNames = useTeamNames()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const wsId = currentWorkspaceId || undefined
    const [tRes, pRes] = await Promise.all([
      db.recurringTasks.getAll(),
      db.projects.getAll(wsId),
    ])
    if (tRes.success && tRes.data) setTasks(tRes.data)
    if (pRes.success && pRes.data) setProjects(pRes.data)
    setLoading(false)
  }, [currentWorkspaceId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCreate = async (data: FormState) => {
    setSaving(true)
    const res = await db.recurringTasks.create(data)
    if (res.success) { toast.success('Şablon yaradıldı'); await fetchAll(); setModal(null) }
    else toast.error(res.error || 'Xəta')
    setSaving(false)
  }

  const handleEdit = async (data: FormState) => {
    if (!selected) return
    setSaving(true)
    const res = await db.recurringTasks.update(selected.id, data)
    if (res.success) { toast.success('Şablon yeniləndi'); await fetchAll(); setModal(null); setSelected(null) }
    else toast.error(res.error || 'Xəta')
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    setSaving(true)
    const res = await db.recurringTasks.delete(selected.id)
    if (res.success) { toast.success('Şablon silindi'); await fetchAll(); setModal(null); setSelected(null) }
    else toast.error(res.error || 'Xəta')
    setSaving(false)
  }

  const handleGenerate = async (task: RecurringTask) => {
    setGenerating(task.id)
    const res = await db.recurringTasks.generate(task.id)
    if (res.success) {
      toast.success(`"${task.title}" tapşırığı yaradıldı`)
      await fetchAll()
    } else {
      toast.error(res.error || 'Xəta')
    }
    setGenerating(null)
  }

  const handleToggleActive = async (task: RecurringTask) => {
    const res = await db.recurringTasks.update(task.id, { isActive: !task.isActive })
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isActive: !t.isActive } : t))
    }
  }

  const projectName = (id: string) => projects.find(p => p.id === id)?.name || id

  // Group by project
  const filtered = filterProject
    ? tasks.filter(t => t.projectId === filterProject)
    : tasks

  const grouped = filtered.reduce<Record<string, RecurringTask[]>>((acc, t) => {
    const key = t.projectId || '_none'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="page-headerM">
        <div>
          <h1>Təkrarlanan Tapşırıqlar</h1>
          <p className="sub">Avtomatik tapşırıq şablonlarını idarə edin</p>
        </div>
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <button onClick={fetchAll} className="btn-ghostM" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={() => { setSelected(null); setModal('create') }} className="btn-primaryM">
            <Plus size={14} /> Yeni Şablon
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="inputM"
          style={{ maxWidth: 280 }}
        >
          <option value="">Bütün layihələr</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {tasks.length > 0 && (
          <span className="text-text-muted text-sm">{filtered.length} şablon</span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cardM space-y-3">
              <div className="h-4 w-1/3 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="h-12 rounded-xl bg-[var(--surface-2)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cardM text-center" style={{ padding: 64 }}>
          <Repeat size={40} className="text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-text-secondary text-sm font-medium">Şablon tapılmadı</p>
          <p className="text-text-muted text-xs mt-1">Avtomatik tapşırıqlar üçün şablon yaradın</p>
          <button onClick={() => setModal('create')} className="btn-primaryM mt-4 mx-auto">
            <Plus size={14} /> Şablon yarat
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectId, groupTasks]) => (
            <div key={projectId} className="space-y-3">
              {/* Group header */}
              <div className="flex items-center gap-2">
                <FolderKanban size={14} className="text-accent-blue" />
                <span className="text-text-secondary text-sm font-semibold">
                  {projectId === '_none' ? 'Layihəsiz' : projectName(projectId)}
                </span>
                <span className="text-xs text-text-muted bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                  {groupTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'cardM space-y-3 transition-all',
                      !task.isActive && 'opacity-60'
                    )}
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary text-sm truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-text-muted text-xs mt-0.5 line-clamp-2">{task.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActive(task)}
                        className="flex-shrink-0 mt-0.5"
                        title={task.isActive ? 'Deaktiv et' : 'Aktiv et'}
                      >
                        {task.isActive
                          ? <ToggleRight size={22} className="text-accent-blue" />
                          : <ToggleLeft size={22} className="text-text-muted" />}
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('badge text-[10px]', priorityColor(task.priority))}>
                        {task.priority}
                      </span>
                      <span className="badge text-[10px] bg-accent-purple/10 text-accent-purple border-accent-purple/20">
                        <Repeat size={9} />
                        {recurrenceLabel(task.recurrence)}
                      </span>
                      {task.assignee && (
                        <span className="badge text-[10px] bg-[var(--surface-2)] text-text-secondary border-[var(--border)]">
                          {task.assignee}
                        </span>
                      )}
                    </div>

                    {/* Next due */}
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Calendar size={11} />
                      <span>Növbəti: </span>
                      <span className={cn(
                        'font-medium',
                        task.nextDueDate && new Date(task.nextDueDate) < new Date()
                          ? 'text-accent-red'
                          : 'text-text-secondary'
                      )}>
                        {task.nextDueDate
                          ? new Date(task.nextDueDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                      <button
                        onClick={() => handleGenerate(task)}
                        disabled={generating === task.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 disabled:opacity-50"
                      >
                        {generating === task.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Play size={12} />}
                        İndi yarat
                      </button>
                      <button
                        onClick={() => { setSelected(task); setModal('edit') }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[var(--surface-2)] transition-all"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => { setSelected(task); setModal('delete') }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Təkrarlanan Şablon">
        <RecurringForm
          projects={projects}
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelected(null) }} title="Şablonu Düzəlt">
        {selected && (
          <RecurringForm
            initial={selected}
            projects={projects}
            teamNames={teamNames}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setSelected(null) }}
            loading={saving}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === 'delete'} onClose={() => { setModal(null); setSelected(null) }} title="Şablonu Sil">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20">
              <AlertCircle size={16} className="text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-text-primary text-sm font-medium">&ldquo;{selected.title}&rdquo; şablonu silinəcək</div>
                <div className="text-text-secondary text-xs mt-0.5">Bu əməliyyat geri qaytarıla bilməz.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setSelected(null) }} className="btn-ghostM flex-1 justify-center">Ləğv et</button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 disabled:opacity-50"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Silinir...</> : 'Sil'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
