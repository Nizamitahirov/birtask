'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Users, Settings, ChevronLeft, ChevronRight,
  Zap, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',         label: 'İdarə Paneli', icon: LayoutDashboard },
  { href: '/projects', label: 'Layihələr',    icon: FolderKanban },
  { href: '/tasks',    label: 'Tapşırıqlar',  icon: CheckSquare },
  { href: '/team',     label: 'Komanda',      icon: Users },
  { href: '/settings', label: 'Parametrlər',  icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-bg-secondary border-r border-white/[0.06] transition-all duration-300 ease-in-out z-50',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
        collapsed && 'justify-center px-0'
      )}>
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
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                collapsed && 'justify-center px-0 mx-auto w-10 h-10'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-bg-card border border-white/10 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Google Sheets link */}
      {process.env.NEXT_PUBLIC_SHEET_URL && !collapsed && (
        <div className="p-3">
          <a
            href={process.env.NEXT_PUBLIC_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-text-secondary hover:text-text-primary transition-all text-xs group"
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
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-bg-card border border-white/[0.1] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all duration-200 shadow-card z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
