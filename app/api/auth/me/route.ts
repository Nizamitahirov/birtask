export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'birtask_token'
const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Giriş edilməyib' },
        { status: 401 }
      )
    }

    let payload: {
      userId: string
      username: string
      role: string
      displayName: string
    }

    try {
      payload = jwt.verify(token, JWT_SECRET) as typeof payload
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token etibarsızdır' },
        { status: 401 }
      )
    }

    // Fetch fresh user data from Firestore
    const doc = await adminDb.collection('users').doc(payload.userId).get()
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'İstifadəçi tapılmadı' },
        { status: 404 }
      )
    }

    const userData = doc.data() as Record<string, unknown>
    if (!userData.isActive) {
      return NextResponse.json(
        { success: false, error: 'Hesab deaktivdir' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: doc.id,
          username: userData.username,
          displayName: userData.displayName,
          role: userData.role,
          department: userData.department,
          email: userData.email,
          mustChangePassword: userData.mustChangePassword ?? false,
          lastLoginAt: userData.lastLoginAt,
          memberId: userData.memberId,
          workspaceIds: userData.workspaceIds,
          projectIds: userData.projectIds,
        },
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
