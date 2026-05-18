'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { db } from '@/lib/db'
import { Notification } from '@/lib/types'
import {
  Bell, MessageSquare, Plus, CheckCheck, X,
  FolderKanban, CheckSquare, Clock, AlertTriangle,
  Circle, CheckCircle, Zap, FolderPlus, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// ── Page meta ─────────────────────────────────────────────────────────────────

const PAGE_META: { path: string; label: string; icon: string }[] = [
  { path: '/projects',  label: 'Layihələr',     icon: 'folder' },
  { path: '/tasks',     label: 'Tapşırıqlar',   icon: 'check_box' },
  { path: '/calendar',  label: 'Təqvim',        icon: 'calendar_month' },
  { path: '/roadmap',   label: 'Yol Xəritəsi',  icon: 'route' },
  { path: '/recurring', label: 'Təkrarlanan',   icon: 'autorenew' },
  { path: '/analytics', label: 'Analitika',     icon: 'analytics' },
  { path: '/team',      label: 'Komanda',       icon: 'groups' },
  { path: '/activity',  label: 'Aktivlik',      icon: 'bolt' },
  { path: '/settings',        label: 'Parametrlər',      icon: 'settings' },
  { path: '/priority-matrix', label: 'Prioritet Matrisi', icon: 'grid_view' },
  { path: '/',                label: 'İdarə Paneli',      icon: 'space_dashboard' },
]

function usePageMeta(pathname: string) {
  return PAGE_META.find(p => p.path === '/' ? pathname === '/' : pathname.startsWith(p.path))
    ?? PAGE_META[PAGE_META.length - 1]
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'İndicə'
  if (s < 3600) return `${Math.floor(s / 60)} dəq əvvəl`
  if (s < 86400) return `${Math.floor(s / 3600)} saat əvvəl`
  return `${Math.floor(s / 86400)} gün əvvəl`
}

// ── Notification icon ─────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: Notification['type'] }) {
  const cls = 'flex-shrink-0'
  switch (type) {
    case 'task_assigned':   return <CheckSquare   size={13} className={cls} style={{ color: '#4DABF7' }} />
    case 'comment_added':   return <MessageSquare size={13} className={cls} style={{ color: '#8B5CF6' }} />
    case 'project_updated': return <FolderKanban  size={13} className={cls} style={{ color: '#06B6D4' }} />
    case 'task_due_soon':   return <Clock         size={13} className={cls} style={{ color: '#F59E0B' }} />
    case 'task_overdue':    return <AlertTriangle size={13} className={cls} style={{ color: '#EF4444' }} />
    default:                return <Bell          size={13} className={cls} style={{ color: 'var(--muted)' }} />
  }
}

// ── Notification panel ────────────────────────────────────────────────────────

function NotificationPanel({
  notifications, loading, filter, setFilter,
  onMarkRead, onMarkUnread, onMarkAll, onClose,
}: {
  notifications: Notification[]
  loading: boolean
  filter: 'all' | 'unread'
  setFilter: (f: 'all' | 'unread') => void
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onMarkAll: () => void
  onClose: () => void
}) {
  const visible = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{
      width: 360,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 16px 48px rgba(15,17,41,0.18)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} style={{ color: 'var(--ink)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Bildirişlər</span>
            {unreadCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#EF4444',
                background: 'rgba(239,68,68,0.12)',
                padding: '1px 7px', borderRadius: 999,
              }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: 'var(--primary)', fontWeight: 700,
                  padding: '4px 8px', borderRadius: 7,
                  background: 'var(--primary-soft)', border: 'none', cursor: 'pointer',
                }}
              >
                <CheckCheck size={11} /> Hamısını oxu
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 26, height: 26, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
                color: 'var(--muted)',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: -1 }}>
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px',
                fontSize: 12, fontWeight: 700,
                border: 'none', background: 'none', cursor: 'pointer',
                color: filter === f ? 'var(--primary)' : 'var(--muted)',
                borderBottom: `2px solid ${filter === f ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'all .12s',
              }}
            >
              {f === 'all' ? 'Hamısı' : `Oxunmamış${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, animation: 'pulse 1.5s infinite' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 11, width: '60%', borderRadius: 6, background: 'var(--surface-2)' }} />
                  <div style={{ height: 11, width: '80%', borderRadius: 6, background: 'var(--surface-3)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Bell size={28} style={{ margin: '0 auto 10px', color: 'var(--muted)', opacity: 0.25, display: 'block' }} />
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, fontWeight: 600 }}>
              {filter === 'unread' ? 'Oxunmamış bildiriş yoxdur' : 'Bildiriş yoxdur'}
            </p>
          </div>
        ) : (
          visible.map(n => (
            <NotifRow
              key={n.id}
              n={n}
              onMarkRead={() => onMarkRead(n.id)}
              onMarkUnread={() => onMarkUnread(n.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {notifications.length} bildiriş · {unreadCount} oxunmamış
          </span>
        </div>
      )}
    </div>
  )
}

function NotifRow({
  n, onMarkRead, onMarkUnread,
}: {
  n: Notification
  onMarkRead: () => void
  onMarkUnread: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 10, padding: '11px 16px',
        background: !n.read
          ? 'rgba(91,91,245,0.04)'
          : hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background .1s',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border-2)',
        position: 'relative',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <NotifIcon type={n.type} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: n.read ? 600 : 700,
            color: n.read ? 'var(--ink-2)' : 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {n.title}
          </span>
          {!n.read && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--primary)', flexShrink: 0,
            }} />
          )}
        </div>
        <p style={{
          fontSize: 11, color: 'var(--muted)', margin: '2px 0 3px',
          lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {n.message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>{relTime(n.createdAt)}</span>
          {hovered && (
            <button
              onClick={n.read ? onMarkUnread : onMarkRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                color: n.read ? 'var(--muted)' : 'var(--primary)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {n.read
                ? <><Circle size={10} /> Oxunmamış et</>
                : <><CheckCircle size={10} /> Oxundu işarələ</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Notification button ───────────────────────────────────────────────────────

function NotificationButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => { setMounted(true) }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const res = await db.notifications.getAll(user.id)
    if (res.success && res.data) setNotifications(res.data)
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchNotifications().finally(() => setLoading(false))
    const id = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(id)
  }, [user, fetchNotifications])

  useEffect(() => {
    if (!open) return
    fetchNotifications()
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
  }, [open, fetchNotifications])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !n.read).length

  const handleMarkRead = async (id: string) => {
    const res = await db.notifications.markRead(id)
    if (res.success) setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkUnread = async (id: string) => {
    // Optimistic — no API for unread yet, just local
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
  }

  const handleMarkAll = async () => {
    if (!user) return
    setMarkingAll(true)
    const res = await db.notifications.markAllRead(user.id)
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('Hamısı oxundu işarələndi')
    } else toast.error(res.error || 'Xəta')
    setMarkingAll(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        onClick={() => setOpen(v => !v)}
        title="Bildirişlər"
        style={{ background: open ? 'var(--primary-soft)' : undefined }}
      >
        <Bell size={16} />
        {unread > 0 && <span className="pip" />}
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
          }}
        >
          <NotificationPanel
            notifications={notifications}
            loading={loading || markingAll}
            filter={filter}
            setFilter={setFilter}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onMarkAll={handleMarkAll}
            onClose={() => setOpen(false)}
          />
        </div>,
        document.body
      )}
    </>
  )
}

// ── Messages button ───────────────────────────────────────────────────────────

function MessagesButton() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        onClick={() => setOpen(v => !v)}
        title="Mesajlar"
        style={{ background: open ? 'var(--primary-soft)' : undefined }}
      >
        <MessageSquare size={16} />
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            width: 300,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(15,17,41,0.18)',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--primary-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <MessageSquare size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>
            Mesajlar
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Bu funksionallıq tezliklə istifadəyə veriləcək.
          </p>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: '100%', padding: '9px 16px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer',
            }}
          >
            Bağla
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

// ── Quick-create dropdown ─────────────────────────────────────────────────────

const CREATE_ITEMS = [
  { icon: CheckSquare, label: 'Tapşırıq yarat',   href: '/tasks',    color: '#8B5CF6', event: 'birtask:new-task' },
  { icon: FolderPlus,  label: 'Layihə yarat',      href: '/projects', color: '#0EA5E9', event: 'birtask:new-project' },
  { icon: UserPlus,    label: 'Üzv dəvət et',      href: '/team',     color: '#10B981', event: 'birtask:new-member' },
  { icon: Zap,         label: 'Workflow yarat',    href: '/settings', color: '#F59E0B', event: 'birtask:new-workflow' },
]

function QuickCreateButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleItem = (item: typeof CREATE_ITEMS[0]) => {
    setOpen(false)
    router.push(item.href)
    // Slight delay so the page mounts before we dispatch the event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(item.event))
    }, 120)
  }

  return (
    <>
      <button
        ref={btnRef}
        className="btn-primaryM"
        onClick={() => setOpen(v => !v)}
        style={{ gap: 6 }}
      >
        <Plus size={15} strokeWidth={2.5} />
        Yeni
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
            width: 220,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(15,17,41,0.18)',
            padding: 6,
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)' }}>
            Tez yaratma
          </div>
          {CREATE_ITEMS.map(item => (
            <button
              key={item.event}
              onClick={() => handleItem(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 10px', borderRadius: 9,
                border: 'none', background: 'none', cursor: 'pointer',
                textAlign: 'left', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: item.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar() {
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspace()
  const meta = usePageMeta(pathname)
  const wsName = currentWorkspace?.name || 'İş sahəsi'

  const openSearch = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
  }

  return (
    <div className="topM">
      {/* Breadcrumb */}
      <div className="crumbM">
        <div className="home">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            {meta.icon}
          </span>
        </div>
        <span>{wsName}</span>
        <span className="sep">/</span>
        <b>{meta.label}</b>
      </div>

      {/* Search bar — opens GlobalSearch via Ctrl+K */}
      <div className="searchM" onClick={openSearch} style={{ cursor: 'pointer' }}>
        <span className="ico material-symbols-rounded" style={{ fontSize: 16, userSelect: 'none' }}>
          search
        </span>
        <input
          placeholder="Layihə, tapşırıq, üzv axtar..."
          readOnly
          style={{ cursor: 'pointer', userSelect: 'none' }}
        />
        <span className="kbd">⌘ K</span>
      </div>

      {/* Right actions */}
      <div className="topM-right">
        <NotificationButton />
        <MessagesButton />
        <QuickCreateButton />
      </div>
    </div>
  )
}
