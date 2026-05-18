export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    let query: FirebaseFirestore.Query = adminDb.collection('workflows')
    if (workspaceId) query = query.where('workspaceId', '==', workspaceId)
    const snapshot = await query.get()
    const rules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    return NextResponse.json({ success: true, data: rules })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('workflows').add({ ...data, createdAt: now, id: '' })
    await docRef.update({ id: docRef.id })
    return NextResponse.json({ success: true, data: { ...data, id: docRef.id, createdAt: now } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
