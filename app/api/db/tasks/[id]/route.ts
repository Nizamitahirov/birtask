export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { executeWorkflows } from '@/lib/workflow-engine'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('tasks').doc(params.id).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Tapşırıq tapılmadı' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { ...doc.data(), id: doc.id } })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Bilinməyən xəta' }, { status: 500 })
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

    // Read existing task BEFORE update to detect changes
    const prevDoc = await ref.get()
    const prev = prevDoc.data() || {}

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
    if (data.assignee && data.assignee !== prev.assignee) {
      try {
        const userSnapshot = await adminDb.collection('users')
          .where('displayName', '==', data.assignee)
          .get()
        if (!userSnapshot.empty) {
          const assigneeUser = userSnapshot.docs[0]
          await adminDb.collection('notifications').add({
            userId: assigneeUser.id,
            type: 'task_assigned',
            title: 'Tapşırıq təyin edildi',
            message: `"${data.title || updated?.title || ''}" tapşırığı sizə təyin edildi`,
            entityId: params.id,
            entityType: 'task',
            read: false,
            createdAt: now,
            id: '',
          }).then(async r => { await r.update({ id: r.id }) })
        }
      } catch {}
    }

    // Trigger workflows — awaited so they complete before response
    const wsId = data.workspaceId || updated?.workspaceId || prev.workspaceId || ''
    if (wsId) {
      const payload = {
        taskId:    params.id,
        taskTitle: data.title     || updated?.title    || '',
        title:     data.title     || updated?.title    || '',
        assignee:  data.assignee  || updated?.assignee || '',
        projectId: data.projectId || updated?.projectId || '',
        priority:  data.priority  || updated?.priority  || '',
        status:    data.status    || updated?.status    || '',
        dueDate:   data.dueDate   || updated?.dueDate   || '',
      }

      const triggers: string[] = ['task_updated']
      if (data.status === 'Tamamlandı')                                triggers.push('task_completed')
      if (data.assignee  !== undefined && data.assignee  !== prev.assignee)  triggers.push('task_assigned', 'field_assignee')
      if (data.status    !== undefined && data.status    !== prev.status)     triggers.push('field_status')
      if (data.dueDate   !== undefined && data.dueDate   !== prev.dueDate)    triggers.push('field_due_date')
      if (data.priority  !== undefined && data.priority  !== prev.priority)   triggers.push('field_priority')

      // Deduplicate and run all matching workflows
      const unique = Array.from(new Set(triggers))
      await Promise.all(unique.map(t => executeWorkflows(t, wsId, payload).catch(() => {})))
    }

    return NextResponse.json({ success: true, data: { ...updated, id: params.id } })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Bilinməyən xəta' }, { status: 500 })
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
    const wsId = taskData.workspaceId || ''
    const title = taskData.title || ''
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

    if (wsId) {
      await executeWorkflows('task_deleted', wsId, {
        taskId: params.id,
        taskTitle: title,
        title,
        assignee: taskData.assignee || '',
        projectId: taskData.projectId || '',
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Bilinməyən xəta' }, { status: 500 })
  }
}
