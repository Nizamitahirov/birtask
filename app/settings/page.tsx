'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { User, UserRole, Workspace, WorkflowRule, WorkflowTrigger } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Settings, Database, CheckCircle, AlertCircle, RefreshCw,
  Users, Plus, Edit2, Trash2, KeyRound, Search, ShieldCheck,
  UserCheck, Eye, EyeOff, Loader2, X, Shield, UserCog,
  Download, Upload, FileText, FileJson, Package, Layers, Zap,
  ToggleLeft, ToggleRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin:   'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
    manager: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    member:  'bg-accent-green/10 text-accent-green border-accent-green/20',
    viewer:  'bg-[var(--surface-2)] text-text-secondary border-[var(--border)]',
  }
  const labels: Record<UserRole, string> = {
    admin: 'Admin', manager: 'Menecer', member: 'Üzv', viewer: 'İzləyici',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', styles[role])}>
      {role === 'admin' && <Shield size={9} />}
      {role === 'manager' && <UserCog size={9} />}
      {role === 'member' && <UserCheck size={9} />}
      {role === 'viewer' && <Eye size={9} />}
      {labels[role]}
    </span>
  )
}

// ── User form (create / edit) ─────────────────────────────────────────────────

interface UserFormProps {
  initial?: Partial<User>
  mode: 'create' | 'edit'
  onSubmit: (data: Partial<User> & { password?: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

function UserForm({ initial, mode, onSubmit, onCancel, loading }: UserFormProps) {
  const [form, setForm] = useState({
    username:    initial?.username    || '',
    displayName: initial?.displayName || '',
    email:       initial?.email       || '',
    role:        (initial?.role       || 'member') as UserRole,
    department:  initial?.department  || '',
    isActive:    initial?.isActive    ?? true,
    password:    '',
  })
  const [showPw, setShowPw] = useState(false)

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Partial<User> & { password?: string; mustChangePassword?: boolean } = {
      displayName: form.displayName,
      email:       form.email,
      role:        form.role,
      department:  form.department,
      isActive:    form.isActive,
    }
    if (mode === 'create') {
      payload.username         = form.username
      payload.password         = form.password
      payload.mustChangePassword = true
    }
    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'create' && (
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">İstifadəçi adı *</label>
          <input
            required
            value={form.username}
            onChange={e => set('username', e.target.value)}
            className="inputM w-full"
            placeholder="username"
            autoComplete="off"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Ad Soyad *</label>
          <input
            required
            value={form.displayName}
            onChange={e => set('displayName', e.target.value)}
            className="inputM w-full"
            placeholder="Ad Soyad"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="inputM w-full"
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Rol *</label>
          <select
            value={form.role}
            onChange={e => set('role', e.target.value)}
            className="inputM w-full"
          >
            <option value="admin">Admin</option>
            <option value="manager">Menecer</option>
            <option value="member">Üzv</option>
            <option value="viewer">İzləyici</option>
          </select>
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Şöbə</label>
          <input
            value={form.department}
            onChange={e => set('department', e.target.value)}
            className="inputM w-full"
            placeholder="Texnologiya..."
          />
        </div>
      </div>

      {mode === 'create' && (
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">İlkin şifrə *</label>
          <div className="relative">
            <input
              required
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className="inputM w-full pr-10"
              placeholder="••••••••"
              minLength={6}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-text-muted text-[11px] mt-1">
            İstifadəçi ilk girişdə şifrəni dəyişəcək.
          </p>
        </div>
      )}

      {mode === 'edit' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div>
            <div className="text-text-primary text-sm font-medium">Aktiv hesab</div>
            <div className="text-text-muted text-xs">Deaktiv etsəniz, istifadəçi daxil ola bilməz</div>
          </div>
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
              form.isActive ? 'bg-accent-blue' : 'bg-[var(--surface-2)]'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                form.isActive ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghostM flex-1 justify-center">
          Ləğv et
        </button>
        <button type="submit" disabled={loading} className="btn-primaryM flex-1 justify-center disabled:opacity-50">
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Saxlanılır...</>
          ) : (mode === 'create' ? 'Yarat' : 'Yenilə')}
        </button>
      </div>
    </form>
  )
}

// ── Reset password form ───────────────────────────────────────────────────────

function ResetPasswordForm({
  user, onDone, onCancel,
}: { user: User; onDone: () => void; onCancel: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Şifrə ən azı 6 simvol olmalıdır')
      return
    }
    setLoading(true)
    const res = await db.users.update(user.id, {
      mustChangePassword: true,
    })
    // Also call a dedicated password reset if available, else update via users api
    try {
      const pwRes = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword }),
      })
      const data = await pwRes.json()
      if (data.success) {
        toast.success(`"${user.displayName}" üçün şifrə sıfırlandı`)
        onDone()
      } else {
        // Fallback: update user record directly if dedicated endpoint missing
        if (res.success) {
          toast.success('Şifrə yeniləndi (admin-reset endpoint yoxdur, yalnız flag qoyuldu)')
          onDone()
        } else {
          toast.error(data.error || 'Şifrə sıfırlana bilmədi')
        }
      }
    } catch {
      toast.error('Şəbəkə xətası')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20">
        <KeyRound size={16} className="text-accent-yellow flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-text-primary text-sm font-medium">&ldquo;{user.displayName}&rdquo; üçün şifrə sıfırla</div>
          <div className="text-text-secondary text-xs mt-0.5">
            İstifadəçi növbəti girişdə şifrəni dəyişməli olacaq.
          </div>
        </div>
      </div>
      <div>
        <label className="block text-text-secondary text-xs mb-1.5">Yeni müvəqqəti şifrə *</label>
        <div className="relative">
          <input
            required
            type={show ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="input w-full pr-10"
            placeholder="••••••••"
            minLength={6}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghostM flex-1 justify-center">Ləğv et</button>
        <button type="submit" disabled={loading} className="btn-primaryM flex-1 justify-center disabled:opacity-50">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Sıfırlanır...</> : 'Şifrəni sıfırla'}
        </button>
      </div>
    </form>
  )
}

// ── Inline modal ──────────────────────────────────────────────────────────────

function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[var(--surface-2)] transition-all"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | 'reset' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await db.users.getAll()
    if (res.success && res.data) setUsers(res.data)
    else toast.error(res.error || 'İstifadəçilər yüklənə bilmədi')
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: Partial<User> & { password?: string }) => {
    setSaving(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('İstifadəçi yaradıldı')
      await fetchUsers()
      setModal(null)
    } else {
      toast.error(json.error || 'Xəta baş verdi')
    }
    setSaving(false)
  }

  const handleEdit = async (data: Partial<User> & { password?: string }) => {
    if (!selected) return
    setSaving(true)
    const res = await db.users.update(selected.id, data)
    if (res.success) {
      toast.success('İstifadəçi yeniləndi')
      await fetchUsers()
      setModal(null)
      setSelected(null)
    } else {
      toast.error(res.error || 'Xəta baş verdi')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    setSaving(true)
    const res = await db.users.delete(selected.id)
    if (res.success) {
      toast.success('İstifadəçi silindi')
      await fetchUsers()
      setModal(null)
      setSelected(null)
    } else {
      toast.error(res.error || 'Xəta baş verdi')
    }
    setSaving(false)
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="inputM pl-9 w-full"
            placeholder="İstifadəçi axtar..."
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('create')}
            className="btn-primaryM"
          >
            <Plus size={14} /> Yeni İstifadəçi
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cardM text-center" style={{ padding: 40 }}>
          <Users size={36} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-secondary text-sm">İstifadəçi tapılmadı</p>
        </div>
      ) : (
        <div className="cardM" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['İstifadəçi', 'Rol', 'Şöbə', 'Status', 'Son giriş', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-text-primary text-sm font-medium truncate flex items-center gap-2">
                          {u.displayName || u.username}
                          {u.mustChangePassword && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20 flex-shrink-0">
                              Şifrə dəyişdirin
                            </span>
                          )}
                        </div>
                        <div className="text-text-muted text-xs">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {u.department || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      u.isActive
                        ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                        : 'bg-[var(--surface-2)] text-text-muted border-[var(--border)]'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-accent-green' : 'bg-text-muted')} />
                      {u.isActive ? 'Aktiv' : 'Deaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && u.id !== currentUser?.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelected(u); setModal('edit') }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[var(--surface-2)] transition-all"
                          title="Düzəlt"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => { setSelected(u); setModal('reset') }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-yellow hover:bg-accent-yellow/10 transition-all"
                          title="Şifrəni sıfırla"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => { setSelected(u); setModal('delete') }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Yeni İstifadəçi">
        <UserForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      <Modal
        open={modal === 'edit'}
        onClose={() => { setModal(null); setSelected(null) }}
        title="İstifadəçini Düzəlt"
      >
        {selected && (
          <UserForm
            mode="edit"
            initial={selected}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setSelected(null) }}
            loading={saving}
          />
        )}
      </Modal>

      <Modal
        open={modal === 'reset'}
        onClose={() => { setModal(null); setSelected(null) }}
        title="Şifrəni Sıfırla"
      >
        {selected && (
          <ResetPasswordForm
            user={selected}
            onDone={() => { setModal(null); setSelected(null); fetchUsers() }}
            onCancel={() => { setModal(null); setSelected(null) }}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={modal === 'delete'}
        onClose={() => { setModal(null); setSelected(null) }}
        title="İstifadəçini Sil"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20">
              <AlertCircle size={16} className="text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-text-primary text-sm font-medium">
                  &ldquo;{selected.displayName}&rdquo; silinəcək
                </div>
                <div className="text-text-secondary text-xs mt-0.5">
                  Bu əməliyyat geri qaytarıla bilməz.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setSelected(null) }}
                className="btn-ghostM flex-1 justify-center"
              >
                Ləğv et
              </button>
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

// ── Workspace Tab ─────────────────────────────────────────────────────────────

const WS_COLORS = ['#5B5BF5','#E85C7A','#0EA5E9','#10B981','#F59E0B','#8B5CF6','#EF4444','#F97316']

function WorkspaceTab() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace, refresh } = useWorkspace()
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '', color: '#5B5BF5' })
  const [newSaving, setNewSaving] = useState(false)

  const startEdit = (ws: Workspace) => {
    setEditId(ws.id)
    setEditForm({ name: ws.name, description: ws.description || '', color: ws.color || '#5B5BF5' })
  }

  const handleSaveEdit = async () => {
    if (!editId || !editForm.name.trim()) return
    setSaving(true)
    const res = await db.workspaces.update(editId, { name: editForm.name.trim(), description: editForm.description, color: editForm.color })
    if (res.success) {
      toast.success('Yeniləndi')
      await refresh()
      setEditId(null)
    } else toast.error(res.error || 'Xəta')
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    const res = await db.workspaces.delete(deleteId)
    if (res.success) {
      toast.success('Silindi')
      await refresh()
      setDeleteId(null)
    } else toast.error(res.error || 'Xəta')
    setDeleting(false)
  }

  const handleCreate = async () => {
    if (!newForm.name.trim()) return
    setNewSaving(true)
    await createWorkspace({ name: newForm.name.trim(), description: newForm.description, color: newForm.color })
    toast.success('İş sahəsi yaradıldı')
    setNewForm({ name: '', description: '', color: '#5B5BF5' })
    setCreating(false)
    setNewSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
      {/* Workspace list */}
      <div className="cardM" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="cardM-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3><span className="ico" style={{ background: 'var(--primary-soft)' }}><Layers size={14} style={{ color: 'var(--primary)' }} /></span>İş Sahələri</h3>
          <button onClick={() => setCreating(c => !c)} className="btn-primaryM" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Plus size={14} /> Yeni
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Ad *</label>
                <input autoFocus value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="inputM" placeholder="İş sahəsi adı" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Rəng</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                  {WS_COLORS.map(c => (
                    <button key={c} onClick={() => setNewForm(f => ({ ...f, color: c }))} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: newForm.color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Açıqlama</label>
              <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} className="inputM" placeholder="İsteğe bağlı açıqlama" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCreating(false)} className="btn-ghostM">Ləğv et</button>
              <button onClick={handleCreate} disabled={newSaving || !newForm.name.trim()} className="btn-primaryM" style={{ opacity: newSaving || !newForm.name.trim() ? 0.5 : 1 }}>
                {newSaving ? <><Loader2 size={13} className="animate-spin" /> Yaradılır...</> : 'Yarat'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div>
          {workspaces.map((ws, i) => (
            <div key={ws.id} style={{ borderBottom: i < workspaces.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {editId === ws.id ? (
                <div style={{ padding: '14px 20px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Ad</label>
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="inputM" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Rəng</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                        {WS_COLORS.map(c => (
                          <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: editForm.color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Açıqlama</label>
                    <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="inputM" placeholder="İsteğe bağlı" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} className="btn-ghostM">Ləğv et</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="btn-primaryM" style={{ opacity: saving ? 0.5 : 1 }}>
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Saxlanılır...</> : 'Yadda saxla'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: ws.color || '#5B5BF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{ws.name}</span>
                      {currentWorkspace?.id === ws.id && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '2px 8px', borderRadius: 999 }}>Aktiv</span>
                      )}
                    </div>
                    {ws.description && <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2 }}>{ws.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {currentWorkspace?.id !== ws.id && (
                      <button onClick={() => setCurrentWorkspace(ws)} className="btn-ghostM" style={{ padding: '5px 12px', fontSize: 12 }}>Keç</button>
                    )}
                    <button onClick={() => startEdit(ws)} className="btn-ghostM" style={{ padding: '5px 10px', fontSize: 12 }}>
                      <Edit2 size={13} />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        onClick={() => setDeleteId(ws.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div style={{ padding: 16, borderRadius: 12, background: '#FEE2E2', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Bu iş sahəsini silmək istəyirsiniz?</div>
              <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 4 }}>
                Bu əməliyyat geri qaytarıla bilməz. Daxilindəki məlumatlar silinməyəcək, lakin iş sahəsi bağlantısı kəsiləcək.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteId(null)} className="btn-ghostM">Ləğv et</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, borderRadius: 8, background: '#EF4444', color: '#fff', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, fontWeight: 700 }}
            >
              {deleting ? <><Loader2 size={13} className="animate-spin" /> Silinir...</> : <><Trash2 size={13} /> Sil</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Connection Tab ────────────────────────────────────────────────────────────

function ConnectionTab() {
  const [tested, setTested] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTested(null)
    const res = await db.projects.getAll()
    setTested(res.success)
    if (res.success) toast.success('Əlaqə uğurla yoxlandı!')
    else toast.error('Əlaqə qurula bilmədi: ' + res.error)
    setTesting(false)
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="cardM space-y-4">
        <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Database size={18} className="text-accent-blue" />
          Firebase Firestore
        </h2>

        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Firebase Admin SDK</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              <span className="text-accent-green flex items-center gap-1">
                <CheckCircle size={11} /> Server tərəfindən konfiqurasiya edilib
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-ghostM flex-1 justify-center disabled:opacity-40"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Yoxlanılır...' : 'Əlaqəni yoxla'}
          </button>
        </div>

        {tested !== null && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${tested
            ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
            : 'bg-accent-red/10 text-accent-red border border-accent-red/20'}`}>
            {tested ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {tested ? 'Firebase Firestore əlaqəsi uğurlu' : 'Əlaqə qurula bilmədi'}
          </div>
        )}
      </div>

      <div className="text-text-muted text-xs text-center">
        BirTask v1.0.0 — Firebase Firestore ilə inteqrasiyalı layihə idarəetmə platforması
      </div>
    </div>
  )
}

// ── Export / Import Tab ───────────────────────────────────────────────────────

function ExportImportTab() {
  const [exportingProjects, setExportingProjects] = useState(false)
  const [exportingTasks, setExportingTasks] = useState(false)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<'projects-csv' | 'tasks-csv' | 'json' | null>(null)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<string>('')
  const [relinking, setRelinking] = useState(false)
  const [relinkResult, setRelinkResult] = useState<string>('')

  const SHEETS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyBiaZe_MD3ykEwacDTWynD4XbZKpzv2lXNFeOpmAdoWmrvIPs8DcexelZw0boXAz1Esw/exec'

  const handleMigrateFromSheets = async () => {
    if (!SHEETS_URL) { toast.error('NEXT_PUBLIC_APPS_SCRIPT_URL təyin edilməyib'); return }
    setMigrating(true)
    setMigrateResult('')
    try {
      const res = await fetch(`${SHEETS_URL}?action=getBatch`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Sheets xətası')
      const { projects = [], tasks = [], team = [] } = json.data || {}
      const migrateRes = await fetch('/api/db/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects, tasks, team }),
      })
      const result = await migrateRes.json()
      if (result.success) {
        setMigrateResult(`✅ ${result.imported.projects} layihə, ${result.imported.tasks} tapşırıq, ${result.imported.team} komanda üzvü köçürüldü`)
        toast.success('Google Sheets datası Firebase-ə köçürüldü')
      } else {
        throw new Error(result.error)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xəta'
      setMigrateResult(`❌ ${msg}`)
      toast.error(msg)
    }
    setMigrating(false)
  }

  const handleRelinkTasks = async () => {
    setRelinking(true)
    setRelinkResult('')
    try {
      const res = await db.tasks.relink()
      if (res.success && res.data) {
        const { relinked, total } = res.data
        setRelinkResult(`✅ ${relinked} tapşırıq layihəyə bağlandı (${total} tapşırıqdan)`)
        toast.success(`${relinked} tapşırıq uğurla bağlandı`)
      } else {
        throw new Error(res.error || 'Xəta')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xəta'
      setRelinkResult(`❌ ${msg}`)
      toast.error(msg)
    }
    setRelinking(false)
  }

  function objectsToCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    const lines = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => {
          const v = String(r[h] ?? '')
          return v.includes(',') || v.includes('"') || v.includes('\n')
            ? `"${v.replace(/"/g, '""')}"`
            : v
        }).join(',')
      ),
    ]
    return lines.join('\n')
  }

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCsv(text: string): string[][] {
    const lines = text.trim().split('\n')
    return lines.map(line => {
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"' && !inQuotes) { inQuotes = true; continue }
        if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++; continue }
        if (ch === '"' && inQuotes) { inQuotes = false; continue }
        if (ch === ',' && !inQuotes) { cells.push(current); current = ''; continue }
        current += ch
      }
      cells.push(current)
      return cells
    })
  }

  const handleExportProjects = async () => {
    setExportingProjects(true)
    const res = await db.projects.getAll()
    if (res.success && res.data) {
      const csv = objectsToCsv(res.data as unknown as Record<string, unknown>[])
      downloadBlob(csv, `layiheler_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
      toast.success('Layihələr ixrac edildi')
    } else {
      toast.error(res.error || 'İxrac xətası')
    }
    setExportingProjects(false)
  }

  const handleExportTasks = async () => {
    setExportingTasks(true)
    const res = await db.tasks.getAll()
    if (res.success && res.data) {
      const csv = objectsToCsv(res.data as unknown as Record<string, unknown>[])
      downloadBlob(csv, `tapshiriqlar_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
      toast.success('Tapşırıqlar ixrac edildi')
    } else {
      toast.error(res.error || 'İxrac xətası')
    }
    setExportingTasks(false)
  }

  const handleExportBackup = async () => {
    setExportingBackup(true)
    const [pRes, tRes, mRes] = await Promise.all([
      db.projects.getAll(),
      db.tasks.getAll(),
      db.team.getAll(),
    ])
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      projects: pRes.data || [],
      tasks: tRes.data || [],
      team: mRes.data || [],
    }
    downloadBlob(
      JSON.stringify(backup, null, 2),
      `birtask_backup_${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    )
    toast.success('Tam yedəklə ixrac edildi')
    setExportingBackup(false)
  }

  const handleFileSelect = (file: File, type: 'projects-csv' | 'tasks-csv' | 'json') => {
    setImportFile(file)
    setImportType(type)
    setPreview(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (type === 'json') {
        try {
          const parsed = JSON.parse(text)
          const info: string[][] = [
            ['Sahə', 'Say'],
            ['Layihələr', String((parsed.projects || []).length)],
            ['Tapşırıqlar', String((parsed.tasks || []).length)],
            ['Komanda', String((parsed.team || []).length)],
            ['Tarix', parsed.exportedAt || 'Bilinmir'],
          ]
          setPreview(info)
        } catch {
          toast.error('Keçərsiz JSON fayl')
          setImportFile(null)
        }
      } else {
        const rows = parseCsv(text)
        setPreview(rows.slice(0, 4))
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importFile || !importType) return
    setImporting(true)
    setImportProgress(0)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      try {
        if (importType === 'json') {
          const backup = JSON.parse(text)
          const projects: Record<string, unknown>[] = backup.projects || []
          const tasks: Record<string, unknown>[] = backup.tasks || []
          const team: Record<string, unknown>[] = backup.team || []
          const total = projects.length + tasks.length + team.length
          let done = 0

          for (const proj of projects) {
            const { id: _pid, createdAt: _pca, ...rest } = proj as Record<string, unknown>
            void _pid; void _pca
            await db.projects.create(rest as Parameters<typeof db.projects.create>[0])
            done++
            setImportProgress(Math.round((done / total) * 100))
          }
          for (const task of tasks) {
            const { id: _tid, createdAt: _tca, updatedAt: _tua, ...rest } = task as Record<string, unknown>
            void _tid; void _tca; void _tua
            await db.tasks.create(rest as Parameters<typeof db.tasks.create>[0])
            done++
            setImportProgress(Math.round((done / total) * 100))
          }
          for (const member of team) {
            const { id: _mid, createdAt: _mca, ...rest } = member as Record<string, unknown>
            void _mid; void _mca
            await db.team.create(rest as Parameters<typeof db.team.create>[0])
            done++
            setImportProgress(Math.round((done / total) * 100))
          }
          toast.success(`Yedəklə idxal edildi: ${projects.length} layihə, ${tasks.length} tapşırıq, ${team.length} üzv`)
        } else if (importType === 'projects-csv') {
          const rows = parseCsv(text)
          if (rows.length < 2) { toast.error('CSV boşdur'); return }
          const headers = rows[0]
          const dataRows = rows.slice(1)
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const obj: Record<string, string> = {}
            headers.forEach((h, idx) => { obj[h] = row[idx] || '' })
            const { id: _id, createdAt: _ca, ...rest } = obj
            void _id; void _ca
            await db.projects.create(rest as Parameters<typeof db.projects.create>[0])
            setImportProgress(Math.round(((i + 1) / dataRows.length) * 100))
          }
          toast.success(`${dataRows.length} layihə idxal edildi`)
        } else if (importType === 'tasks-csv') {
          const rows = parseCsv(text)
          if (rows.length < 2) { toast.error('CSV boşdur'); return }
          const headers = rows[0]
          const dataRows = rows.slice(1)
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const obj: Record<string, string> = {}
            headers.forEach((h, idx) => { obj[h] = row[idx] || '' })
            const { id: _tid2, createdAt: _ca2, updatedAt: _ua2, ...rest } = obj
            void _tid2; void _ca2; void _ua2
            await db.tasks.create(rest as Parameters<typeof db.tasks.create>[0])
            setImportProgress(Math.round(((i + 1) / dataRows.length) * 100))
          }
          toast.success(`${dataRows.length} tapşırıq idxal edildi`)
        }
        setImportFile(null)
        setPreview(null)
        setImportType(null)
      } catch (err) {
        toast.error('İdxal xətası: ' + (err instanceof Error ? err.message : 'Bilinməyən xəta'))
      }
      setImporting(false)
      setImportProgress(0)
    }
    reader.readAsText(importFile)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Google Sheets Migration */}
      <div className="cardM space-y-4" style={{ borderColor: 'var(--primary)' }}>
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <span className="text-accent-purple">↗</span>
          Google Sheets → Firebase Miqrasiyası
        </h2>
        <p className="text-text-muted text-sm">Köhnə Google Sheets datasını bir dəfəlik Firebase-ə köçür. Mövcud data üzərindən yazılacaq.</p>
        <button
          onClick={handleMigrateFromSheets}
          disabled={migrating}
          className="btn-primaryM disabled:opacity-50"
        >
          {migrating ? <><span className="animate-spin inline-block mr-2">⟳</span>Köçürülür...</> : '🚀 Google Sheets-dən köçür'}
        </button>
        {migrateResult && <p className="text-sm mt-2">{migrateResult}</p>}

        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-text-muted text-xs mb-3">Əgər köçürmə artıq edilibsə amma tapşırıqlar layihə altında görünmürsə, aşağıdakı düymə ilə yenidən bağlayın:</p>
          <button
            onClick={handleRelinkTasks}
            disabled={relinking}
            className="btn-ghostM disabled:opacity-50"
          >
            {relinking ? <><Loader2 size={14} className="animate-spin" /> Bağlanılır...</> : '🔗 Tapşırıqları layihəyə bağla'}
          </button>
          {relinkResult && <p className="text-sm mt-2">{relinkResult}</p>}
        </div>
      </div>

      {/* Export section */}
      <div className="cardM space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Download size={18} className="text-accent-blue" />
          Məlumatları İxrac Et
        </h2>
        <p className="text-text-muted text-sm">Bütün layihə məlumatlarını CSV və ya JSON formatında yükləyin.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportProjects}
            disabled={exportingProjects}
            className="btn-ghostM justify-center disabled:opacity-50"
          >
            {exportingProjects
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} className="text-accent-green" />}
            Layihələr CSV
          </button>
          <button
            onClick={handleExportTasks}
            disabled={exportingTasks}
            className="btn-ghostM justify-center disabled:opacity-50"
          >
            {exportingTasks
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} className="text-accent-blue" />}
            Tapşırıqlar CSV
          </button>
          <button
            onClick={handleExportBackup}
            disabled={exportingBackup}
            className="btn-primaryM justify-center disabled:opacity-50"
          >
            {exportingBackup
              ? <Loader2 size={14} className="animate-spin" />
              : <Package size={14} />}
            Tam Yedəklə (JSON)
          </button>
        </div>
      </div>

      {/* Import section */}
      <div className="cardM space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Upload size={18} className="text-accent-purple" />
          Məlumatları İdxal Et
        </h2>
        <p className="text-text-muted text-sm">CSV və ya JSON faylından məlumat idxal edin. Mövcud məlumatlar dəyişdirilməyəcək — yeni qeydlər əlavə olunacaq.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { type: 'projects-csv' as const, label: 'Layihələr CSV', icon: FileText, color: 'text-accent-green', accept: '.csv' },
            { type: 'tasks-csv' as const,    label: 'Tapşırıqlar CSV', icon: FileText, color: 'text-accent-blue', accept: '.csv' },
            { type: 'json' as const,         label: 'JSON Yedəklə',    icon: FileJson, color: 'text-accent-purple', accept: '.json' },
          ].map(({ type, label, icon: Icon, color, accept }) => (
            <label key={type} className="btn-ghostM justify-center cursor-pointer">
              <Icon size={14} className={color} />
              {label}
              <input
                type="file"
                accept={accept}
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file, type)
                  e.target.value = ''
                }}
              />
            </label>
          ))}
        </div>

        {/* Preview */}
        {importFile && preview && (
          <div className="rounded-xl overflow-hidden border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-2)]">
              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-accent-blue" />
                <span className="text-text-primary font-medium">{importFile.name}</span>
                <span className="text-text-muted text-xs">({Math.round(importFile.size / 1024)} KB)</span>
              </div>
              <button
                onClick={() => { setImportFile(null); setPreview(null); setImportType(null) }}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 overflow-x-auto">
              <p className="text-text-muted text-xs mb-2 font-medium">
                {importType === 'json' ? 'Yedəklə məzmunu:' : 'İlk 3 sətir önizləmə:'}
              </p>
              <table className="text-xs w-full">
                {preview.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 border-b border-[var(--border)] max-w-[160px] truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </table>
            </div>

            {/* Progress */}
            {importing && (
              <div className="px-4 pb-3">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>İdxal edilir...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill bg-accent-blue" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3 px-4 pb-4">
              <button
                onClick={() => { setImportFile(null); setPreview(null); setImportType(null) }}
                className="btn-ghostM flex-1 justify-center"
                disabled={importing}
              >
                Ləğv et
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primaryM flex-1 justify-center disabled:opacity-50"
              >
                {importing
                  ? <><Loader2 size={14} className="animate-spin" /> İdxal edilir...</>
                  : <><Upload size={14} /> İdxal et</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Workflow Tab ──────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  task_created:      'Tapşırıq yaradıldı',
  task_completed:    'Tapşırıq tamamlandı',
  task_assigned:     'Tapşırıq təyin edildi',
  project_created:   'Layihə yaradıldı',
  project_completed: 'Layihə tamamlandı',
}

const EMPTY_RULE: Omit<WorkflowRule, 'id' | 'createdAt'> = {
  name: '',
  trigger: 'task_completed',
  action: 'send_email',
  emailTo: '',
  emailSubject: '{{taskTitle}} tamamlandı',
  emailBody: 'Salam,\n\n"{{taskTitle}}" tapşırığı tamamlandı.\nİcraçı: {{assignee}}\n\nBirTask',
  workspaceId: '',
  isActive: true,
}

function WorkflowTab() {
  const { currentWorkspace } = useWorkspace()
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<WorkflowRule | null>(null)
  const [form, setForm] = useState<Omit<WorkflowRule, 'id' | 'createdAt'>>(EMPTY_RULE)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const wsId = currentWorkspace?.id || ''

  const fetchRules = useCallback(async () => {
    setLoading(true)
    const res = await db.workflows.getAll(wsId)
    if (res.success && res.data) setRules(res.data)
    setLoading(false)
  }, [wsId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const openCreate = () => {
    setForm({ ...EMPTY_RULE, workspaceId: wsId })
    setSelected(null)
    setModal('create')
  }

  const openEdit = (rule: WorkflowRule) => {
    setSelected(rule)
    setForm({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      emailTo: rule.emailTo,
      emailSubject: rule.emailSubject,
      emailBody: rule.emailBody,
      workspaceId: rule.workspaceId,
      isActive: rule.isActive,
    })
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (modal === 'create') {
      const res = await db.workflows.create({ ...form, workspaceId: wsId })
      if (res.success) { toast.success('Qayda yaradıldı'); await fetchRules(); setModal(null) }
      else toast.error(res.error || 'Xəta')
    } else if (modal === 'edit' && selected) {
      const res = await db.workflows.update(selected.id, form)
      if (res.success) { toast.success('Qayda yeniləndi'); await fetchRules(); setModal(null) }
      else toast.error(res.error || 'Xəta')
    }
    setSaving(false)
  }

  const handleToggle = async (rule: WorkflowRule) => {
    const res = await db.workflows.update(rule.id, { isActive: !rule.isActive })
    if (res.success) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const res = await db.workflows.delete(id)
    if (res.success) { toast.success('Silindi'); await fetchRules() }
    else toast.error(res.error || 'Xəta')
    setDeleting(null)
  }

  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Zap size={18} className="text-accent-purple" />
            Workflow Qaydaları
          </h2>
          <p className="text-text-muted text-xs mt-1">Avtomatik e-poçt bildirişləri üçün qaydalar qurun</p>
        </div>
        <button onClick={openCreate} className="btn-primaryM">
          <Plus size={14} /> Yeni Qayda
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)] animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="cardM text-center" style={{ padding: 40 }}>
          <Zap size={36} className="text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-text-secondary text-sm font-medium">Hələ heç bir qayda yoxdur</p>
          <p className="text-text-muted text-xs mt-1">E-poçt bildirişləri üçün yeni qayda əlavə edin</p>
          <button onClick={openCreate} className="btn-primaryM mt-4 mx-auto">
            <Plus size={14} /> Yeni Qayda
          </button>
        </div>
      ) : (
        <div className="cardM" style={{ padding: 0, overflow: 'hidden' }}>
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors group"
              style={{ borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: rule.isActive ? 'var(--primary-soft)' : 'var(--surface-2)' }}
              >
                <Zap size={15} style={{ color: rule.isActive ? 'var(--primary)' : 'var(--muted-2)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-primary text-sm font-semibold">{rule.name}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    {TRIGGER_LABELS[rule.trigger]}
                  </span>
                </div>
                <div className="text-text-muted text-xs mt-0.5 truncate">
                  → {rule.emailTo} · &ldquo;{rule.emailSubject}&rdquo;
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(rule)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                  title={rule.isActive ? 'Deaktiv et' : 'Aktiv et'}
                >
                  {rule.isActive
                    ? <ToggleRight size={22} style={{ color: 'var(--primary)' }} />
                    : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => openEdit(rule)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[var(--surface-2)] transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting === rule.id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  {deleting === rule.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Yeni Workflow Qaydası' : 'Qaydanı Düzəlt'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Qayda adı *</label>
            <input
              required
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              className="inputM w-full"
              placeholder="Məs: Tapşırıq tamamlandıqda bildiriş"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Tetikləyici *</label>
            <select
              value={form.trigger}
              onChange={e => setF('trigger', e.target.value)}
              className="inputM w-full"
            >
              {(Object.entries(TRIGGER_LABELS) as [WorkflowTrigger, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Əməliyyat</label>
            <div className="inputM w-full text-text-secondary text-sm cursor-not-allowed opacity-70 flex items-center gap-2">
              E-poçt göndər
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Kimə (e-poçt) *</label>
            <input
              required
              type="email"
              value={form.emailTo}
              onChange={e => setF('emailTo', e.target.value)}
              className="inputM w-full"
              placeholder="manager@example.com"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">Mövzu *</label>
            <input
              required
              value={form.emailSubject}
              onChange={e => setF('emailSubject', e.target.value)}
              className="inputM w-full"
              placeholder="{{taskTitle}} tamamlandı"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1.5">
              Mətn *
              <span className="text-text-muted ml-1">(&#123;&#123;taskTitle&#125;&#125;, &#123;&#123;projectName&#125;&#125;, &#123;&#123;assignee&#125;&#125; yer tutucuları istifadə edə bilərsiniz)</span>
            </label>
            <textarea
              required
              rows={4}
              value={form.emailBody}
              onChange={e => setF('emailBody', e.target.value)}
              className="inputM w-full resize-none"
              placeholder="Salam,&#10;&#10;&quot;{{taskTitle}}&quot; tapşırığı tamamlandı.&#10;İcraçı: {{assignee}}"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <div className="text-text-primary text-sm font-medium">Aktiv</div>
              <div className="text-text-muted text-xs">Bu qayda aktiv olduqda e-poçtlar göndərilir</div>
            </div>
            <button
              type="button"
              onClick={() => setF('isActive', !form.isActive)}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                form.isActive ? 'bg-accent-blue' : 'bg-[var(--surface-2)]'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                form.isActive ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-ghostM flex-1 justify-center">
              Ləğv et
            </button>
            <button type="submit" disabled={saving} className="btn-primaryM flex-1 justify-center disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saxlanılır...</> : (modal === 'create' ? 'Yarat' : 'Yenilə')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'workspace' | 'connection' | 'users' | 'export' | 'workflow'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('workspace')

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'workspace',  label: 'İş Sahələri',   icon: Layers },
    { id: 'connection', label: 'Əlaqə',         icon: Database },
    { id: 'users',      label: 'İstifadəçilər', icon: Users },
    { id: 'export',     label: 'Export / Import', icon: Download },
    { id: 'workflow',   label: 'Workflow',       icon: Zap },
  ]

  return (
    <div className="pageM fade-in">
      <div className="page-headerM">
        <div>
          <h1>Parametrlər</h1>
          <p className="sub">Platforma konfiqurasiyası</p>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              borderBottom: tab === id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === id ? 'var(--primary)' : 'var(--muted)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
              transition: 'color .12s',
            }}
          >
            <Icon size={15} />
            {label}
            {id === 'users' && user?.role === 'admin' && (
              <ShieldCheck size={12} style={{ color: '#8B5CF6', opacity: 0.7 }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'workspace'  && <WorkspaceTab />}
      {tab === 'connection' && <ConnectionTab />}
      {tab === 'users'      && <UsersTab />}
      {tab === 'export'     && <ExportImportTab />}
      {tab === 'workflow'   && <WorkflowTab />}
    </div>
  )
}
