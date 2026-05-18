'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { Project, Task, TeamMember, TimeEntry } from '@/lib/types'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { RefreshCw } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number): number {
  if (b === 0) return 0
  return Math.round((a / b) * 100)
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}d`
  if (m === 0) return `${h}s`
  return `${h}s ${m}d`
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

type DateRange = '7' | '30' | '90' | 'month'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7': 'Son 7 gün',
  '30': 'Son 30 gün',
  '90': 'Son 90 gün',
  'month': 'Bu ay',
}

function getRangeStart(range: DateRange): Date {
  const now = new Date()
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  const d = new Date(now)
  d.setDate(d.getDate() - parseInt(range))
  return d
}

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

function paletteFor(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return VIBRANT_PALETTES[Math.abs(h) % VIBRANT_PALETTES.length]
}

const STATUS_COLORS: Record<string, string> = {
  'Davam edir':     'indigo',
  'Tamamlandı':     'green',
  'Yoxlanılır':     'info',
  'Planlaşdırılır': 'muted',
  'Gözləyir':       'warn',
  'Dayandırıldı':   'accent',
}

// ── Stat Card (dashboard style) ───────────────────────────────────────────────

function StatCard({
  color, icon, label, value, total, sub, loading,
}: {
  color: string; icon: string; label: string; value: number | string
  total?: number | string; sub?: string; loading: boolean
}) {
  if (loading) return <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />

  const points = [5, 8, 6, 10, 7, 13, 9, 14]
  const maxP = Math.max(...points)
  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 100},${30 - (p / maxP) * 24}`
  ).join(' ')
  const fillPath = path + ' L 100,30 L 0,30 Z'
  const colorVar =
    color === 'indigo' ? 'var(--primary)' :
    color === 'pink'   ? 'var(--pink)'    :
    color === 'info'   ? 'var(--info)'    :
    color === 'green'  ? 'var(--success)' :
    'var(--accent)'
  const sparkId = `spark-${label.replace(/\s+/g, '-')}`

  return (
    <div className={`statM color-${color}`}>
      <div className="statM-head">
        <div className="ico">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{icon}</span>
        </div>
      </div>
      <div className="v">{value}</div>
      <div className="l">
        {label}
        {total !== undefined && <span style={{ color: 'var(--muted-2)' }}> / {total}</span>}
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
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

// ── Legend Row ────────────────────────────────────────────────────────────────

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

// ── Bar Chart (SVG) ───────────────────────────────────────────────────────────

interface WeekBar { label: string; count: number }

function BarChartSVG({ data }: { data: WeekBar[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 600, H = 180, PAD_L = 28, PAD_B = 36, PAD_T = 16
  const barW = (W - PAD_L - 8) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 196 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            {f > 0 && (
              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--muted)">
                {Math.round(max * f)}
              </text>
            )}
          </g>
        )
      })}

      {data.map((d, i) => {
        const barH = ((H - PAD_T - PAD_B) * d.count) / max
        const x = PAD_L + i * barW + barW * 0.15
        const bw = barW * 0.7
        const y = H - PAD_B - barH
        return (
          <g key={i}>
            <rect
              x={x} y={Math.max(y, PAD_T)} width={bw}
              height={Math.min(barH, H - PAD_T - PAD_B)}
              rx={4}
              fill={d.count > 0 ? 'url(#barGrad)' : 'var(--surface-2)'}
            />
            {d.count > 0 && (
              <text x={x + bw / 2} y={Math.max(y, PAD_T) - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">
                {d.count}
              </text>
            )}
            <text x={x + bw / 2} y={H - PAD_B + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">
              {d.label}
            </text>
          </g>
        )
      })}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B5BF5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#B57BFF" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { currentWorkspaceId } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('30')
  const [animate, setAnimate] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setAnimate(false)
    const wsId = currentWorkspaceId || undefined
    const [pRes, tRes, mRes, eRes] = await Promise.all([
      db.projects.getAll(wsId),
      db.tasks.getAll(undefined, wsId),
      db.team.getAll(wsId),
      db.timeEntries.getAll(),
    ])
    if (pRes.success && pRes.data) setProjects(pRes.data)
    if (tRes.success && tRes.data) setTasks(tRes.data)
    if (mRes.success && mRes.data) setTeam(mRes.data)
    if (eRes.success && eRes.data) setTimeEntries(eRes.data)
    setLoading(false)
    setTimeout(() => setAnimate(true), 80)
  }, [currentWorkspaceId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const rangeStart = getRangeStart(range)
  const filteredTasks = tasks.filter(t => new Date(t.createdAt) >= rangeStart)
  const filteredEntries = timeEntries.filter(e => new Date(e.createdAt) >= rangeStart)

  // KPIs
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => p.status === 'Tamamlandı').length
  const completedTasks = filteredTasks.filter(t => t.status === 'Tamamlandı').length
  const overdueCount = filteredTasks.filter(t => {
    if (!t.dueDate || t.status === 'Tamamlandı') return false
    return new Date(t.dueDate) < new Date()
  }).length
  const totalLoggedMinutes = filteredEntries.reduce((a, e) => a + (e.durationMinutes || 0), 0)
  const completionRate = pct(completedTasks, filteredTasks.length)

  const onTimeDone = filteredTasks.filter(t => {
    if (t.status !== 'Tamamlandı') return false
    if (!t.dueDate) return true
    return new Date(t.updatedAt) <= new Date(t.dueDate)
  }).length
  const onTimeRate = pct(onTimeDone, completedTasks)

  // Bar chart: tasks completed per week (last 8 weeks)
  const weekBars: WeekBar[] = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7)
    const ws = getWeekStart(weekStart)
    const we = new Date(ws)
    we.setDate(we.getDate() + 7)
    const count = tasks.filter(t => {
      if (t.status !== 'Tamamlandı') return false
      const d = new Date(t.updatedAt)
      return d >= ws && d < we
    }).length
    return { label: weekLabel(ws), count }
  })

  // Donut: task status
  const STATUS_DONUT: { label: string; color: string }[] = [
    { label: 'Tamamlandı', color: '#10B981' },
    { label: 'Davam edir', color: '#5B5BF5' },
    { label: 'Yoxlanılır', color: '#F59E0B' },
    { label: 'Gözləyir',   color: '#94A3B8' },
  ]
  const donutSlices = STATUS_DONUT.map(s => ({
    ...s,
    count: filteredTasks.filter(t => t.status === s.label).length,
  })).filter(s => s.count > 0)
  const donutTotal = donutSlices.reduce((a, s) => a + s.count, 0)

  // Donut ring via stroke-dasharray
  const R = 72
  const circ = 2 * Math.PI * R
  let cumOffset = 0
  const donutArcs = donutSlices.map(s => {
    const dash = (s.count / donutTotal) * circ
    const offset = cumOffset
    cumOffset += dash
    return { ...s, dash, offset }
  })

  // Project health
  const projectHealth = projects.map(proj => {
    const projTasks = tasks.filter(t => t.projectId === proj.id)
    const done = projTasks.filter(t => t.status === 'Tamamlandı').length
    const overdue = projTasks.filter(t => {
      if (!t.dueDate || t.status === 'Tamamlandı') return false
      return new Date(t.dueDate) < new Date()
    }).length
    const progress = projTasks.length > 0 ? pct(done, projTasks.length) : Number(proj.progress) || 0
    return { ...proj, projTasks: projTasks.length, done, overdue, progress }
  })

  // Team performance
  const teamPerf = team.map(member => {
    const assigned = filteredTasks.filter(t => t.assignee === member.name)
    const done = assigned.filter(t => t.status === 'Tamamlandı')
    const loggedMin = filteredEntries
      .filter(e => e.userDisplayName === member.name || e.userId === member.id)
      .reduce((a, e) => a + (e.durationMinutes || 0), 0)
    return {
      ...member,
      assigned: assigned.length,
      done: done.length,
      rate: pct(done.length, assigned.length),
      loggedMin,
    }
  }).filter(m => m.assigned > 0 || m.loggedMin > 0).sort((a, b) => b.rate - a.rate)

  return (
    <div className="pageM fade-in">

      {/* HERO */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="greeting">📊 KPI Analitika</div>
          <h1>
            {DATE_RANGE_LABELS[range]}də{' '}
            <span style={{
              background: 'linear-gradient(90deg, #FFD466, #FF8FB1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {completedTasks}
            </span>{' '}
            tapşırıq tamamlandı.
          </h1>
          <p>
            {totalProjects} layihə · {filteredTasks.length} tapşırıq izlənilir. Vaxtında çatdırılma nisbəti {onTimeRate}%.
          </p>
          <div className="cta-row">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`cta${range === r ? '' : ' ghost'}`}
                style={{ fontSize: 12, padding: '8px 16px' }}
              >
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
            <button
              onClick={fetchAll}
              className="cta ghost"
              style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <div className="ico">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>trending_up</span>
            </div>
            <div>
              <div className="v">{completionRate}%</div>
              <div className="l">Tamamlanma nisbəti</div>
            </div>
          </div>
          <div className="hero-stat">
            <div className="ico">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>folder</span>
            </div>
            <div>
              <div className="v">{totalProjects}</div>
              <div className="l">Ümumi layihə</div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="statsM stagger">
        <StatCard
          color="indigo" icon="folder"
          label="Cəmi Layihə" value={totalProjects}
          total={completedProjects} sub={`${completedProjects} tamamlandı`}
          loading={loading}
        />
        <StatCard
          color="green" icon="check_circle"
          label="Tamamlanan Tapşırıq" value={completedTasks}
          total={filteredTasks.length}
          loading={loading}
        />
        <StatCard
          color="warn" icon="warning"
          label="Gecikmiş Tapşırıq" value={overdueCount}
          total={filteredTasks.length}
          loading={loading}
        />
        <StatCard
          color="info" icon="schedule"
          label="Qeydə Alınan Vaxt" value={formatHours(totalLoggedMinutes)}
          sub={`${filteredEntries.length} qeyd`}
          loading={loading}
        />
      </div>

      {/* GRID: bar chart + donut */}
      <div className="gridM">

        {/* Bar chart card */}
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>bar_chart</span>
              </span>
              Həftəlik Tamamlanan Tapşırıqlar
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Son 8 həftə</span>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 196, borderRadius: 12 }} />
          ) : (
            <BarChartSVG data={weekBars} />
          )}
        </div>

        {/* Donut card */}
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>donut_large</span>
              </span>
              Tapşırıq Status Bölgüsü
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              {donutTotal} tapşırıq
            </span>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 168, borderRadius: 12 }} />
          ) : donutTotal === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Məlumat yoxdur
            </div>
          ) : (
            <>
              <div className="donutM">
                <svg viewBox="0 0 168 168">
                  <defs>
                    <linearGradient id="donutGrad2" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5B5BF5" />
                      <stop offset="50%" stopColor="#B57BFF" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <circle cx="84" cy="84" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
                  {donutArcs.map((s, i) => (
                    <circle
                      key={i}
                      cx="84" cy="84" r={R}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="14"
                      strokeDasharray={`${animate ? s.dash : 0} ${circ}`}
                      strokeDashoffset={-s.offset}
                      strokeLinecap="butt"
                      style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.7,.1,1)' }}
                    />
                  ))}
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
                {donutSlices.map(s => (
                  <LegendRow key={s.label} color={s.color} label={s.label} value={s.count} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Project Health */}
      {projectHealth.length > 0 && (
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>folder_open</span>
              </span>
              Layihə Sağlamlığı
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              {completedProjects} / {totalProjects} tamamlandı
            </span>
          </div>
          <div className="projM">
            {projectHealth.map(proj => {
              const [c1, c2] = paletteFor(proj.id)
              const statusColor = STATUS_COLORS[proj.status] || 'muted'
              return (
                <div className="projM-row" key={proj.id}>
                  <div className="projM-head">
                    <div
                      className="projM-swatch"
                      style={{ background: proj.color || `linear-gradient(135deg, ${c1}, ${c2})` }}
                    >
                      {proj.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="projM-text">
                      <div className="n">{proj.name}</div>
                      <div className="s">
                        {proj.done}/{proj.projTasks} tapşırıq
                        {proj.overdue > 0 && (
                          <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {proj.overdue} gecikmiş</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`pill ${statusColor}`}>
                    <span className="dot" />
                    {proj.status}
                  </span>
                  <div className="projM-progress">
                    <div className="progressM">
                      <div
                        className="progressM-fill"
                        style={{
                          width: animate ? `${proj.progress}%` : '0%',
                          background: proj.color || `linear-gradient(90deg, ${c1}, ${c2})`,
                        }}
                      />
                    </div>
                    <span className="projM-pct">{proj.progress}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Performance */}
      {teamPerf.length > 0 && (
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico">
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>groups</span>
              </span>
              Komanda Performansı
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              {teamPerf.length} üzv
            </span>
          </div>
          <div className="actM">
            {teamPerf.map(m => {
              const [c1, c2] = paletteFor(m.id)
              return (
                <div key={m.id} className="actM-row">
                  <div
                    className="av"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="msg" style={{ flex: 1, minWidth: 0 }}>
                    <b>{m.name}</b>
                    {m.department && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {m.department}</span>}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 120, height: 4, borderRadius: 4, background: 'var(--surface-2)' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: animate ? `${m.rate}%` : '0%',
                          background: m.rate >= 75 ? 'var(--success)' : m.rate >= 50 ? '#F59E0B' : 'var(--accent)',
                          transition: 'width .9s cubic-bezier(.2,.7,.1,1)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: m.rate >= 75 ? 'var(--success)' : m.rate >= 50 ? '#F59E0B' : 'var(--accent)',
                      }}>
                        {m.rate}%
                      </span>
                      <span className="pill muted" style={{ fontSize: 10 }}>
                        {m.done}/{m.assigned}
                      </span>
                    </div>
                  </div>
                  <div className="ts">
                    {m.loggedMin > 0 ? formatHours(m.loggedMin) : '—'}
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
