'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { Role, PermissionKey } from '@/lib/types'
import { PERMISSION_GROUPS, resolveImplied, getImpliedBy } from '@/lib/permissions'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Plus, Trash2, Shield, Lock, Link2, Loader2, Save,
  Check, ShieldCheck, ChevronDown, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  '#5B5BF5', '#E85C7A', '#0EA5E9', '#10B981',
  '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4',
  '#84CC16', '#EC4899',
]

type GroupMode = 'none' | 'all' | 'custom'

function deriveGroupMode(groupKeys: PermissionKey[], active: Set<PermissionKey>): GroupMode {
  const has = groupKeys.filter(k => active.has(k)).length
  if (has === 0) return 'none'
  if (has === groupKeys.length) return 'all'
  return 'custom'
}

// ── Permission Checkbox ───────────────────────────────────────────────────────

function PermissionItem({
  permKey, label, description, impliesKeys, active, impliedBy, isSystem, color, onToggle,
}: {
  permKey: PermissionKey
  label: string
  description: string
  impliesKeys?: PermissionKey[]
  active: boolean
  impliedBy: string[]
  isSystem: boolean
  color: string
  onToggle: () => void
}) {
  const locked = isSystem || impliedBy.length > 0

  return (
    <button
      type="button"
      onClick={locked ? undefined : onToggle}
      title={impliedBy.length > 0 ? `Bu icazə "${impliedBy.join(', ')}" tərəfindən aktivdir` : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
        padding: '8px 10px', borderRadius: 10, textAlign: 'left',
        border: `1.5px solid ${active ? color + '55' : 'var(--border)'}`,
        background: active ? color + '0D' : 'var(--surface)',
        cursor: locked ? 'default' : 'pointer',
        transition: 'all .15s',
        opacity: isSystem && !active ? 0.38 : 1,
      }}
    >
      {/* Custom checkbox */}
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
        border: `1.5px solid ${active ? color : 'var(--border)'}`,
        background: active ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}>
        {active && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--ink)' : 'var(--muted-2)' }}>
            {label}
          </span>
          {impliedBy.length > 0 && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                fontSize: 9, color: color, fontWeight: 700,
                background: color + '18', padding: '1px 5px', borderRadius: 4,
              }}
            >
              <Link2 size={8} />
              avtomatik
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>
          {description}
        </div>
        {impliesKeys && impliesKeys.length > 0 && (
          <div style={{
            fontSize: 9, color: color, marginTop: 3,
            display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
          }}>
            <Link2 size={8} />
            <span style={{ opacity: 0.8 }}>əlavə olaraq aktivləşdirir:</span>
            {impliesKeys.map(k => (
              <span key={k} style={{
                background: color + '18', padding: '0 4px', borderRadius: 3, fontWeight: 700,
              }}>
                {k}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Group Mode Selector (radio-style) ─────────────────────────────────────────

function GroupModeSelector({
  mode, onChange, color,
}: {
  mode: GroupMode; onChange: (m: GroupMode) => void; color: string
}) {
  const options: { value: GroupMode; label: string }[] = [
    { value: 'none',   label: 'Yox' },
    { value: 'custom', label: 'Seçim' },
    { value: 'all',    label: 'Hamısı' },
  ]

  return (
    <div style={{
      display: 'flex', background: 'var(--surface-2)',
      borderRadius: 8, padding: 3, gap: 2,
    }}>
      {options.map(opt => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '4px 11px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: active ? 'var(--surface)' : 'transparent',
              color: active
                ? opt.value === 'all' ? '#10B981'
                : opt.value === 'none' ? '#EF4444'
                : color
                : 'var(--muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Permission Group Card ─────────────────────────────────────────────────────

function PermissionGroup({
  group, active, impliedByMap, isSystem, onTogglePerm, onSetGroupMode,
}: {
  group: typeof PERMISSION_GROUPS[number]
  active: Set<PermissionKey>
  impliedByMap: Map<PermissionKey, PermissionKey[]>
  isSystem: boolean
  onTogglePerm: (key: PermissionKey) => void
  onSetGroupMode: (keys: PermissionKey[], mode: GroupMode) => void
}) {
  const groupKeys = group.permissions.map(p => p.key)
  const mode = deriveGroupMode(groupKeys, active)
  const activeCount = groupKeys.filter(k => active.has(k)).length

  return (
    <div style={{
      borderRadius: 14, border: `1.5px solid ${activeCount > 0 ? group.color + '35' : 'var(--border)'}`,
      background: activeCount > 0 ? group.color + '06' : 'var(--surface)',
      overflow: 'hidden', transition: 'all .2s',
    }}>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: `1px solid ${activeCount > 0 ? group.color + '25' : 'var(--border)'}`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: activeCount > 0 ? group.color + '20' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}>
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 17, color: activeCount > 0 ? group.color : 'var(--muted)' }}
          >
            {group.icon}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{group.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {activeCount === 0 ? 'İcazə yoxdur' : `${activeCount} / ${groupKeys.length} icazə aktiv`}
          </div>
        </div>

        {!isSystem && (
          <GroupModeSelector
            mode={mode}
            color={group.color}
            onChange={m => onSetGroupMode(groupKeys, m)}
          />
        )}
      </div>

      {/* Individual permissions grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 8, padding: 12,
      }}>
        {group.permissions.map(perm => (
          <PermissionItem
            key={perm.key}
            permKey={perm.key}
            label={perm.label}
            description={perm.description}
            impliesKeys={perm.implies}
            active={active.has(perm.key)}
            impliedBy={impliedByMap.get(perm.key) || []}
            isSystem={isSystem}
            color={group.color}
            onToggle={() => onTogglePerm(perm.key)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RolesTab() {
  const { currentWorkspaceId } = useWorkspace()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Role | null>(null)

  // Edit state
  const [editPerms, setEditPerms] = useState<Set<PermissionKey>>(new Set())
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState('#5B5BF5')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create state
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCreating, setNewCreating] = useState(false)

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    const res = await db.roles.getAll(currentWorkspaceId || undefined)
    if (res.success && res.data) setRoles(res.data)
    setLoading(false)
  }, [currentWorkspaceId])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const selectRole = (role: Role) => {
    setSelected(role)
    setEditPerms(new Set(role.permissions))
    setEditName(role.name)
    setEditDesc(role.description || '')
    setEditColor(role.color || '#5B5BF5')
    setDirty(false)
  }

  const togglePerm = (key: PermissionKey) => {
    setDirty(true)
    setEditPerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Only remove if no other active permission implies this one
        const impliedByMap = getImpliedBy(next)
        if ((impliedByMap.get(key) || []).length > 0) {
          toast('Bu icazə başqa bir icazə tərəfindən tələb olunur', { icon: '🔗' })
          return prev
        }
        next.delete(key)
      } else {
        next.add(key)
        return new Set(resolveImplied(Array.from(next)))
      }
      return next
    })
  }

  const setGroupMode = (groupKeys: PermissionKey[], mode: GroupMode) => {
    setDirty(true)
    setEditPerms(prev => {
      const next = new Set(prev)
      if (mode === 'none') {
        groupKeys.forEach(k => {
          const impliedByMap = getImpliedBy(next)
          const externalImpliers = (impliedByMap.get(k) || []).filter(
            imp => !groupKeys.includes(imp as PermissionKey)
          )
          if (externalImpliers.length === 0) next.delete(k)
        })
      } else if (mode === 'all') {
        groupKeys.forEach(k => next.add(k))
        return new Set(resolveImplied(Array.from(next)))
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    const res = await db.roles.update(selected.id, {
      name: editName.trim() || selected.name,
      description: editDesc,
      color: editColor,
      permissions: Array.from(editPerms),
    })
    if (res.success && res.data) {
      toast.success('Rol yeniləndi')
      setDirty(false)
      await fetchRoles()
      selectRole(res.data)
    } else {
      toast.error(res.error || 'Xəta baş verdi')
    }
    setSaving(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setNewCreating(true)
    const res = await db.roles.create({
      name: newName.trim(),
      description: '',
      color: ROLE_COLORS[roles.length % ROLE_COLORS.length],
      permissions: [],
      isSystem: false,
      workspaceId: currentWorkspaceId || '',
    })
    if (res.success && res.data) {
      toast.success('Rol yaradıldı')
      setNewName('')
      setCreating(false)
      await fetchRoles()
      selectRole(res.data)
    } else {
      toast.error(res.error || 'Xəta')
    }
    setNewCreating(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    const res = await db.roles.delete(deleteId)
    if (res.success) {
      toast.success('Rol silindi')
      if (selected?.id === deleteId) setSelected(null)
      setDeleteId(null)
      await fetchRoles()
    } else {
      toast.error(res.error || 'Xəta')
    }
    setDeleting(false)
  }

  const impliedByMap = getImpliedBy(editPerms)
  const totalActive = editPerms.size

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 240px)', minHeight: 560 }}>

      {/* ── Left: Role List ── */}
      <div className="cardM" style={{
        width: 220, flexShrink: 0, padding: 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
            Rollər
          </span>
          <button
            onClick={() => setCreating(c => !c)}
            className="btn-primaryM"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            <Plus size={12} /> Yeni
          </button>
        </div>

        {creating && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setCreating(false); setNewName('') }
                }}
                placeholder="Rol adı..."
                className="inputM"
                style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
              />
              <button
                onClick={handleCreate}
                disabled={newCreating || !newName.trim()}
                className="btn-primaryM"
                style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }}
              >
                {newCreating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, margin: '6px 10px', borderRadius: 10 }} />
            ))
          ) : roles.map(role => {
            const isSelected = selected?.id === role.id
            return (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: isSelected ? 'var(--primary-soft)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderLeft: `3px solid ${isSelected ? (role.color || '#5B5BF5') : 'transparent'}`,
                  transition: 'all .12s',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: role.color || '#5B5BF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {role.isSystem
                    ? <Lock size={12} color="#fff" />
                    : <Shield size={12} color="#fff" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {role.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {role.permissions.length} icazə
                  </div>
                </div>
                {role.isSystem && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: 'var(--primary)',
                    background: 'var(--primary-soft)', padding: '2px 5px',
                    borderRadius: 4, flexShrink: 0, textTransform: 'uppercase',
                  }}>
                    sys
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: Editor ── */}
      {selected ? (
        <div className="cardM" style={{
          flex: 1, padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: editColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px ${editColor}55`,
            }}>
              {selected.isSystem
                ? <Lock size={18} color="#fff" />
                : <Shield size={18} color="#fff" />
              }
            </div>

            {selected.isSystem ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{selected.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: '#64748B', padding: '2px 8px', borderRadius: 999,
                  }}>
                    Sistem Rolu
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {selected.description || 'Bu rol sistem tərəfindən idarə olunur'} · {totalActive} icazə
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                <input
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setDirty(true) }}
                  className="inputM"
                  style={{ fontSize: 15, fontWeight: 800, padding: '6px 12px', minWidth: 140, maxWidth: 220 }}
                  placeholder="Rol adı"
                />
                <input
                  value={editDesc}
                  onChange={e => { setEditDesc(e.target.value); setDirty(true) }}
                  className="inputM"
                  style={{ fontSize: 12, padding: '6px 12px', flex: 1, minWidth: 140 }}
                  placeholder="Açıqlama (isteğe bağlı)"
                />
              </div>
            )}

            {/* Color picker + actions */}
            {!selected.isSystem && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setEditColor(c); setDirty(true) }}
                    style={{
                      width: 18, height: 18, borderRadius: 5, background: c,
                      border: 'none', cursor: 'pointer',
                      outline: editColor === c ? `2.5px solid ${c}` : '2px solid transparent',
                      outlineOffset: 2,
                      transform: editColor === c ? 'scale(1.25)' : 'scale(1)',
                      transition: 'transform .15s',
                    }}
                  />
                ))}
                <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
                <button
                  onClick={() => setDeleteId(selected.id)}
                  className="btn-ghostM"
                  style={{ padding: '5px 9px', color: '#EF4444' }}
                  title="Rolu sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div style={{
            padding: '8px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              İcazə xülasəsi:
            </span>
            {PERMISSION_GROUPS.map(g => {
              const gKeys = g.permissions.map(p => p.key)
              const count = gKeys.filter(k => editPerms.has(k)).length
              if (count === 0) return null
              return (
                <span key={g.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: g.color, background: g.color + '18',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>{g.icon}</span>
                  {count}/{gKeys.length}
                </span>
              )
            })}
            {totalActive === 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Heç bir icazə seçilməyib</span>
            )}
          </div>

          {/* Permission groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              İcazə Qrupları
            </div>

            {PERMISSION_GROUPS.map(group => (
              <PermissionGroup
                key={group.key}
                group={group}
                active={editPerms}
                impliedByMap={impliedByMap}
                isSystem={selected.isSystem}
                onTogglePerm={togglePerm}
                onSetGroupMode={setGroupMode}
              />
            ))}
          </div>

          {/* Save bar */}
          {dirty && !selected.isSystem && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#F59E0B' }} />
                Yadda saxlanmamış dəyişikliklər var
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => selectRole(selected)}
                  className="btn-ghostM"
                  style={{ fontSize: 12 }}
                >
                  Ləğv et
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primaryM"
                  style={{ fontSize: 12 }}
                >
                  {saving
                    ? <><Loader2 size={13} className="animate-spin" /> Saxlanılır...</>
                    : <><Save size={13} /> Dəyişiklikləri saxla</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="cardM" style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <ShieldCheck size={44} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-2)' }}>Rol seçin</div>
            <div style={{ fontSize: 12, marginTop: 6, maxWidth: 240, lineHeight: 1.6 }}>
              Soldan bir rol seçin və icazələrini idarə edin,
              ya da &ldquo;Yeni&rdquo; düyməsi ilə xüsusi rol yaradın.
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Rolu sil"
        message="Bu rolu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz. Sistem rolları silinə bilməz."
        loading={deleting}
      />
    </div>
  )
}
