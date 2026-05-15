export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { projects = [], tasks = [], team = [] } = await req.json()
    const now = new Date().toISOString()
    const imported = { projects: 0, tasks: 0, team: 0 }

    const batch1 = adminDb.batch()
    for (const p of projects) {
      const ref = p.id ? adminDb.collection('projects').doc(p.id) : adminDb.collection('projects').doc()
      batch1.set(ref, { ...p, id: ref.id, createdAt: p.createdAt || now }, { merge: true })
      imported.projects++
    }
    await batch1.commit()

    const batch2 = adminDb.batch()
    for (const t of tasks) {
      const ref = t.id ? adminDb.collection('tasks').doc(t.id) : adminDb.collection('tasks').doc()
      batch2.set(ref, { ...t, id: ref.id, createdAt: t.createdAt || now, updatedAt: t.updatedAt || now }, { merge: true })
      imported.tasks++
    }
    await batch2.commit()

    const batch3 = adminDb.batch()
    for (const m of team) {
      const ref = m.id ? adminDb.collection('team').doc(m.id) : adminDb.collection('team').doc()
      batch3.set(ref, { ...m, id: ref.id, createdAt: m.createdAt || now }, { merge: true })
      imported.team++
    }
    await batch3.commit()

    // Re-link tasks to projects by matching projectName → projectId
    const projectsSnap = await adminDb.collection('projects').get()
    const nameToId: Record<string, string> = {}
    const validIds = new Set<string>()
    projectsSnap.docs.forEach(doc => {
      validIds.add(doc.id)
      const name = (doc.data().name as string) || ''
      if (name) nameToId[name.toLowerCase().trim()] = doc.id
    })

    const tasksSnap = await adminDb.collection('tasks').get()
    const relinkBatch = adminDb.batch()
    let relinked = 0
    tasksSnap.docs.forEach(doc => {
      const task = doc.data()
      const needsRelink = !task.projectId || !validIds.has(task.projectId as string)
      if (needsRelink && task.projectName) {
        const matchId = nameToId[(task.projectName as string).toLowerCase().trim()]
        if (matchId) {
          relinkBatch.update(doc.ref, { projectId: matchId })
          relinked++
        }
      }
    })
    await relinkBatch.commit()

    return NextResponse.json({ success: true, imported, relinked })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
