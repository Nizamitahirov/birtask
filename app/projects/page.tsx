'use client'

import { useState } from 'react'
import { useProjects, useTeamNames } from '@/hooks/useSheets'
import { Project } from '@/lib/types'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Plus, Search, FolderKanban, LayoutGrid, List, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = ['Hamısı', 'Planlaşdırılır', 'Davam edir', 'Tamamlandı', 'Dayandırıldı']

export default function ProjectsPage() {
  const { projects, loading, refresh, create, update, remove } = useProjects()
  const teamNames = useTeamNames()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Hamısı')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Hamısı' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleCreate = async (data: Omit<Project, 'id' | 'createdAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<Project, 'id' | 'createdAt'>) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Layihələr</h1>
          <p className="text-text-secondary text-sm mt-1">{projects.length} layihə</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-secondary w-9 h-9 !p-0 justify-center" title="Yenilə">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={15} /> Yeni Layihə
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Layihə axtar..."
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView('grid')}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'grid' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              view === 'list' ? 'bg-white/[0.1] text-text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Layihə tapılmadı"
          description="Yeni layihə yaradın və ya axtarışı dəyişdirin"
          action={
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus size={15} /> Yeni Layihə
            </button>
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={p => { setSelected(p); setModal('edit') }}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Layihə', 'Status', 'Prioritet', 'Rəhbər', 'Son tarix', 'İrəliləyiş', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: p.color }}>
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-text-primary font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge text-xs" style={{ color: '#94A3B8' }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.priority}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.owner || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.endDate || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 progress-bar">
                        <div className="progress-fill" style={{ width: `${p.progress}%`, background: p.color }} />
                      </div>
                      <span className="text-text-secondary text-xs">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelected(p); setModal('edit') }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all">
                        ✏️
                      </button>
                      <button onClick={() => setConfirmDelete(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni Layihə" size="lg">
        <ProjectForm
          teamNames={teamNames}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelected(null) }} title="Layihəni Düzəlt" size="lg">
        {selected && (
          <ProjectForm
            initial={selected}
            teamNames={teamNames}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setSelected(null) }}
            loading={saving}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Layihəni sil"
        message={`"${confirmDelete?.name}" layihəsini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        loading={deleting}
      />
    </div>
  )
}
