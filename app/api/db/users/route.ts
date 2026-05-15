import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('users')
      .orderBy('createdAt', 'desc')
      .get()
    const users = snapshot.docs.map((doc) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...rest } = doc.data() as Record<string, unknown>
      return { ...rest, id: doc.id }
    })
    return NextResponse.json({ success: true, data: users })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()

    // Hash password if provided as plain text
    let passwordHash = data.passwordHash
    if (data.password && !data.passwordHash) {
      passwordHash = await bcrypt.hash(data.password, 12)
    }

    const { password: _pw, ...rest } = data
    void _pw

    const docRef = await adminDb.collection('users').add({
      ...rest,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      isActive: data.isActive ?? true,
      mustChangePassword: data.mustChangePassword ?? false,
      id: '',
    })
    await docRef.update({ id: docRef.id })

    await adminDb.collection('activity').add({
      action: 'create',
      entityType: 'user',
      entityId: docRef.id,
      entityName: data.displayName || data.username || '',
      userId: 'system',
      userDisplayName: 'System',
      createdAt: now,
    })

    // Return without passwordHash
    const { passwordHash: _hash, ...safeData } = { ...rest, id: docRef.id, createdAt: now, updatedAt: now }
    void _hash
    return NextResponse.json({ success: true, data: safeData }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
