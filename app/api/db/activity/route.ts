export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('activity')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    const logs = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
    return NextResponse.json({ success: true, data: logs })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
