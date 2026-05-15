import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('users').doc(params.id).get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi tapılmadı' },
        { status: 404 }
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = doc.data() as Record<string, unknown>
    return NextResponse.json({ success: true, data: { ...rest, id: doc.id } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const ref = adminDb.collection('users').doc(params.id)

    // If a plain password is sent, hash it before storing
    const updateData: Record<string, unknown> = { ...data, updatedAt: now }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12)
      delete updateData.password
    }

    await ref.update(updateData)
    const updated = (await ref.get()).data() as Record<string, unknown>

    await adminDb.collection('activity').add({
      action: 'update',
      entityType: 'user',
      entityId: params.id,
      entityName: data.displayName || updated?.displayName || '',
      userId: 'system',
      userDisplayName: 'System',
      createdAt: now,
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUpdated } = updated
    return NextResponse.json({ success: true, data: { ...safeUpdated, id: params.id } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ref = adminDb.collection('users').doc(params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi tapılmadı' },
        { status: 404 }
      )
    }
    const userData = doc.data() as Record<string, unknown>
    const displayName = (userData?.displayName as string) || (userData?.username as string) || ''
    await ref.delete()
    const now = new Date().toISOString()

    await adminDb.collection('activity').add({
      action: 'delete',
      entityType: 'user',
      entityId: params.id,
      entityName: displayName,
      userId: 'system',
      userDisplayName: 'System',
      createdAt: now,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
