export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requirePermission } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ success: false, error: 'workspaceId tələb olunur' }, { status: 400 })

    const snapshot = await adminDb.collection('workspaceMembers')
      .where('workspaceId', '==', workspaceId)
      .get()
    const members = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    return NextResponse.json({ success: true, data: members })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const gate = await requirePermission(req, 'settings.workspace', { workspaceId: data.workspaceId })
    if (gate.error) return gate.error
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('workspaceMembers').add({
      workspaceId: data.workspaceId,
      userId: data.userId,
      userDisplayName: data.userDisplayName || '',
      userRole: data.userRole || 'member',
      permission: data.permission || 'read',
      addedAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })

    // Also add workspaceId to the user's workspaceIds array
    if (data.userId) {
      const userRef = adminDb.collection('users').doc(data.userId)
      const userDoc = await userRef.get()
      if (userDoc.exists) {
        const existing: string[] = userDoc.data()?.workspaceIds || []
        if (!existing.includes(data.workspaceId)) {
          await userRef.update({ workspaceIds: [...existing, data.workspaceId] })
        }
      }
    }

    return NextResponse.json({ success: true, data: { ...data, id: docRef.id, addedAt: now } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
