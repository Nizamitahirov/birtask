import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    let query: FirebaseFirestore.Query = adminDb.collection('notifications')
    if (userId) query = query.where('userId', '==', userId)
    query = query.orderBy('createdAt', 'desc')

    const snapshot = await query.get()
    const notifications = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
    return NextResponse.json({ success: true, data: notifications })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('notifications').add({
      ...data,
      read: false,
      createdAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, read: false, createdAt: now }
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
