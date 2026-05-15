export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST() {
  try {
    const [projectsSnap, tasksSnap] = await Promise.all([
      adminDb.collection('projects').get(),
      adminDb.collection('tasks').get(),
    ])

    const nameToId: Record<string, string> = {}
    const validIds = new Set<string>()
    projectsSnap.docs.forEach(doc => {
      validIds.add(doc.id)
      const name = (doc.data().name as string) || ''
      if (name) nameToId[name.toLowerCase().trim()] = doc.id
    })

    const batch = adminDb.batch()
    let relinked = 0

    tasksSnap.docs.forEach(doc => {
      const task = doc.data()
      const needsRelink = !task.projectId || !validIds.has(task.projectId as string)
      if (needsRelink && task.projectName) {
        const matchId = nameToId[(task.projectName as string).toLowerCase().trim()]
        if (matchId) {
          batch.update(doc.ref, { projectId: matchId })
          relinked++
        }
      }
    })

    await batch.commit()
    return NextResponse.json({ success: true, relinked, total: tasksSnap.size })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
