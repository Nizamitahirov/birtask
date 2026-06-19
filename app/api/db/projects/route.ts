export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    let query: FirebaseFirestore.Query = adminDb.collection('projects')
    if (workspaceId) query = query.where('workspaceId', '==', workspaceId)

    const snapshot = await query.get()
    let projects = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return bt.localeCompare(at)
      })

    // Per-user filtering for member/viewer roles
    const token = req.cookies.get('birtask_token')?.value
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
        if (['member', 'viewer'].includes(payload.role)) {
          const userDoc = await adminDb.collection('users').doc(payload.userId).get()
          const userData = userDoc.data()
          const allowedIds = new Set<string>(userData?.projectIds || [])
          const memberId: string | undefined = userData?.memberId

          // Auto-discover projects via team member task assignments
          if (memberId) {
            const memberDoc = await adminDb.collection('team').doc(memberId).get()
            const memberName = memberDoc.data()?.name as string | undefined
            if (memberName && workspaceId) {
              const tasksSnap = await adminDb.collection('tasks')
                .where('workspaceId', '==', workspaceId)
                .where('assignee', '==', memberName)
                .get()
              tasksSnap.docs.forEach(d => {
                const pid = (d.data() as { projectId?: string }).projectId
                if (pid) allowedIds.add(pid)
              })
            }
          }

          // Only filter if restrictions are configured
          if (userData?.projectIds !== undefined || memberId !== undefined) {
            projects = projects.filter((p: { id?: string }) => allowedIds.has(p.id || ''))
          }
        }
      } catch {
        // Invalid or missing token — no filtering
      }
    }

    return NextResponse.json({ success: true, data: projects })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('projects').add({
      ...data,
      createdAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now }

    await adminDb.collection('activity').add({
      action: 'create',
      entityType: 'project',
      entityId: docRef.id,
      entityName: data.name || '',
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
