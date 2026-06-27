export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requirePermission } from '@/lib/auth-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('workspaces').doc(params.id).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Workspace tapılmadı' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { ...doc.data(), id: doc.id } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requirePermission(req, 'settings.workspace', { workspaceId: params.id })
    if (gate.error) return gate.error
    const data = await req.json()
    const now = new Date().toISOString()
    const ref = adminDb.collection('workspaces').doc(params.id)
    await ref.update({ ...data, updatedAt: now })
    const updated = (await ref.get()).data()
    return NextResponse.json({ success: true, data: { ...updated, id: params.id } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gate = await requirePermission(req, 'settings.workspace', { workspaceId: params.id })
    if (gate.error) return gate.error
    await adminDb.collection('workspaces').doc(params.id).delete()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
