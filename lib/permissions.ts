import type { PermissionKey } from './types'

export interface PermissionDef {
  key: PermissionKey
  label: string
  description: string
  implies?: PermissionKey[]
}

export interface PermissionGroupDef {
  key: string
  label: string
  icon: string
  color: string
  permissions: PermissionDef[]
}

export const PERMISSION_GROUPS: PermissionGroupDef[] = [
  {
    key: 'projects', label: 'Layihələr', icon: 'folder', color: '#5B5BF5',
    permissions: [
      { key: 'projects.view',   label: 'Görüntülə',  description: 'Layihə siyahısına baxış' },
      { key: 'projects.create', label: 'Yarat',       description: 'Yeni layihə əlavə et',           implies: ['projects.view'] },
      { key: 'projects.edit',   label: 'Redaktə et',  description: 'Mövcud layihəni düzəlt',         implies: ['projects.view'] },
      { key: 'projects.delete', label: 'Sil',         description: 'Layihəni kalıcı olaraq sil',      implies: ['projects.view', 'projects.edit'] },
    ],
  },
  {
    key: 'tasks', label: 'Tapşırıqlar', icon: 'check_box', color: '#10B981',
    permissions: [
      { key: 'tasks.view',     label: 'Görüntülə',  description: 'Tapşırıq siyahısına baxış' },
      { key: 'tasks.create',   label: 'Yarat',       description: 'Yeni tapşırıq əlavə et',         implies: ['tasks.view'] },
      { key: 'tasks.edit',     label: 'Redaktə et',  description: 'Tapşırığı düzəlt',               implies: ['tasks.view'] },
      { key: 'tasks.assign',   label: 'Assign et',   description: 'Tapşırığı üzvə təyin et',        implies: ['tasks.view', 'tasks.edit'] },
      { key: 'tasks.complete', label: 'Tamamla',     description: 'Tapşırığı tamamlandı işarələ',   implies: ['tasks.view'] },
      { key: 'tasks.delete',   label: 'Sil',         description: 'Tapşırığı sildir',               implies: ['tasks.view', 'tasks.edit'] },
    ],
  },
  {
    key: 'team', label: 'Komanda', icon: 'groups', color: '#F59E0B',
    permissions: [
      { key: 'team.view',   label: 'Görüntülə',  description: 'Komanda üzvlərini gör' },
      { key: 'team.invite', label: 'Dəvət et',   description: 'Yeni üzv əlavə et',            implies: ['team.view'] },
      { key: 'team.edit',   label: 'Redaktə et', description: 'Üzv məlumatlarını düzəlt',     implies: ['team.view'] },
      { key: 'team.remove', label: 'Çıxar',      description: 'Üzvü komandadan çıxar',        implies: ['team.view', 'team.edit'] },
    ],
  },
  {
    key: 'analytics', label: 'Analitika', icon: 'analytics', color: '#8B5CF6',
    permissions: [
      { key: 'analytics.view', label: 'Baxış',    description: 'Analitika səhifəsinə baxış' },
      { key: 'reports.export', label: 'İxrac et', description: 'Hesabatları Excel/CSV ilə ixrac et', implies: ['analytics.view'] },
    ],
  },
  {
    key: 'time', label: 'Vaxt İzləmə', icon: 'schedule', color: '#06B6D4',
    permissions: [
      { key: 'time.view',   label: 'Görüntülə', description: 'Vaxt qeydlərinə baxış' },
      { key: 'time.log',    label: 'Qeyd et',   description: 'Öz vaxt qeydini əlavə et', implies: ['time.view'] },
      { key: 'time.manage', label: 'İdarə et',  description: 'Bütün vaxt qeydlərini idarə et', implies: ['time.view', 'time.log'] },
    ],
  },
  {
    key: 'workflows', label: 'İş Axınları', icon: 'bolt', color: '#EC4899',
    permissions: [
      { key: 'workflows.view',   label: 'Görüntülə', description: 'İş axınlarına baxış' },
      { key: 'workflows.manage', label: 'İdarə et',  description: 'İş axınlarını yarat/düzəlt/sil', implies: ['workflows.view'] },
    ],
  },
  {
    key: 'views', label: 'Görünüşlər', icon: 'grid_view', color: '#64748B',
    permissions: [
      { key: 'activity.view',   label: 'Aktivlik',          description: 'Aktivlik tarixçəsinə baxış' },
      { key: 'calendar.view',   label: 'Təqvim',            description: 'Təqvim görünüşünə baxış' },
      { key: 'roadmap.view',    label: 'Yol xəritəsi',      description: 'Yol xəritəsinə baxış' },
      { key: 'recurring.view',  label: 'Təkrarlanan',       description: 'Təkrarlanan tapşırıqlara baxış' },
      { key: 'recurring.manage',label: 'Təkrarlananı idarə et', description: 'Şablonları yarat/düzəlt/sil', implies: ['recurring.view'] },
    ],
  },
  {
    key: 'settings', label: 'Parametrlər', icon: 'settings', color: '#EF4444',
    permissions: [
      { key: 'settings.view',      label: 'Görüntülə',      description: 'Parametrlər səhifəsinə baxış' },
      { key: 'settings.workspace', label: 'İş sahəsi',      description: 'İş sahəsi parametrlərini idarə et', implies: ['settings.view'] },
      { key: 'settings.users',     label: 'İstifadəçilər',  description: 'İstifadəçiləri idarə et',          implies: ['settings.view'] },
      { key: 'settings.roles',     label: 'Rollər',         description: 'Rolları və icazələri idarə et',    implies: ['settings.view', 'settings.users'] },
    ],
  },
]

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key)) as PermissionKey[]

/** Expand a permission set to include all implied permissions (transitive closure) */
export function resolveImplied(permissions: PermissionKey[]): PermissionKey[] {
  const set = new Set(permissions)
  let changed = true
  while (changed) {
    changed = false
    for (const g of PERMISSION_GROUPS) {
      for (const p of g.permissions) {
        if (set.has(p.key) && p.implies) {
          for (const implied of p.implies) {
            if (!set.has(implied)) { set.add(implied); changed = true }
          }
        }
      }
    }
  }
  return Array.from(set)
}

/** Returns the set of permissions that are implied BY other active permissions (not directly checked) */
export function getImpliedBy(active: Set<PermissionKey>): Map<PermissionKey, PermissionKey[]> {
  const result = new Map<PermissionKey, PermissionKey[]>()
  for (const g of PERMISSION_GROUPS) {
    for (const p of g.permissions) {
      if (active.has(p.key) && p.implies) {
        for (const implied of p.implies) {
          if (!result.has(implied)) result.set(implied, [])
          result.get(implied)!.push(p.key)
        }
      }
    }
  }
  return result
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: ALL_PERMISSIONS,
  manager: resolveImplied([
    'projects.view', 'projects.create', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete', 'tasks.delete',
    'team.view', 'team.invite', 'team.edit',
    'analytics.view', 'reports.export',
    'time.view', 'time.log', 'time.manage',
    'workflows.view', 'workflows.manage',
    'activity.view', 'calendar.view', 'roadmap.view', 'recurring.view', 'recurring.manage',
    'settings.view',
  ] as PermissionKey[]),
  member: resolveImplied([
    'projects.view',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete',
    'team.view',
    'analytics.view',
    'time.view', 'time.log',
    'activity.view', 'calendar.view', 'roadmap.view', 'recurring.view',
  ] as PermissionKey[]),
  viewer: resolveImplied([
    'projects.view', 'tasks.view', 'team.view',
    'analytics.view', 'activity.view', 'calendar.view', 'roadmap.view',
  ] as PermissionKey[]),
}
