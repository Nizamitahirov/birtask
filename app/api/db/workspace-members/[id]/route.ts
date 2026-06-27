export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requirePermission } from '@/lib/auth-server'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requirePermission(req, 'settings.workspace')
    if (gate.error) return gate.error
    const { permission } = await req.json()
    await adminDb.collection('workspaceMembers').doc(params.id).update({ permission })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requirePermission(req, 'settings.workspace')
    if (gate.error) return gate.error
    const doc = await adminDb.collection('workspaceMembers').doc(params.id).get()
    if (doc.exists) {
      const data = doc.data()
      // Remove workspaceId from user's workspaceIds
      if (data?.userId && data?.workspaceId) {
        const userRef = adminDb.collection('users').doc(data.userId)
        const userDoc = await userRef.get()
        if (userDoc.exists) {
          const existing: string[] = userDoc.data()?.workspaceIds || []
          await userRef.update({ workspaceIds: existing.filter((id: string) => id !== data.workspaceId) })
        }
      }
    }
    await adminDb.collection('workspaceMembers').doc(params.id).delete()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
