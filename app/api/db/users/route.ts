export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requirePermission } from '@/lib/auth-server'
import bcrypt from 'bcryptjs'

function omitPassword(data: Record<string, unknown>) {
  const safe = { ...data }
  delete safe.passwordHash
  delete safe.password
  return safe
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection('users').get()
    const users = snapshot.docs
      .map((doc) => omitPassword({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return bt.localeCompare(at)
      })
    return NextResponse.json({ success: true, data: users })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const gate = await requirePermission(req, 'settings.users', { workspaceId: data.workspaceIds?.[0] })
    if (gate.error) return gate.error
    const now = new Date().toISOString()

    let passwordHash = data.passwordHash
    if (data.password && !data.passwordHash) {
      passwordHash = await bcrypt.hash(data.password, 12)
    }

    const docData = omitPassword({ ...data, passwordHash, createdAt: now, updatedAt: now, isActive: data.isActive ?? true, mustChangePassword: data.mustChangePassword ?? false, id: '' })

    const docRef = await adminDb.collection('users').add({ ...docData, passwordHash })
    await docRef.update({ id: docRef.id })

    await adminDb.collection('activity').add({
      action: 'create', entityType: 'user', entityId: docRef.id,
      entityName: data.displayName || data.username || '',
      userId: 'system', userDisplayName: 'System', createdAt: now,
    })

    return NextResponse.json({ success: true, data: { ...omitPassword(docData), id: docRef.id } }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
