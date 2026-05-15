import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

function computeNextDueDate(current: string, recurrence: 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(current)
  if (recurrence === 'daily') date.setDate(date.getDate() + 1)
  else if (recurrence === 'weekly') date.setDate(date.getDate() + 7)
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recurringRef = adminDb.collection('recurring-tasks').doc(params.id)
    const recurringDoc = await recurringRef.get()

    if (!recurringDoc.exists) {
      return NextResponse.json({ success: false, error: 'Şablon tapılmadı' }, { status: 404 })
    }

    const template = recurringDoc.data()!
    const now = new Date().toISOString()

    // Fetch project name
    let projectName = ''
    if (template.projectId) {
      const projectDoc = await adminDb.collection('projects').doc(template.projectId).get()
      projectName = projectDoc.data()?.name || ''
    }

    // Create task from template
    const taskData = {
      projectId: template.projectId || '',
      projectName,
      title: template.title,
      description: template.description || '',
      status: 'Gözləyir',
      priority: template.priority || 'Orta',
      assignee: template.assignee || '',
      dueDate: template.nextDueDate || now.split('T')[0],
      tags: template.tags || '',
      createdAt: now,
      updatedAt: now,
    }

    const taskRef = await adminDb.collection('tasks').add(taskData)
    await taskRef.update({ id: taskRef.id })
    const createdTask = { ...taskData, id: taskRef.id }

    // Update nextDueDate on recurring template
    const nextDueDate = computeNextDueDate(
      template.nextDueDate || now.split('T')[0],
      template.recurrence || 'weekly'
    )
    await recurringRef.update({ nextDueDate })

    // Log activity
    await adminDb.collection('activity').add({
      action: 'create',
      entityType: 'task',
      entityId: taskRef.id,
      entityName: template.title,
      userId: 'system',
      userDisplayName: 'Recurring',
      createdAt: now,
    })

    return NextResponse.json({ success: true, data: createdTask }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
