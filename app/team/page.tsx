'use client'

import { useState } from 'react'
import { useTeam, useTasks } from '@/hooks/useSheets'
import { TeamMember, Task } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Plus, Search, Users, Edit2, Trash2, RefreshCw, Mail, Phone, Building2, BarChart3, LayoutGrid, AlertTriangle } from 'lucide-react'
import { getInitials, getDaysLeft, cn } from '@/lib/utils'

const AVATAR_COLORS = [
  'from-accent-blue to-accent-purple',
  'from-accent-cyan to-accent-blue',
  'from-accent-purple to-accent-pink',
  'from-accent-green to-accent-cyan',
  'from-accent-yellow to-accent-green',
]

function MemberCard({ member, onEdit, onDelete, idx }: {
  member: TeamMember
  onEdit: (m: TeamMember) => void
  onDelete: (m: TeamMember) => void
  idx: number
}) {
  const gradient = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  return (
    <div className="card p-5 hover:border-white/[0.12] hover:shadow-card-hover transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {getInitials(member.name)}
          </div>
          <div>
            <h3 className="text-text-primary font-semibold text-sm">{member.name}</h3>
            <p className="text-text-secondary text-xs">{member.role}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(member)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(member)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {member.department && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Building2 size={12} className="text-text-muted flex-shrink-0" />
            <span>{member.department}</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Mail size={12} className="text-text-muted flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Phone size={12} className="text-text-muted flex-shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberForm({ initial, onSubmit, onCancel, loading }: {
  initial?: Partial<TeamMember>
  onSubmit: (data: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    role: initial?.role || '',
    department: initial?.department || '',
    phone: initial?.phone || '',
    avatar: initial?.avatar || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Ad Soyad *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Ad Soyad" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Telefon</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+994 50 xxx xx xx" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Vəzifə</label>
          <input value={form.role} onChange={e => set('role', e.target.value)} className="input" placeholder="Developer, Manager..." />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Şöbə</label>
          <input value={form.department} onChange={e => set('department', e.target.value)} className="input" placeholder="Texnologiya, Dizayn..." />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Ləğv et</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
          {loading ? 'Saxlanılır...' : (initial?.id ? 'Yenilə' : 'Əlavə et')}
        </button>
      </div>
    </form>
  )
}

function WorkloadView({ members, tasks }: { members: TeamMember[]; tasks: Task[] }) {
  const today = new Date()

  const memberStats = members.map((m, idx) => {
    const myTasks = tasks.filter(t => t.assignee === m.name)
    const waiting = myTasks.filter(t => t.status === 'Gözləyir').length
    const inProgress = myTasks.filter(t => t.status === 'Davam edir').length
    const reviewing = myTasks.filter(t => t.status === 'Yoxlanılır').length
    const done = myTasks.filter(t => t.status === 'Tamamlandı').length
    const overdue = myTasks.filter(t => {
      if (!t.dueDate || t.status === 'Tamamlandı') return false
      return getDaysLeft(t.dueDate) < 0
    }).length
    const total = myTasks.length
    const donePercent = total > 0 ? Math.round((done / total) * 100) : 0
    const gradient = ['from-accent-blue to-accent-purple','from-accent-cyan to-accent-blue','from-accent-purple to-accent-pink','from-accent-green to-accent-cyan','from-accent-yellow to-accent-green'][idx % 5]
    return { member: m, waiting, inProgress, reviewing, done, overdue, total, donePercent, gradient }
  }).sort((a, b) => b.total - a.total)

  const maxTasks = Math.max(...memberStats.map(s => s.total), 1)

  return (
    <div className="space-y-3">
      {memberStats.map(({ member, waiting, inProgress, reviewing, done, overdue, total, donePercent, gradient }) => (
        <div key={member.id} className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
              {getInitials(member.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-primary text-sm font-medium">{member.name}</span>
                <span className="text-text-muted text-xs">{member.role}</span>
                {overdue > 0 && (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                    <AlertTriangle size={9} /> {overdue} gecikmiş
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(total / maxTasks) * 100}%`, background: done > 0 ? '#10B981' : '#3B82F6' }}
                  />
                </div>
                <span className="text-text-muted text-xs whitespace-nowrap">{total} tapşırıq</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Gözləyir', count: waiting, color: '#94A3B8' },
              { label: 'Davam edir', count: inProgress, color: '#3B82F6' },
              { label: 'Yoxlanılır', count: reviewing, color: '#F59E0B' },
              { label: 'Tamamlandı', count: done, color: '#10B981' },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="rounded-lg px-2 py-1.5 text-center"
                style={{ background: `${color}11`, border: `1px solid ${color}22` }}
              >
                <div className="text-sm font-bold" style={{ color }}>{count}</div>
                <div className="text-[10px] text-text-muted leading-tight mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TeamPage() {
  const { members, loading, refresh, create, update, remove } = useTeam()
  const { tasks } = useTasks()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'workload'>('grid')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase()) ||
    m.department?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    if (!selected) return
    setSaving(true)
    await update(selected.id, data)
    setSaving(false)
    setModal(null)
    setSelected(null)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Komanda</h1>
          <p className="text-text-secondary text-sm mt-1">{members.length} üzv</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-secondary w-9 h-9 !p-0 justify-center">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={15} /> Üzv əlavə et
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Üzv axtar..."
          />
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView('grid')}
            title="Kartlar"
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'grid' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('workload')}
            title="İş yükü"
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'workload' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <BarChart3 size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Üzv tapılmadı"
          description="Komandanıza ilk üzvü əlavə edin"
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus size={15} /> Üzv əlavə et
            </button>
          }
        />
      ) : view === 'workload' ? (
        <WorkloadView members={filtered} tasks={tasks} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <MemberCard
              key={m.id}
              member={m}
              idx={i}
              onEdit={m => { setSelected(m); setModal('edit') }}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
      )}

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Üzv əlavə et">
        <MemberForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelected(null) }} title="Üzvü düzəlt">
        {selected && (
          <MemberForm initial={selected} onSubmit={handleEdit} onCancel={() => { setModal(null); setSelected(null) }} loading={saving} />
        )}
      </Modal>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Üzvü sil"
        message={`"${confirmDelete?.name}" üzvünü komandadan silmək istədiyinizə əminsiniz?`}
        loading={deleting}
      />
    </div>
  )
}
