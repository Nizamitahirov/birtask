'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { db } from '@/lib/db'
import { useAuth } from './AuthContext'
import { useWorkspace } from './WorkspaceContext'
import { effectivePermissions } from '@/lib/permissions'
import type { PermissionKey, Role } from '@/lib/types'

interface PermissionsContextValue {
  /** The current user's resolved permission set for the active workspace. */
  permissions: Set<PermissionKey>
  /** True once the role data for the current workspace has loaded. */
  ready: boolean
  /** Check a single permission. Undefined/null = always allowed. */
  can: (perm?: PermissionKey | null) => boolean
  /** True if the user has ANY of the given permissions. */
  canAny: (perms: PermissionKey[]) => boolean
  /** True if the user has ALL of the given permissions. */
  canAll: (perms: PermissionKey[]) => boolean
  /** Re-fetch role definitions (e.g. after editing roles). */
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currentWorkspaceId } = useWorkspace()
  const [roles, setRoles] = useState<Role[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !currentWorkspaceId) {
      setRoles([])
      setReady(false)
      return
    }
    setReady(false)
    try {
      const res = await db.roles.getAll(currentWorkspaceId)
      setRoles(res.success && res.data ? res.data : [])
    } catch {
      setRoles([])
    } finally {
      setReady(true)
    }
  }, [user, currentWorkspaceId])

  useEffect(() => { refresh() }, [refresh])

  const permissions = useMemo<Set<PermissionKey>>(() => {
    if (!user) return new Set()
    if (user.role === 'admin') return new Set(effectivePermissions('admin'))
    // Match the role document for this workspace (system roles use a
    // deterministic `${workspaceId}-${roleKey}` id), falling back to name match.
    const roleDoc =
      roles.find((r: Role) => r.id === `${currentWorkspaceId}-${user.role}`) ||
      roles.find((r: Role) => r.name?.toLowerCase() === user.role?.toLowerCase()) ||
      null
    return new Set(effectivePermissions(user.role, roleDoc))
  }, [user, roles, currentWorkspaceId])

  const can = useCallback(
    (perm?: PermissionKey | null) => {
      if (!perm) return true
      if (user?.role === 'admin') return true
      return permissions.has(perm)
    },
    [permissions, user]
  )

  const canAny = useCallback(
    (perms: PermissionKey[]) => perms.some(p => can(p)),
    [can]
  )

  const canAll = useCallback(
    (perms: PermissionKey[]) => perms.every(p => can(p)),
    [can]
  )

  return (
    <PermissionsContext.Provider value={{ permissions, ready, can, canAny, canAll, refresh }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider')
  return ctx
}
