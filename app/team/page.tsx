'use client'

import { useState, useMemo } from 'react'
import { useTeam, useTasks } from '@/hooks/useSheets'
import { TeamMember, Task } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus, Users } from 'lucide-react'
import { getDaysLeft } from '@/lib/utils'

/* ── Palette helpers ─────────────────────────────────────────── */

const PASTEL_PALETTES: [string, string][] = [
  ['#FFD6E0', '#FFC9B0'],
  ['#C5F5E0', '#BFE6FF'],
  ['#E5DCFF', '#FFD6E0'],
  ['#FFF0B8', '#FFD9B0'],
  ['#F0D5FF', '#C5F5E0'],
  ['#C9E6FF', '#DCD3FF'],
  ['#FFCABA', '#FFF0B8'],
  ['#D8EFC8', '#C9E6FF'],
]

const VIBRANT_PALETTES: [string, string][] = [
  ['#5B5BF5', '#B57BFF'],
  ['#FF8B7B', '#FFD466'],
  ['#16C098', '#67E8C5'],
  ['#4DABF7', '#A78BFA'],
  ['#E879C8', '#FF8FB1'],
  ['#F5A524', '#FF8B7B'],
  ['#7C5BF7', '#E879C8'],
  ['#16C098', '#5B5BF5'],
]

function paletteIndexFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 8
}

function paletteFor(seed: string): [string, string] {
  return PASTEL_PALETTES[paletteIndexFor(seed)]
}

function avatarPaletteFor(seed: string): [string, string] {
  return VIBRANT_PALETTES[(paletteIndexFor(seed) + 3) % 8]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Menecer', member: 'Üzv', viewer: 'İzləyici',
}

const COMPANY_ICONS: Record<string, { ico: string; bg: string; fg: string }> = {
  'Birbank':    { ico: 'account_balance', bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  'Pashapay':   { ico: 'payments',        bg: 'var(--success-soft)', fg: 'var(--success)' },
  'Birmarket':  { ico: 'storefront',      bg: 'var(--warn-soft)',    fg: 'var(--warn)' },
}

/* ── Member form ─────────────────────────────────────────────── */

function MemberForm({
  initial, onSubmit, onCancel, loading,
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
    department: initial?.department || '',
    phone: initial?.phone || '',
    avatar: initial?.avatar || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ ...form } as Omit<TeamMember, 'id' | 'createdAt'>)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ad Soyad *
        </label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className="inputM" placeholder="Ad Soyad" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="inputM" placeholder="email@example.com" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Telefon</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="inputM" placeholder="+994 50 xxx xx xx" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vəzifə</label>
          <input value={form.role} onChange={e => set('role', e.target.value)} className="inputM" placeholder="Developer, Manager..." />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Şöbə</label>
          <input value={form.department} onChange={e => set('department', e.target.value)} className="inputM" placeholder="Texnologiya, Dizayn..." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        <button type="button" onClick={onCancel} className="btn-ghostM" style={{ flex: 1, justifyContent: 'center' }}>Ləğv et</button>
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
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const departments = useMemo(
    () => Array.from(new Set(members.map(m => m.department).filter(Boolean))),
    [members]
  )

  const companies = useMemo(
    () => Array.from(new Set(members.map(m => m.company).filter(Boolean))) as string[],
    [members]
  )

  const byCompany = useMemo(() => {
    const r: Record<string, number> = {}
    members.forEach(m => { const c = m.company || 'Digər'; r[c] = (r[c] || 0) + 1 })
    return r
  }, [members])

  const filtered = useMemo(() => members.filter(m => {
    if (roleFilter !== 'all' && (m.company || 'Digər') !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.name.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.position?.toLowerCase().includes(q) ||
        m.company?.toLowerCase().includes(q) ||
        m.personalCode?.toLowerCase().includes(q) ||
        m.finCode?.toLowerCase().includes(q)
    }
    return true
  }), [members, search, roleFilter])

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

  const selectedMember = selected ? members.find(m => m.id === selected) : null

  return (
    <div className="pageM fade-in">

      {/* Header */}
      <div className="team-headM">
        <div>
          <h1>
            Komanda
            <span className="cnt">{members.length}</span>
          </h1>
          <div className="sub">
            {members.length} üzv · {companies.length} şirkət · {departments.length} departament
          </div>
        </div>
        <div className="actions">
          <button className="btn-ghostM" onClick={refresh}>
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>refresh</span>
            Yenilə
          </button>
          <button className="btn-ghostM">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>filter_list</span>
            Süzgəc
          </button>
          <button className="btn-primaryM" onClick={() => setModal('create')}>
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>person_add</span>
            Yeni üzv
          </button>
        </div>
      </div>

      {/* Company cards */}
      {companies.length > 0 && (
        <div className="deptM stagger">
          {companies.map(company => {
            const companyMembers = members.filter(m => m.company === company)
            const cInfo = COMPANY_ICONS[company] || { ico: 'apartment', bg: 'var(--surface-2)', fg: 'var(--muted)' }
            return (
              <div
                className={'deptCard' + (roleFilter === company ? ' active' : '')}
                key={company}
                onClick={() => setRoleFilter(roleFilter === company ? 'all' : company)}
                style={{ cursor: 'pointer' }}
              >
                <div className="hdr">
                  <div className="nm">{company}</div>
                  <div className="ico" style={{ background: cInfo.bg, color: cInfo.fg }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{cInfo.ico}</span>
                  </div>
                </div>
                <div className="cnt">
                  {companyMembers.length}
                  <small>üzv</small>
                </div>
                <div className="avstack">
                  {companyMembers.slice(0, 5).map(m => {
                    const [av1, av2] = avatarPaletteFor(m.id)
                    return (
                      <div
                        key={m.id}
                        className="av"
                        style={{ background: `linear-gradient(135deg, ${av1}, ${av2})` }}
                      >
                        {initials(m.name)}
                      </div>
                    )
                  })}
                  {companyMembers.length > 5 && (
                    <div className="av more">+{companyMembers.length - 5}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="team-filters">
        <div className="searchM" style={{ maxWidth: 480 }}>
          <span className="ico">
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>search</span>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, email, şöbə üzrə axtar..."
          />
          <span className="kbd">⌘ K</span>
        </div>
        <div className="team-chips">
          {[
            { id: 'all', label: 'Hamısı', count: members.length },
            ...companies.map(c => ({ id: c, label: c, count: byCompany[c] || 0 })),
          ].map(c => (
            <button
              key={c.id}
              className={roleFilter === c.id ? 'on' : ''}
              onClick={() => setRoleFilter(c.id)}
            >
              {c.label}
              <span className="cnt">{c.count}</span>
            </button>
          ))}
        </div>
        <button className="btn-ghostM">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>sort</span>
          Ad ↓
        </button>
      </div>

      {/* Member grid */}
      {loading ? (
        <div className="team-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Üzv tapılmadı"
          description="Komandanıza ilk üzvü əlavə edin"
          action={
            <button onClick={() => setModal('create')} className="btn-primaryM">
              <Plus size={15} /> Üzv əlavə et
            </button>
          }
        />
      ) : (
        <div className="team-grid">
          {filtered.map(m => {
            const [c1, c2] = paletteFor(m.id)
            const [ac1, ac2] = avatarPaletteFor(m.id)
            const companyPill =
              m.company === 'Birbank' ? 'indigo' :
              m.company === 'Pashapay' ? 'info' :
              m.company === 'Birmarket' ? 'warn' : 'muted'

            const myTasks = tasks.filter(t => t.assignee === m.name)
            const doneTasks = myTasks.filter(t => t.status === 'Tamamlandı').length

            return (
              <div
                key={m.id}
                className={'memberM' + (selected === m.id ? ' selected' : '')}
                onClick={() => setSelected(selected === m.id ? null : m.id)}
                style={{
                  '--g1': c1,
                  '--g2': c2,
                  '--ag1': ac1,
                  '--ag2': ac2,
                } as React.CSSProperties}
              >
                <div className="cover" style={{ position: 'relative' }}>
                  <div className="av">{initials(m.name)}</div>
                </div>
                <div className="body">
                  <div className="name-row">
                    <div>
                      <div className="name">{m.name}</div>
                      <div className="un" style={{ fontSize: 10 }}>{m.personalCode ? `#${m.personalCode}` : (m.email?.split('@')[0] || '')}</div>
                    </div>
                    <span
                      className="status-bullet"
                      style={{
                        background: (m as any).isActive !== false ? 'var(--success)' : 'var(--muted-2)',
                        boxShadow: (m as any).isActive !== false
                          ? '0 0 0 3px var(--success-soft)'
                          : '0 0 0 3px var(--surface-2)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {m.company && <span className={`pill ${companyPill}`}>{m.company}</span>}
                    {m.position && (
                      <span className="dept" style={{ fontSize: 10 }}>
                        {m.position}
                      </span>
                    )}
                  </div>

                  <div className="meta-row">
                    <div>
                      <div className="k">Tapş.</div>
                      <div className="v">{myTasks.length}</div>
                    </div>
                    <div>
                      <div className="k">Bitib</div>
                      <div className="v" style={{ color: 'var(--success)' }}>{doneTasks}</div>
                    </div>
                    <div>
                      <div className="k">FIN</div>
                      <div className="v" style={{ fontSize: 10, fontFamily: 'monospace' }}>{m.finCode || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selectedMember && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(15,17,41,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: 24,
            animation: 'fadeIn .2s both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              width: 420,
              background: 'var(--surface)',
              borderRadius: 20,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {(() => {
              const m = selectedMember
              const [c1, c2] = paletteFor(m.id)
              const [ac1, ac2] = avatarPaletteFor(m.id)
              const companyPill =
                m.company === 'Birbank' ? 'indigo' :
                m.company === 'Pashapay' ? 'info' :
                m.company === 'Birmarket' ? 'warn' : 'muted'
              const myTasks = tasks.filter(t => t.assignee === m.name)
              const doneTasks = myTasks.filter(t => t.status === 'Tamamlandı').length

              return (
                <>
                  <div style={{
                    height: 100,
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    position: 'relative',
                  }}>
                    <button
                      onClick={() => setSelected(null)}
                      className="icon-btn"
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(15,17,41,0.10)',
                        borderColor: 'transparent',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
                    </button>
                    <div style={{
                      position: 'absolute',
                      left: 22,
                      bottom: 14,
                      width: 68, height: 68,
                      borderRadius: 18,
                      background: `linear-gradient(135deg, ${ac1}, ${ac2})`,
                      color: 'white',
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid var(--surface)',
                      boxShadow: '0 10px 24px -8px rgba(15,17,41,0.35)',
                    }}>
                      {initials(m.name)}
                    </div>
                  </div>

                  <div style={{ padding: '14px 22px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--ink)' }}>
                          {m.name}
                        </h2>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {m.email}
                        </div>
                      </div>
                      {m.company && (
                        <span className={`pill ${companyPill}`} style={{ flexShrink: 0 }}>
                          {m.company}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="btn-ghostM"
                          style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>mail</span>
                          Email
                        </a>
                      )}
                      <button
                        className="btn-ghostM"
                        style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
                        onClick={() => { setEditMember(m); setModal('edit') }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 13 }}>edit</span>
                        Düzəlt
                      </button>
                      <button
                        className="btn-primaryM"
                        style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12 }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 13 }}>folder_shared</span>
                        Layihələr
                      </button>
                    </div>

                    <div style={{
                      marginTop: 14,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 6,
                    }}>
                      {[
                        { k: 'Tapşırıq', v: myTasks.length, ico: 'task' },
                        { k: 'Tamamlandı', v: doneTasks, ico: 'check_circle' },
                        { k: 'Personal', v: m.personalCode || '—', ico: 'badge' },
                      ].map(s => (
                        <div key={s.k} style={{
                          padding: '10px 8px',
                          background: 'var(--surface-2)',
                          borderRadius: 10,
                          textAlign: 'center',
                        }}>
                          <div style={{
                            margin: '0 auto 4px',
                            width: 22, height: 22,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--surface)',
                          }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 12 }}>{s.ico}</span>
                          </div>
                          <div style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: typeof s.v === 'number' ? 18 : 11,
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            lineHeight: 1,
                            color: 'var(--ink)',
                          }}>{s.v}</div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.k}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      background: 'var(--surface-2)',
                      borderRadius: 12,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      rowGap: 8,
                      columnGap: 16,
                    }}>
                      <CompactField k="Vəzifə" v={m.position || m.role || '—'} />
                      <CompactField k="Şirkət" v={m.company || '—'} />
                      <CompactField k="Personal kod" v={m.personalCode || '—'} />
                      <CompactField k="FIN kod" v={m.finCode || '—'} />
                      <CompactField k="Departament" v={m.department || '—'} />
                      <CompactField k="Funksional sahə" v={m.division || '—'} />
                      {m.section && <CompactField k="Bölmə" v={m.section} />}
                      {m.email && <CompactField k="Email" v={m.email} />}
                      {m.phone && <CompactField k="Telefon" v={m.phone} />}
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                      <button
                        className="btn-ghostM"
                        style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 12, color: 'var(--accent)' }}
                        onClick={() => setConfirmDelete(m)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 12 }}>delete_outline</span>
                        Sil
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

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

function CompactField({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: 9,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
        marginBottom: 2,
      }}>{k}</div>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--ink)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{v}</div>
    </div>
  )
}
