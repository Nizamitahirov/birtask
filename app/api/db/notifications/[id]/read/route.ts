export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ref = adminDb.collection('notifications').doc(params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Bildiriş tapılmadı' },
        { status: 404 }
      )
    }
    await ref.update({ read: true })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
