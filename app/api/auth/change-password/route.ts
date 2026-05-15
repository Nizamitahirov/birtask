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
      return NextResponse.json(
        { success: false, error: 'Giriş edilməyib' },
        { status: 401 }
      )
    }

    let payload: { userId: string; displayName: string; username: string }
    try {
      payload = jwt.verify(token, JWT_SECRET) as typeof payload
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token etibarsızdır' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Cari şifrə və yeni şifrə tələb olunur' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Yeni şifrə ən az 6 simvol olmalıdır' },
        { status: 400 }
      )
    }

    // Fetch user
    const ref = adminDb.collection('users').doc(payload.userId)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi tapılmadı' },
        { status: 404 }
      )
    }

    const userData = doc.data() as Record<string, unknown>
    const passwordHash = userData.passwordHash as string

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Cari şifrə yanlışdır' },
        { status: 400 }
      )
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 12)
    const now = new Date().toISOString()
    await ref.update({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: now,
    })

    // Log activity
    await adminDb.collection('activity').add({
      action: 'update',
      entityType: 'user',
      entityId: payload.userId,
      entityName: payload.displayName || payload.username || '',
      userId: payload.userId,
      userDisplayName: payload.displayName || payload.username || '',
      changes: { password: { from: '***', to: '***' } },
      createdAt: now,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
