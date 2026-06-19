export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ success: false, error: 'projectId tələb olunur' }, { status: 400 })

    const snapshot = await adminDb.collection('projectMembers')
      .where('projectId', '==', projectId)
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
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('projectMembers').add({
      projectId: data.projectId,
      userId: data.userId,
      userDisplayName: data.userDisplayName || '',
      userRole: data.userRole || 'member',
      permission: data.permission || 'read',
      addedAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })

    // Add projectId to user's projectIds array
    if (data.userId && data.projectId) {
      const userRef = adminDb.collection('users').doc(data.userId)
      const userDoc = await userRef.get()
      if (userDoc.exists) {
        const existing: string[] = userDoc.data()?.projectIds || []
        if (!existing.includes(data.projectId)) {
          await userRef.update({ projectIds: [...existing, data.projectId] })
        }
      }
    }

    return NextResponse.json({ success: true, data: { ...data, id: docRef.id, addedAt: now } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
