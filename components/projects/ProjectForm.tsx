'use client'

import { useState } from 'react'
import { Project, Priority, ProjectStatus } from '@/lib/types'
import { PROJECT_COLORS, cn } from '@/lib/utils'
import { MultiSelect } from '@/components/ui/MultiSelect'

interface ProjectFormProps {
  initial?: Partial<Project>
  teamNames?: string[]
  onSubmit: (data: Omit<Project, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const statuses: ProjectStatus[] = ['Planlaşdırılır', 'Davam edir', 'Tamamlandı', 'Dayandırıldı']
const priorities: Priority[] = ['Aşağı', 'Orta', 'Yüksək', 'Kritik']

export function ProjectForm({ initial, teamNames = [], onSubmit, onCancel, loading }: ProjectFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    status: (initial?.status || 'Planlaşdırılır') as ProjectStatus,
    priority: (initial?.priority || 'Orta') as Priority,
    startDate: initial?.startDate || '',
    endDate: initial?.endDate || '',
    budget: initial?.budget || '',
    owner: initial?.owner || '',
    color: initial?.color || PROJECT_COLORS[0],
    progress: initial?.progress?.toString() || '0',
  })
  const [owners, setOwners] = useState<string[]>(
    initial?.owner ? initial.owner.split(',').map(s => s.trim()).filter(Boolean) : []
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form, owner: owners.join(', ') } as Omit<Project, 'id' | 'createdAt'>)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Layihə adı *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Layihənin adını daxil edin" />
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Təsvir</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input resize-none" rows={2} placeholder="Layihə haqqında qısa məlumat" />
      </div>

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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Başlama tarixi</label>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Bitmə tarixi</label>
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Büdcə (AZN)</label>
          <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} className="input" placeholder="0" />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">İrəliləyiş (%)</label>
          <input type="number" min="0" max="100" value={form.progress} onChange={e => set('progress', e.target.value)} className="input" placeholder="0" />
        </div>
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Məsul şəxslər</label>
        {teamNames.length > 0 ? (
          <MultiSelect options={teamNames} value={owners} onChange={setOwners} placeholder="Məsul seçin..." />
        ) : (
          <input value={form.owner} onChange={e => set('owner', e.target.value)} className="input" placeholder="Ad Soyad" />
        )}
      </div>

      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Rəng</label>
        <div className="flex gap-2">
          {PROJECT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={cn('w-7 h-7 rounded-lg transition-all duration-200 flex-shrink-0', form.color === c && 'ring-2 ring-white/50 scale-110')}
              style={{ background: c }} />
          ))}
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
