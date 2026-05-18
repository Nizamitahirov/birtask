'use client'

import { useState, useEffect } from 'react'
import { useTeam } from '@/hooks/useSheets'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { TeamMember } from '@/lib/types'
import { db } from '@/lib/db'
import toast from 'react-hot-toast'

/* ── Avatar palette helpers ─────────────────────────────────── */

const VIBRANT_PALETTES = [
  ['#5B5BF5', '#B57BFF'],
  ['#FF8B7B', '#FFD466'],
  ['#16C098', '#67E8C5'],
  ['#4DABF7', '#A78BFA'],
  ['#E879C8', '#FF8FB1'],
  ['#F5A524', '#FF8B7B'],
  ['#7C5BF7', '#E879C8'],
  ['#16C098', '#5B5BF5'],
]

function avatarPaletteFor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return VIBRANT_PALETTES[Math.abs(h) % 8] as [string, string]
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/* ── OrgSubtree component ───────────────────────────────────── */

interface OrgSubtreeProps {
  member: TeamMember
  allMembers: TeamMember[]
  draggingId: string | null
  dragOverId: string | null
  visited: Set<string>
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, id: string) => void
  onClearManager: (id: string) => void
}

function OrgSubtree({
  member,
  allMembers,
  draggingId,
  dragOverId,
  visited,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onClearManager,
}: OrgSubtreeProps) {
  if (visited.has(member.id)) return null
  const nextVisited = new Set(visited).add(member.id)
  const children = allMembers.filter(
    (m) => m.managerId === member.id && m.id !== member.id
  )
  const [c1, c2] = avatarPaletteFor(member.id)
  const isOver = dragOverId === member.id && draggingId !== member.id
  const [hovered, setHovered] = useState(false)

  return (
    <li>
      <div
        draggable
        onDragStart={() => onDragStart(member.id)}
        onDragOver={(e) => onDragOver(e, member.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, member.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 160,
          minHeight: 72,
          borderRadius: 12,
          border: `2px solid ${isOver ? 'var(--primary)' : 'var(--border)'}`,
          background: isOver ? 'var(--primary-soft)' : 'var(--surface)',
          padding: '10px 12px',
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          position: 'relative',
          transition: 'border-color 0.15s, background 0.15s',
          userSelect: 'none',
        }}
      >
        {/* Clear manager button */}
        {hovered && member.managerId && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClearManager(member.id)
            }}
            title="Rəhbəri sil"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
              fontSize: 12,
              lineHeight: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ×
          </button>
        )}

        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {initials(member.name)}
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ink)',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {member.name}
        </div>

        {/* Role / dept */}
        <div
          style={{
            fontSize: 10,
            color: 'var(--muted)',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {[member.role, member.department].filter(Boolean).join(' · ')}
        </div>
      </div>

      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <OrgSubtree
              key={child.id}
              member={child}
              allMembers={allMembers}
              draggingId={draggingId}
              dragOverId={dragOverId}
              visited={nextVisited}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClearManager={onClearManager}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/* ── Main OrgChart page ─────────────────────────────────────── */

type Tab = 'list' | 'chart'

export default function OrgChartPage() {
  const { members, loading } = useTeam()
  const { currentWorkspaceId } = useWorkspace()
  const [localMembers, setLocalMembers] = useState<TeamMember[]>([])
  const [tab, setTab] = useState<Tab>('list')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [rootDragOver, setRootDragOver] = useState(false)

  useEffect(() => {
    setLocalMembers(members)
  }, [members])

  async function updateManager(memberId: string, managerId: string | null) {
    // Optimistic local update
    setLocalMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, managerId: managerId ?? undefined }
          : m
      )
    )
    try {
      await db.team.update(memberId, { managerId: managerId ?? undefined } as Partial<TeamMember>)
      toast.success('Rəhbər yeniləndi')
    } catch {
      toast.error('Xəta baş verdi')
      // Revert
      setLocalMembers(members)
    }
  }

  const placed = localMembers.filter(
    (m) => m.managerId && localMembers.find((x) => x.id === m.managerId)
  ).length

  /* ── Drag handlers ──────────────────────────────────────────── */

  function handleDragStart(id: string) {
    setDraggingId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOverId(id)
  }

  function handleDragLeave() {
    setDragOverId(null)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (draggingId && draggingId !== targetId) {
      updateManager(draggingId, targetId)
    }
    setDraggingId(null)
    setDragOverId(null)
  }

  function handleClearManager(memberId: string) {
    updateManager(memberId, null)
  }

  /* ── Root drop zone ─────────────────────────────────────────── */

  function handleRootDragOver(e: React.DragEvent) {
    e.preventDefault()
    setRootDragOver(true)
  }

  function handleRootDragLeave() {
    setRootDragOver(false)
  }

  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault()
    if (draggingId) {
      updateManager(draggingId, null)
    }
    setDraggingId(null)
    setDragOverId(null)
    setRootDragOver(false)
  }

  /* ── Tree roots ─────────────────────────────────────────────── */

  const roots = localMembers.filter(
    (m) => !m.managerId || !localMembers.find((x) => x.id === m.managerId)
  )

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="page-headerM" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 28, color: 'var(--primary)' }}
          >
            account_tree
          </span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              Org Chart
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Komanda iyerarxiyasını idarə edin
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="pill">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
              groups
            </span>
            {members.length} üzv
          </span>
          <span className="pill">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
              account_tree
            </span>
            {placed} yerləşdirilmiş
          </span>
        </div>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: 'var(--surface-2)',
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {([
          { key: 'list', label: 'Siyahı', icon: 'list' },
          { key: 'chart', label: 'Vizual', icon: 'account_tree' },
        ] as { key: Tab; label: string; icon: string }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              border: 'none',
              background: tab === key ? 'var(--surface)' : 'transparent',
              color: tab === key ? 'var(--ink)' : 'var(--muted)',
              fontWeight: tab === key ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              {icon}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {/* TAB 1: List */}
      {!loading && tab === 'list' && (
        <div className="cardM" style={{ overflow: 'hidden' }}>
          {localMembers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>
                groups
              </span>
              Komanda üzvü tapılmadı
            </div>
          ) : (
            <div>
              {localMembers.map((member, idx) => {
                const [c1, c2] = avatarPaletteFor(member.id)
                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom:
                        idx < localMembers.length - 1
                          ? '1px solid var(--border)'
                          : 'none',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      {initials(member.name)}
                    </div>

                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {[member.role, member.department].filter(Boolean).join(' · ')}
                      </div>
                    </div>

                    {/* Line Manager dropdown */}
                    <div style={{ flexShrink: 0 }}>
                      <label
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        Birbaşa rəhbər
                      </label>
                      <select
                        value={member.managerId ?? ''}
                        onChange={(e) =>
                          updateManager(member.id, e.target.value || null)
                        }
                        style={{
                          padding: '6px 10px',
                          border: '1.5px solid var(--border)',
                          borderRadius: 8,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          fontSize: 12,
                          fontWeight: 600,
                          minWidth: 180,
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">— Birbaşa rəhbər yoxdur —</option>
                        {localMembers
                          .filter((m) => m.id !== member.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Visual Org Chart */}
      {!loading && tab === 'chart' && (
        <div>
          {/* Root drop zone */}
          <div
            onDragOver={handleRootDragOver}
            onDragLeave={handleRootDragLeave}
            onDrop={handleRootDrop}
            style={{
              border: `2px dashed ${rootDragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 24,
              textAlign: 'center',
              fontSize: 13,
              color: rootDragOver ? 'var(--primary)' : 'var(--muted)',
              background: rootDragOver ? 'var(--primary-soft)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>
              arrow_downward
            </span>
            Buraya buraxın → Rəhbərsiz et
          </div>

          {localMembers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              Komanda üzvü tapılmadı
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
              <ul className="org-tree">
                {roots.map((root) => (
                  <OrgSubtree
                    key={root.id}
                    member={root}
                    allMembers={localMembers}
                    draggingId={draggingId}
                    dragOverId={dragOverId}
                    visited={new Set<string>()}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClearManager={handleClearManager}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Org tree CSS */}
      <style>{`
        .org-tree, .org-tree ul {
          list-style: none; padding: 0; margin: 0; text-align: center;
        }
        .org-tree > li { padding-top: 0; }
        .org-tree ul {
          display: flex;
          justify-content: center;
          gap: 0;
          padding-top: 20px;
          position: relative;
        }
        .org-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 20px;
          background: var(--border);
          transform: translateX(-50%);
        }
        .org-tree li {
          position: relative;
          padding: 20px 8px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        /* vertical line up from each child */
        .org-tree ul > li::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 20px;
          background: var(--border);
          transform: translateX(-50%);
        }
        /* horizontal line connecting siblings */
        .org-tree ul > li::after {
          content: '';
          position: absolute;
          top: 0;
          height: 2px;
          background: var(--border);
          left: 0;
          right: 0;
        }
        /* first child: horizontal line only from center to right */
        .org-tree ul > li:first-child::after { left: 50%; }
        /* last child: horizontal line only from left to center */
        .org-tree ul > li:last-child::after { right: 50%; }
        /* only child: no horizontal line */
        .org-tree ul > li:only-child::after { display: none; }
        .org-tree ul > li:only-child::before { display: none; }
        .org-tree ul:has(> li:only-child)::before { display: block; }
      `}</style>
    </div>
  )
}
