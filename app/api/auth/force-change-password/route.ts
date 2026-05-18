export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'birtask_token'
const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Giriş edilməyib' }, { status: 401 })
    }

    let payload: { userId: string; displayName: string; username: string }
    try {
      payload = jwt.verify(token, JWT_SECRET) as typeof payload
    } catch {
      return NextResponse.json({ success: false, error: 'Token etibarsızdır' }, { status: 401 })
    }

    const { newPassword } = await req.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Şifrə ən az 6 simvol olmalıdır' },
        { status: 400 }
      )
    }

    const ref = adminDb.collection('users').doc(payload.userId)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'İstifadəçi tapılmadı' }, { status: 404 })
    }

    const userData = doc.data() as Record<string, unknown>

    // Only allow this endpoint when mustChangePassword is true
    if (!userData.mustChangePassword) {
      return NextResponse.json(
        { success: false, error: 'Bu əməliyyat icazə verilmir' },
        { status: 403 }
      )
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    const now = new Date().toISOString()

    await ref.update({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: now,
    })

    await adminDb.collection('activity').add({
      action: 'update',
      entityType: 'user',
      entityId: payload.userId,
      entityName: userData.displayName || userData.username || '',
      userId: payload.userId,
      userDisplayName: userData.displayName || userData.username || '',
      changes: { password: { from: '***', to: '***' }, mustChangePassword: { from: true, to: false } },
      createdAt: now,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Xəta' },
      { status: 500 }
    )
  }
}
