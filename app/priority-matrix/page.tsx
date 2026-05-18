'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useProjects } from '@/hooks/useSheets'
import { db } from '@/lib/db'
import { Project } from '@/lib/types'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

type QuadKey = 'do' | 'plan' | 'delegate' | 'elim'
type Zone = QuadKey | 'pool'
type MatrixState = Record<Zone, string[]>

// ── Quadrant config ──────────────────────────────────────────────────────────

const QUADRANTS: {
  key: QuadKey
  label: string
  tag: string
  desc: string
  tip: string
  color: string
  softBg: string
  headerBorder: string
  icon: string
}[] = [
  {
    key: 'do',
    label: 'İndi Et',
    tag: 'Do First',
    desc: 'Yüksək təcililik · Yüksək əhəmiyyət',
    tip: 'Kritik deadline, böhran, mühüm tapşırıqlar',
    color: '#EF4444',
    softBg: 'rgba(239,68,68,0.05)',
    headerBorder: 'rgba(239,68,68,0.18)',
    icon: 'bolt',
  },
  {
    key: 'delegate',
    label: 'Həvalə Et',
    tag: 'Delegate',
    desc: 'Yüksək təcililik · Aşağı əhəmiyyət',
    tip: 'Rutin tapşırıqlar, bəzi mesajlar, kiçik düzəlişlər',
    color: '#F59E0B',
    softBg: 'rgba(245,158,11,0.05)',
    headerBorder: 'rgba(245,158,11,0.18)',
    icon: 'group',
  },
  {
    key: 'plan',
    label: 'Plan Et',
    tag: 'Schedule',
    desc: 'Aşağı təcililik · Yüksək əhəmiyyət',
    tip: 'Strateji planlaşdırma, inkişaf, öyrənmə',
    color: '#5B5BF5',
    softBg: 'rgba(91,91,245,0.05)',
    headerBorder: 'rgba(91,91,245,0.18)',
    icon: 'calendar_month',
  },
  {
    key: 'elim',
    label: 'Ləğv Et',
    tag: 'Eliminate',
    desc: 'Aşağı təcililik · Aşağı əhəmiyyət',
    tip: 'Diqqəti dağıdan, dəyər verməyən işlər',
    color: '#6B7280',
    softBg: 'rgba(107,114,128,0.05)',
    headerBorder: 'rgba(107,114,128,0.18)',
    icon: 'delete_sweep',
  },
]

const STATUS_COLORS: Record<string, string> = {
  'Planlaşdırılır': '#0EA5E9',
  'Davam edir':     '#10B981',
  'Tamamlandı':     '#6B7280',
  'Dayandırıldı':   '#F59E0B',
}

const PRIORITY_COLORS: Record<string, string> = {
  'Kritik': '#EF4444',
  'Yüksək': '#F59E0B',
  'Orta':   '#5B5BF5',
  'Aşağı':  '#10B981',
}

// ── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  zone,
  dragging,
  onDragStart,
  onReturn,
}: {
  project: Project
  zone: Zone
  dragging: boolean
  onDragStart: () => void
  onReturn: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.35 : 1,
        transition: 'box-shadow .12s, transform .12s, opacity .12s',
        boxShadow: hovered && !dragging ? '0 2px 10px rgba(0,0,0,0.08)' : undefined,
        transform: hovered && !dragging ? 'translateY(-1px)' : undefined,
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Color stripe */}
      <div style={{
        width: 3,
        alignSelf: 'stretch',
        minHeight: 32,
        borderRadius: 2,
        background: project.color || 'var(--primary)',
        flexShrink: 0,
      }} />

      {/* Drag handle */}
      <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--muted-2)', flexShrink: 0, opacity: 0.5 }}>
        drag_indicator
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {project.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: STATUS_COLORS[project.status] || 'var(--muted)',
          }}>
            {project.status}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>·</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: PRIORITY_COLORS[project.priority] || 'var(--muted)',
          }}>
            {project.priority}
          </span>
        </div>
      </div>

      {/* Return button (only in quadrant, not pool) */}
      {zone !== 'pool' && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onReturn() }}
          title="Hovuza qaytar"
          style={{
            width: 22, height: 22, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            cursor: 'pointer', flexShrink: 0,
            color: 'var(--muted)',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 12 }}>undo</span>
        </button>
      )}
    </div>
  )
}

// ── Pool chip (compact card for unassigned pool) ─────────────────────────────

function PoolChip({
  project,
  dragging,
  onDragStart,
}: {
  project: Project
  dragging: boolean
  onDragStart: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.3 : 1,
        transition: 'background .1s, box-shadow .12s, transform .12s',
        boxShadow: hovered && !dragging ? '0 2px 8px rgba(0,0,0,0.06)' : undefined,
        transform: hovered && !dragging ? 'translateY(-1px)' : undefined,
        userSelect: 'none',
      }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: project.color || 'var(--primary)',
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        {project.name}
      </span>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>· {project.owner || project.status}</span>
    </div>
  )
}

// ── Quadrant ─────────────────────────────────────────────────────────────────

function Quadrant({
  config,
  projectIds,
  allProjects,
  dragOverZone,
  dragId,
  dragFrom,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onReturn,
}: {
  config: typeof QUADRANTS[0]
  projectIds: string[]
  allProjects: Project[]
  dragOverZone: Zone | null
  dragId: string | null
  dragFrom: Zone | null
  onDragStart: (id: string, from: Zone) => void
  onDragOver: (zone: Zone) => void
  onDragLeave: () => void
  onDrop: (to: Zone) => void
  onReturn: (id: string, from: Zone) => void
}) {
  const isOver = dragOverZone === config.key
  const projects = projectIds.map(id => allProjects.find(p => p.id === id)).filter(Boolean) as Project[]

  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOver(config.key) }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(config.key) }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: isOver ? 'var(--surface-2)' : config.softBg,
        border: `1px solid ${isOver ? config.color : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'background .12s, border-color .12s',
        outline: isOver ? `2px dashed ${config.color}` : 'none',
        outlineOffset: -3,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: `1px solid ${config.headerBorder}`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: config.color }}>
              {config.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: config.color }}>
              {config.tag}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {config.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {config.desc}
          </div>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em',
          color: projects.length > 0 ? config.color : 'var(--border)',
          lineHeight: 1,
          flexShrink: 0,
        }}>
          {projects.length}
        </div>
      </div>

      {/* Tip */}
      <div style={{
        padding: '6px 16px',
        fontSize: 10, color: 'var(--muted)',
        borderBottom: '1px dotted var(--border)',
        fontStyle: 'italic',
      }}>
        {config.tip}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 140,
        overflowY: 'auto',
      }}>
        {projects.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: 'var(--muted-2)',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: 16,
          }}>
            Buraya sürükləyin
          </div>
        ) : (
          projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              zone={config.key}
              dragging={dragId === p.id}
              onDragStart={() => onDragStart(p.id, config.key)}
              onReturn={() => onReturn(p.id, config.key)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PriorityMatrixPage() {
  const { currentWorkspaceId } = useWorkspace()
  const { projects, loading: projectsLoading } = useProjects()

  const [assignments, setAssignments] = useState<MatrixState>({
    do: [], plan: [], delegate: [], elim: [], pool: [],
  })
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<Zone | null>(null)
  const [dragOver, setDragOver] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const saveRef = useRef(false)

  // Load from Firebase on mount
  useEffect(() => {
    if (!currentWorkspaceId) return
    db.priorityMatrix.get(currentWorkspaceId).then(res => {
      if (res.success && res.data) {
        setAssignments(prev => ({
          do:       res.data!.do       || [],
          plan:     res.data!.plan     || [],
          delegate: res.data!.delegate || [],
          elim:     res.data!.elim     || [],
          pool:     prev.pool,
        }))
      }
      setLoaded(true)
    })
  }, [currentWorkspaceId])

  // Sync pool: add new projects, remove deleted
  useEffect(() => {
    if (!loaded || !projects.length) return
    setAssignments(prev => {
      const validIds = new Set(projects.map(p => p.id))
      const placed = new Set([...prev.do, ...prev.plan, ...prev.delegate, ...prev.elim])
      const newOnes = projects.map(p => p.id).filter(id => !placed.has(id) && !prev.pool.includes(id))
      return {
        do:       prev.do.filter(id => validIds.has(id)),
        plan:     prev.plan.filter(id => validIds.has(id)),
        delegate: prev.delegate.filter(id => validIds.has(id)),
        elim:     prev.elim.filter(id => validIds.has(id)),
        pool:     [...prev.pool.filter(id => validIds.has(id)), ...newOnes],
      }
    })
  }, [projects, loaded])

  const persist = useCallback(async (state: MatrixState) => {
    if (!currentWorkspaceId || saveRef.current) return
    saveRef.current = true
    setSaving(true)
    await db.priorityMatrix.save(currentWorkspaceId, {
      do:       state.do,
      plan:     state.plan,
      delegate: state.delegate,
      elim:     state.elim,
    })
    setSaving(false)
    saveRef.current = false
  }, [currentWorkspaceId])

  const move = useCallback((id: string, from: Zone, to: Zone) => {
    if (from === to) return
    setAssignments(prev => {
      const next: MatrixState = {
        do:       prev.do.filter(x => x !== id),
        plan:     prev.plan.filter(x => x !== id),
        delegate: prev.delegate.filter(x => x !== id),
        elim:     prev.elim.filter(x => x !== id),
        pool:     prev.pool.filter(x => x !== id),
      }
      next[to] = [...next[to], id]
      persist(next)
      return next
    })
  }, [persist])

  const handleDragStart = (id: string, from: Zone) => {
    setDragId(id); setDragFrom(from)
  }

  const handleDragOver = (zone: Zone) => {
    setDragOver(zone)
  }

  const handleDragLeave = () => {
    // Small delay to avoid flicker when moving between children
    setTimeout(() => setDragOver(null), 50)
  }

  const handleDrop = (to: Zone) => {
    if (dragId && dragFrom) move(dragId, dragFrom, to)
    setDragId(null); setDragFrom(null); setDragOver(null)
  }

  const handleReturn = (id: string, from: Zone) => {
    move(id, from, 'pool')
  }

  const handleReset = () => {
    const fresh: MatrixState = {
      do: [], plan: [], delegate: [], elim: [],
      pool: projects.map(p => p.id),
    }
    setAssignments(fresh)
    persist(fresh)
    toast.success('Matris sıfırlandı')
  }

  // Stats
  const placed  = assignments.do.length + assignments.plan.length + assignments.delegate.length + assignments.elim.length
  const unplaced = assignments.pool.length
  const total   = projects.length

  const poolProjects = assignments.pool
    .map(id => projects.find(p => p.id === id))
    .filter(Boolean) as Project[]

  const topQuad = QUADRANTS.reduce((a, b) =>
    (assignments[a.key]?.length ?? 0) >= (assignments[b.key]?.length ?? 0) ? a : b
  )

  if (projectsLoading && !loaded) {
    return (
      <div className="pageM fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              height: 80, borderRadius: 14,
              background: 'var(--surface-2)',
              animation: 'pulse 1.5s infinite',
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="page-headerM">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--primary-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--primary)' }}>
                grid_view
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', margin: 0 }}>
              Prioritet Matrisi
            </h1>
            {saving && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>
                  sync
                </span>
                Saxlanılır...
              </span>
            )}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Layihələri sürükləyib kvadranta buraxın — Eisenhower matrisi
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/projects" className="btn-ghostM" style={{ fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>folder</span>
            Layihələrə keç
          </Link>
          <button onClick={handleReset} className="btn-ghostM" style={{ fontSize: 12 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>restart_alt</span>
            Sıfırla
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
      }}>
        {[
          { label: 'Cəmi layihə',        value: total,              icon: 'folder', color: 'var(--primary)' },
          { label: 'Yerləşdirilmiş',     value: placed,             icon: 'check_circle', color: '#10B981' },
          { label: 'Yerləşdirilməmiş',   value: unplaced,           icon: 'pending', color: '#F59E0B' },
          { label: 'Ən çox',             value: placed > 0 ? topQuad.label : '—', icon: 'star', color: '#5B5BF5', isText: true },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: s.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: s.color }}>
                {s.icon}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: (s as { isText?: boolean }).isText ? 14 : 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Axis + Matrix wrapper */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gridTemplateRows: '1fr 24px', gap: 0 }}>

        {/* Y-axis label */}
        <div style={{
          gridRow: 1, gridColumn: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          Təcililik (Urgency)
        </div>

        {/* 2×2 matrix grid */}
        <div style={{
          gridRow: 1, gridColumn: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 10,
          minHeight: 520,
        }}>
          {/* Row 1: high urgency */}
          {QUADRANTS.filter(q => q.key === 'do' || q.key === 'delegate').map(q => (
            <Quadrant
              key={q.key}
              config={q}
              projectIds={assignments[q.key]}
              allProjects={projects}
              dragOverZone={dragOver}
              dragId={dragId}
              dragFrom={dragFrom}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onReturn={handleReturn}
            />
          ))}
          {/* Row 2: low urgency */}
          {QUADRANTS.filter(q => q.key === 'plan' || q.key === 'elim').map(q => (
            <Quadrant
              key={q.key}
              config={q}
              projectIds={assignments[q.key]}
              allProjects={projects}
              dragOverZone={dragOver}
              dragId={dragId}
              dragFrom={dragFrom}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onReturn={handleReturn}
            />
          ))}
        </div>

        {/* X-axis label */}
        <div style={{
          gridRow: 2, gridColumn: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--muted)', paddingTop: 6, position: 'relative',
        }}>
          <span style={{ position: 'absolute', left: 8, fontSize: 8, opacity: 0.6 }}>AŞAĞI ←</span>
          Əhəmiyyət (Importance)
          <span style={{ position: 'absolute', right: 8, fontSize: 8, opacity: 0.6 }}>→ YÜKSƏK</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16,
        padding: '12px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        fontSize: 11,
      }}>
        {QUADRANTS.map(q => (
          <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: q.color }}>{q.tag}</span>
            <span style={{ color: 'var(--muted)' }}>—</span>
            <span style={{ color: 'var(--ink-2)' }}>{q.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', color: 'var(--muted-2)', fontSize: 10 }}>
          ↕ Yuxarı = Yüksək Urgency &nbsp;·&nbsp; Sağ = Yüksək Importance
        </div>
      </div>

      {/* Unassigned pool */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--muted)' }}>
              inventory_2
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              Yerləşdirilməmiş Layihələr
            </span>
            {unplaced > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: 'var(--surface-3)',
                color: 'var(--ink-2)',
                padding: '2px 7px', borderRadius: 999,
              }}>
                {unplaced}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Kvadranta sürükləyin
          </span>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); handleDragOver('pool') }}
          onDragLeave={handleDragLeave}
          onDrop={e => { e.preventDefault(); handleDrop('pool') }}
          style={{
            padding: '14px 16px',
            minHeight: 72,
            background: dragOver === 'pool' ? 'var(--surface-2)' : undefined,
            outline: dragOver === 'pool' ? '2px dashed var(--primary)' : 'none',
            outlineOffset: -3,
            borderRadius: '0 0 14px 14px',
            transition: 'background .12s',
          }}
        >
          {poolProjects.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 44, color: 'var(--muted-2)', fontSize: 12,
            }}>
              {total === 0 ? (
                <span>
                  Hələ layihə yoxdur.{' '}
                  <Link href="/projects" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                    Layihə yarat →
                  </Link>
                </span>
              ) : '▸ Bütün layihələr yerləşdirilib'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {poolProjects.map(p => (
                <PoolChip
                  key={p.id}
                  project={p}
                  dragging={dragId === p.id}
                  onDragStart={() => handleDragStart(p.id, 'pool')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
