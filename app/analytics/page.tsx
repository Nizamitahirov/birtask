'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { Project, Task, TeamMember, TimeEntry } from '@/lib/types'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'
import {
  BarChart2, TrendingUp, Clock, CheckSquare,
  FolderKanban, Users, RefreshCw, Calendar,
  AlertCircle, Target
} from 'lucide-react'

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
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  const d = new Date(now)
  d.setDate(d.getDate() - parseInt(range))
  return d
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof BarChart2
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="cardM flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-text-muted text-xs mb-1">{label}</div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        {sub && <div className="text-text-muted text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Bar Chart (SVG) ───────────────────────────────────────────────────────────

interface WeekBar { label: string; count: number }

function BarChartSVG({ data }: { data: WeekBar[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 600
  const H = 180
  const PAD_LEFT = 30
  const PAD_BOTTOM = 40
  const PAD_TOP = 16
  const barW = (W - PAD_LEFT - 16) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Y grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - f)
        return (
          <g key={f}>
            <line x1={PAD_LEFT} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            {f > 0 && (
              <text x={PAD_LEFT - 4} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(148,163,184,0.7)">
                {Math.round(max * f)}
              </text>
            )}
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = ((H - PAD_TOP - PAD_BOTTOM) * d.count) / max
        const x = PAD_LEFT + i * barW + barW * 0.15
        const bw = barW * 0.7
        const y = H - PAD_BOTTOM - barH
        return (
          <g key={i}>
            <rect
              x={x} y={Math.max(y, PAD_TOP)} width={bw}
              height={Math.min(barH, H - PAD_TOP - PAD_BOTTOM)}
              rx={4}
              fill={d.count > 0 ? 'url(#barGrad)' : 'rgba(255,255,255,0.04)'}
            />
            {d.count > 0 && (
              <text
                x={x + bw / 2} y={Math.max(y, PAD_TOP) - 4}
                textAnchor="middle" fontSize={9} fill="rgba(148,163,184,0.9)"
              >
                {d.count}
              </text>
            )}
            <text
              x={x + bw / 2} y={H - PAD_BOTTOM + 14}
              textAnchor="middle" fontSize={9} fill="rgba(148,163,184,0.7)"
            >
              {d.label}
            </text>
          </g>
        )
      })}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Donut Chart (SVG) ─────────────────────────────────────────────────────────

interface DonutSlice { label: string; count: number; color: string }

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((a, s) => a + s.count, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">Məlumat yoxdur</div>
    )
  }

  const R = 60
  const CX = 80
  const CY = 80
  let cumAngle = -Math.PI / 2

  const paths = slices.map(s => {
    const angle = (s.count / total) * 2 * Math.PI
    const x1 = CX + R * Math.cos(cumAngle)
    const y1 = CY + R * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = CX + R * Math.cos(cumAngle)
    const y2 = CY + R * Math.sin(cumAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    return { ...s, d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`, angle }
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 160 160" className="w-36 h-36 flex-shrink-0">
        {paths.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.85} />
        ))}
        <circle cx={CX} cy={CY} r={34} fill="rgb(var(--bg-card))" />
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize={18} fontWeight="bold" fill="rgb(var(--text-primary))">{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={9} fill="rgba(148,163,184,0.8)">tapşırıq</text>
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-text-secondary">{s.label}</span>
            <span className="text-text-primary font-semibold ml-auto pl-4">{s.count}</span>
            <span className="text-text-muted text-xs w-10 text-right">{pct(s.count, total)}%</span>
          </div>
        ))}
      </div>
    </div>
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

  const fetchAll = useCallback(async () => {
    setLoading(true)
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
  }, [currentWorkspaceId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const rangeStart = getRangeStart(range)

  // Filtered tasks by date range
  const filteredTasks = tasks.filter(t => new Date(t.createdAt) >= rangeStart)
  const filteredEntries = timeEntries.filter(e => new Date(e.createdAt) >= rangeStart)

  // KPI stats
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => p.status === 'Tamamlandı').length
  const completedPct = pct(completedProjects, totalProjects)

  const totalTasksInRange = filteredTasks.length
  const completedTasksInRange = filteredTasks.filter(t => t.status === 'Tamamlandı').length

  const overdueCount = filteredTasks.filter(t => {
    if (!t.dueDate || t.status === 'Tamamlandı') return false
    return new Date(t.dueDate) < new Date()
  }).length

  const onTimeDone = filteredTasks.filter(t => {
    if (t.status !== 'Tamamlandı') return false
    if (!t.dueDate) return true
    return new Date(t.updatedAt) <= new Date(t.dueDate)
  }).length
  const onTimeRate = pct(onTimeDone, completedTasksInRange)

  const totalLoggedMinutes = filteredEntries.reduce((a, e) => a + (e.durationMinutes || 0), 0)

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

  // Donut: task status distribution
  const STATUS_COLORS: Record<string, string> = {
    'Gözləyir':   '#94A3B8',
    'Davam edir': '#3B82F6',
    'Yoxlanılır': '#F59E0B',
    'Tamamlandı': '#10B981',
  }
  const donutSlices: DonutSlice[] = Object.entries(STATUS_COLORS).map(([label, color]) => ({
    label,
    color,
    count: filteredTasks.filter(t => t.status === label).length,
  })).filter(s => s.count > 0)

  // Team performance
  const teamPerf = team.map(member => {
    const assigned = filteredTasks.filter(t => t.assignee === member.name)
    const done = assigned.filter(t => t.status === 'Tamamlandı')
    const memberEntries = filteredEntries.filter(e => e.userDisplayName === member.name || e.userId === member.id)
    const loggedMin = memberEntries.reduce((a, e) => a + (e.durationMinutes || 0), 0)
    return {
      ...member,
      assigned: assigned.length,
      done: done.length,
      rate: pct(done.length, assigned.length),
      loggedMin,
    }
  }).filter(m => m.assigned > 0 || m.loggedMin > 0)

  // Project health
  const projectHealth = projects.map(proj => {
    const projTasks = tasks.filter(t => t.projectId === proj.id)
    const done = projTasks.filter(t => t.status === 'Tamamlandı').length
    const overdue = projTasks.filter(t => {
      if (!t.dueDate || t.status === 'Tamamlandı') return false
      return new Date(t.dueDate) < new Date()
    }).length
    const progress = projTasks.length > 0 ? pct(done, projTasks.length) : Number(proj.progress) || 0
    return { ...proj, projTasks: projTasks.length, done, overdue, computedProgress: progress }
  })

  const STATUS_BADGE: Record<string, string> = {
    'Planlaşdırılır': 'bg-[var(--surface-2)] text-text-secondary border-[var(--border)]',
    'Davam edir':     'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    'Tamamlandı':     'bg-accent-green/10 text-accent-green border-accent-green/20',
    'Dayandırıldı':   'bg-accent-red/10 text-accent-red border-accent-red/20',
  }

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="page-headerM">
        <div>
          <h1>KPI Analitika</h1>
          <p className="sub">Layihə və komanda performansı</p>
        </div>
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={range === r ? 'btn-primaryM' : 'btn-ghostM'}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {DATE_RANGE_LABELS[r]}
            </button>
          ))}
          <button onClick={fetchAll} className="btn-ghostM" style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="cardM h-24 animate-pulse" style={{ opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FolderKanban}
              label="Cəmi Layihə"
              value={totalProjects}
              sub={`${completedProjects} tamamlandı (${completedPct}%)`}
              color="bg-accent-blue"
            />
            <StatCard
              icon={Target}
              label="Vaxtında Çatdırılma"
              value={`${onTimeRate}%`}
              sub={`${onTimeDone} / ${completedTasksInRange} tapşırıq`}
              color="bg-accent-green"
            />
            <StatCard
              icon={AlertCircle}
              label="Gecikmiş Tapşırıq"
              value={overdueCount}
              sub={`${totalTasksInRange} tapşırıqdan`}
              color={overdueCount > 0 ? 'bg-accent-red' : 'bg-accent-green'}
            />
            <StatCard
              icon={Clock}
              label="Qeydə Alınan Vaxt"
              value={formatHours(totalLoggedMinutes)}
              sub={`${filteredEntries.length} qeyd`}
              color="bg-accent-purple"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div className="cardM space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-accent-blue" />
                <h2 className="font-semibold text-text-primary text-sm">Həftəlik Tamamlanan Tapşırıqlar</h2>
              </div>
              <BarChartSVG data={weekBars} />
            </div>

            {/* Donut chart */}
            <div className="cardM space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-accent-green" />
                <h2 className="font-semibold text-text-primary text-sm">Tapşırıq Status Bölgüsü</h2>
                <span className="ml-auto text-text-muted text-xs">{filteredTasks.length} tapşırıq</span>
              </div>
              {donutSlices.length > 0
                ? <DonutChart slices={donutSlices} />
                : <div className="text-text-muted text-sm text-center py-10">Seçilmiş dövrdə tapşırıq yoxdur</div>}
            </div>
          </div>

          {/* Team Performance */}
          <div className="cardM" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <Users size={16} className="text-accent-purple" />
              <h2 className="font-semibold text-text-primary text-sm">Komanda Performansı</h2>
            </div>
            {teamPerf.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-sm">Məlumat yoxdur</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Üzv', 'Verilmiş', 'Tamamlanan', 'Uğur nisbəti', 'Qeydə alınan vaxt'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-text-muted text-xs font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerf.sort((a, b) => b.rate - a.rate).map(m => (
                      <tr key={m.id} className="hover:bg-[var(--surface-2)] transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-text-primary font-medium text-sm">{m.name}</div>
                              {m.department && <div className="text-text-muted text-xs">{m.department}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary">{m.assigned}</td>
                        <td className="px-5 py-3 text-accent-green font-medium">{m.done}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px] h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green transition-all"
                                style={{ width: `${m.rate}%` }}
                              />
                            </div>
                            <span className={cn(
                              'text-xs font-semibold',
                              m.rate >= 75 ? 'text-accent-green' : m.rate >= 50 ? 'text-accent-yellow' : 'text-accent-red'
                            )}>
                              {m.rate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary text-xs">
                          {m.loggedMin > 0 ? formatHours(m.loggedMin) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Project Health Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-accent-blue" />
              <h2 className="font-semibold text-text-primary">Layihə Sağlamlığı</h2>
            </div>
            {projectHealth.length === 0 ? (
              <div className="cardM text-center text-text-muted text-sm" style={{ padding: 40 }}>Layihə tapılmadı</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {projectHealth.map(proj => (
                  <div key={proj.id} className="cardM space-y-3">
                    {/* Project header */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: proj.color || '#3B82F6' }}
                      >
                        {proj.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary text-sm truncate">{proj.name}</div>
                        <span className={cn('badge text-[10px] mt-0.5', STATUS_BADGE[proj.status] || 'bg-[var(--surface-2)] text-text-secondary border-[var(--border)]')}>
                          {proj.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-text-muted text-xs">İrəliləyiş</span>
                        <span className="text-text-primary text-xs font-semibold">{proj.computedProgress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${proj.computedProgress}%`, background: proj.color || '#3B82F6' }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 text-xs">
                      <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <div className="font-semibold text-text-primary">{proj.projTasks}</div>
                        <div className="text-text-muted">Tapşırıq</div>
                      </div>
                      <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <div className="font-semibold text-accent-green">{proj.done}</div>
                        <div className="text-text-muted">Tamamlandı</div>
                      </div>
                      <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <div className={cn('font-semibold', proj.overdue > 0 ? 'text-accent-red' : 'text-text-muted')}>
                          {proj.overdue}
                        </div>
                        <div className="text-text-muted">Gecikmiş</div>
                      </div>
                    </div>

                    {/* End date */}
                    {proj.endDate && (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Calendar size={11} />
                        <span>Son tarix: </span>
                        <span className={cn(
                          'font-medium',
                          new Date(proj.endDate) < new Date() && proj.status !== 'Tamamlandı'
                            ? 'text-accent-red'
                            : 'text-text-secondary'
                        )}>
                          {new Date(proj.endDate).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
