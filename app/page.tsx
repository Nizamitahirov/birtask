'use client'

import { useState, useEffect } from 'react'
import { useDashboard, useProjects, useTasks } from '@/hooks/useSheets'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { db } from '@/lib/db'
import Link from 'next/link'

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

function paletteIndexFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 8
}

function avatarPaletteFor(seed: string): [string, string] {
  return VIBRANT_PALETTES[(paletteIndexFor(seed) + 3) % 8] as [string, string]
}

type QuadKey = 'do' | 'plan' | 'delegate' | 'elim'

const QUAD_META: Record<QuadKey, { label: string; color: string; bg: string; icon: string }> = {
  do:       { label: 'İndi Et',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    icon: 'bolt' },
  plan:     { label: 'Plan Et',   color: '#5B5BF5', bg: 'rgba(91,91,245,0.1)',    icon: 'calendar_today' },
  delegate: { label: 'Həvalə Et', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: 'person_raised_hand' },
  elim:     { label: 'Ləğv Et',   color: '#6B7280', bg: 'rgba(107,114,128,0.1)',  icon: 'block' },
}

const STATUS_COLORS: Record<string, string> = {
  'Davam edir':     'indigo',
  'Tamamlandı':     'green',
  'Yoxlanılır':     'info',
  'Planlaşdırılır': 'muted',
  'Gözləyir':       'warn',
  'Dayandırıldı':   'accent',
}

export default function DashboardPage() {
  const { stats, activities, loading } = useDashboard()
  const { projects } = useProjects()
  const { tasks } = useTasks()
  const { currentWorkspaceId } = useWorkspace()
  const [animate, setAnimate] = useState(false)
  const [tab, setTab] = useState('all')
  const [matrixMap, setMatrixMap] = useState<Record<string, QuadKey>>({})

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!currentWorkspaceId) return
    db.priorityMatrix.get(currentWorkspaceId).then(res => {
      if (!res.success || !res.data) return
      const map: Record<string, QuadKey> = {}
      const d = res.data
      ;(d.do       || []).forEach((id: string) => { map[id] = 'do' })
      ;(d.plan     || []).forEach((id: string) => { map[id] = 'plan' })
      ;(d.delegate || []).forEach((id: string) => { map[id] = 'delegate' })
      ;(d.elim     || []).forEach((id: string) => { map[id] = 'elim' })
      setMatrixMap(map)
    })
  }, [currentWorkspaceId])

  const completionRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Gecə xeyir' : hour < 12 ? 'Sabahın xeyir' : hour < 18 ? 'Salam' : 'Axşamın xeyir'

  const filteredProjects = tab === 'active'
    ? projects.filter(p => (p.status as string) === 'Davam edir')
    : tab === 'review'
      ? projects.filter(p => (p.status as string) === 'Yoxlanılır' || (p.status as string) === 'Tamamlandı')
      : projects

  const r = 72
  const circumference = 2 * Math.PI * r
  const dash = animate ? (completionRate / 100) * circumference : 0

  return (
    <div className="pageM fade-in">

      {/* HERO */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="greeting">{greeting} 👋</div>
          <h1>
            Bu gün{' '}
            <span style={{
              background: 'linear-gradient(90deg, #FFD466, #FF8FB1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {stats?.completedTasks ?? 0}
            </span>{' '}
            tapşırıq tamamlandı.
          </h1>
          <p>
            {stats?.activeProjects ?? 0} aktiv layihə üzərində işləyirsiniz.
            Komandanız bu həftə yaxşı irəliləyiş göstərir.
          </p>
          <div className="cta-row">
            <Link href="/tasks" className="cta">
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>add_task</span>
              Yeni tapşırıq
            </Link>
            <Link href="/calendar" className="cta ghost">
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>calendar_today</span>
              Cədvəlim
            </Link>
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <div className="ico">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>trending_up</span>
            </div>
            <div>
              <div className="v">{completionRate}%</div>
              <div className="l">Tamamlanma · bu ay</div>
            </div>
          </div>
          <div className="hero-stat">
            <div className="ico">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>schedule</span>
            </div>
            <div>
              <div className="v">{stats?.totalProjects ?? 0}</div>
              <div className="l">Ümumi layihə</div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="statsM stagger">
        <StatCard
          color="indigo"
          icon="folder"
          label="Aktiv layihələr"
          value={stats?.activeProjects ?? 0}
          total={stats?.totalProjects ?? 0}
          delta="+2"
          deltaDir="up"
          loading={loading}
        />
        <StatCard
          color="pink"
          icon="check_circle"
          label="Tamamlanan tapşırıqlar"
          value={stats?.completedTasks ?? 0}
          total={stats?.totalTasks ?? 0}
          delta="+18%"
          deltaDir="up"
          loading={loading}
        />
        <StatCard
          color="info"
          icon="visibility"
          label="Yoxlanılır"
          value={0}
          total={stats?.totalTasks ?? 0}
          delta="−3"
          deltaDir="up"
          loading={loading}
        />
        <StatCard
          color="warn"
          icon="warning"
          label="Gecikmiş tapşırıqlar"
          value={stats?.overdueTasks ?? 0}
          total={stats?.totalTasks ?? 0}
          delta="−2"
          deltaDir="up"
          loading={loading}
        />
      </div>

      {/* GRID: projects + donut */}
      <div className="gridM">
        {/* Projects card */}
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>folder_open</span>
              </span>
              Cari layihələr
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="tabs" style={{
                display: 'flex',
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}>
                <button
                  className={tab === 'all' ? 'on' : ''}
                  onClick={() => setTab('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: tab === 'all' ? 'var(--ink)' : 'var(--muted)',
                    background: tab === 'all' ? 'var(--surface)' : 'transparent',
                    boxShadow: tab === 'all' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Hamısı
                </button>
                <button
                  onClick={() => setTab('active')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: tab === 'active' ? 'var(--ink)' : 'var(--muted)',
                    background: tab === 'active' ? 'var(--surface)' : 'transparent',
                    boxShadow: tab === 'active' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Aktiv
                </button>
                <button
                  onClick={() => setTab('review')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: tab === 'review' ? 'var(--ink)' : 'var(--muted)',
                    background: tab === 'review' ? 'var(--surface)' : 'transparent',
                    boxShadow: tab === 'review' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Bitirilir
                </button>
              </div>
              <Link href="/projects" className="cardM-head" style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 0,
              }}>
                Hamısını gör
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>arrow_forward</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <div className="projM">
              {filteredProjects.slice(0, 6).map(p => {
                const [c1, c2] = avatarPaletteFor(p.id)
                const pct = Number(p.progress) || 0
                const statusColor = STATUS_COLORS[p.status as string] || 'muted'
                const assignees = Array.from(new Set(
                  tasks.filter(t => t.projectId === p.id && t.assignee).map(t => t.assignee)
                ))
                const visibleAssignees = assignees.slice(0, 3)
                const overflow = assignees.length - visibleAssignees.length
                return (
                  <div className="projM-row" key={p.id}>
                    <div className="projM-head">
                      <div
                        className="projM-swatch"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      >
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="projM-text">
                        <div className="n">{p.name}</div>
                        <div className="s">{pct}% · {p.owner || '—'}</div>
                      </div>
                    </div>
                    <span className={`pill ${statusColor}`}>
                      <span className="dot" />
                      {p.status}
                    </span>
                    {(() => {
                      const qk = matrixMap[p.id] as QuadKey | undefined
                      const meta = qk ? QUAD_META[qk] : null
                      return meta ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 999,
                          background: meta.bg, color: meta.color,
                          fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 11 }}>{meta.icon}</span>
                          {meta.label}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10, color: 'var(--muted)',
                          fontWeight: 500, whiteSpace: 'nowrap',
                        }}>
                          Prioritet yoxdur
                        </span>
                      )
                    })()}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {visibleAssignees.map((name, idx) => {
                        const [a1, a2] = avatarPaletteFor(name)
                        const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                        return (
                          <div key={idx} title={name} style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${a1}, ${a2})`,
                            border: '2px solid var(--surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, color: '#fff',
                            marginLeft: idx === 0 ? 0 : -7,
                            flexShrink: 0, position: 'relative', zIndex: visibleAssignees.length - idx,
                          }}>
                            {initials}
                          </div>
                        )
                      })}
                      {overflow > 0 && (
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: 'var(--surface-3)',
                          border: '2px solid var(--surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: 'var(--muted)',
                          marginLeft: -7, flexShrink: 0,
                        }}>
                          +{overflow}
                        </div>
                      )}
                    </div>
                    <div className="projM-progress">
                      <div className="progressM">
                        <div
                          className="progressM-fill"
                          style={{
                            width: animate ? `${pct}%` : '0%',
                            background: `linear-gradient(90deg, ${c1}, ${c2})`,
                          }}
                        />
                      </div>
                      <span className="projM-pct">{pct}%</span>
                    </div>
                  </div>
                )
              })}
              {filteredProjects.length === 0 && (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 13,
                }}>
                  Layihə tapılmadı
                </div>
              )}
            </div>
          )}
        </div>

        {/* Donut card */}
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>donut_large</span>
              </span>
              Ümumi İrəliləyiş
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Detallı</span>
          </div>

          {/* Donut */}
          <div className="donutM">
            <svg viewBox="0 0 168 168">
              <defs>
                <linearGradient id="donutGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#5B5BF5" />
                  <stop offset="50%" stopColor="#B57BFF" />
                  <stop offset="100%" stopColor="#FF6FB0" />
                </linearGradient>
              </defs>
              <circle className="track" cx="84" cy="84" r={r} fill="none" strokeWidth="14" />
              <circle
                className="fill"
                cx="84" cy="84" r={r}
                fill="none" strokeWidth="14"
                strokeDasharray={`${dash} ${circumference}`}
              />
            </svg>
            <div className="inner">
              <div className="pct">
                {completionRate}
                <span style={{ fontSize: 18, color: 'var(--muted)' }}>%</span>
              </div>
              <div className="lbl">Tamamlandı</div>
            </div>
          </div>

          <div className="legend">
            <LegendRow color="#5B5BF5" label="Tamamlandı" value={stats?.completedTasks ?? 0} />
            <LegendRow color="#FF6A6A" label="Gecikmiş" value={stats?.overdueTasks ?? 0} />
            <LegendRow color="#4DABF7" label="Aktiv" value={stats?.activeProjects ?? 0} />
            <LegendRow color="#E7E9F2" label="Ümumi tapşırıq" value={stats?.totalTasks ?? 0} />
          </div>
        </div>
      </div>

      {/* ACTIVITY */}
      {activities.length > 0 && (
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>bolt</span>
              </span>
              Son aktivlik
            </h3>
            <Link href="/activity" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              Hamısı
            </Link>
          </div>
          <div className="actM">
            {activities.slice(0, 6).map((a, i) => {
              const [c1, c2] = avatarPaletteFor(a.userId || String(i))
              const iconMap: Record<string, string> = {
                create: 'add_circle', update: 'sync', delete: 'delete',
                complete: 'check_circle',
              }
              const colorMap: Record<string, string> = {
                create: 'indigo', update: 'info', delete: 'accent', complete: 'green',
              }
              const typeColor = colorMap[a.type] || 'muted'
              const typeIcon = iconMap[a.type] || 'info'
              return (
                <div key={a.id} className="actM-row">
                  <div
                    className="av"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    {(a.userId || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="msg">
                    <b>{a.userId}</b>{' '}{a.message}
                    <div style={{ marginTop: 4 }}>
                      <span className={`pill ${typeColor}`} style={{ fontSize: 10 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 11 }}>
                          {typeIcon}
                        </span>
                        {a.entityType}
                      </span>
                    </div>
                  </div>
                  <div className="ts" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(a.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  color, icon, label, value, total, delta, deltaDir, loading,
}: {
  color: string; icon: string; label: string; value: number; total: number
  delta: string; deltaDir: string; loading: boolean
}) {
  if (loading) {
    return <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
  }

  const points = [6, 9, 7, 11, 8, 14, 10]
  const max = Math.max(...points)
  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 100},${30 - (p / max) * 24}`
  ).join(' ')
  const fillPath = path + ' L 100,30 L 0,30 Z'
  const colorVar =
    color === 'indigo' ? 'var(--primary)' :
    color === 'pink' ? 'var(--pink)' :
    color === 'info' ? 'var(--info)' :
    'var(--accent)'
  const sparkId = `spark-${label.replace(/\s+/g, '')}`

  return (
    <div className={`statM color-${color}`}>
      <div className="statM-head">
        <div className="ico">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{icon}</span>
        </div>
        <span className={`delta ${deltaDir === 'up' ? 'up' : 'down'}`}>{delta}</span>
      </div>
      <div className="v">{value}</div>
      <div className="l">
        {label}{' '}
        <span style={{ color: 'var(--muted-2)' }}>/ {total}</span>
      </div>
      <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none">
        <defs>
          <linearGradient id={sparkId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${sparkId})`} />
        <path d={path} fill="none" stroke={colorVar} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="legend-row">
      <span className="lk">
        <span className="sq" style={{ background: color }} />
        {label}
      </span>
      <span className="lv">{Math.max(0, value)}</span>
    </div>
  )
}
