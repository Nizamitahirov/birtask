import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { adminDb } from './firebase-admin'
import { effectivePermissions } from './permissions'
import type { PermissionKey } from './types'

const COOKIE_NAME = 'birtask_token'
const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export interface AuthedUser {
  id: string
  username: string
  role: string
  displayName: string
  workspaceIds?: string[]
  projectIds?: string[]
}

/** Verify the auth cookie and load the fresh, active user record. Null if unauthenticated/inactive. */
export async function getAuthUser(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  let payload: { userId: string }
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }

  const doc = await adminDb.collection('users').doc(payload.userId).get()
  if (!doc.exists) return null
  const d = doc.data() as Record<string, unknown>
  if (!d.isActive) return null

  return {
    id: doc.id,
    username: d.username as string,
    role: d.role as string,
    displayName: d.displayName as string,
    workspaceIds: (d.workspaceIds as string[]) || undefined,
    projectIds: (d.projectIds as string[]) || undefined,
  }
}

/**
 * Resolve the user's effective permission set. When a workspace is known the
 * (admin-customisable) role document for that workspace is used; otherwise we
 * fall back to the user's first workspace, then to the built-in defaults.
 */
export async function getUserPermissions(
  user: AuthedUser,
  workspaceId?: string | null
): Promise<Set<PermissionKey>> {
  if (user.role === 'admin') return new Set(effectivePermissions('admin'))

  const wsId = workspaceId || user.workspaceIds?.[0] || null
  let roleDoc: { permissions?: PermissionKey[] } | null = null
  if (wsId) {
    try {
      const snap = await adminDb.collection('roles').doc(`${wsId}-${user.role}`).get()
      if (snap.exists) roleDoc = snap.data() as { permissions?: PermissionKey[] }
    } catch {
      // fall through to defaults
    }
  }
  return new Set(effectivePermissions(user.role, roleDoc))
}

type GateResult = { user: AuthedUser; error?: never } | { user?: never; error: NextResponse }

/**
 * Guard an API route handler. Returns `{ user }` when allowed, or `{ error }`
 * (a ready-to-return 401/403 response) when not. Pass `workspaceId` (from the
 * parsed body or query) so admin-customised role permissions are honoured.
 *
 *   const gate = await requirePermission(req, 'settings.users', { workspaceId })
 *   if (gate.error) return gate.error
 *   // ...gate.user is the authenticated, authorised user
 */
export async function requirePermission(
  req: NextRequest,
  perm: PermissionKey,
  opts?: { workspaceId?: string | null }
): Promise<GateResult> {
  const user = await getAuthUser(req)
  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Giriş edilməyib' }, { status: 401 }) }
  }
  const perms = await getUserPermissions(user, opts?.workspaceId)
  if (!perms.has(perm)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Bu əməliyyat üçün icazəniz yoxdur' },
        { status: 403 }
      ),
    }
  }
  return { user }
}
