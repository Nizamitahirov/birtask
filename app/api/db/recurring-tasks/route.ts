import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    let query: FirebaseFirestore.Query = adminDb.collection('recurring-tasks')
    if (projectId) query = query.where('projectId', '==', projectId)
    query = query.orderBy('createdAt', 'desc')

    const snapshot = await query.get()
    const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    return NextResponse.json({ success: true, data: tasks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('recurring-tasks').add({
      ...data,
      createdAt: now,
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now }
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
