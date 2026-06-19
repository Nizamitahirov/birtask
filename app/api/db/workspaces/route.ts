export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export async function GET(req: NextRequest) {
  try {
    const snapshot = await adminDb.collection('workspaces').get()
    let workspaces = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => {
        const at = (a as { createdAt?: string }).createdAt || ''
        const bt = (b as { createdAt?: string }).createdAt || ''
        return at.localeCompare(bt)
      })

    // Per-user workspace filtering for member/viewer roles
    const token = req.cookies.get('birtask_token')?.value
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
        if (['member', 'viewer'].includes(payload.role)) {
          const userDoc = await adminDb.collection('users').doc(payload.userId).get()
          const userData = userDoc.data()
          const workspaceIds: string[] = userData?.workspaceIds || []
          if (workspaceIds.length > 0) {
            workspaces = workspaces.filter((ws: { id?: string }) => workspaceIds.includes(ws.id || ''))
          }
        }
      } catch {
        // Invalid or missing token — no filtering
      }
    }

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
