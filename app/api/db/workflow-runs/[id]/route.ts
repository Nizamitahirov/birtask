export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await adminDb.collection('workflow-runs').doc(params.id).get()
    if (!doc.exists) return NextResponse.json({ success: false, error: 'Tapılmadı' }, { status: 404 })
    return NextResponse.json({ success: true, data: { ...doc.data(), id: doc.id } })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    await adminDb.collection('workflow-runs').doc(params.id).update(data)
    const doc = await adminDb.collection('workflow-runs').doc(params.id).get()
    return NextResponse.json({ success: true, data: { ...doc.data(), id: doc.id } })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
