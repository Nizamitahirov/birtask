'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useTeam, useTasks } from '@/hooks/useSheets'
import { TeamMember } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { avatarPaletteFor, initialsM, fmtDateM } from '@/lib/design-utils'

/* ── Company color helpers ───────────────────────────────────── */

function companyColor(company: string | undefined): string {
  if (company === 'Birbank') return 'var(--primary)'
  if (company === 'Pashapay') return 'var(--success)'
  if (company === 'Birmarket') return 'var(--warn)'
  return 'var(--muted)'
}

/* ── Stat chip ───────────────────────────────────────────────── */

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="tm2-stat">
      <div className="tm2-stat-l">{label}</div>
      <div className="tm2-stat-v">{value}</div>
      <div className="tm2-stat-s">{sub}</div>
    </div>
  )
}

/* ── DrField ─────────────────────────────────────────────────── */

function DrField({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 10,
      padding: '9px 0',
      borderBottom: '1px solid var(--border-2)',
      fontSize: 12,
    }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{k}</span>
      <span style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v || '—'}</span>
    </div>
  )
}

/* ── Member drawer ───────────────────────────────────────────── */

function MemberDrawer({
  member,
  memberTasks,
  memberDone,
  onClose,
  onEdit,
  onDelete,
}: {
  member: TeamMember
  memberTasks: number
  memberDone: number
  onClose: () => void
  onEdit: (m: TeamMember) => void
  onDelete: (m: TeamMember) => void
}) {
  const [a1, a2] = avatarPaletteFor(member.id)
  const roleColor = companyColor(member.company)
  const isActive = !!member.email

  return ReactDOM.createPortal(
    <div className="task-drawer-bg" onClick={onClose}>
      <div className="task-drawer fade-in" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ position: 'absolute', top: 14, right: 14, background: 'var(--surface-2)' }}
          >
            <Icon name="close" size={13} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="tm2-av"
              style={{
                background: `linear-gradient(135deg, ${a1}, ${a2})`,
                width: 56,
                height: 56,
                fontSize: 18,
                borderRadius: 14,
                flexShrink: 0,
              }}
            >
              {initialsM(member.name)}
              {isActive && <span className="tm2-online"></span>}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                {member.name}
              </h2>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                {member.personalCode ? `#${member.personalCode}` : member.email || ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: roleColor, fontWeight: 700 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor, flexShrink: 0 }}></span>
              {member.company || member.position || member.role || '—'}
            </span>
            <span style={{ color: 'var(--muted-2)' }}>·</span>
            <span style={{ fontWeight: 600 }}>{member.department}</span>
            <span style={{ color: 'var(--muted-2)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: isActive ? 'var(--success)' : 'var(--muted)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--success)' : 'var(--muted-2)', flexShrink: 0 }}></span>
              {isActive ? 'Aktiv' : 'Deaktiv'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 22px 22px', overflowY: 'auto', flex: 1 }}>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="btn-ghostM"
                style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
              >
                <Icon name="mail" size={13} /> Email
              </a>
            ) : (
              <button className="btn-ghostM" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }} disabled>
                <Icon name="mail" size={13} /> Email
              </button>
            )}
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
              onClick={() => onEdit(member)}
            >
              <Icon name="edit" size={13} /> Düzəlt
            </button>
            <button
              className="btn-primaryM"
              style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
            >
              <Icon name="folder_shared" size={13} /> Layihələr
            </button>
          </div>

          {/* Stats */}
          <div className="tm2-drawer-stats">
            <div>
              <div className="tm2-k">Tapşırıq</div>
              <div className="tm2-v lg">{memberTasks}</div>
            </div>
            <div>
              <div className="tm2-k">Tamamlandı</div>
              <div className="tm2-v lg" style={{ color: 'var(--success)' }}>{memberDone}</div>
            </div>
            <div>
              <div className="tm2-k">Personal</div>
              <div className="tm2-v lg" style={{ fontSize: 12 }}>{member.personalCode || '—'}</div>
            </div>
          </div>

          {/* Fields */}
          <div className="tm2-drawer-fields">
            <DrField k="Email" v={member.email} />
            <DrField k="Vəzifə" v={member.position || member.role} />
            <DrField k="Şirkət" v={member.company} />
            <DrField k="Personal kod" v={member.personalCode} />
            <DrField k="FIN kod" v={member.finCode} />
            <DrField k="Departament" v={member.department} />
            <DrField k="Funksional sahə" v={member.division} />
            {member.section && <DrField k="Bölmə" v={member.section} />}
            {member.phone && <DrField k="Telefon" v={member.phone} />}
            <DrField k="Qoşulub" v={member.createdAt ? fmtDateM(member.createdAt) : undefined} />
          </div>

          {/* Delete */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <button
              className="btn-ghostM"
              style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12, color: 'var(--accent)' }}
              onClick={() => onDelete(member)}
            >
              <Icon name="delete_outline" size={12} /> Sil
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Member form ─────────────────────────────────────────────── */

function MemberForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<TeamMember>
  onSubmit: (data: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    role: initial?.role || '',
    position: initial?.position || '',
    department: initial?.department || '',
    company: initial?.company || '',
    phone: initial?.phone || '',
    avatar: initial?.avatar || '',
    workspaceId: initial?.workspaceId || '',
    division: initial?.division || '',
    section: initial?.section || '',
    personalCode: initial?.personalCode || '',
    finCode: initial?.finCode || '',
    managerId: initial?.managerId || '',
    functionalManagerId: initial?.functionalManagerId || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form } as Omit<TeamMember, 'id' | 'createdAt'>)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 6,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Ad Soyad *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className="inputM" placeholder="Ad Soyad" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="inputM" placeholder="email@example.com" />
        </div>
        <div>
          <label style={labelStyle}>Telefon</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="inputM" placeholder="+994 50 xxx xx xx" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Vəzifə</label>
          <input value={form.position} onChange={e => set('position', e.target.value)} className="inputM" placeholder="Funksional lider..." />
        </div>
        <div>
          <label style={labelStyle}>Şöbə</label>
          <input value={form.department} onChange={e => set('department', e.target.value)} className="inputM" placeholder="Texnologiya..." />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Şirkət</label>
        <select value={form.company} onChange={e => set('company', e.target.value)} className="inputM">
          <option value="">Seçin...</option>
          <option value="Birbank">Birbank</option>
          <option value="Pashapay">Pashapay</option>
          <option value="Birmarket">Birmarket</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
        <button type="button" onClick={onCancel} className="btn-ghostM" style={{ flex: 1, justifyContent: 'center' }}>
          Ləğv et
        </button>
        <button type="submit" disabled={loading} className="btn-primaryM" style={{ flex: 1, justifyContent: 'center', opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Saxlanılır...' : (initial?.id ? 'Yenilə' : 'Əlavə et')}
        </button>
      </div>
    </form>
  )
}

/* ── Main page ───────────────────────────────────────────────── */

export default function TeamPage() {
  const { members, loading, refresh, create, update, remove } = useTeam()
  const { tasks } = useTasks()

  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('all')
  const [dept, setDept] = useState('all')
  const [view, setView] = useState<'list' | 'card'>('list')
  const [selected, setSelected] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  /* keyboard shortcuts */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* derived data */
  const byCompany = useMemo(() => {
    const r: Record<string, number> = {}
    members.forEach(m => { const c = m.company || 'Digər'; r[c] = (r[c] || 0) + 1 })
    return r
  }, [members])

  const departments = useMemo(
    () => Array.from(new Set(members.map(m => m.department).filter(Boolean))).sort() as string[],
    [members]
  )

  const filtered = useMemo(() => members.filter(m => {
    if (company !== 'all' && (m.company || 'Digər') !== company) return false
    if (dept !== 'all' && m.department !== dept) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.position || '').toLowerCase().includes(q) ||
        (m.company || '').toLowerCase().includes(q) ||
        (m.personalCode || '').toLowerCase().includes(q) ||
        (m.finCode || '').toLowerCase().includes(q)
      )
    }
    return true
  }), [members, query, company, dept])

  const birbank  = byCompany['Birbank']  || 0
  const pashapay = byCompany['Pashapay'] || 0
  const birmarket = byCompany['Birmarket'] || 0

  const selectedMember = selected ? members.find(m => m.id === selected) ?? null : null

  /* handlers */
  const handleCreate = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    setSaving(true)
    await create(data)
    setSaving(false)
    setModal(null)
  }

  const handleEdit = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    if (!editMember) return
    setSaving(true)
    await update(editMember.id, data)
    setSaving(false)
    setModal(null)
    setEditMember(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    await remove(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
    setSelected(null)
  }

  const openEdit = (m: TeamMember) => {
    setEditMember(m)
    setModal('edit')
    setSelected(null)
  }

  const openDeleteConfirm = (m: TeamMember) => {
    setConfirmDelete(m)
    setSelected(null)
  }

  return (
    <div className="pageM fade-in">

      {/* Header */}
      <div className="tm2-head">
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            İdarəetmə
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 0' }}>
            Komanda
            <span style={{ color: 'var(--muted)', fontWeight: 600, marginLeft: 10 }}>{members.length}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghostM" onClick={refresh}>
            <Icon name="refresh" size={13} /> Yenilə
          </button>
          <button className="btn-ghostM">
            <Icon name="file_download" size={13} /> İxrac
          </button>
          <button className="btn-primaryM" onClick={() => setModal('create')}>
            <Icon name="person_add" size={13} /> Yeni üzv
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="tm2-stats">
        <Stat label="Birbank"  value={birbank}         sub="üzv" />
        <Stat label="Pashapay" value={pashapay}        sub="üzv" />
        <Stat label="Birmarket" value={birmarket}      sub="üzv" />
        <Stat label="Ümumi"    value={members.length}  sub="üzv" />
      </div>

      {/* Toolbar */}
      <div className="tm2-toolbar">
        <div className="tm2-search">
          <Icon name="search" size={15} />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ad, email, ya da şöbə..."
          />
          <span className="kbd">⌘K</span>
        </div>

        <div className="tm2-chips">
          {[
            { id: 'all',        label: 'Hamısı',   count: members.length },
            { id: 'Birbank',    label: 'Birbank',   count: birbank },
            { id: 'Pashapay',   label: 'Pashapay',  count: pashapay },
            { id: 'Birmarket',  label: 'Birmarket', count: birmarket },
          ].map(c => (
            <button
              key={c.id}
              className={'tm2-chip' + (company === c.id ? ' on' : '')}
              onClick={() => setCompany(c.id)}
            >
              {c.label}<span className="cnt">{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <select
            className="task-select"
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{ minWidth: 140, fontSize: 12 }}
          >
            <option value="all">Bütün şöbələr</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="tm2-viewtog">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="Siyahı">
              <Icon name="sort" size={14} />
            </button>
            <button className={view === 'card' ? 'on' : ''} onClick={() => setView('card')} title="Kartlar">
              <Icon name="space_dashboard" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="tm2-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tm2-empty">
          <Icon name="person_search" size={36} />
          <div style={{ marginTop: 12, fontWeight: 700 }}>Heç nə tapılmadı</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Başqa axtarış sözü yoxlayın.</div>
        </div>
      ) : view === 'list' ? (
        /* ── List view ── */
        <div className="tm2-list">
          <div className="tm2-lhead">
            <span>№</span>
            <span>Üzv</span>
            <span>Rol</span>
            <span>Şöbə</span>
            <span>Email</span>
            <span>Tapş.</span>
            <span>Şirkət</span>
            <span></span>
          </div>
          {filtered.map((m, i) => {
            const [a1, a2] = avatarPaletteFor(m.id)
            const roleColor = companyColor(m.company)
            const memberTasks = tasks.filter(t => t.assignee === m.name)
            const doneTasks = memberTasks.filter(t => t.status === 'Tamamlandı').length

            return (
              <div key={m.id} className="tm2-lrow" onClick={() => setSelected(m.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    className="tm2-av"
                    style={{ background: `linear-gradient(135deg, ${a1}, ${a2})`, flexShrink: 0 }}
                  >
                    {initialsM(m.name)}
                    {m.email && <span className="tm2-online"></span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tm2-name">{m.name}</div>
                    <div className="tm2-un">{m.personalCode ? `#${m.personalCode}` : ''}</div>
                  </div>
                </div>

                <span className="tm2-role" style={{ color: roleColor }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor, flexShrink: 0 }}></span>
                  {m.position || m.role || '—'}
                </span>

                <span style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.department}
                </span>

                <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.email}
                </span>

                <span style={{ fontSize: 12, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                  {doneTasks}<span style={{ color: 'var(--muted)', fontWeight: 500 }}>/{memberTasks.length}</span>
                </span>

                <span style={{ fontSize: 11, color: roleColor, fontWeight: 700 }}>
                  {m.company || '—'}
                </span>

                <button className="tm2-icbtn" onClick={(e) => { e.stopPropagation(); setSelected(m.id) }}>
                  <Icon name="arrow_forward" size={12} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Card view ── */
        <div className="tm2-grid">
          {filtered.map((m) => {
            const [a1, a2] = avatarPaletteFor(m.id)
            const roleColor = companyColor(m.company)
            const memberTasks = tasks.filter(t => t.assignee === m.name)
            const doneTasks = memberTasks.filter(t => t.status === 'Tamamlandı').length

            return (
              <div key={m.id} className="tm2-card" onClick={() => setSelected(m.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className="tm2-av lg"
                    style={{ background: `linear-gradient(135deg, ${a1}, ${a2})`, flexShrink: 0 }}
                  >
                    {initialsM(m.name)}
                    {m.email && <span className="tm2-online lg"></span>}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="tm2-name lg">{m.name}</div>
                    <div className="tm2-un">{m.personalCode ? `#${m.personalCode}` : (m.email?.split('@')[0] || '')}</div>
                  </div>
                </div>

                <div className="tm2-card-meta">
                  <span className="tm2-role" style={{ color: roleColor }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor, flexShrink: 0 }}></span>
                    {m.position || m.role || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                    {m.department}
                  </span>
                </div>

                <div className="tm2-card-stats">
                  <div>
                    <div className="tm2-k">Tapşırıq</div>
                    <div className="tm2-v">{memberTasks.length}</div>
                  </div>
                  <div>
                    <div className="tm2-k">Bitirilib</div>
                    <div className="tm2-v" style={{ color: 'var(--success)' }}>{doneTasks}</div>
                  </div>
                  <div>
                    <div className="tm2-k">Şirkət</div>
                    <div className="tm2-v" style={{ fontSize: 10, color: roleColor }}>{m.company || '—'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Member drawer — portal */}
      {selectedMember && (() => {
        const memberTasks = tasks.filter(t => t.assignee === selectedMember.name)
        const memberDone  = memberTasks.filter(t => t.status === 'Tamamlandı').length
        return (
          <MemberDrawer
            member={selectedMember}
            memberTasks={memberTasks.length}
            memberDone={memberDone}
            onClose={() => setSelected(null)}
            onEdit={openEdit}
            onDelete={openDeleteConfirm}
          />
        )
      })()}

      {/* Modals */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Üzv əlavə et">
        <MemberForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={saving} />
      </Modal>

      <Modal
        open={modal === 'edit'}
        onClose={() => { setModal(null); setEditMember(null) }}
        title="Üzvü düzəlt"
      >
        {editMember && (
          <MemberForm
            initial={editMember}
            onSubmit={handleEdit}
            onCancel={() => { setModal(null); setEditMember(null) }}
            loading={saving}
          />
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
