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

    // Trigger workflow engine for various task update events
    {
      const wsId = data.workspaceId || updated?.workspaceId || ''
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      if (wsId) {
        const taskId = params.id
        const taskTitle = data.title || updated?.title || ''
        const assignee = data.assignee || updated?.assignee || ''
        const prevStatus = updated?.status || ''
        const prevAssignee = updated?.assignee || ''
        const prevDueDate = updated?.dueDate || ''
        const prevPriority = updated?.priority || ''

        const triggerPayload = {
          taskId,
          taskTitle,
          assignee,
          projectId: data.projectId || updated?.projectId || '',
          priority: data.priority || updated?.priority || '',
          status: data.status || updated?.status || '',
          dueDate: data.dueDate || updated?.dueDate || '',
        }

        const fire = (triggerType: string) => {
          fetch(`${baseUrl}/api/workflows/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triggerType, workspaceId: wsId, data: triggerPayload }),
          }).catch(() => {})
        }

        // Always fire task_updated
        fire('task_updated')

        // Specific event triggers
        if (data.status === 'Tamamlandı') fire('task_completed')
        if (data.assignee && data.assignee !== prevAssignee) fire('task_assigned')

        // Field-level triggers
        if (data.status && data.status !== prevStatus) fire('field_status')
        if (data.dueDate && data.dueDate !== prevDueDate) fire('field_due_date')
        if (data.assignee && data.assignee !== prevAssignee) fire('field_assignee')
        if (data.priority && data.priority !== prevPriority) fire('field_priority')
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
    const taskData = doc.data() || {}
    const title = taskData.title || ''
    const wsId = taskData.workspaceId || ''
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

    // Trigger workflow engine for task_deleted
    if (wsId) {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      fetch(`${baseUrl}/api/workflows/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: 'task_deleted',
          workspaceId: wsId,
          data: { taskId: params.id, taskTitle: title, assignee: taskData.assignee || '', projectId: taskData.projectId || '' },
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
