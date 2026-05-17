'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { db } from '@/lib/db'
import { Notification } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, CheckCheck, X, FolderKanban, CheckSquare, MessageSquare, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

function getRelativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'İndi'
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`
  return `${Math.floor(diff / 86400)} gün əvvəl`
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'task_assigned':     return <CheckSquare size={14} className="text-accent-blue" />
    case 'comment_added':     return <MessageSquare size={14} className="text-accent-purple" />
    case 'project_updated':   return <FolderKanban size={14} className="text-accent-cyan" />
    case 'task_due_soon':     return <Clock size={14} className="text-accent-yellow" />
    case 'task_overdue':      return <AlertTriangle size={14} className="text-accent-red" />
    default:                  return <Bell size={14} className="text-text-muted" />
  }
}

interface NotificationBellProps {
  collapsed?: boolean
}

export function NotificationBell({ collapsed }: NotificationBellProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const unread = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const res = await db.notifications.getAll(user.id)
    if (res.success && res.data) setNotifications(res.data)
  }, [user])

  // Initial fetch + polling every 30s
  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchNotifications().finally(() => setLoading(false))
    intervalRef.current = setInterval(fetchNotifications, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, fetchNotifications])

  // Fetch on open
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMarkRead = async (id: string) => {
    const res = await db.notifications.markRead(id)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    setMarkingAll(true)
    const res = await db.notifications.markAllRead(user.id)
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('Hamısı oxundu işarələndi')
    } else {
      toast.error(res.error || 'Xəta baş verdi')
    }
    setMarkingAll(false)
  }

  const getEntityHref = (n: Notification) =>
    n.entityType === 'project'
      ? `/projects/${n.entityId}`
      : `/projects/${n.entityId}`

  if (!user) return null

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        title="Bildirişlər"
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-text-secondary hover:text-text-primary w-full',
          open && 'bg-white/[0.06] text-text-primary',
          collapsed && 'justify-center px-0 mx-auto w-10 h-10'
        )}
        style={{ background: open ? 'var(--surface-2)' : undefined }}
      >
        <div className="relative flex-shrink-0">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className="text-sm font-medium flex-1 text-left">Bildirişlər</span>
        )}
        {!collapsed && unread > 0 && (
          <span className="ml-auto min-w-[20px] h-5 rounded-full bg-accent-red/20 text-accent-red text-[10px] font-bold flex items-center justify-center px-1.5">
            {unread}
          </span>
        )}
        {/* Collapsed tooltip */}
        {collapsed && (
          <div
            className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
          >
            Bildirişlər {unread > 0 ? `(${unread})` : ''}
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute z-[100] w-80 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            bottom: 0,
            left: 'calc(100% + 8px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(15,17,41,0.15)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Bildirişlər</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent-red/15 text-accent-red text-[10px] font-bold">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-[11px] px-2 py-1 rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-all flex items-center gap-1"
                >
                  <CheckCheck size={11} />
                  Hamısını oxu
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
                style={{ }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'var(--surface-2)' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded" style={{ background: 'var(--surface-2)' }} />
                      <div className="h-3 w-1/2 rounded" style={{ background: 'var(--surface-3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">Bildiriş yoxdur</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <Link
                    key={n.id}
                    href={getEntityHref(n)}
                    onClick={() => { handleMarkRead(n.id); setOpen(false) }}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-all group cursor-pointer',
                      !n.read
                        ? 'bg-accent-blue/[0.04] hover:bg-accent-blue/[0.07]'
                        : ''
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <NotifIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn('text-xs font-semibold truncate', n.read ? 'text-text-secondary' : 'text-text-primary')}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1 opacity-70">
                        {getRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2 border-t text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[11px] text-text-muted">
                {notifications.length} bildiriş · {unread} oxunmamış
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
