export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { name, color, ownerId } = await req.json()
    const now = new Date().toISOString()

    // Create default workspace
    const wsRef = await adminDb.collection('workspaces').add({
      name: name || 'Ana İş Sahəsi',
      description: 'Əsas iş sahəsi',
      color: color || '#5B5BF5',
      ownerId: ownerId || '',
      memberIds: [],
      createdAt: now,
      updatedAt: now,
      id: '',
    })
    await wsRef.update({ id: wsRef.id })
    const workspaceId = wsRef.id

    // Migrate all orphaned data to this workspace (batch chunks of 500)
    const collections = ['projects', 'tasks', 'team', 'activity', 'time-entries', 'recurring-tasks']
    let migrated = 0

    for (const col of collections) {
      const snap = await adminDb.collection(col).get()
      const orphans = snap.docs.filter(doc => !doc.data().workspaceId)
      const CHUNK = 400
      for (let i = 0; i < orphans.length; i += CHUNK) {
        const batch = adminDb.batch()
        orphans.slice(i, i + CHUNK).forEach(doc => batch.update(doc.ref, { workspaceId }))
        await batch.commit()
        migrated += Math.min(CHUNK, orphans.length - i)
      }
    }

    return NextResponse.json({ success: true, workspaceId, migrated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
