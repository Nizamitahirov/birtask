'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { User, UserRole } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import {
  Settings, Database, CheckCircle, AlertCircle, RefreshCw,
  Users, Plus, Edit2, Trash2, KeyRound, Search, ShieldCheck,
  UserCheck, Eye, EyeOff, Loader2, X, Shield, UserCog,
  Download, Upload, FileText, FileJson, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin:   'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
    manager: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    member:  'bg-accent-green/10 text-accent-green border-accent-green/20',
    viewer:  'bg-white/[0.06] text-text-secondary border-white/[0.10]',
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
            className="input w-full"
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
            className="input w-full"
            placeholder="Ad Soyad"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-xs mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="input w-full"
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
            className="select w-full"
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
            className="input w-full"
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
              className="input w-full pr-10"
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
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div>
            <div className="text-text-primary text-sm font-medium">Aktiv hesab</div>
            <div className="text-text-muted text-xs">Deaktiv etsəniz, istifadəçi daxil ola bilməz</div>
          </div>
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
              form.isActive ? 'bg-accent-blue' : 'bg-white/[0.12]'
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
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">
          Ləğv et
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
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
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Ləğv et</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
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
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
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
            className="input pl-9 w-full"
            placeholder="İstifadəçi axtar..."
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal('create')}
            className="btn-primary"
          >
            <Plus size={14} /> Yeni İstifadəçi
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={36} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-secondary text-sm">İstifadəçi tapılmadı</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['İstifadəçi', 'Rol', 'Şöbə', 'Status', 'Son giriş', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
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
                        : 'bg-white/[0.04] text-text-muted border-white/[0.08]'
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
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all"
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
                className="btn-secondary flex-1 justify-center"
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
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Database size={18} className="text-accent-blue" />
          Firebase Firestore
        </h2>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div>
            <div className="text-text-primary text-sm font-medium">Firebase Admin SDK</div>
            <div className="text-text-muted text-xs mt-0.5">
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
            className="btn-secondary flex-1 justify-center disabled:opacity-40"
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
      <div className="card p-6 space-y-4 border border-accent-purple/20">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <span className="text-accent-purple">↗</span>
          Google Sheets → Firebase Miqrasiyası
        </h2>
        <p className="text-text-muted text-sm">Köhnə Google Sheets datasını bir dəfəlik Firebase-ə köçür. Mövcud data üzərindən yazılacaq.</p>
        <button
          onClick={handleMigrateFromSheets}
          disabled={migrating}
          className="btn-primary disabled:opacity-50"
        >
          {migrating ? <><span className="animate-spin inline-block mr-2">⟳</span>Köçürülür...</> : '🚀 Google Sheets-dən köçür'}
        </button>
        {migrateResult && <p className="text-sm mt-2">{migrateResult}</p>}

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-text-muted text-xs mb-3">Əgər köçürmə artıq edilibsə amma tapşırıqlar layihə altında görünmürsə, aşağıdakı düymə ilə yenidən bağlayın:</p>
          <button
            onClick={handleRelinkTasks}
            disabled={relinking}
            className="btn-secondary disabled:opacity-50"
          >
            {relinking ? <><Loader2 size={14} className="animate-spin" /> Bağlanılır...</> : '🔗 Tapşırıqları layihəyə bağla'}
          </button>
          {relinkResult && <p className="text-sm mt-2">{relinkResult}</p>}
        </div>
      </div>

      {/* Export section */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Download size={18} className="text-accent-blue" />
          Məlumatları İxrac Et
        </h2>
        <p className="text-text-muted text-sm">Bütün layihə məlumatlarını CSV və ya JSON formatında yükləyin.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportProjects}
            disabled={exportingProjects}
            className="btn-secondary justify-center disabled:opacity-50"
          >
            {exportingProjects
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} className="text-accent-green" />}
            Layihələr CSV
          </button>
          <button
            onClick={handleExportTasks}
            disabled={exportingTasks}
            className="btn-secondary justify-center disabled:opacity-50"
          >
            {exportingTasks
              ? <Loader2 size={14} className="animate-spin" />
              : <FileText size={14} className="text-accent-blue" />}
            Tapşırıqlar CSV
          </button>
          <button
            onClick={handleExportBackup}
            disabled={exportingBackup}
            className="btn-primary justify-center disabled:opacity-50"
          >
            {exportingBackup
              ? <Loader2 size={14} className="animate-spin" />
              : <Package size={14} />}
            Tam Yedəklə (JSON)
          </button>
        </div>
      </div>

      {/* Import section */}
      <div className="card p-6 space-y-4">
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
            <label key={type} className="btn-secondary justify-center cursor-pointer">
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
          <div className="rounded-xl overflow-hidden border border-white/[0.08]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03]">
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
                      <td key={ci} className="px-2 py-1 border-b border-white/[0.04] max-w-[160px] truncate">
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
                className="btn-secondary flex-1 justify-center"
                disabled={importing}
              >
                Ləğv et
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
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

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'connection' | 'users' | 'export'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('connection')

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'connection', label: 'Əlaqə',         icon: Database },
    { id: 'users',      label: 'İstifadəçilər',  icon: Users },
    { id: 'export',     label: 'Export / Import', icon: Download },
  ]

  return (
    <div className="pageM fade-in">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }} className="">Parametrlər</h1>
        <p className="text-text-secondary text-sm mt-1">Platforma konfiqurasiyası</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
              tab === id
                ? 'text-accent-blue border-accent-blue'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            )}
          >
            <Icon size={15} />
            {label}
            {id === 'users' && user?.role === 'admin' && (
              <ShieldCheck size={12} className="text-accent-purple opacity-70" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'connection' && <ConnectionTab />}
      {tab === 'users'      && <UsersTab />}
      {tab === 'export'     && <ExportImportTab />}
    </div>
  )
}
