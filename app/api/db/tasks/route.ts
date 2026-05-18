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

    // Create notification for assignee if task has one
    if (data.assignee) {
      try {
        const userSnapshot = await adminDb.collection('users')
          .where('displayName', '==', data.assignee)
          .get()
        if (!userSnapshot.empty) {
          const assigneeUser = userSnapshot.docs[0]
          await adminDb.collection('notifications').add({
            userId: assigneeUser.id,
            type: 'task_assigned',
            title: 'Yeni tapşırıq',
            message: `"${data.title}" tapşırığı sizə təyin edildi`,
            entityId: docRef.id,
            entityType: 'task',
            read: false,
            createdAt: now,
            id: '',
          }).then(async ref => { await ref.update({ id: ref.id }) })
        }
      } catch {}
    }

    // Trigger workflow emails for task_created
    const wsId = data.workspaceId || ''
    if (wsId) {
      fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'task_created',
          workspaceId: wsId,
          data: { taskTitle: data.title || '', assignee: data.assignee || '' }
        })
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
