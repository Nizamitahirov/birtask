'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Users, Settings, ChevronLeft, ChevronRight,
  Zap, ExternalLink, Sun, Moon, Map
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { href: '/',          label: 'İdarə Paneli', icon: LayoutDashboard },
  { href: '/projects',  label: 'Layihələr',    icon: FolderKanban },
  { href: '/tasks',     label: 'Tapşırıqlar',  icon: CheckSquare },
  { href: '/roadmap',   label: 'Yol Xəritəsi', icon: Map },
  { href: '/team',      label: 'Komanda',      icon: Users },
  { href: '/settings',  label: 'Parametrlər',  icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r transition-all duration-300 ease-in-out z-50',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
      style={{ background: 'rgb(var(--bg-secondary))', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center flex-shrink-0 shadow-glow-blue">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-text-primary text-sm tracking-wide">BirTask</span>
            <p className="text-[10px] text-text-muted">Layihə İdarəetmə</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="section-label px-2 mb-3">Menyü</p>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                active
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'text-text-secondary hover:text-text-primary',
                collapsed && 'justify-center px-0 mx-auto w-10 h-10'
              )}
              style={!active ? { ':hover': { background: 'var(--surface-2)' } } as React.CSSProperties : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" />
              )}
              {collapsed && (
                <div
                  className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
                >
                  {label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-text-secondary hover:text-text-primary w-full',
            collapsed && 'justify-center px-0 mx-auto w-10 h-10'
          )}
          style={{ background: 'var(--surface-1)' }}
        >
          {theme === 'dark'
            ? <Sun size={18} className="flex-shrink-0 text-accent-yellow" />
            : <Moon size={18} className="flex-shrink-0 text-accent-blue" />}
          {!collapsed && (
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>
      </div>

      {/* Google Sheets link */}
      {process.env.NEXT_PUBLIC_SHEET_URL && !collapsed && (
        <div className="p-3">
          <a
            href={process.env.NEXT_PUBLIC_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary transition-all text-xs group"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[8px] font-bold">G</span>
            </div>
            <span className="flex-1">Google Sheets</span>
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      )}

      {/* Collapse btn */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 z-10"
        style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
