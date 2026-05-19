'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { db } from '@/lib/db'
import { ActivityLog, TeamMember } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTeam } from '@/hooks/useSheets'
import { Icon } from '@/components/ui/Icon'
import { avatarPaletteFor, initialsM, fmtDateM, fmtTimeM, relTimeAz } from '@/lib/design-utils'
import { Shield } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Config ──────────────────────────────────────────────────────────────────

const AV_ACTION_CONFIG: Record<
  ActivityLog['action'],
  { label: string; ico: string; color: string; soft: string; verb: string }
> = {
  create:   { label: 'Yaradıldı',  ico: 'add_circle',     color: 'var(--primary)',  soft: 'var(--primary-soft)',  verb: 'yaratdı' },
  update:   { label: 'Yeniləndi',  ico: 'edit',           color: 'var(--info)',     soft: 'var(--info-soft)',     verb: 'yenilədi' },
  delete:   { label: 'Silindi',    ico: 'delete_outline', color: 'var(--accent)',   soft: 'var(--accent-soft)',   verb: 'sildi' },
  complete: { label: 'Tamamlandı', ico: 'check_circle',   color: 'var(--success)',  soft: 'var(--success-soft)',  verb: 'tamamladı' },
  login:    { label: 'Daxil oldu', ico: 'login',          color: 'var(--pink)',     soft: 'var(--pink-soft)',     verb: 'daxil oldu' },
  logout:   { label: 'Çıxdı',     ico: 'logout',         color: 'var(--muted)',    soft: 'var(--surface-2)',     verb: 'çıxış etdi' },
  comment:  { label: 'Şərh',      ico: 'chat_bubble',    color: 'var(--warn)',     soft: 'var(--warn-soft)',     verb: 'şərh yazdı' },
}

const AV_ENTITY_CONFIG: Record<
  ActivityLog['entityType'],
  { label: string; ico: string; color: string }
> = {
  project: { label: 'Layihə',     ico: 'folder',    color: 'var(--primary)' },
  task:    { label: 'Tapşırıq',   ico: 'check_box', color: 'var(--info)' },
  team:    { label: 'Komanda',    ico: 'groups',    color: 'var(--success)' },
  user:    { label: 'İstifadəçi', ico: 'person',    color: 'var(--pink)' },
  comment: { label: 'Şərh',      ico: 'chat',      color: 'var(--warn)' },
}

const AV_FIELD_LABELS: Record<string, string> = {
  status:     'Status',
  priority:   'Prioritet',
  assignee:   'İcraçı',
  dueDate:    'Son tarix',
  progress:   'İrəliləyiş',
  department: 'Şöbə',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvStat({
  ico,
  color,
  label,
  value,
  sub,
}: {
  ico: string
  color: 'indigo' | 'info' | 'green' | 'accent'
  label: string
  value: number
  sub: string
}) {
  const colorVar =
    color === 'indigo' ? 'var(--primary)'
    : color === 'info' ? 'var(--info)'
    : color === 'green' ? 'var(--success)'
    : 'var(--accent)'
  const softVar =
    color === 'indigo' ? 'var(--primary-soft)'
    : color === 'info' ? 'var(--info-soft)'
    : color === 'green' ? 'var(--success-soft)'
    : 'var(--accent-soft)'
  return (
    <div className="av-stat">
      <div className="av-stat-l">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: softVar, color: colorVar,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={ico} size={15} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
          {value}
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{sub}</span>
      </div>
    </div>
  )
}

function TopUserAvatar({ member }: { member: TeamMember }) {
  const [a1, a2] = avatarPaletteFor(member.id)
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 11,
      background: `linear-gradient(135deg, ${a1}, ${a2})`,
      color: 'white', fontSize: 13, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initialsM(member.name)}
    </div>
  )
}

function ActivityRow({ log, members }: { log: ActivityLog; members: TeamMember[] }) {
  const cfg = AV_ACTION_CONFIG[log.action]
  const entCfg = AV_ENTITY_CONFIG[log.entityType]
  const member =
    members.find(m => m.id === log.userId) ??
    members.find(m => m.name === log.userDisplayName) ??
    null
  const [a1, a2] = member ? avatarPaletteFor(member.id) : ['#ccc', '#aaa']
  const displayName = member?.name ?? log.userDisplayName
  const initials = member ? initialsM(member.name) : initialsM(log.userDisplayName)
  const time = fmtTimeM(log.createdAt)
  const changes = log.changes ? Object.entries(log.changes) : []

  return (
    <div className="av-row">
      {/* Time gutter */}
      <div className="av-time">
        <span>{time}</span>
        <span className="av-time-rel">{relTimeAz(log.createdAt)}</span>
      </div>

      {/* Action icon — timeline node */}
      <div className="av-node">
        <div className="av-node-ico" style={{ background: cfg.soft, color: cfg.color }}>
          <Icon name={cfg.ico} size={14} />
        </div>
      </div>

      {/* Card */}
      <div className="av-card">
        <div className="av-card-head">
          <div className="av-card-user">
            <div
              className="av-card-av"
              style={{ background: `linear-gradient(135deg, ${a1}, ${a2})` }}
            >
              {initials}
            </div>
            <span style={{ fontWeight: 700 }}>{displayName}</span>
          </div>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{cfg.verb}</span>
          {entCfg && (
            <span className="av-entity-pill" style={{ color: entCfg.color, background: 'var(--surface-2)' }}>
              <Icon name={entCfg.ico} size={10} />
              {entCfg.label}
            </span>
          )}
          {log.entityName && (
            <span className="av-entname">«{log.entityName}»</span>
          )}
        </div>

        {changes.length > 0 && (
          <div className="av-changes">
            {changes.map(([key, val]) => {
              const v = val as { from: unknown; to: unknown }
              return (
                <div key={key} className="av-change">
                  <span className="av-change-k">{AV_FIELD_LABELS[key] ?? key}</span>
                  <span className="av-change-from">{String(v.from)}</span>
                  <Icon name="arrow_forward" size={11} />
                  <span className="av-change-to">{String(v.to)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { user } = useAuth()
  const { currentWorkspaceId } = useWorkspace()
  const { members } = useTeam()

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [period, setPeriod] = useState('all')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const today = useMemo(() => new Date(), [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await db.activity.getAll(currentWorkspaceId || undefined)
    if (res.success && res.data) setLogs(res.data)
    else toast.error(res.error || 'Aktivlik məlumatları yüklənmədi')
    setLoading(false)
  }, [currentWorkspaceId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Ctrl/Cmd+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Stats across all logs
  const stats = useMemo(() => {
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)
    let todayCount = 0, weekCount = 0
    const byAction: Record<string, number> = {}
    const byUser:   Record<string, number> = {}
    logs.forEach(l => {
      const d = new Date(l.createdAt)
      if (d >= todayStart) todayCount++
      if (d >= weekStart)  weekCount++
      byAction[l.action] = (byAction[l.action] ?? 0) + 1
      byUser[l.userId]   = (byUser[l.userId]   ?? 0) + 1
    })
    const topUserId = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topUser = topUserId
      ? (members.find(m => m.id === topUserId) ?? null)
      : null
    return {
      total: logs.length,
      todayCount,
      weekCount,
      byAction,
      topUser,
      topUserCount: topUserId ? (byUser[topUserId] ?? 0) : 0,
    }
  }, [logs, members, today])

  // Unique users for dropdown (prefer members list, supplement with display names)
  const userOptions = useMemo(() => {
    if (members.length > 0) return members.map(m => ({ id: m.id, name: m.name }))
    const seen = new Set<string>()
    const opts: { id: string; name: string }[] = []
    logs.forEach(l => {
      if (!seen.has(l.userId)) {
        seen.add(l.userId)
        opts.push({ id: l.userId, name: l.userDisplayName })
      }
    })
    return opts
  }, [members, logs])

  // Filter
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter !== 'all' && l.action     !== actionFilter) return false
      if (entityFilter !== 'all' && l.entityType !== entityFilter) return false
      if (userFilter   !== 'all' && l.userId     !== userFilter)   return false
      if (period !== 'all') {
        const d = new Date(l.createdAt)
        const cutoff = new Date(today)
        if (period === 'today') cutoff.setHours(0, 0, 0, 0)
        else cutoff.setDate(cutoff.getDate() - parseInt(period, 10))
        if (d < cutoff) return false
      }
      if (query) {
        const q = query.toLowerCase()
        const member =
          members.find(m => m.id === l.userId) ??
          members.find(m => m.name === l.userDisplayName)
        return (
          (l.entityName ?? '').toLowerCase().includes(q) ||
          (member?.name ?? l.userDisplayName).toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, actionFilter, entityFilter, userFilter, period, query, members, today])

  // Group by day (descending)
  const grouped = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {}
    filtered.forEach(l => {
      const d = new Date(l.createdAt); d.setHours(0, 0, 0, 0)
      const k = d.toISOString();
      (map[k] = map[k] ?? []).push(l)
    })
    return Object.entries(map)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([k, items]) => ({ date: new Date(k), items }))
  }, [filtered])

  const groupLabel = (date: Date) => {
    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0)
    const diff = Math.round((dayStart.getTime() - date.getTime()) / 86400000)
    if (diff === 0) return 'Bu gün'
    if (diff === 1) return 'Dünən'
    if (diff < 7)  return diff + ' gün əvvəl'
    return fmtDateM(date.toISOString())
  }

  const hasFilters = actionFilter !== 'all' || entityFilter !== 'all' || userFilter !== 'all' || period !== 'all' || query !== ''
  const resetFilters = () => {
    setActionFilter('all'); setEntityFilter('all'); setUserFilter('all')
    setPeriod('all'); setQuery('')
  }

  // Access denied for non-admins
  if (user && user.role !== 'admin') {
    return (
      <div className="pageM fade-in" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={28} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Giriş qadağandır</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', maxWidth: 340, margin: 0 }}>
          Bu səhifə yalnız admin üçündür. Lazımi icazəyə malik deyilsiniz.
        </p>
      </div>
    )
  }

  return (
    <div className="pageM fade-in">

      {/* Header */}
      <div className="tm2-head">
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            İdarəetmə · Audit
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 0' }}>
            Aktivlik Jurnalı
            <span style={{ color: 'var(--muted)', fontWeight: 600, marginLeft: 10 }}>{stats.total}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghostM"><Icon name="file_download" size={13} /> İxrac</button>
          <button className="btn-ghostM" onClick={fetchLogs}><Icon name="autorenew" size={13} /> Yenilə</button>
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="av-stats">
          <AvStat ico="bolt"         color="indigo" label="Bu gün"    value={stats.todayCount}              sub="hadisə" />
          <AvStat ico="schedule"     color="info"   label="Bu həftə"  value={stats.weekCount}               sub="hadisə" />
          <AvStat ico="check_circle" color="green"  label="Tamamlanan" value={stats.byAction.complete ?? 0} sub="tapşırıq" />
          {stats.topUser && (
            <div className="av-stat av-top">
              <div className="av-stat-l">Ən aktiv</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <TopUserAvatar member={stats.topUser} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stats.topUser.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{stats.topUserCount} hadisə</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action chips */}
      <div className="av-actions">
        <button
          className={'av-actchip' + (actionFilter === 'all' ? ' on' : '')}
          onClick={() => setActionFilter('all')}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink)' }} />
          Hamısı
          <span className="cnt">{stats.total}</span>
        </button>
        {(Object.keys(AV_ACTION_CONFIG) as ActivityLog['action'][]).map(a => {
          const cfg = AV_ACTION_CONFIG[a]
          const count = stats.byAction[a] ?? 0
          if (count === 0) return null
          return (
            <button
              key={a}
              className={'av-actchip' + (actionFilter === a ? ' on' : '')}
              onClick={() => setActionFilter(a)}
              style={
                actionFilter === a
                  ? { background: cfg.color, color: 'white', borderColor: cfg.color }
                  : { color: cfg.color }
              }
            >
              <Icon name={cfg.ico} size={12} />
              {cfg.label}
              <span className="cnt" style={actionFilter === a ? { color: 'rgba(255,255,255,0.85)' } : {}}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter toolbar */}
      <div className="av-toolbar">
        <div className="tm2-search" style={{ flex: 1, maxWidth: 320 }}>
          <Icon name="search" size={15} />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Hadisə, istifadəçi, obyekt..."
          />
          <span className="kbd">⌘K</span>
        </div>

        <select
          className="task-select"
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          style={{ minWidth: 140, fontSize: 12 }}
        >
          <option value="all">Bütün növlər</option>
          {(Object.entries(AV_ENTITY_CONFIG) as [ActivityLog['entityType'], { label: string; ico: string; color: string }][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          className="task-select"
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          style={{ minWidth: 160, fontSize: 12 }}
        >
          <option value="all">Bütün istifadəçilər</option>
          {userOptions.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <div className="av-periodtog">
          {([
            { v: 'all',   l: 'Hamısı' },
            { v: 'today', l: 'Bu gün' },
            { v: '7',     l: '7g' },
            { v: '30',    l: '30g' },
          ] as const).map(p => (
            <button key={p.v} className={period === p.v ? 'on' : ''} onClick={() => setPeriod(p.v)}>
              {p.l}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            style={{
              fontSize: 11, color: 'var(--accent)', fontWeight: 700,
              padding: '6px 10px', display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer',
            }}
          >
            <Icon name="close" size={11} /> Sıfırla
          </button>
        )}
      </div>

      {/* Result info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px', fontSize: 11, color: 'var(--muted)' }}>
        <span>
          <b style={{ color: 'var(--ink)', fontWeight: 800 }}>{filtered.length}</b> hadisə · {grouped.length} gün
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          {new Date().toLocaleString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="cardM"
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', opacity: 0.6 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 12, width: '35%', borderRadius: 4, background: 'var(--surface-2)' }} />
                <div style={{ height: 12, width: '55%', borderRadius: 4, background: 'var(--surface-2)' }} />
              </div>
              <div style={{ height: 12, width: 64, borderRadius: 4, background: 'var(--surface-2)', flexShrink: 0 }} />
            </div>
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div className="tm2-empty">
          <Icon name="bolt" size={36} />
          <div style={{ marginTop: 12, fontWeight: 700 }}>Hadisə tapılmadı</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Süzgəcləri yumşaldın.</div>
        </div>

      ) : (
        <div className="av-timeline">
          {grouped.map(({ date, items }) => (
            <div key={date.toISOString()} className="av-group">
              <div className="av-group-head">
                <span className="av-group-label">{groupLabel(date)}</span>
                <span className="av-group-rule" />
                <span className="av-group-count">{items.length}</span>
              </div>
              <div className="av-list">
                {items.map(l => (
                  <ActivityRow key={l.id} log={l} members={members} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
