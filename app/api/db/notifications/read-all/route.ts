import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId tələb olunur' },
        { status: 400 }
      )
    }

    const snapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get()

    const batch = adminDb.batch()
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true })
    })
    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
