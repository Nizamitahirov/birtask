import type { PermissionKey } from './types'

export interface NavItemDef {
  href: string
  label: string
  icon: string
  /** Permission required to see this item / access this route. Undefined = always allowed. */
  perm?: PermissionKey
}

/** Primary navigation — everyday work surfaces. */
export const NAV_MAIN: NavItemDef[] = [
  { href: '/',                label: 'İdarə Paneli',      icon: 'space_dashboard' },
  { href: '/projects',        label: 'Layihələr',         icon: 'folder',          perm: 'projects.view' },
  { href: '/tasks',           label: 'Tapşırıqlar',       icon: 'check_box',       perm: 'tasks.view' },
  { href: '/calendar',        label: 'Təqvim',            icon: 'calendar_month',  perm: 'calendar.view' },
  { href: '/roadmap',         label: 'Yol Xəritəsi',      icon: 'route',           perm: 'roadmap.view' },
  { href: '/recurring',       label: 'Təkrarlanan',       icon: 'autorenew',       perm: 'recurring.view' },
  { href: '/analytics',       label: 'Analitika',         icon: 'analytics',       perm: 'analytics.view' },
  { href: '/priority-matrix', label: 'Prioritet Matrisi', icon: 'grid_view',       perm: 'tasks.view' },
  { href: '/orgchart',        label: 'Org Chart',         icon: 'account_tree',    perm: 'team.view' },
  { href: '/adhoc',           label: 'Ad hoc',            icon: 'co_present',       perm: 'tasks.view' },
]

/** Administrative navigation — management surfaces. */
export const NAV_ADMIN: NavItemDef[] = [
  { href: '/team',     label: 'Komanda',     icon: 'groups',   perm: 'team.view' },
  { href: '/activity', label: 'Aktivlik',    icon: 'bolt',     perm: 'activity.view' },
  { href: '/settings', label: 'Parametrlər', icon: 'settings', perm: 'settings.view' },
]

const ALL_NAV = [...NAV_MAIN, ...NAV_ADMIN]

/**
 * Resolve the permission required to access a given pathname.
 * Uses the longest-prefix match so e.g. `/projects/123` maps to `/projects`.
 * Returns null when the route has no permission requirement (always allowed).
 */
export function requiredPermissionForPath(pathname: string): PermissionKey | null {
  const match = ALL_NAV
    .filter(i => i.href !== '/' && (pathname === i.href || pathname.startsWith(i.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.perm ?? null
}
