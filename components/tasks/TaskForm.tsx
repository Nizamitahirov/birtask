'use client'

import { useState } from 'react'
import { Task, Priority, TaskStatus, Project } from '@/lib/types'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { AIWriteButton } from '@/components/ai/AIWriteButton'

interface TaskFormProps {
  initial?: Partial<Task>
  projects?: Project[]
  teamNames?: string[]
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const statuses: TaskStatus[] = ['Gözləyir', 'Davam edir', 'Yoxlanılır', 'Tamamlandı']
const priorities: Priority[] = ['Aşağı', 'Orta', 'Yüksək', 'Kritik']

export function TaskForm({ initial, projects = [], teamNames = [], onSubmit, onCancel, loading }: TaskFormProps) {
  const [form, setForm] = useState({
    projectId: initial?.projectId || '',
    projectName: initial?.projectName || '',
    title: initial?.title || '',
    description: initial?.description || '',
    status: (initial?.status || 'Gözləyir') as TaskStatus,
    priority: (initial?.priority || 'Orta') as Priority,
    assignee: initial?.assignee || '',
    dueDate: initial?.dueDate || '',
    tags: initial?.tags || '',
  })
  const [assignees, setAssignees] = useState<string[]>(
    initial?.assignee ? initial.assignee.split(',').map(s => s.trim()).filter(Boolean) : []
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const proj = projects.find(p => p.id === e.target.value)
    setForm(f => ({ ...f, projectId: e.target.value, projectName: proj?.name || '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form, assignee: assignees.join(', ') } as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Tapşırıq adı *</label>
        <input
          required
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className="input"
          placeholder="Tapşırığın adını daxil edin"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-text-secondary text-xs">Təsvir</label>
          <AIWriteButton
            disabled={!form.title.trim()}
            getContext={() => ({
              type: 'task',
              title: form.title,
              projectName: form.projectName,
              status: form.status,
              priority: form.priority,
            })}
            onResult={text => set('description', text)}
          />
        </div>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className="input resize-none"
          rows={2}
          placeholder="Tapşırıq haqqında məlumat"
        />
      </div>

      {projects.length > 0 && (
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Layihə</label>
          <select value={form.projectId} onChange={handleProjectChange} className="select">
            <option value="">Layihə seçin...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="select">
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Prioritet</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} className="select">
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">İcraçılar</label>
        {teamNames.length > 0 ? (
          <MultiSelect
            options={teamNames}
            value={assignees}
            onChange={setAssignees}
            placeholder="İcraçı seçin..."
          />
        ) : (
          <input
            value={form.assignee}
            onChange={e => set('assignee', e.target.value)}
            className="input"
            placeholder="Ad Soyad (vergüllə ayırın)"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Son tarix</label>
          <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Teqlər</label>
          <input value={form.tags} onChange={e => set('tags', e.target.value)} className="input" placeholder="tag1, tag2" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Ləğv et</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
          {loading ? 'Saxlanılır...' : (initial?.id ? 'Yenilə' : 'Yarat')}
        </button>
      </div>
    </form>
  )
}
