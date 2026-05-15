'use client'

import { useEffect, useState, useMemo } from 'react'
import { db } from '@/lib/db'
import { ActivityLog } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import {
  Activity, Plus, Edit2, Trash2, CheckCircle2, LogIn, LogOut,
  MessageSquare, Filter, RefreshCw, Shield, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const MONTH_NAMES_AZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

const ACTION_LABELS: Record<ActivityLog['action'], string> = {
  create:  'Yaradıldı',
  update:  'Yeniləndi',
  delete:  'Silindi',
  login:   'Daxil oldu',
  logout:  'Çıxdı',
  complete: 'Tamamlandı',
  comment: 'Şərh yazıldı',
}

const ENTITY_LABELS: Record<ActivityLog['entityType'], string> = {
  project: 'Layihə',
  task:    'Tapşırıq',
  team:    'Komanda',
  user:    'İstifadəçi',
  comment: 'Şərh',
}

const ENTITY_COLORS: Record<ActivityLog['entityType'], string> = {
  project: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20',
  task:    'text-accent-purple bg-accent-purple/10 border-accent-purple/20',
  team:    'text-accent-green bg-accent-green/10 border-accent-green/20',
  user:    'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20',
  comment: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20',
}

const ACTION_COLORS: Record<ActivityLog['action'], string> = {
  create:  'text-accent-green',
  update:  'text-accent-blue',
  delete:  'text-accent-red',
  login:   'text-accent-cyan',
  logout:  'text-text-muted',
  complete: 'text-accent-green',
  comment: 'text-accent-purple',
}

function ActionIcon({ action }: { action: ActivityLog['action'] }) {
  const cls = cn('flex-shrink-0', ACTION_COLORS[action])
  switch (action) {
    case 'create':   return <Plus size={14} className={cls} />
    case 'update':   return <Edit2 size={14} className={cls} />
    case 'delete':   return <Trash2 size={14} className={cls} />
    case 'complete': return <CheckCircle2 size={14} className={cls} />
    case 'login':    return <LogIn size={14} className={cls} />
    case 'logout':   return <LogOut size={14} className={cls} />
    case 'comment':  return <MessageSquare size={14} className={cls} />
    default:         return <Activity size={14} className={cls} />
  }
}

function getRelativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'İndi'
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün əvvəl`
  return new Date(dateStr).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ALL_ACTIONS = ['Hamısı', 'create', 'update', 'delete', 'complete', 'comment', 'login', 'logout'] as const
const ALL_ENTITY_TYPES = ['Hamısı', 'project', 'task', 'team', 'user', 'comment'] as const

export default function ActivityPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const [actionFilter, setActionFilter] = useState<string>('Hamısı')
  const [entityFilter, setEntityFilter] = useState<string>('Hamısı')

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    const res = await db.activity.getAll()
    if (res.success && res.data) setLogs(res.data)
    else toast.error(res.error || 'Aktivlik məlumatları yüklənmədi')
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  // Derive available years from logs
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    logs.forEach(l => years.add(new Date(l.createdAt).getFullYear()))
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [logs, currentYear])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const d = new Date(l.createdAt)
      const matchAction = actionFilter === 'Hamısı' || l.action === actionFilter
      const matchEntity = entityFilter === 'Hamısı' || l.entityType === entityFilter
      const matchYear = d.getFullYear() === selectedYear
      const matchMonth = selectedMonth === null || d.getMonth() === selectedMonth
      return matchAction && matchEntity && matchYear && matchMonth
    })
  }, [logs, actionFilter, entityFilter, selectedYear, selectedMonth])

  const hasFilters = actionFilter !== 'Hamısı' || entityFilter !== 'Hamısı' || selectedMonth !== null

  const resetFilters = () => {
    setActionFilter('Hamısı')
    setEntityFilter('Hamısı')
    setSelectedYear(now.getFullYear())
    setSelectedMonth(null)
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
          <Shield size={28} className="text-accent-red" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Giriş qadağandır</h2>
        <p className="text-text-secondary text-sm text-center max-w-sm">
          Bu səhifə yalnız admin üçündür. Lazımi icazəyə malik deyilsiniz.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Aktivlik Jurnalı</h1>
          <p className="text-text-secondary text-sm mt-1">
            {filtered.length} qeyd {logs.length !== filtered.length ? `(${logs.length} ümumi)` : ''}
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-secondary w-9 h-9 !p-0 justify-center self-start sm:self-auto">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-text-muted" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Filtrlər</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-accent-red hover:underline transition-all"
            >
              Filtrləri sıfırla
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Action filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="select pr-8 min-w-[140px] appearance-none"
            >
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>
                  {a === 'Hamısı' ? 'Bütün əməliyyatlar' : ACTION_LABELS[a as ActivityLog['action']]}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Entity filter */}
          <div className="relative">
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              className="select pr-8 min-w-[140px] appearance-none"
            >
              {ALL_ENTITY_TYPES.map(e => (
                <option key={e} value={e}>
                  {e === 'Hamısı' ? 'Bütün növlər' : ENTITY_LABELS[e as ActivityLog['entityType']]}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Year filter */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="select pr-8 min-w-[100px] appearance-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Month filter */}
          <div className="relative">
            <select
              value={selectedMonth ?? ''}
              onChange={e => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
              className="select pr-8 min-w-[140px] appearance-none"
            >
              <option value="">Bütün aylar</option>
              {MONTH_NAMES_AZ.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 rounded-xl animate-pulse"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
              <div className="h-3 w-20 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <Activity size={22} className="text-text-muted opacity-60" />
          </div>
          <p className="text-text-secondary text-sm font-medium">Aktivlik tapılmadı</p>
          <p className="text-text-muted text-xs">Seçilmiş filtrə uyğun qeyd yoxdur</p>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-accent-blue hover:underline mt-1">
              Filtrləri sıfırla
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map((log, i) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  'hover:bg-white/[0.02]'
                )}
              >
                {/* Action icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <ActionIcon action={log.action} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {/* Action badge */}
                    <span className={cn('text-xs font-semibold', ACTION_COLORS[log.action])}>
                      {ACTION_LABELS[log.action]}
                    </span>

                    {/* Entity type badge */}
                    <span className={cn('badge text-[10px]', ENTITY_COLORS[log.entityType])}>
                      {ENTITY_LABELS[log.entityType]}
                    </span>

                    {/* Entity name */}
                    {log.entityName && (
                      <span className="text-xs text-text-primary font-medium truncate max-w-[200px]">
                        &ldquo;{log.entityName}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">{log.userDisplayName}</span>
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <span className="opacity-70">
                        {Object.entries(log.changes).slice(0, 2).map(([key, val]) => (
                          <span key={key} className="mr-1">
                            {key}: <span className="line-through opacity-60">{String((val as { from: unknown; to: unknown }).from)}</span>
                            {' → '}
                            <span className="text-text-secondary">{String((val as { from: unknown; to: unknown }).to)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-[11px] text-text-muted whitespace-nowrap flex-shrink-0 mt-0.5" title={new Date(log.createdAt).toLocaleString('az-AZ')}>
                  {getRelativeTime(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
