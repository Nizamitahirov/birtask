import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ref = adminDb.collection('comments').doc(params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Şərh tapılmadı' },
        { status: 404 }
      )
    }
    await ref.delete()
    const now = new Date().toISOString()

    await adminDb.collection('activity').add({
      action: 'delete',
      entityType: 'comment',
      entityId: params.id,
      entityName: '',
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
