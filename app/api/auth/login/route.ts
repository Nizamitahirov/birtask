export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'birtask_token'
const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'
const JWT_EXPIRES_IN = '7d'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi adı və şifrə tələb olunur' },
        { status: 400 }
      )
    }

    // Find user by username
    const snapshot = await adminDb
      .collection('users')
      .where('username', '==', username)
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi adı və ya şifrə yanlışdır' },
        { status: 401 }
      )
    }

    const userDoc = snapshot.docs[0]
    const userData = userDoc.data() as Record<string, unknown>

    // Compare password
    const passwordHash = userData.passwordHash as string
    if (!passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Hesab konfiqurasiya xətası' },
        { status: 500 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi adı və ya şifrə yanlışdır' },
        { status: 401 }
      )
    }

    // Sign JWT
    const payload = {
      userId: userDoc.id,
      username: userData.username as string,
      role: userData.role as string,
      displayName: userData.displayName as string,
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    // Update lastLoginAt
    const now = new Date().toISOString()
    await userDoc.ref.update({ lastLoginAt: now })

    // Log activity
    await adminDb.collection('activity').add({
      action: 'login',
      entityType: 'user',
      entityId: userDoc.id,
      entityName: userData.displayName || userData.username || '',
      userId: userDoc.id,
      userDisplayName: userData.displayName || userData.username || '',
      createdAt: now,
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: userDoc.id,
          username: userData.username,
          displayName: userData.displayName,
          role: userData.role,
          mustChangePassword: userData.mustChangePassword ?? false,
        },
      },
    })

    // Set httpOnly cookie (7 days)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    })

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
