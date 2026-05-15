export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'birtask_token'
const JWT_SECRET = process.env.JWT_SECRET || 'birtask-jwt-secret-2026-super-secure-key'

export async function POST(req: NextRequest) {
  try {
    // Attempt to read the current user from the token for activity logging
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          userId: string
          displayName: string
          username: string
        }
        const now = new Date().toISOString()
        await adminDb.collection('activity').add({
          action: 'logout',
          entityType: 'user',
          entityId: payload.userId,
          entityName: payload.displayName || payload.username || '',
          userId: payload.userId,
          userDisplayName: payload.displayName || payload.username || '',
          createdAt: now,
        })
      } catch {
        // Token invalid — still proceed with logout
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
