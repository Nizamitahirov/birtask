import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    let query: FirebaseFirestore.Query = adminDb.collection('comments')
    if (entityType) query = query.where('entityType', '==', entityType)
    if (entityId) query = query.where('entityId', '==', entityId)
    query = query.orderBy('createdAt', 'asc')

    const snapshot = await query.get()
    const comments = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
    return NextResponse.json({ success: true, data: comments })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('comments').add({
      ...data,
      createdAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now }

    await adminDb.collection('activity').add({
      action: 'comment',
      entityType: data.entityType || 'task',
      entityId: data.entityId || '',
      entityName: '',
      userId: data.userId || 'system',
      userDisplayName: data.userDisplayName || 'System',
      createdAt: now,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
