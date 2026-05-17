export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    let query: FirebaseFirestore.Query = adminDb.collection('team')
    if (workspaceId) query = query.where('workspaceId', '==', workspaceId)

    const snapshot = await query.get()
    const members = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return bt.localeCompare(at)
      })
    return NextResponse.json({ success: true, data: members })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('team').add({
      ...data,
      createdAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now }

    await adminDb.collection('activity').add({
      action: 'create',
      entityType: 'team',
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
