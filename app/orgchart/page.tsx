'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTeam } from '@/hooks/useSheets'
import { db } from '@/lib/db'
import { TeamMember } from '@/lib/types'
import toast from 'react-hot-toast'

// ─── Palettes ────────────────────────────────────────────────────────────────

const VIBRANT_PALETTES: [string, string][] = [
  ['#5B5BF5', '#B57BFF'], ['#FF8B7B', '#FFD466'], ['#16C098', '#67E8C5'],
  ['#4DABF7', '#A78BFA'], ['#E879C8', '#FF8FB1'], ['#F5A524', '#FF8B7B'],
  ['#7C5BF7', '#E879C8'], ['#16C098', '#5B5BF5'],
]
function avatarPaletteFor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return VIBRANT_PALETTES[Math.abs(h) % 8]
}

const DEPT_HUES = ['#5B5BF5','#EF4444','#10B981','#F59E0B','#8B5CF6',
                   '#06B6D4','#EC4899','#14B8A6','#F97316','#6366F1']
function deptColor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return DEPT_HUES[Math.abs(h) % DEPT_HUES.length]
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const CW = 196, CH = 118, HG = 40, VG = 80

interface Pos { x: number; y: number }

function buildLayout(members: TeamMember[], collapsed: Set<string>) {
  const ids = new Set(members.map(m => m.id))
  const childMap = new Map<string, string[]>()
  const roots: string[] = []

  members.forEach(m => {
    const valid = m.managerId && ids.has(m.managerId) && m.managerId !== m.id
    if (valid) {
      const arr = childMap.get(m.managerId!) ?? []
      arr.push(m.id); childMap.set(m.managerId!, arr)
    } else roots.push(m.id)
  })

  const widthCache = new Map<string, number>()
  function subtreeW(id: string, vis = new Set<string>()): number {
    if (vis.has(id)) return CW
    if (widthCache.has(id)) return widthCache.get(id)!
    vis = new Set(vis); vis.add(id)
    if (collapsed.has(id)) { widthCache.set(id, CW); return CW }
    const ch = childMap.get(id) ?? []
    if (!ch.length) { widthCache.set(id, CW); return CW }
    const w = Math.max(CW, ch.reduce((s, c, i) => s + subtreeW(c, vis) + (i ? HG : 0), 0))
    widthCache.set(id, w); return w
  }

  const positions = new Map<string, Pos>()
  function place(id: string, x: number, y: number, vis = new Set<string>()) {
    if (vis.has(id)) return
    vis = new Set(vis); vis.add(id)
    positions.set(id, { x, y })
    if (collapsed.has(id)) return
    const ch = childMap.get(id) ?? []
    if (!ch.length) return
    const total = ch.reduce((s, c, i) => s + subtreeW(c, vis) + (i ? HG : 0), 0)
    let cx = x + CW / 2 - total / 2
    ch.forEach(c => {
      const w = subtreeW(c, vis)
      place(c, cx, y + CH + VG, vis)
      cx += w + HG
    })
  }

  let rx = 0
  roots.forEach(r => { place(r, rx, 0); rx += subtreeW(r) + HG * 2 })

  let maxX = 0, maxY = 0
  positions.forEach(({ x, y }) => { maxX = Math.max(maxX, x + CW); maxY = Math.max(maxY, y + CH) })

  return { positions, childMap, roots, totalW: maxX, totalH: maxY }
}

// ─── Member Modal ─────────────────────────────────────────────────────────────

function MemberModal({ member, members, onClose }: {
  member: TeamMember; members: TeamMember[]; onClose: () => void
}) {
  const [c1, c2] = avatarPaletteFor(member.id)
  const dc = deptColor(member.department || '')
  const mgr = members.find(m => m.id === member.managerId)
  const fmgr = members.find(m => m.id === member.functionalManagerId)
  const reports = members.filter(m => m.managerId === member.id)
  const initials = member.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,30,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>
        {/* colour strip */}
        <div style={{ height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />

        {/* Header */}
        <div style={{ padding: '28px 28px 20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, flexShrink: 0,
            background: `linear-gradient(135deg,${c1},${c2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 800,
            boxShadow: `0 8px 24px ${c1}50`,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              {member.name}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 3 }}>{member.role || '—'}</div>
            {member.department && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                padding: '3px 10px', borderRadius: 999,
                background: dc + '18', color: dc, fontSize: 11, fontWeight: 700,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 12 }}>business</span>
                {member.department}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Info rows */}
        <div style={{ padding: '0 28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: 'mail', label: 'E-poçt', value: member.email },
            { icon: 'call', label: 'Telefon', value: member.phone },
            { icon: 'account_tree', label: 'Birbaşa rəhbər', value: mgr?.name, sub: mgr?.role },
            { icon: 'hub', label: 'Funksional rəhbər', value: fmgr?.name, sub: fmgr?.role, dashed: true },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
            }}>
              <span className="material-symbols-rounded" style={{
                fontSize: 16, color: r.dashed ? '#8B5CF6' : 'var(--primary)',
                flexShrink: 0,
              }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.value}
                  {r.sub && <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 6 }}>· {r.sub}</span>}
                </div>
              </div>
            </div>
          ))}

          {reports.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Birbaşa tabelilər ({reports.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {reports.map(r => {
                  const [rc1, rc2] = avatarPaletteFor(r.id)
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 10px', borderRadius: 999,
                      background: 'var(--surface-3)', border: '1px solid var(--border)',
                      fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg,${rc1},${rc2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 8, fontWeight: 800,
                      }}>{r.name.substring(0, 2).toUpperCase()}</div>
                      {r.name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Org Node Card ────────────────────────────────────────────────────────────

function OrgNode({ member, members, isOver, isDragging, hasChildren, isCollapsed,
  onDragStart, onDragOver, onDragLeave, onDrop, onToggleCollapse, onClick,
}: {
  member: TeamMember; members: TeamMember[]; isOver: boolean; isDragging: boolean
  hasChildren: boolean; isCollapsed: boolean
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void; onDrop: (e: React.DragEvent) => void
  onToggleCollapse: () => void; onClick: () => void
}) {
  const [c1, c2] = avatarPaletteFor(member.id)
  const dc = deptColor(member.department || 'x')
  const initials = member.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      style={{
        width: CW, minHeight: CH,
        borderRadius: 14,
        background: isOver ? 'rgba(91,91,245,0.07)' : 'var(--surface)',
        border: `2px solid ${isOver ? 'var(--primary)' : isDragging ? 'var(--primary)' : 'var(--border)'}`,
        boxShadow: isOver ? '0 0 0 3px rgba(91,91,245,0.18)' : '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden', cursor: 'pointer', userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        transition: 'border-color .15s, box-shadow .15s, opacity .15s',
        position: 'relative',
      }}
    >
      {/* Department color bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${c1},${c2})` }} />

      <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg,${c1},${c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 800,
          boxShadow: `0 4px 10px ${c1}40`,
        }}>{initials}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.role || '—'}
          </div>
          {member.department && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5,
              padding: '2px 6px', borderRadius: 6,
              background: dc + '15', color: dc, fontSize: 9, fontWeight: 700,
            }}>{member.department}</span>
          )}
          {member.email && (
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.email}
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      {hasChildren && (
        <button onClick={e => { e.stopPropagation(); onToggleCollapse() }} style={{
          position: 'absolute', bottom: 6, right: 6,
          width: 20, height: 20, borderRadius: 6,
          border: '1px solid var(--border)', background: 'var(--surface-2)',
          color: 'var(--muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 12 }}>
            {isCollapsed ? 'expand_more' : 'expand_less'}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── Visual Chart ─────────────────────────────────────────────────────────────

function VisualChart({ members, onUpdateManager }: {
  members: TeamMember[]
  onUpdateManager: (id: string, field: 'managerId' | 'functionalManagerId', val: string | null) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [transform, setTransform] = useState({ x: 60, y: 60, scale: 0.85 })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [panOrigin, setPanOrigin] = useState({ mx: 0, my: 0, tx: 0, ty: 0 })
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { positions, childMap, totalW, totalH } = buildLayout(members, collapsed)

  // Center the tree
  const centerView = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const { width, height } = c.getBoundingClientRect()
    const scale = Math.min(1, Math.min(width / (totalW + 80), height / (totalH + 80)), 0.9)
    setTransform({ x: (width - totalW * scale) / 2, y: 40, scale })
  }, [totalW, totalH])

  useEffect(() => { centerView() }, [centerView])

  // Zoom
  const zoom = (delta: number) =>
    setTransform(t => ({ ...t, scale: Math.max(0.25, Math.min(2, t.scale + delta)) }))

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoom(e.deltaY < 0 ? 0.08 : -0.08)
  }

  // Pan
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    setPanning(true)
    setPanOrigin({ mx: e.clientX, my: e.clientY, tx: transform.x, ty: transform.y })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!panning) return
    setTransform(t => ({ ...t, x: panOrigin.tx + e.clientX - panOrigin.mx, y: panOrigin.ty + e.clientY - panOrigin.my }))
  }
  const onMouseUp = () => setPanning(false)

  // Drag-and-drop
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) { setDragOverId(null); return }
    onUpdateManager(draggingId, 'managerId', targetId)
    setDraggingId(null); setDragOverId(null)
  }

  // Expand / Collapse all
  const collapseAll = () => setCollapsed(new Set(Array.from(childMap.keys())))
  const expandAll = () => setCollapsed(new Set())

  // Build SVG lines
  const lines: { x1: number; y1: number; x2: number; y2: number; dashed: boolean }[] = []
  members.forEach(m => {
    const mPos = positions.get(m.id)
    if (!mPos) return
    // Line manager (solid)
    if (m.managerId && m.managerId !== m.id) {
      const pPos = positions.get(m.managerId)
      if (pPos) lines.push({
        x1: pPos.x + CW / 2, y1: pPos.y + CH,
        x2: mPos.x + CW / 2, y2: mPos.y,
        dashed: false,
      })
    }
    // Functional manager (dashed)
    if (m.functionalManagerId && m.functionalManagerId !== m.id) {
      const fPos = positions.get(m.functionalManagerId)
      if (fPos) lines.push({
        x1: fPos.x + CW / 2, y1: fPos.y + CH,
        x2: mPos.x + CW / 2, y2: mPos.y,
        dashed: true,
      })
    }
  })

  const svgW = Math.max(totalW + 200, 800)
  const svgH = Math.max(totalH + 200, 600)

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--surface-2)' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute', left: 16, top: 16, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          { icon: 'add', action: () => zoom(0.12), title: 'Böyüt' },
          { icon: 'remove', action: () => zoom(-0.12), title: 'Kiçilt' },
          { icon: 'center_focus_strong', action: centerView, title: 'Mərkəzləşdir' },
          { icon: 'unfold_less', action: collapseAll, title: 'Hamısını qat' },
          { icon: 'unfold_more', action: expandAll, title: 'Hamısını aç' },
        ].map(btn => (
          <button key={btn.icon} onClick={btn.action} title={btn.title} style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{btn.icon}</span>
          </button>
        ))}

        {/* Scale indicator */}
        <div style={{
          marginTop: 4, padding: '4px 8px', borderRadius: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          fontSize: 10, fontWeight: 700, color: 'var(--muted)', textAlign: 'center',
        }}>
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', right: 16, bottom: 16, zIndex: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 2, background: 'var(--primary)' }} />
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Birbaşa rəhbər</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 0, borderTop: '2px dashed #8B5CF6' }} />
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Funksional rəhbər</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 2, background: 'var(--border)', opacity: 0.5 }} />
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Sürüklə → manager təyin et</span>
        </div>
      </div>

      {/* Root drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOverId('__root__') }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={e => { e.preventDefault(); if (draggingId) { onUpdateManager(draggingId, 'managerId', null); setDraggingId(null); setDragOverId(null) } }}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          padding: '7px 14px', borderRadius: 10,
          border: `2px dashed ${dragOverId === '__root__' ? 'var(--primary)' : 'var(--border)'}`,
          background: dragOverId === '__root__' ? 'var(--primary-soft)' : 'var(--surface)',
          color: dragOverId === '__root__' ? 'var(--primary)' : 'var(--muted)',
          fontSize: 11, fontWeight: 700, cursor: 'default',
          transition: 'all .15s',
        }}
      >
        Rəhbərsiz et (kök)
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ width: '100%', height: '100%', cursor: panning ? 'grabbing' : 'grab', overflow: 'hidden' }}
      >
        <div style={{
          transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'relative',
          width: svgW,
          height: svgH,
        }}>
          {/* SVG lines */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
            width={svgW} height={svgH}>
            <defs>
              <marker id="arrowSolid" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--primary)" opacity="0.6" />
              </marker>
              <marker id="arrowDash" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#8B5CF6" opacity="0.6" />
              </marker>
            </defs>
            {lines.map((l, i) => {
              const mx = (l.x1 + l.x2) / 2
              const my1 = l.y1 + VG * 0.45
              const my2 = l.y2 - VG * 0.45
              const d = `M${l.x1},${l.y1} C${l.x1},${my1} ${l.x2},${my2} ${l.x2},${l.y2}`
              return (
                <path key={i} d={d}
                  stroke={l.dashed ? '#8B5CF6' : 'var(--primary)'}
                  strokeWidth={l.dashed ? 1.5 : 2}
                  strokeDasharray={l.dashed ? '6 4' : undefined}
                  fill="none" opacity={0.55}
                  markerEnd={l.dashed ? 'url(#arrowDash)' : 'url(#arrowSolid)'}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {members.map(m => {
            const pos = positions.get(m.id)
            if (!pos) return null
            const children = childMap.get(m.id) ?? []
            return (
              <div key={m.id} data-node="1" style={{ position: 'absolute', left: pos.x, top: pos.y }}>
                <OrgNode
                  member={m} members={members}
                  isOver={dragOverId === m.id && draggingId !== m.id}
                  isDragging={draggingId === m.id}
                  hasChildren={children.length > 0}
                  isCollapsed={collapsed.has(m.id)}
                  onDragStart={() => setDraggingId(m.id)}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(m.id) }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => { e.stopPropagation(); handleDrop(e, m.id) }}
                  onToggleCollapse={() => setCollapsed(prev => {
                    const n = new Set(prev)
                    n.has(m.id) ? n.delete(m.id) : n.add(m.id)
                    return n
                  })}
                  onClick={() => setSelectedMember(m)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {selectedMember && (
        <MemberModal member={selectedMember} members={members} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  )
}

// ─── Manager Select ───────────────────────────────────────────────────────────

function ManagerSelect({ value, members, excludeId, placeholder, onChange, color }: {
  value: string; members: TeamMember[]; excludeId: string
  placeholder: string; onChange: (v: string) => void; color?: string
}) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
      <span className="material-symbols-rounded" style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, color: color ?? 'var(--primary)', pointerEvents: 'none', zIndex: 1,
      }}>account_tree</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px 8px 30px',
          border: '1.5px solid var(--border)', borderRadius: 10,
          background: 'var(--surface)', color: 'var(--ink)',
          fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none',
        }}
      >
        <option value="">— {placeholder} —</option>
        {members.filter(m => m.id !== excludeId).map(m => (
          <option key={m.id} value={m.id}>{m.name} ({m.role || m.department || '—'})</option>
        ))}
      </select>
      <span className="material-symbols-rounded" style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, color: 'var(--muted)', pointerEvents: 'none',
      }}>unfold_more</span>
    </div>
  )
}

// ─── List Tab ─────────────────────────────────────────────────────────────────

function ListTab({ members, onUpdate }: {
  members: TeamMember[]
  onUpdate: (id: string, field: 'managerId' | 'functionalManagerId', val: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.department || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span className="material-symbols-rounded" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: 'var(--muted)', pointerEvents: 'none',
        }}>search</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="İşçi axtar..."
          style={{
            width: '100%', padding: '10px 14px 10px 38px',
            border: '1.5px solid var(--border)', borderRadius: 12,
            background: 'var(--surface)', color: 'var(--ink)',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12, padding: '0 16px',
        fontSize: 10, fontWeight: 800, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        <span>İşçi</span>
        <span>Birbaşa rəhbər</span>
        <span>Funksional rəhbər</span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((m, i) => {
          const [c1, c2] = avatarPaletteFor(m.id)
          const dc = deptColor(m.department || 'x')
          const initials = m.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12, alignItems: 'center',
              padding: '12px 16px', borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              transition: 'box-shadow .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
            >
              {/* Member info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg,${c1},${c2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  boxShadow: `0 4px 12px ${c1}40`,
                }}>{initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.role || '—'}
                  </div>
                  {m.department && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4,
                      padding: '2px 6px', borderRadius: 6,
                      background: dc + '15', color: dc, fontSize: 9, fontWeight: 700,
                    }}>{m.department}</span>
                  )}
                </div>
              </div>

              {/* Line Manager */}
              <ManagerSelect
                value={m.managerId ?? ''}
                members={members}
                excludeId={m.id}
                placeholder="Birbaşa rəhbər yoxdur"
                onChange={v => onUpdate(m.id, 'managerId', v || null)}
              />

              {/* Functional Manager */}
              <ManagerSelect
                value={m.functionalManagerId ?? ''}
                members={members}
                excludeId={m.id}
                placeholder="Funksional rəhbər yoxdur"
                onChange={v => onUpdate(m.id, 'functionalManagerId', v || null)}
                color="#8B5CF6"
              />
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            İşçi tapılmadı
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { currentWorkspaceId } = useWorkspace()
  const { members, loading } = useTeam()
  const [localMembers, setLocalMembers] = useState<TeamMember[]>([])
  const [tab, setTab] = useState<'list' | 'chart'>('list')

  useEffect(() => { setLocalMembers(members) }, [members])

  const updateManager = useCallback(async (
    id: string, field: 'managerId' | 'functionalManagerId', val: string | null
  ) => {
    setLocalMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: val ?? undefined } : m))
    const res = await db.team.update(id, { [field]: val ?? null })
    if (!res.success) {
      toast.error('Saxlanmadı')
      setLocalMembers(members)
    } else {
      toast.success(field === 'managerId' ? 'Birbaşa rəhbər yeniləndi' : 'Funksional rəhbər yeniləndi')
    }
  }, [members])

  const placed = localMembers.filter(m => m.managerId && localMembers.some(x => x.id === m.managerId)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'var(--primary-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--primary)' }}>account_tree</span>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', margin: 0 }}>
                Org Chart
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Komanda iyerarxiyasını idarə edin</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { icon: 'groups', label: `${localMembers.length} üzv`, color: 'var(--primary)', bg: 'var(--primary-soft)' },
              { icon: 'account_tree', label: `${placed} yerləşdirilmiş`, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
              { icon: 'person_off', label: `${localMembers.length - placed} rəhbərsiz`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 10,
                background: s.bg, color: s.color,
                fontSize: 12, fontWeight: 700,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{s.icon}</span>
                {s.label}
              </div>
            ))}

            {/* Tab switcher */}
            <div style={{
              display: 'flex', background: 'var(--surface-2)',
              borderRadius: 10, padding: 3, gap: 2, marginLeft: 8,
            }}>
              {(['list', 'chart'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '6px 14px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  color: tab === t ? 'var(--ink)' : 'var(--muted)',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                    {t === 'list' ? 'view_list' : 'account_tree'}
                  </span>
                  {t === 'list' ? 'Siyahı' : 'Vizual'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === 'chart' ? (
        <VisualChart members={localMembers} onUpdateManager={updateManager} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14 }} />
              ))}
            </div>
          ) : (
            <ListTab members={localMembers} onUpdate={updateManager} />
          )}
        </div>
      )}
    </div>
  )
}
