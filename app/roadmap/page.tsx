'use client'

import { useState, useRef, useEffect } from 'react'
import { useProjects } from '@/hooks/useSheets'
import { Project } from '@/lib/types'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { Map, RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
const MONTH_NAMES_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365
}

export default function RoadmapPage() {
  const { projects, loading, refresh } = useProjects()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [dayWidth, setDayWidth] = useState(3) // px per day
  const containerRef = useRef<HTMLDivElement>(null)

  const totalDays = daysInYear(year)
  const timelineWidth = totalDays * dayWidth

  const todayDayOfYear = year === today.getFullYear() ? getDayOfYear(today) : -1
  const todayX = todayDayOfYear > 0 ? (todayDayOfYear - 1) * dayWidth : -1

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current && todayX > 0) {
      containerRef.current.scrollLeft = Math.max(0, todayX - 200)
    }
  }, [year, todayX])

  // Build month columns
  const months = Array.from({ length: 12 }, (_, m) => {
    const start = new Date(year, m, 1)
    const end = new Date(year, m + 1, 0)
    const startDay = getDayOfYear(start) - 1
    const endDay = getDayOfYear(end) - 1
    return {
      name: MONTH_NAMES[m],
      full: MONTH_NAMES_FULL[m],
      x: startDay * dayWidth,
      width: (endDay - startDay + 1) * dayWidth,
    }
  })

  // Compute bar for each project
  const projectBars = projects.map(p => {
    if (!p.startDate && !p.endDate) return null
    const start = p.startDate ? new Date(p.startDate) : new Date(year, 0, 1)
    const end = p.endDate ? new Date(p.endDate) : new Date(year, 11, 31)

    const clampedStart = new Date(Math.max(start.getTime(), new Date(year, 0, 1).getTime()))
    const clampedEnd = new Date(Math.min(end.getTime(), new Date(year, 11, 31).getTime()))

    if (clampedStart > clampedEnd) return null

    const startX = (getDayOfYear(clampedStart) - 1) * dayWidth
    const endX = (getDayOfYear(clampedEnd) - 1) * dayWidth + dayWidth
    const width = endX - startX
    const progress = Number(p.progress) || 0

    return { project: p, startX, width, progress, originalStart: start, originalEnd: end }
  }).filter(Boolean) as Array<{
    project: Project
    startX: number
    width: number
    progress: number
    originalStart: Date
    originalEnd: Date
  }>

  const ROW_HEIGHT = 52
  const LABEL_WIDTH = 220

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Yol Xəritəsi</h1>
          <p className="text-text-secondary text-sm mt-1">{projects.length} layihə</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDayWidth(w => Math.max(2, w - 1))}
            className="btn-secondary w-9 h-9 !p-0 justify-center"
            title="Uzaq bax"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => setDayWidth(w => Math.min(8, w + 1))}
            className="btn-secondary w-9 h-9 !p-0 justify-center"
            title="Yaxın bax"
          >
            <ZoomIn size={15} />
          </button>
          <div className="flex items-center gap-1 card px-2 py-1.5">
            <button
              onClick={() => setYear(y => y - 1)}
              className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-text-primary text-sm font-semibold w-12 text-center">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={refresh} className="btn-secondary w-9 h-9 !p-0 justify-center" title="Yenilə">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={Map} title="Layihə tapılmadı" description="Əvvəlcə layihə yaradın" />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex">
            {/* Project labels */}
            <div className="flex-shrink-0 border-r border-white/[0.06]" style={{ width: LABEL_WIDTH }}>
              {/* Month header spacer */}
              <div className="h-10 border-b border-white/[0.06] flex items-center px-4">
                <span className="text-text-muted text-xs font-medium">Layihə</span>
              </div>
              {projectBars.map(({ project }) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 px-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: project.color || '#3B82F6' }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-text-primary text-xs font-medium truncate">{project.name}</div>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div ref={containerRef} className="flex-1 overflow-x-auto">
              <div style={{ width: timelineWidth, minWidth: '100%' }}>
                {/* Month headers */}
                <div className="flex h-10 border-b border-white/[0.06] relative">
                  {months.map(m => (
                    <div
                      key={m.name}
                      className="absolute top-0 flex items-center border-r border-white/[0.04] h-full px-2"
                      style={{ left: m.x, width: m.width }}
                    >
                      <span className="text-text-muted text-xs font-medium whitespace-nowrap overflow-hidden">{m.name}</span>
                    </div>
                  ))}
                  {/* Today marker header */}
                  {todayX >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-accent-blue/60 z-10"
                      style={{ left: todayX }}
                    />
                  )}
                </div>

                {/* Rows */}
                {projectBars.map(({ project, startX, width, progress }) => (
                  <div
                    key={project.id}
                    className="relative border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
                    style={{ height: ROW_HEIGHT, width: timelineWidth }}
                  >
                    {/* Grid lines */}
                    {months.map(m => (
                      <div
                        key={m.name}
                        className="absolute top-0 bottom-0 border-r border-white/[0.03]"
                        style={{ left: m.x + m.width - 1 }}
                      />
                    ))}

                    {/* Today line */}
                    {todayX >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-accent-blue/30 z-10"
                        style={{ left: todayX }}
                      />
                    )}

                    {/* Bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-lg overflow-hidden flex items-center"
                      style={{
                        left: startX + 2,
                        width: Math.max(width - 4, 8),
                        height: 28,
                        background: project.color ? `${project.color}33` : 'rgba(59,130,246,0.2)',
                        border: `1px solid ${project.color || '#3B82F6'}44`,
                      }}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute top-0 left-0 bottom-0 rounded-lg"
                        style={{
                          width: `${progress}%`,
                          background: project.color || '#3B82F6',
                          opacity: 0.5,
                        }}
                      />
                      {width > 60 && (
                        <span
                          className="relative z-10 px-2 text-[10px] font-semibold truncate"
                          style={{ color: project.color || '#3B82F6' }}
                        >
                          {project.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today marker legend */}
          {todayX >= 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.06]">
              <div className="w-4 h-0.5 bg-accent-blue/60" />
              <span className="text-text-muted text-xs">Bugün ({today.toLocaleDateString('az-AZ')})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
