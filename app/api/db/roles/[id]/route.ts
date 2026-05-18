export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { ALL_PERMISSIONS } from '@/lib/permissions'
import type { PermissionKey } from '@/lib/types'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const ref = adminDb.collection('roles').doc(params.id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Rol tapılmadı' }, { status: 404 })
    }

    const existing = snap.data()!
    const now = new Date().toISOString()

    const update: Record<string, unknown> = { updatedAt: now }
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description
    if (data.color !== undefined) update.color = data.color

    // Always allow permission updates (even system roles can have their perms updated
    // by admins in an emergency — but isSystem flag cannot be changed)
    if (data.permissions !== undefined) {
      const validPerms = (data.permissions as string[]).filter(p =>
        (ALL_PERMISSIONS as string[]).includes(p)
      ) as PermissionKey[]
      update.permissions = validPerms
    }

    // Never allow changing isSystem
    delete update.isSystem

    await ref.update(update)
    const updated = (await ref.get()).data()
    return NextResponse.json({ success: true, data: { ...updated, id: params.id } })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ref = adminDb.collection('roles').doc(params.id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'Rol tapılmadı' }, { status: 404 })
    }
    if (snap.data()?.isSystem) {
      return NextResponse.json({ success: false, error: 'Sistem rolları silinə bilməz' }, { status: 403 })
    }
    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
