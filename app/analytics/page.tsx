'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTasks } from '@/hooks/useSheets'
import { useProjects } from '@/hooks/useSheets'
import { useTeam } from '@/hooks/useSheets'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { db } from '@/lib/db'
import { Icon } from '@/components/ui/Icon'
import { avatarPaletteFor, initialsM, STATUS_COLORS } from '@/lib/design-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type RangeVal = '7' | '30' | '90' | 'all'

interface AnStatProps {
  color: string
  icon: string
  label: string
  value: string | number
  total: string
  trend: number[]
  change?: number   // explicit % change vs previous period (overrides trend-based delta)
  positive?: boolean
  negative?: boolean
}

interface SliceData {
  l: string
  c: string
  count: number
}

interface WeekBar {
  label: string
  count: number
}

interface TrendPoint {
  day: Date
  count: number
}

interface ProjectHealth {
  id: string
  name: string
  status: string
  tasksCount: number
  done: number
  overdue: number
  health: number
}

interface TeamPerfRow {
  id: string
  name: string
  department?: string
  assigned: number
  done: number
  rate: number
  hours: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AN_RANGES: { v: RangeVal; l: string }[] = [
  { v: '7',   l: 'Son 7 gün' },
  { v: '30',  l: 'Son 30 gün' },
  { v: '90',  l: 'Son 90 gün' },
  { v: 'all', l: 'Hamısı' },
]

const AN_MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek']

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0
}

function fmtH(min: number): string {
  if (!min) return '0s'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return m + 'd'
  if (m === 0) return h + 's'
  return h + 's ' + m + 'd'
}

// ── AnStat — KPI card with sparkline ─────────────────────────────────────────

function AnStat({ color, icon, label, value, total, trend, change, positive, negative }: AnStatProps) {
  const max = Math.max(...trend, 1)
  const path = trend
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (trend.length - 1)) * 100},${30 - (p / max) * 24}`)
    .join(' ')
  const fillPath = path + ' L 100,30 L 0,30 Z'
  const colorVar =
    color === 'indigo' ? 'var(--primary)' :
    color === 'pink'   ? 'var(--pink)'    :
    color === 'info'   ? 'var(--info)'    :
    color === 'warn'   ? 'var(--warn)'    :
    'var(--accent)'
  const sparkId = 'an-spark-' + label.replace(/\s+/g, '')

  const last = trend[trend.length - 1]
  const prev = trend[trend.length - 2] ?? last
  const trendDelta = prev ? Math.round(((last - prev) / Math.max(prev, 1)) * 100) : 0
  const delta = change !== undefined ? change : trendDelta
  const isGood = (positive && delta >= 0) || (negative && delta <= 0) || (!positive && !negative && delta >= 0)
  const deltaClass = isGood ? 'up' : 'down'
  const deltaSign = delta >= 0 ? '+' : ''

  return (
    <div className={`statM color-${color}`}>
      <div className="statM-head">
        <div className="ico"><Icon name={icon} size={16} /></div>
        <span className={`delta ${deltaClass}`}>{deltaSign}{delta}%</span>
      </div>
      <div className="v">{value}</div>
      <div className="l">{label} <span style={{ color: 'var(--muted-2)' }}>· {total}</span></div>
      <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none">
        <defs>
          <linearGradient id={sparkId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${sparkId})`} />
        <path d={path} fill="none" stroke={colorVar} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ── AnLineChart ───────────────────────────────────────────────────────────────

function AnLineChart({ points, labels, target, animate }: {
  points: number[]
  labels: string[]
  target?: number
  animate: boolean
}) {
  const W = 600, H = 220, PAD_L = 32, PAD_R = 12, PAD_T = 20, PAD_B = 28
  const max = Math.max(...points, target ?? 0, 1)
  const stepX = (W - PAD_L - PAD_R) / Math.max(points.length - 1, 1)
  const yFor = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / max)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD_L + i * stepX},${yFor(p)}`).join(' ')
  const fillPath = path + ` L ${PAD_L + (points.length - 1) * stepX},${H - PAD_B} L ${PAD_L},${H - PAD_B} Z`
  const targetY = target !== undefined ? yFor(target) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 240 }} className="an-line">
      <defs>
        <linearGradient id="an-line-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5B5BF5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5B5BF5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.6" />
            {f > 0 && (
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontWeight="700">
                {Math.round(max * f)}
              </text>
            )}
          </g>
        )
      })}

      {targetY !== null && target !== undefined && (
        <g>
          <line x1={PAD_L} y1={targetY} x2={W - PAD_R} y2={targetY} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          <text x={W - PAD_R - 2} y={targetY - 4} textAnchor="end" fontSize="9" fill="var(--accent)" fontWeight="700">Hədəf {target}</text>
        </g>
      )}

      <path d={fillPath} fill="url(#an-line-grad)" style={{ opacity: animate ? 1 : 0, transition: 'opacity .8s' }} />

      <path
        d={path}
        fill="none"
        stroke="#5B5BF5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animate ? undefined : '1000'}
        strokeDashoffset={animate ? 0 : 1000}
        style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={PAD_L + i * stepX} cy={yFor(p)} r="3.5" fill="white" stroke="#5B5BF5" strokeWidth="2" />
          {p > 0 && i === points.length - 1 && (
            <g>
              <rect x={PAD_L + i * stepX - 18} y={yFor(p) - 24} width="36" height="18" rx="4" fill="#5B5BF5" />
              <text x={PAD_L + i * stepX} y={yFor(p) - 11} textAnchor="middle" fontSize="10" fill="white" fontWeight="800">{p}</text>
            </g>
          )}
        </g>
      ))}

      {labels.map((l, i) => (i % 2 === 1) && (
        <text key={i} x={PAD_L + i * stepX} y={H - PAD_B + 16} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="600">{l}</text>
      ))}
    </svg>
  )
}

// ── AnBarChart ────────────────────────────────────────────────────────────────

function AnBarChart({ data, animate }: { data: WeekBar[]; animate: boolean }) {
  const W = 600, H = 200, PAD_L = 28, PAD_R = 12, PAD_T = 24, PAD_B = 28
  const max = Math.max(...data.map(d => d.count), 1)
  const slot = (W - PAD_L - PAD_R) / data.length
  const barW = slot * 0.6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 220 }}>
      <defs>
        <linearGradient id="an-bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B5BF5" />
          <stop offset="100%" stopColor="#B57BFF" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map(f => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
            {f > 0 && (
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontWeight="600">
                {Math.round(max * f)}
              </text>
            )}
          </g>
        )
      })}

      {data.map((d, i) => {
        const fullH = ((H - PAD_T - PAD_B) * d.count) / max
        const barH = animate ? fullH : 0
        const x = PAD_L + i * slot + (slot - barW) / 2
        const y = H - PAD_B - barH
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={Math.max(barH, 0)} rx="6"
              fill="url(#an-bar-grad)"
              style={{ transition: `all .9s cubic-bezier(.2,.7,.1,1) ${i * 60}ms` }}
            />
            {d.count > 0 && animate && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--ink)">{d.count}</text>
            )}
            <text x={x + barW / 2} y={H - PAD_B + 16} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--muted)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── AnDonut ───────────────────────────────────────────────────────────────────

function AnDonut({ slices, animate, centerLabel, centerValue }: {
  slices: SliceData[]
  animate: boolean
  centerLabel: string
  centerValue: string
}) {
  const R = 70
  const C = 2 * Math.PI * R
  const total = slices.reduce((s, x) => s + x.count, 0)
  let offset = 0

  return (
    <div className="donutM" style={{ width: 168, height: 168 }}>
      <svg viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        {slices.map((s, i) => {
          const dash = total > 0 ? (s.count / total) * C : 0
          const currentOffset = offset
          offset += dash
          return (
            <circle
              key={i}
              cx="84" cy="84" r={R}
              fill="none"
              stroke={s.c}
              strokeWidth="14"
              strokeDasharray={animate ? `${dash} ${C}` : `0 ${C}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 84 84)"
              style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.7,.1,1)' }}
            />
          )
        })}
      </svg>
      <div className="inner">
        <div className="pct">{centerValue}</div>
        <div className="lbl">{centerLabel}</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { currentWorkspaceId } = useWorkspace()
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { members } = useTeam()

  const [timeEntries, setTimeEntries] = useState<{ durationMinutes?: number; userDisplayName?: string; userId?: string; createdAt?: string }[]>([])
  const [range, setRange] = useState<RangeVal>('30')
  const [animate, setAnimate] = useState(false)

  // Load time entries gracefully
  useEffect(() => {
    if (db.timeEntries?.getAll) {
      db.timeEntries.getAll().then(res => {
        if (res?.success && res.data) setTimeEntries(res.data)
      }).catch(() => {})
    }
  }, [currentWorkspaceId])

  // Animate on range change
  useEffect(() => {
    setAnimate(false)
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [range])

  // Initial animate
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [])

  const today = useMemo(() => new Date(), [])

  // ── Computed stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const days = range === 'all' ? null : parseInt(range)
    const rangeStart = days ? new Date(today.getTime() - days * 86400000) : new Date(0)
    const prevStart  = days ? new Date(today.getTime() - days * 2 * 86400000) : new Date(0)

    // Current period: tasks updated within range
    const tasksInRange = tasks.filter(t => new Date(t.updatedAt) >= rangeStart)
    // Previous period: same length, before current range
    const prevTasks    = tasks.filter(t => {
      const d = new Date(t.updatedAt)
      return d >= prevStart && d < rangeStart
    })

    const total      = tasksInRange.length
    const completed  = tasksInRange.filter(t => t.status === 'Tamamlandı').length
    const inProgress = tasksInRange.filter(t => t.status === 'Davam edir').length
    const inReview   = tasksInRange.filter(t => t.status === 'Yoxlanılır').length
    const pending    = tasksInRange.filter(t => t.status === 'Gözləyir').length

    const prevCompleted = prevTasks.filter(t => t.status === 'Tamamlandı').length

    // Overdue = tasks not done and past due date RIGHT NOW (snapshot)
    const allOverdue  = tasks.filter(t => t.status !== 'Tamamlandı' && t.dueDate && new Date(t.dueDate) < today)
    const overdueNow  = allOverdue.length
    // Previous period overdue proxy: tasks with dueDate falling in the previous window and still not done
    const prevOverdue = tasks.filter(t =>
      t.status !== 'Tamamlandı' && t.dueDate &&
      new Date(t.dueDate) >= prevStart && new Date(t.dueDate) < rangeStart
    ).length

    // On-time completion: completed within range AND finished before/on dueDate
    const onTimeDone = tasksInRange.filter(t =>
      t.status === 'Tamamlandı' && (!t.dueDate || new Date(t.updatedAt) <= new Date(t.dueDate))
    ).length

    // Projects: new projects created in current vs previous period
    const projNow  = projects.filter(p => new Date(p.createdAt) >= rangeStart).length
    const projPrev = projects.filter(p => {
      const d = new Date(p.createdAt)
      return d >= prevStart && d < rangeStart
    }).length

    // Time entries: current vs previous period
    const teNow  = timeEntries.filter(e => !e.createdAt || new Date(e.createdAt) >= rangeStart)
    const tePrev = timeEntries.filter(e => {
      if (!e.createdAt) return false
      const d = new Date(e.createdAt)
      return d >= prevStart && d < rangeStart
    })
    const teMinNow  = teNow.reduce((a, e) => a + (e.durationMinutes ?? 0), 0)
    const teMinPrev = tePrev.reduce((a, e) => a + (e.durationMinutes ?? 0), 0)

    // % change helpers — null if no previous data
    const changePct = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0)

    // Sparkline trends: weekly points for the range
    const numWeeks = days ? Math.min(Math.ceil(days / 7), 8) : 8
    const completedTrend: number[] = []
    const overdueTrend:   number[] = []
    const projTrend:      number[] = []
    const timeTrend:      number[] = []

    for (let i = numWeeks - 1; i >= 0; i--) {
      const wEnd   = new Date(today.getTime() - i * 7 * 86400000)
      const wStart = new Date(today.getTime() - (i + 1) * 7 * 86400000)

      completedTrend.push(tasks.filter(t => {
        if (t.status !== 'Tamamlandı') return false
        const d = new Date(t.updatedAt)
        return d >= wStart && d <= wEnd
      }).length)

      overdueTrend.push(tasks.filter(t =>
        t.status !== 'Tamamlandı' && t.dueDate &&
        new Date(t.dueDate) >= wStart && new Date(t.dueDate) <= wEnd
      ).length)

      projTrend.push(projects.filter(p => new Date(p.createdAt) <= wEnd).length)

      timeTrend.push(Math.round(
        timeEntries
          .filter(e => e.createdAt && new Date(e.createdAt) >= wStart && new Date(e.createdAt) <= wEnd)
          .reduce((a, e) => a + (e.durationMinutes ?? 0), 0) / 60
      ))
    }

    return {
      tasks: tasksInRange,
      total, completed, inProgress, inReview, pending,
      overdueNow, prevOverdue,
      completionRate: pct(completed, total),
      onTimeRate: pct(onTimeDone, completed),
      completedChange: changePct(completed, prevCompleted),
      overdueChange:   changePct(overdueNow, prevOverdue),
      projNow, projChange: changePct(projNow, projPrev),
      teMinNow, teMinPrev, teChange: changePct(teMinNow, teMinPrev),
      completedTrend, overdueTrend, projTrend, timeTrend,
    }
  }, [tasks, projects, timeEntries, range, today])

  // ── Trend points (14-day daily, for line chart) ──────────────────────────────

  const trendPoints = useMemo<TrendPoint[]>(() => {
    const out: TrendPoint[] = []
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const day = new Date(todayStart)
      day.setDate(day.getDate() - i)
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      const count = tasks.filter(t => {
        if (t.status !== 'Tamamlandı') return false
        const d = new Date(t.updatedAt)
        return d >= day && d < next
      }).length
      out.push({ day, count })
    }
    return out
  }, [tasks, today])

  // ── Weekly bars (last 8 weeks) ───────────────────────────────────────────────

  const weekBars = useMemo<WeekBar[]>(() => {
    const out: WeekBar[] = []
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(todayStart)
      weekEnd.setDate(weekEnd.getDate() - i * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)
      const count = tasks.filter(t => {
        if (t.status !== 'Tamamlandı') return false
        const d = new Date(t.updatedAt)
        return d >= weekStart && d <= weekEnd
      }).length
      out.push({
        label: weekStart.getDate() + ' ' + AN_MONTHS_SHORT[weekStart.getMonth()],
        count,
      })
    }
    return out
  }, [tasks, today])

  // ── Status donut slices ──────────────────────────────────────────────────────

  const statusSlices = useMemo<SliceData[]>(() => {
    const order: { l: string; c: string }[] = [
      { l: 'Tamamlandı', c: 'var(--success)' },
      { l: 'Davam edir', c: 'var(--primary)' },
      { l: 'Yoxlanılır', c: 'var(--warn)' },
      { l: 'Gözləyir',   c: 'var(--muted)' },
    ]
    return order
      .map(s => ({ ...s, count: stats.tasks.filter(t => t.status === s.l).length }))
      .filter(s => s.count > 0)
  }, [stats.tasks])

  const sliceTotal = statusSlices.reduce((s, x) => s + x.count, 0)

  // ── Priority mix ────────────────────────────────────────────────────────────

  const priorityMix = useMemo(() => {
    const order = ['Kritik', 'Yüksək', 'Orta', 'Aşağı']
    const colors: Record<string, string> = {
      'Kritik': 'var(--accent)',
      'Yüksək': 'var(--warn)',
      'Orta':   'var(--info)',
      'Aşağı':  'var(--muted-2)',
    }
    return order.map(p => ({
      label: p,
      count: stats.tasks.filter(t => t.priority === p).length,
      color: colors[p],
    }))
  }, [stats.tasks])

  // ── Project health ───────────────────────────────────────────────────────────

  const projectHealth = useMemo<ProjectHealth[]>(() => {
    return projects.map(p => {
      const projTasks = tasks.filter(t => t.projectId === p.id)
      const done = projTasks.filter(t => t.status === 'Tamamlandı').length
      const overdue = projTasks.filter(t =>
        t.status !== 'Tamamlandı' && t.dueDate && new Date(t.dueDate) < today
      ).length
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        tasksCount: projTasks.length,
        done,
        overdue,
        health: pct(done, projTasks.length),
      }
    }).filter(p => p.tasksCount > 0)
  }, [projects, tasks, today])

  // ── Team performance ─────────────────────────────────────────────────────────

  const teamPerf = useMemo<TeamPerfRow[]>(() => {
    return members.map(m => {
      const assigned = stats.tasks.filter(t => t.assignee === m.name)
      const done = assigned.filter(t => t.status === 'Tamamlandı').length
      const loggedMin = timeEntries
        .filter(e => e.userDisplayName === m.name || e.userId === m.id)
        .reduce((a, e) => a + (e.durationMinutes ?? 0), 0)
      return {
        id: m.id,
        name: m.name,
        department: m.department,
        assigned: assigned.length,
        done,
        rate: pct(done, assigned.length),
        hours: loggedMin,
      }
    })
      .filter(m => m.assigned > 0)
      .sort((a, b) => b.rate - a.rate || b.done - a.done)
  }, [members, stats.tasks, timeEntries])

  // totalLoggedMin is now computed inside stats as stats.teMinNow

  const rangeLabel = AN_RANGES.find(r => r.v === range)!.l

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="pageM fade-in">

      {/* Hero */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="greeting">📊 KPI Analitika</div>
          <h1>
            {rangeLabel}də{' '}
            <span style={{
              background: 'linear-gradient(90deg, #FFD466, #FF8FB1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {stats.completed}
            </span>{' '}
            tapşırıq tamamlandı.
          </h1>
          <p>
            {projects.length} layihə · {tasks.length} tapşırıq izlənilir.
            Vaxtında çatdırılma nisbəti <b>{stats.onTimeRate}%</b>.
            {stats.overdueNow > 0 && <> · <span style={{ color: '#FFD466', fontWeight: 700 }}>{stats.overdueNow} gecikmiş</span></>}
          </p>
          <div className="cta-row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {AN_RANGES.map(r => (
              <button
                key={r.v}
                className={'cta' + (range === r.v ? '' : ' ghost')}
                style={{ fontSize: 12, padding: '8px 16px' }}
                onClick={() => setRange(r.v)}
              >
                {r.l}
              </button>
            ))}
            <button className="cta ghost" style={{ fontSize: 12, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="file_download" size={12} /> İxrac
            </button>
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <div className="ico"><Icon name="trending_up" size={16} /></div>
            <div>
              <div className="v">{stats.completionRate}%</div>
              <div className="l">Tamamlanma nisbəti</div>
            </div>
          </div>
          <div className="hero-stat">
            <div className="ico"><Icon name="schedule" size={16} /></div>
            <div>
              <div className="v">{stats.onTimeRate}%</div>
              <div className="l">Vaxtında çatdırılma</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI stat cards */}
      <div className="statsM">
        {/* Projects: total count, delta = new projects this period vs previous */}
        <AnStat
          color="indigo" icon="folder"
          label="Layihə" value={projects.length}
          total={`${projects.filter(p => p.status === 'Davam edir').length} aktiv · ${projects.filter(p => p.status === 'Tamamlandı').length} tamamlandı`}
          trend={stats.projTrend.length ? stats.projTrend : [0, projects.length]}
          change={stats.projChange}
          positive
        />
        {/* Completed tasks: in current range, delta = vs previous same period */}
        <AnStat
          color="info" icon="check_circle"
          label="Tamamlanan tapşırıq" value={stats.completed}
          total={`${stats.total} tapşırıq · ${stats.completionRate}% nisbət`}
          trend={stats.completedTrend.length ? stats.completedTrend : [0, stats.completed]}
          change={stats.completedChange}
          positive
        />
        {/* Overdue tasks: snapshot of tasks past due date, delta = vs previous period's new overdue */}
        <AnStat
          color="warn" icon="warning"
          label="Gecikmiş tapşırıq" value={stats.overdueNow}
          total={`${tasks.filter(t => t.status !== 'Tamamlandı').length} aktiv tapşırıq`}
          trend={stats.overdueTrend.length ? stats.overdueTrend : [0, stats.overdueNow]}
          change={stats.overdueChange}
          negative
        />
        {/* Time entries: hours logged in current range, delta = vs previous period */}
        <AnStat
          color="pink" icon="schedule"
          label="Vaxt qeydləri" value={fmtH(stats.teMinNow)}
          total={`${timeEntries.length} qeyd · əvvəlki: ${fmtH(stats.teMinPrev)}`}
          trend={stats.timeTrend.length ? stats.timeTrend : [0, Math.round(stats.teMinNow / 60)]}
          change={stats.teChange}
          positive
        />
      </div>

      {/* Trend line + status donut */}
      <div className="gridM">
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Icon name="trending_up" size={16} />
              </span>
              Tamamlanma trendi
            </h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg, #5B5BF5, #B57BFF)' }}></span>
                Gündəlik tamamlanan
              </span>
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                <span style={{ width: 14, height: 2, background: 'var(--accent)', borderRadius: 2 }}></span>
                Hədəf (5/gün)
              </span>
            </div>
          </div>
          <AnLineChart
            points={trendPoints.map(p => p.count)}
            labels={trendPoints.map(p => p.day.getDate() + '/' + (p.day.getMonth() + 1))}
            target={5}
            animate={animate}
          />
        </div>

        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico"><Icon name="donut_large" size={16} /></span>
              Status bölgüsü
            </h3>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{sliceTotal}</span>
          </div>
          {sliceTotal === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Məlumat yoxdur
            </div>
          ) : (
            <>
              <AnDonut
                slices={statusSlices}
                animate={animate}
                centerLabel="Tamamlandı"
                centerValue={stats.completionRate + '%'}
              />
              <div className="legend">
                {statusSlices.map(s => (
                  <div key={s.l} className="legend-row">
                    <span className="lk">
                      <span className="sq" style={{ background: s.c }}></span>
                      {s.l}
                    </span>
                    <span className="lv">
                      {s.count}{' '}
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>({pct(s.count, sliceTotal)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weekly bar chart + priority mix */}
      <div className="gridM">
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <Icon name="analytics" size={16} />
              </span>
              Həftəlik tamamlanan tapşırıqlar
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Son 8 həftə</span>
          </div>
          <AnBarChart data={weekBars} animate={animate} />
        </div>

        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Icon name="bolt" size={16} />
              </span>
              Prioritet paylanması
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{stats.tasks.length} tapşırıq</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {priorityMix.map(p => {
              const maxCount = Math.max(...priorityMix.map(x => x.count), 1)
              const w = (p.count / maxCount) * 100
              return (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }}></span>
                      {p.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFeatureSettings: '"tnum"' }}>{p.count}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: animate ? w + '%' : '0%',
                      background: p.color,
                      borderRadius: 999,
                      transition: 'width .8s cubic-bezier(.2,.7,.1,1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Project health */}
      {projectHealth.length > 0 && (
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico"><Icon name="folder_open" size={16} /></span>
              Layihə sağlamlığı
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{projectHealth.length} aktiv</span>
          </div>
          <div className="an-projhealth">
            {projectHealth.map(p => {
              const [c1, c2] = avatarPaletteFor(p.id)
              const healthColor = p.health >= 75
                ? 'var(--success)'
                : p.health >= 40
                ? 'var(--warn)'
                : 'var(--accent)'
              const statusCls = STATUS_COLORS[p.status] || 'muted'
              return (
                <div key={p.id} className="an-projrow">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11,
                      background: `linear-gradient(135deg, ${c1}, ${c2})`,
                      color: 'white', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      letterSpacing: '-0.02em', flexShrink: 0,
                    }}>
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {p.done}/{p.tasksCount} tapşırıq
                        {p.overdue > 0 && (
                          <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: 8 }}>· {p.overdue} gecikmiş</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`pill ${statusCls}`}>
                    <span className="dot"></span>
                    {p.status}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 140, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: animate ? p.health + '%' : '0%',
                        background: healthColor,
                        borderRadius: 999,
                        transition: 'width .9s cubic-bezier(.2,.7,.1,1)',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: healthColor, minWidth: 36, textAlign: 'right' }}>
                      {p.health}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team performance */}
      {teamPerf.length > 0 && (
        <div className="cardM">
          <div className="cardM-head">
            <h3>
              <span className="ico" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>
                <Icon name="groups" size={16} />
              </span>
              Komanda performansı
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Top {teamPerf.length} ifaçı</span>
          </div>
          <div className="an-teamtable">
            <div className="an-teamhead">
              <span>Üzv</span>
              <span style={{ textAlign: 'center' }}>Tapşırıq</span>
              <span style={{ textAlign: 'center' }}>Tamamlandı</span>
              <span>Performans</span>
              <span style={{ textAlign: 'right' }}>Saat</span>
            </div>
            {teamPerf.map((m, i) => {
              const [a1, a2] = avatarPaletteFor(m.id)
              const perfColor = m.rate >= 75
                ? 'var(--success)'
                : m.rate >= 50
                ? 'var(--warn)'
                : 'var(--accent)'
              return (
                <div key={m.id} className="an-teamrow">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: i === 0 ? 'linear-gradient(135deg, #FFD466, #FF8B7B)' : 'var(--surface-2)',
                      color: i === 0 ? 'white' : 'var(--muted)',
                      fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: `linear-gradient(135deg, ${a1}, ${a2})`,
                      color: 'white', fontWeight: 700, fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {initialsM(m.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.department}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', fontFeatureSettings: '"tnum"' }}>
                    {m.assigned}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', textAlign: 'center', fontFeatureSettings: '"tnum"' }}>
                    {m.done}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden', minWidth: 60 }}>
                      <div style={{
                        height: '100%',
                        width: animate ? m.rate + '%' : '0%',
                        background: perfColor,
                        borderRadius: 999,
                        transition: `width .9s cubic-bezier(.2,.7,.1,1) ${i * 60}ms`,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: perfColor, minWidth: 36, textAlign: 'right' }}>
                      {m.rate}%
                    </span>
                  </div>
                  <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', fontFeatureSettings: '"tnum"' }}>
                    {m.hours > 0 ? fmtH(m.hours) : '0s'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
