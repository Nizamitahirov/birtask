'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { Role, PermissionKey } from '@/lib/types'
import { PERMISSION_GROUPS, resolveImplied, getImpliedBy } from '@/lib/permissions'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Plus, Trash2, Shield, Lock, Link2, Loader2, Save,
  Check, ShieldCheck, ChevronDown, ChevronUp, Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  '#5B5BF5', '#E85C7A', '#0EA5E9', '#10B981',
  '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4',
  '#EC4899', '#84CC16',
]

type GroupMode = 'none' | 'all' | 'custom'

function deriveGroupMode(groupKeys: PermissionKey[], active: Set<PermissionKey>): GroupMode {
  const count = groupKeys.filter(k => active.has(k)).length
  if (count === 0) return 'none'
  if (count === groupKeys.length) return 'all'
  return 'custom'
}

// ── Permission Item ───────────────────────────────────────────────────────────

function PermItem({
  perm, active, impliedBy, color, editable, onToggle,
}: {
  perm: typeof PERMISSION_GROUPS[0]['permissions'][0]
  active: boolean
  impliedBy: string[]
  color: string
  editable: boolean
  onToggle: () => void
}) {
  const blocked = !editable || impliedBy.length > 0

  return (
    <button
      type="button"
      onClick={blocked ? (impliedBy.length > 0 ? () => toast(`Əvvəl bu icazəni tələb edən icazəni söndür`, { icon: '🔗' }) : undefined) : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 12px', borderRadius: 10,
        textAlign: 'left', transition: 'all .12s',
        border: `1.5px solid ${active ? color + '50' : 'var(--border)'}`,
        background: active ? color + '0C' : 'var(--surface)',
        cursor: blocked ? (impliedBy.length > 0 ? 'not-allowed' : 'default') : 'pointer',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 17, height: 17, borderRadius: 5, flexShrink: 0,
        border: `2px solid ${active ? color : 'var(--border)'}`,
        background: active ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
      }}>
        {active && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>

      {/* Label + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: active ? 'var(--ink)' : 'var(--muted-2)',
          }}>
            {perm.label}
          </span>
          {impliedBy.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700, color: color,
              background: color + '15', padding: '1px 6px', borderRadius: 999,
            }}>
              <Link2 size={7} /> auto
            </span>
          )}
          {perm.implies && perm.implies.length > 0 && !impliedBy.length && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9, color: 'var(--muted)', background: 'var(--surface-2)',
              padding: '1px 6px', borderRadius: 999,
            }}>
              <Link2 size={7} /> {perm.implies.length} tələb
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
          {perm.description}
        </div>
      </div>
    </button>
  )
}

// ── Group Mode Pill ───────────────────────────────────────────────────────────

function ModePills({
  mode, onChange, color,
}: {
  mode: GroupMode; onChange: (m: GroupMode) => void; color: string
}) {
  return (
    <div
      style={{ display: 'flex', background: 'var(--surface-3, var(--surface-2))', borderRadius: 8, padding: 2, gap: 1 }}
      onClick={e => e.stopPropagation()}
    >
      {(['none', 'custom', 'all'] as GroupMode[]).map(v => {
        const labels = { none: 'Yox', custom: 'Seçim', all: 'Hamısı' }
        const on = mode === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all .12s',
              background: on ? 'var(--surface)' : 'transparent',
              color: on
                ? v === 'all' ? '#10B981' : v === 'none' ? '#EF4444' : color
                : 'var(--muted)',
              boxShadow: on ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}
          >
            {labels[v]}
          </button>
        )
      })}
    </div>
  )
}

// ── Permission Group Accordion ────────────────────────────────────────────────

function GroupAccordion({
  group, active, impliedByMap, expanded, editable,
  onTogglePerm, onSetGroupMode, onToggleExpand,
}: {
  group: typeof PERMISSION_GROUPS[0]
  active: Set<PermissionKey>
  impliedByMap: Map<PermissionKey, PermissionKey[]>
  expanded: boolean
  editable: boolean
  onTogglePerm: (k: PermissionKey) => void
  onSetGroupMode: (keys: PermissionKey[], mode: GroupMode) => void
  onToggleExpand: () => void
}) {
  const keys = group.permissions.map(p => p.key)
  const activeCount = keys.filter(k => active.has(k)).length
  const mode = deriveGroupMode(keys, active)
  const hasAny = activeCount > 0

  return (
    <div style={{
      borderRadius: 12,
      border: `1.5px solid ${hasAny ? group.color + '45' : 'var(--border)'}`,
      background: hasAny ? group.color + '05' : 'var(--surface)',
      overflow: 'hidden',
      transition: 'border-color .15s, background .15s',
    }}>
      {/* Header — always visible, click to expand/collapse */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${hasAny ? group.color + '25' : 'var(--border)'}` : 'none',
          transition: 'background .12s',
        }}
      >
        {/* Group icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: hasAny ? group.color + '20' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: hasAny ? group.color : 'var(--muted)' }}>
            {group.icon}
          </span>
        </div>

        {/* Name + count */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            {group.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {activeCount === 0
              ? 'Heç bir icazə yox'
              : `${activeCount} / ${keys.length} icazə aktiv`}
          </div>
        </div>

        {/* Active permission pills (compact preview) */}
        {!expanded && hasAny && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
            {group.permissions.filter(p => active.has(p.key)).map(p => (
              <span key={p.key} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                background: group.color + '18', color: group.color,
              }}>
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* Mode pills (only when editing) */}
        {editable && (
          <ModePills
            mode={mode}
            color={group.color}
            onChange={m => onSetGroupMode(keys, m)}
          />
        )}

        {/* Chevron */}
        <div style={{ color: 'var(--muted)', flexShrink: 0, marginLeft: 4 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Permissions grid (expanded) */}
      {expanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 8, padding: '12px 14px',
        }}>
          {group.permissions.map(perm => (
            <PermItem
              key={perm.key}
              perm={perm}
              active={active.has(perm.key)}
              impliedBy={impliedByMap.get(perm.key) || []}
              color={group.color}
              editable={editable}
              onToggle={() => onTogglePerm(perm.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function RolesTab() {
  const { currentWorkspaceId } = useWorkspace()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Role | null>(null)

  const [editPerms, setEditPerms] = useState<Set<PermissionKey>>(new Set())
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState('#5B5BF5')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSaving, setNewSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Expand/collapse per group
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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
    // Auto-expand groups that have active permissions
    const expanded = new Set<string>()
    PERMISSION_GROUPS.forEach(g => {
      if (g.permissions.some(p => role.permissions.includes(p.key))) {
        expanded.add(g.key)
      }
    })
    setExpandedGroups(expanded)
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const togglePerm = (key: PermissionKey) => {
    setDirty(true)
    setEditPerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if ((getImpliedBy(next).get(key) || []).length > 0) {
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
          const extImpliers = (getImpliedBy(next).get(k) || []).filter(
            imp => !groupKeys.includes(imp as PermissionKey)
          )
          if (extImpliers.length === 0) next.delete(k)
        })
      } else if (mode === 'all') {
        groupKeys.forEach(k => next.add(k))
        return new Set(resolveImplied(Array.from(next)))
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!selected || !editName.trim()) return
    setSaving(true)
    const res = await db.roles.update(selected.id, {
      name: editName.trim(),
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
    setNewSaving(true)
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
      setNewName(''); setCreating(false)
      await fetchRoles()
      selectRole(res.data)
    } else {
      toast.error(res.error || 'Xəta')
    }
    setNewSaving(false)
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

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)', minHeight: 580 }}>

      {/* ── Left panel: role list ──────────────────────────────── */}
      <div className="cardM" style={{
        width: 256, flexShrink: 0, padding: 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Rollər
          </span>
          <button onClick={() => setCreating(c => !c)} className="btn-primaryM" style={{ padding: '5px 12px', fontSize: 12 }}>
            <Plus size={13} /> Yeni Rol
          </button>
        </div>

        {/* Inline create */}
        {creating && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
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
                style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
              />
              <button
                onClick={handleCreate}
                disabled={newSaving || !newName.trim()}
                className="btn-primaryM"
                style={{ padding: '7px 11px', flexShrink: 0 }}
              >
                {newSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
            </div>
          </div>
        )}

        {/* Role list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 58, margin: '6px 10px', borderRadius: 10 }} />
              ))
            : roles.map(role => {
                const isSel = selected?.id === role.id
                const permPct = Math.round((role.permissions.length / 28) * 100)
                return (
                  <button
                    key={role.id}
                    onClick={() => selectRole(role)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 14px 10px 12px', textAlign: 'left',
                      background: isSel ? 'var(--primary-soft)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      borderLeft: `3px solid ${isSel ? (role.color || '#5B5BF5') : 'transparent'}`,
                      transition: 'all .1s',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: role.color || '#5B5BF5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSel ? `0 3px 10px ${role.color || '#5B5BF5'}55` : 'none',
                      transition: 'box-shadow .15s',
                    }}>
                      {role.isSystem ? <Lock size={14} color="#fff" /> : <Shield size={14} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {role.name}
                        {role.isSystem && (
                          <span style={{
                            fontSize: 8, fontWeight: 800, textTransform: 'uppercase',
                            color: 'var(--primary)', background: 'var(--primary-soft)',
                            padding: '1px 5px', borderRadius: 4, letterSpacing: '0.05em',
                          }}>
                            sys
                          </span>
                        )}
                      </div>
                      {/* Permission progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'var(--surface-2)' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${permPct}%`,
                            background: role.color || '#5B5BF5',
                            transition: 'width .3s',
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
                          {role.permissions.length}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
          }
        </div>
      </div>

      {/* ── Right panel: editor ────────────────────────────────── */}
      {selected ? (
        <div className="cardM" style={{
          flex: 1, padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Role header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: editColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${editColor}55`,
            }}>
              {selected.isSystem ? <Lock size={20} color="#fff" /> : <Shield size={20} color="#fff" />}
            </div>

            {/* Name + description editable */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <input
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setDirty(true) }}
                  className="inputM"
                  style={{ fontSize: 16, fontWeight: 800, padding: '5px 12px', maxWidth: 240 }}
                  placeholder="Rol adı"
                />
                {selected.isSystem && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: '#64748B', padding: '3px 9px', borderRadius: 999,
                  }}>
                    Sistem rolu
                  </span>
                )}
              </div>
              <input
                value={editDesc}
                onChange={e => { setEditDesc(e.target.value); setDirty(true) }}
                className="inputM"
                style={{ fontSize: 12, padding: '5px 12px', maxWidth: 360 }}
                placeholder="Açıqlama (isteğe bağlı)"
              />
            </div>

            {/* Color + delete */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setEditColor(c); setDirty(true) }}
                    style={{
                      width: 20, height: 20, borderRadius: 5, background: c,
                      border: 'none', cursor: 'pointer',
                      outline: editColor === c ? `2.5px solid ${c}` : '2px solid transparent',
                      outlineOffset: 2,
                      transform: editColor === c ? 'scale(1.3)' : 'scale(1)',
                      transition: 'transform .12s',
                    }}
                  />
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--border)', marginLeft: 2 }} />
                <button
                  onClick={() => setDeleteId(selected.id)}
                  className="btn-ghostM"
                  style={{ padding: '4px 9px', color: '#EF4444', fontSize: 12 }}
                  title="Rolu sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{
            padding: '8px 20px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)', display: 'flex', gap: 8,
            alignItems: 'center', flexWrap: 'wrap', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginRight: 4 }}>
              Aktiv icazələr:
            </span>
            {PERMISSION_GROUPS.map(g => {
              const n = g.permissions.filter(p => editPerms.has(p.key)).length
              if (!n) return null
              return (
                <span key={g.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700,
                  color: g.color, background: g.color + '18',
                  padding: '3px 9px', borderRadius: 999,
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>{g.icon}</span>
                  {n}/{g.permissions.length}
                </span>
              )
            })}
            {editPerms.size === 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Heç bir icazə seçilməyib
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              Cəmi: {editPerms.size} icazə
            </span>
          </div>

          {/* Accordion groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Expand/collapse all controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
                İcazə Qrupları
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setExpandedGroups(new Set(PERMISSION_GROUPS.map(g => g.key)))}
                  className="btn-ghostM"
                  style={{ fontSize: 11, padding: '3px 10px' }}
                >
                  Hamısını aç
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedGroups(new Set())}
                  className="btn-ghostM"
                  style={{ fontSize: 11, padding: '3px 10px' }}
                >
                  Hamısını bağla
                </button>
              </div>
            </div>

            {PERMISSION_GROUPS.map(group => (
              <GroupAccordion
                key={group.key}
                group={group}
                active={editPerms}
                impliedByMap={impliedByMap}
                expanded={expandedGroups.has(group.key)}
                editable
                onTogglePerm={togglePerm}
                onSetGroupMode={setGroupMode}
                onToggleExpand={() => toggleGroup(group.key)}
              />
            ))}
          </div>

          {/* Save bar */}
          {dirty && (
            <div style={{
              padding: '11px 20px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
                Saxlanmamış dəyişikliklər
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => selectRole(selected)} className="btn-ghostM" style={{ fontSize: 12 }}>
                  Ləğv et
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primaryM" style={{ fontSize: 12 }}>
                  {saving
                    ? <><Loader2 size={13} className="animate-spin" /> Saxlanılır...</>
                    : <><Save size={13} /> Saxla</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="cardM" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <ShieldCheck size={48} style={{ margin: '0 auto 16px', color: 'var(--muted)', opacity: 0.25 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>
              Rol seçin
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 260 }}>
              Sol paneldən bir rol seçin və icazələrini idarə edin.
              Yeni xüsusi rol yaratmaq üçün <strong>Yeni Rol</strong> düyməsini basın.
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Rolu sil"
        message="Bu rolu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz."
        loading={deleting}
      />
    </div>
  )
}
