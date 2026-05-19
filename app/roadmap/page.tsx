'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useProjects } from '@/hooks/useSheets'
import { avatarPaletteFor, paletteFor, initialsM, fmtDateM, STATUS_COLORS } from '@/lib/design-utils'
import { Icon } from '@/components/ui/Icon'

const RM_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
const RM_QUARTERS = [
  { label: 'Q1', start: 0, end: 2 },
  { label: 'Q2', start: 3, end: 5 },
  { label: 'Q3', start: 6, end: 8 },
  { label: 'Q4', start: 9, end: 11 },
]

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

function daysInYear(y: number): number {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365
}

export default function RoadmapPage() {
  const { projects, loading } = useProjects()
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [dayW, setDayW] = useState(3.4)
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'none'>('status')
  const [hovered, setHovered] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(false)
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [year, dayW, groupBy])

  const total = daysInYear(year)
  const timelineW = total * dayW
  const todayDayY = today.getFullYear() === year ? dayOfYear(today) : -1
  const todayX = todayDayY > 0 ? (todayDayY - 1) * dayW : -1

  useEffect(() => {
    if (scrollerRef.current && todayX > 0) {
      scrollerRef.current.scrollLeft = Math.max(0, todayX - 220)
    }
  }, [year, dayW, todayX])

  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => {
    const start = new Date(year, m, 1)
    const end = new Date(year, m + 1, 0)
    const sd = dayOfYear(start) - 1
    const ed = dayOfYear(end) - 1
    return {
      idx: m,
      name: RM_MONTHS_SHORT[m],
      x: sd * dayW,
      w: (ed - sd + 1) * dayW,
    }
  }), [year, dayW])

  const bars = useMemo(() => projects.map(p => {
    const ps = new Date(p.startDate)
    const pe = new Date(p.endDate)
    if (isNaN(ps.getTime()) || isNaN(pe.getTime())) return null
    const yStart = new Date(year, 0, 1)
    const yEnd = new Date(year, 11, 31)
    if (pe < yStart || ps > yEnd) return null
    const cs = ps < yStart ? yStart : ps
    const ce = pe > yEnd ? yEnd : pe
    const sx = (dayOfYear(cs) - 1) * dayW
    const ex = (dayOfYear(ce) - 1) * dayW + dayW
    return {
      project: p,
      startX: sx,
      width: Math.max(ex - sx, 12),
      progress: Number(p.progress) || 0,
      startsBefore: ps < yStart,
      endsAfter: pe > yEnd,
      originalStart: ps,
      originalEnd: pe,
    }
  }).filter(Boolean) as Array<{
    project: typeof projects[number]
    startX: number
    width: number
    progress: number
    startsBefore: boolean
    endsAfter: boolean
    originalStart: Date
    originalEnd: Date
  }>, [year, dayW, projects])

  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ label: 'Bütün layihələr', color: 'var(--primary)', soft: 'var(--primary-soft)', items: bars }]
    }
    const order = groupBy === 'status'
      ? ['Davam edir', 'Yoxlanılır', 'Planlaşdırılır', 'Tamamlandı', 'Dayandırıldı']
      : ['Kritik', 'Yüksək', 'Orta', 'Aşağı']
    const getKey = (b: typeof bars[number]) => groupBy === 'status' ? b.project.status : b.project.priority
    const map: Record<string, typeof bars> = {}
    bars.forEach(b => {
      const k = getKey(b);
      (map[k] = map[k] || []).push(b)
    })
    const colors: Record<string, { c: string; soft: string }> = {
      'Davam edir':     { c: 'var(--primary)', soft: 'var(--primary-soft)' },
      'Yoxlanılır':     { c: 'var(--warn)',    soft: 'var(--warn-soft)' },
      'Planlaşdırılır': { c: 'var(--muted)',   soft: 'var(--surface-2)' },
      'Tamamlandı':     { c: 'var(--success)', soft: 'var(--success-soft)' },
      'Dayandırıldı':   { c: 'var(--accent)',  soft: 'var(--accent-soft)' },
      'Kritik':         { c: 'var(--accent)',  soft: 'var(--accent-soft)' },
      'Yüksək':         { c: 'var(--warn)',    soft: 'var(--warn-soft)' },
      'Orta':           { c: 'var(--info)',    soft: 'var(--info-soft)' },
      'Aşağı':          { c: 'var(--muted)',   soft: 'var(--surface-2)' },
    }
    return order.filter(k => map[k] && map[k].length).map(k => ({
      label: k,
      color: colors[k]?.c ?? 'var(--primary)',
      soft: colors[k]?.soft ?? 'var(--surface-2)',
      items: map[k],
    }))
  }, [bars, groupBy])

  const stats = useMemo(() => {
    const inYear = bars.length
    const active = bars.filter(b => b.project.status === 'Davam edir').length
    const completed = bars.filter(b => b.project.status === 'Tamamlandı').length
    const overdue = bars.filter(b => b.originalEnd < today && b.project.status !== 'Tamamlandı').length
    return { inYear, active, completed, overdue }
  }, [bars, today])

  const ROW_H = 56
  const LABEL_W = 280
  const HEAD_H = 64

  return (
    <div className="pageM fade-in">
      {/* Header */}
      <div className="team-headM">
        <div>
          <h1>Yol Xəritəsi <span className="cnt">{stats.inYear}</span></h1>
          <div className="sub">
            {year} ili üzrə {stats.inYear} layihə · {stats.active} aktiv · {stats.completed} tamamlandı
            {stats.overdue > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{stats.overdue} gecikmiş</span></>
            )}
          </div>
        </div>
        <div className="actions">
          <div className="rm-yearpick">
            <button className="rm-yarrow" onClick={() => setYear(year - 1)}>
              <Icon name="arrow_forward" size={13} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', minWidth: 48, textAlign: 'center' }}>{year}</span>
            <button className="rm-yarrow" onClick={() => setYear(year + 1)} style={{ transform: 'scaleX(-1)' }}>
              <Icon name="arrow_forward" size={13} />
            </button>
          </div>
          <button className="btn-ghostM" onClick={() => {
            setYear(today.getFullYear())
            requestAnimationFrame(() => {
              if (scrollerRef.current && todayX > 0) {
                scrollerRef.current.scrollLeft = Math.max(0, todayX - 220)
              }
            })
          }}>
            <Icon name="calendar_today" size={13} /> Bu gün
          </button>
          <button className="btn-primaryM">
            <Icon name="add" size={14} /> Yeni Layihə
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="rm-controls">
        <div className="rm-legend">
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Qrupla:</span>
          {([
            { v: 'status',   l: 'Status' },
            { v: 'priority', l: 'Prioritet' },
            { v: 'none',     l: 'Heç biri' },
          ] as const).map(o => (
            <button key={o.v} onClick={() => setGroupBy(o.v)} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 700,
              borderRadius: 999,
              border: '1px solid ' + (groupBy === o.v ? 'var(--primary)' : 'var(--border)'),
              background: groupBy === o.v ? 'var(--primary)' : 'var(--surface)',
              color: groupBy === o.v ? 'white' : 'var(--ink-2)',
              cursor: 'pointer', transition: 'all .1s',
            }}>{o.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
            <Icon name="schedule" size={12} />
            <span>Miqyas</span>
          </div>
          <button className="icon-btn" onClick={() => setDayW(w => Math.max(1.8, +(w - 0.6).toFixed(2)))}>
            <Icon name="close" size={13} />
          </button>
          <div style={{ width: 120, height: 4, background: 'var(--surface-2)', borderRadius: 999, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: `${((dayW - 1.8) / (8 - 1.8)) * 100}%`,
              background: 'var(--primary)', borderRadius: 999,
            }} />
          </div>
          <button className="icon-btn" onClick={() => setDayW(w => Math.min(8, +(w + 0.6).toFixed(2)))}>
            <Icon name="add" size={13} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="rm-chart">
        {/* Labels column */}
        <div className="rm-labels" style={{ width: LABEL_W, flexShrink: 0 }}>
          <div className="rm-labels-head" style={{ height: HEAD_H }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Layihə</span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>İrəliləyiş</span>
          </div>
          {groups.map((g, gi) => (
            <div key={g.label + gi}>
              {groupBy !== 'none' && (
                <div className="rm-group-row" style={{ borderLeftColor: g.color }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: g.color }}>{g.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{g.items.length}</span>
                </div>
              )}
              {g.items.map(({ project, progress }) => {
                const [c1, c2] = avatarPaletteFor(project.id)
                return (
                  <div
                    key={project.id}
                    className="rm-label"
                    style={{ height: ROW_H }}
                    onMouseEnter={() => setHovered(project.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${c1}, ${c2})`,
                      color: 'white', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      letterSpacing: '-0.02em', flexShrink: 0,
                    }}>{initialsM(project.name)}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span className={'pill ' + (STATUS_COLORS[project.status] ?? '')} style={{ fontSize: 9, padding: '1px 6px' }}>{project.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)', minWidth: 30, textAlign: 'right' }}>{progress}%</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Timeline scroller */}
        <div className="rm-timeline" ref={scrollerRef}>
          <div style={{ width: timelineW, minWidth: '100%' }}>
            {/* Header: quarters + months */}
            <div style={{ height: HEAD_H, position: 'relative', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {/* Quarters row */}
              <div style={{ height: 28, position: 'relative', borderBottom: '1px solid var(--border-2)' }}>
                {RM_QUARTERS.map(q => {
                  const x = months[q.start].x
                  const w = months[q.end].x + months[q.end].w - x
                  return (
                    <div key={q.label} style={{
                      position: 'absolute', left: x, width: w, top: 0, bottom: 0,
                      borderRight: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--muted)',
                    }}>
                      {q.label}
                    </div>
                  )
                })}
              </div>
              {/* Months row */}
              <div style={{ height: 36, position: 'relative' }}>
                {months.map((m, mi) => (
                  <div key={m.name} style={{
                    position: 'absolute', left: m.x, width: m.w, top: 0, bottom: 0,
                    borderRight: '1px solid var(--border-2)',
                    display: 'flex', alignItems: 'center',
                    paddingLeft: 8,
                    fontSize: 11, fontWeight: 700,
                    color: today.getFullYear() === year && today.getMonth() === mi ? 'var(--primary)' : 'var(--ink-2)',
                  }}>
                    {m.name}
                    {today.getFullYear() === year && today.getMonth() === mi && (
                      <span style={{ marginLeft: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                    )}
                  </div>
                ))}
              </div>
              {/* Today line in header */}
              {todayX >= 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: todayX, width: 2,
                  background: 'var(--primary)', zIndex: 5,
                }}>
                  <div style={{
                    position: 'absolute', top: -2, left: -16,
                    fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'white',
                    background: 'var(--primary)',
                    padding: '2px 6px', borderRadius: 4,
                    boxShadow: 'var(--shadow-glow)',
                  }}>Bugün</div>
                </div>
              )}
            </div>

            {/* Rows */}
            <div style={{ position: 'relative' }}>
              {/* Background grid lines */}
              {months.map(m => (
                <div key={m.name} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: m.x + m.w - 1,
                  borderRight: '1px solid var(--border-2)',
                }} />
              ))}
              {/* Today line through chart */}
              {todayX >= 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: todayX, width: 2,
                  background: 'var(--primary)',
                  opacity: 0.25, zIndex: 2,
                  pointerEvents: 'none',
                }} />
              )}

              {groups.map((g, gi) => (
                <div key={g.label + gi}>
                  {groupBy !== 'none' && (
                    <div style={{
                      height: 32,
                      background: g.soft,
                      borderBottom: '1px solid var(--border-2)',
                    }} />
                  )}
                  {g.items.map(({ project, startX, width, progress, startsBefore, endsAfter, originalStart, originalEnd }) => {
                    const [c1, c2] = avatarPaletteFor(project.id)
                    const isHover = hovered === project.id
                    const overdue = originalEnd < today && project.status !== 'Tamamlandı'
                    const done = project.status === 'Tamamlandı'
                    const dim = project.status === 'Dayandırıldı'
                    return (
                      <div
                        key={project.id}
                        className="rm-row"
                        style={{ height: ROW_H, opacity: dim ? 0.6 : 1 }}
                        onMouseEnter={() => setHovered(project.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <div className="rm-bar" style={{
                          position: 'absolute',
                          left: startX + 4,
                          width: animate ? (width - 8) : 0,
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                          color: 'white',
                          boxShadow: isHover ? `0 8px 20px -6px ${c1}99` : 'none',
                          transform: isHover ? 'translateY(-50%) scale(1.01)' : 'translateY(-50%)',
                          borderTopLeftRadius: startsBefore ? 0 : 10,
                          borderBottomLeftRadius: startsBefore ? 0 : 10,
                          borderTopRightRadius: endsAfter ? 0 : 10,
                          borderBottomRightRadius: endsAfter ? 0 : 10,
                        }}>
                          {/* Progress shimmer */}
                          <div style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0,
                            width: `${progress}%`,
                            background: 'rgba(255,255,255,0.22)',
                            transition: 'width .8s cubic-bezier(.2,.7,.1,1)',
                          }} />

                          {/* Diagonal pattern for paused */}
                          {dim && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 6px, transparent 6px 12px)',
                            }} />
                          )}

                          {/* Bar content */}
                          {width > 56 && (
                            <div style={{ position: 'relative', zIndex: 2, padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                {done && <Icon name="check_circle" size={13} />}
                                {overdue && <Icon name="warning" size={13} />}
                                <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{project.name}</span>
                              </div>
                              {width > 140 && (
                                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.95, fontFeatureSettings: '"tnum"', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{progress}%</span>
                              )}
                            </div>
                          )}

                          {startsBefore && <div className="rm-bar-fade left" />}
                          {endsAfter && <div className="rm-bar-fade right" />}
                        </div>

                        {/* Hover tooltip */}
                        {isHover && (
                          <div className="rm-tooltip" style={{
                            left: Math.max(8, Math.min(timelineW - 240, startX + width / 2 - 110)),
                            top: -2,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <span className={'pill ' + (STATUS_COLORS[project.status] ?? '')} style={{ fontSize: 9 }}>
                                <span className="dot" />{project.status}
                              </span>
                              <span className={'pill ' + (project.priority === 'Kritik' ? 'accent' : project.priority === 'Yüksək' ? 'warn' : project.priority === 'Orta' ? 'info' : 'muted')} style={{ fontSize: 9 }}>
                                {project.priority}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{project.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                              {fmtDateM(originalStart.toISOString())} → {fmtDateM(originalEnd.toISOString())}
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: progress + '%', background: `linear-gradient(90deg, ${c1}, ${c2})`, borderRadius: 999 }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800 }}>{progress}%</span>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                              <span>{project.owner}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom legend */}
      <div className="rm-bottom-legend">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 3, background: 'var(--primary)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Bugün — {fmtDateM(today.toISOString())}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 8, background: 'linear-gradient(135deg, #5B5BF5, #B57BFF)', borderRadius: 3 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Layihə müddəti</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 8, background: 'rgba(15,17,41,0.15)', borderRadius: 3, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%', background: 'rgba(255,255,255,0.4)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>İrəliləyiş overlay</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="warning" size={12} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Gecikmiş</span>
        </div>
      </div>
    </div>
  )
}
