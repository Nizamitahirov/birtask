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

    type BatchUpdate = { ref: FirebaseFirestore.DocumentReference; projectId: string }
    const updates: BatchUpdate[] = []

    tasksSnap.docs.forEach(doc => {
      const task = doc.data()
      const needsRelink = !task.projectId || !validIds.has(task.projectId as string)
      if (needsRelink && task.projectName) {
        const matchId = nameToId[(task.projectName as string).toLowerCase().trim()]
        if (matchId) {
          updates.push({ ref: doc.ref, projectId: matchId })
        }
      }
    })

    // Firestore batch limit is 500 — split into chunks
    const CHUNK = 500
    for (let i = 0; i < updates.length; i += CHUNK) {
      const batch = adminDb.batch()
      updates.slice(i, i + CHUNK).forEach(u => batch.update(u.ref, { projectId: u.projectId }))
      await batch.commit()
    }

    const relinked = updates.length
    return NextResponse.json({ success: true, relinked, total: tasksSnap.size })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
