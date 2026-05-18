export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('tasks').doc(params.id).get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Tapşırıq tapılmadı' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, data: { ...doc.data(), id: doc.id } })
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
    const ref = adminDb.collection('tasks').doc(params.id)
    await ref.update({ ...data, updatedAt: now })
    const updated = (await ref.get()).data()

    await adminDb.collection('activity').add({
      action: 'update',
      entityType: 'task',
      entityId: params.id,
      entityName: data.title || updated?.title || '',
      userId: 'system',
      userDisplayName: 'System',
      createdAt: now,
    })

    // Notify new assignee on reassignment
    if (data.assignee) {
      try {
        const userSnapshot = await adminDb.collection('users')
          .where('displayName', '==', data.assignee)
          .get()
        if (!userSnapshot.empty) {
          const assigneeUser = userSnapshot.docs[0]
          const taskTitle = data.title || updated?.title || ''
          await adminDb.collection('notifications').add({
            userId: assigneeUser.id,
            type: 'task_assigned',
            title: 'Tapşırıq yeniləndi',
            message: `"${taskTitle}" tapşırığı sizin üçün yeniləndi`,
            entityId: params.id,
            entityType: 'task',
            read: false,
            createdAt: now,
            id: '',
          }).then(async ref => { await ref.update({ id: ref.id }) })
        }
      } catch {}
    }

    // Trigger workflow emails for task_completed
    if (data.status === 'Tamamlandı' || data.status === 'completed') {
      const wsId = data.workspaceId || updated?.workspaceId || ''
      if (wsId) {
        fetch(`${process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger: 'task_completed',
            workspaceId: wsId,
            data: { taskTitle: data.title || updated?.title || '', assignee: data.assignee || updated?.assignee || '', status: 'Tamamlandı' }
          })
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, data: { ...updated, id: params.id } })
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
    const ref = adminDb.collection('tasks').doc(params.id)
    const doc = await ref.get()
    const title = doc.data()?.title || ''
    await ref.delete()
    const now = new Date().toISOString()

    await adminDb.collection('activity').add({
      action: 'delete',
      entityType: 'task',
      entityId: params.id,
      entityName: title,
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
