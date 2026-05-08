'use client'

import { useState } from 'react'
import { useTeam } from '@/hooks/useSheets'
import { TeamMember } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Plus, Search, Users, Edit2, Trash2, RefreshCw, Mail, Phone, Building2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'

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

export default function TeamPage() {
  const { members, loading, refresh, create, update, remove } = useTeam()
  const [search, setSearch] = useState('')
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

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Üzv axtar..."
        />
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
