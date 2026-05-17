export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const snapshot = await adminDb.collection('workspaces').get()
    const workspaces = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return at.localeCompare(bt)
      })
    return NextResponse.json({ success: true, data: workspaces })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()
    const docRef = await adminDb.collection('workspaces').add({
      name: data.name || 'Yeni İş Sahəsi',
      description: data.description || '',
      color: data.color || '#5B5BF5',
      ownerId: data.ownerId || '',
      memberIds: data.memberIds || [],
      createdAt: now,
      updatedAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })
    const created = { ...data, id: docRef.id, createdAt: now, updatedAt: now }
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
