'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { TimeEntry } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  Play, Square, Plus, Clock, Trash2, ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}s ${m}d`
  return `${m}d`
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function totalMinutes(entries: TimeEntry[]): number {
  return entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0)
}

interface TimeTrackerProps {
  taskId: string
  projectId: string
}

export function TimeTracker({ taskId, projectId }: TimeTrackerProps) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualHours, setManualHours] = useState('0')
  const [manualMinutes, setManualMinutes] = useState('30')
  const [manualDesc, setManualDesc] = useState('')
  const [addingManual, setAddingManual] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const filter = taskId ? { taskId } : { projectId }
    const res = await db.timeEntries.getAll(filter)
    if (res.success && res.data) {
      setEntries(res.data)
      // Check if there's an active (no endTime) entry for current user
      const active = res.data.find(e => !e.endTime && e.userId === user?.id)
      setActiveEntry(active || null)
    }
    setLoading(false)
  }, [taskId, projectId, user?.id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Tick elapsed timer
  useEffect(() => {
    if (!activeEntry) { setElapsed(0); return }
    const start = new Date(activeEntry.startTime).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeEntry])

  const handleStart = async () => {
    if (!user) return
    setStarting(true)
    const res = await db.timeEntries.create({
      taskId: taskId || '',
      projectId,
      userId: user.id,
      userDisplayName: user.displayName || user.username,
      description: '',
      startTime: new Date().toISOString(),
    })
    if (res.success && res.data) {
      setActiveEntry(res.data)
      toast.success('Taymer başladı')
      await fetchEntries()
    } else {
      toast.error(res.error || 'Xəta')
    }
    setStarting(false)
  }

  const handleStop = async () => {
    if (!activeEntry) return
    setStopping(true)
    const endTime = new Date().toISOString()
    const durationMinutes = Math.max(
      1,
      Math.round((new Date(endTime).getTime() - new Date(activeEntry.startTime).getTime()) / 60000)
    )
    const res = await db.timeEntries.update(activeEntry.id, { endTime, durationMinutes })
    if (res.success) {
      setActiveEntry(null)
      toast.success(`${formatDuration(durationMinutes)} qeydə alındı`)
      await fetchEntries()
    } else {
      toast.error(res.error || 'Xəta')
    }
    setStopping(false)
  }

  const handleAddManual = async () => {
    if (!user) return
    const mins = (parseInt(manualHours) || 0) * 60 + (parseInt(manualMinutes) || 0)
    if (mins <= 0) { toast.error('Müddət 0-dan böyük olmalıdır'); return }
    setAddingManual(true)
    const now = new Date()
    const startTime = new Date(now.getTime() - mins * 60000).toISOString()
    const res = await db.timeEntries.create({
      taskId: taskId || '',
      projectId,
      userId: user.id,
      userDisplayName: user.displayName || user.username,
      description: manualDesc,
      startTime,
      endTime: now.toISOString(),
      durationMinutes: mins,
    })
    if (res.success) {
      toast.success('Vaxt əlavə edildi')
      setManualHours('0')
      setManualMinutes('30')
      setManualDesc('')
      setShowManual(false)
      await fetchEntries()
    } else {
      toast.error(res.error || 'Xəta')
    }
    setAddingManual(false)
  }

  const handleDelete = async (id: string) => {
    const res = await db.timeEntries.delete(id)
    if (res.success) {
      toast.success('Qeyd silindi')
      await fetchEntries()
    } else {
      toast.error(res.error || 'Xəta')
    }
  }

  const total = totalMinutes(entries)

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-accent-blue flex-shrink-0" />
          <span className="font-semibold text-text-primary text-sm">Vaxt İzləmə</span>
          {total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-medium">
              {formatDuration(total)}
            </span>
          )}
          {activeEntry && (
            <span className="flex items-center gap-1 text-xs text-accent-green animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              Davam edir
            </span>
          )}
        </div>
        <div className="text-text-muted">
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </div>
      </div>

      {!collapsed && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
          {/* Timer controls */}
          <div className="flex items-center gap-3">
            {activeEntry ? (
              <>
                <div className="flex-1 font-mono text-2xl font-bold text-text-primary tracking-widest">
                  {formatElapsed(elapsed)}
                </div>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="btn-danger !py-2"
                >
                  {stopping ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  Dayandır
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 text-text-muted text-sm">
                  {entries.length === 0 ? 'Hələ vaxt qeyd edilməyib' : `${entries.length} qeyd`}
                </div>
                <button
                  onClick={() => setShowManual(v => !v)}
                  className="btn-secondary !py-2"
                >
                  <Plus size={13} /> Manual
                </button>
                <button
                  onClick={handleStart}
                  disabled={starting}
                  className="btn-primary !py-2"
                >
                  {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Başla
                </button>
              </>
            )}
          </div>

          {/* Manual entry form */}
          {showManual && !activeEntry && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            >
              <p className="text-text-secondary text-xs font-medium">Manual vaxt əlavə et</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-text-muted text-[11px] mb-1">Saat</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={manualHours}
                    onChange={e => setManualHours(e.target.value)}
                    className="input text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-text-muted text-[11px] mb-1">Dəqiqə</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={e => setManualMinutes(e.target.value)}
                    className="input text-center"
                  />
                </div>
              </div>
              <div>
                <label className="block text-text-muted text-[11px] mb-1">Açıqlama (isteğe bağlı)</label>
                <input
                  value={manualDesc}
                  onChange={e => setManualDesc(e.target.value)}
                  className="input"
                  placeholder="Nə üzərində işlənildi..."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowManual(false)} className="btn-secondary flex-1 justify-center !text-xs">
                  Ləğv et
                </button>
                <button onClick={handleAddManual} disabled={addingManual} className="btn-primary flex-1 justify-center !text-xs disabled:opacity-50">
                  {addingManual ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Əlavə et
                </button>
              </div>
            </div>
          )}

          {/* Entries list */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm group',
                    !entry.endTime && 'border border-accent-green/20 bg-accent-green/5'
                  )}
                  style={entry.endTime ? { background: 'var(--surface-1)' } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary text-xs font-medium">{entry.userDisplayName}</span>
                      {!entry.endTime && (
                        <span className="text-[10px] text-accent-green font-medium">Aktiv</span>
                      )}
                    </div>
                    {entry.description && (
                      <div className="text-text-muted text-[11px] mt-0.5 truncate">{entry.description}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {entry.durationMinutes ? (
                      <span className="text-text-primary text-xs font-semibold">
                        {formatDuration(entry.durationMinutes)}
                      </span>
                    ) : (
                      <span className="text-accent-green text-xs font-mono">{formatElapsed(elapsed)}</span>
                    )}
                    <div className="text-text-muted text-[10px]">
                      {new Date(entry.startTime).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  {entry.endTime && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent-red"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-xs text-center py-3">Vaxt qeydi yoxdur</p>
          )}
        </div>
      )}
    </div>
  )
}
