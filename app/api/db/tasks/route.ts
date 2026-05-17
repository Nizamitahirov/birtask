export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const workspaceId = searchParams.get('workspaceId')

    let query: FirebaseFirestore.Query = adminDb.collection('tasks')
    if (workspaceId) query = query.where('workspaceId', '==', workspaceId)
    else if (projectId) query = query.where('projectId', '==', projectId)

    if (projectId && workspaceId) query = query.where('projectId', '==', projectId)

    const snapshot = await query.get()
    const tasks = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return bt.localeCompare(at)
      })
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
    const docRef = await adminDb.collection('tasks').add({
      ...data,
      createdAt: now,
      updatedAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now, updatedAt: now }

    await adminDb.collection('activity').add({
      action: 'create',
      entityType: 'task',
      entityId: docRef.id,
      entityName: data.title || '',
      workspaceId: data.workspaceId || '',
      userId: 'system',
      userDisplayName: 'System',
      createdAt: now,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
