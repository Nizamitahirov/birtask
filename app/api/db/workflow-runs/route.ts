export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('workflowId')
    let query: FirebaseFirestore.Query = adminDb.collection('workflow-runs')
    if (workflowId) query = query.where('workflowId', '==', workflowId)
    const snapshot = await query.get()
    const runs = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => ((b as { startedAt?: string }).startedAt || '').localeCompare((a as { startedAt?: string }).startedAt || ''))
      .slice(0, 100)
    return NextResponse.json({ success: true, data: runs })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const docRef = await adminDb.collection('workflow-runs').add(data)
    await docRef.update({ id: docRef.id })
    return NextResponse.json({ success: true, data: { ...data, id: docRef.id } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
