export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions'
import type { PermissionKey } from '@/lib/types'

const SYSTEM_ROLES = [
  { key: 'admin',   name: 'Admin',      description: 'Tam giriş — bütün icazələr', color: '#EF4444' },
  { key: 'manager', name: 'Menecer',    description: 'Layihə və komanda idarəetməsi', color: '#5B5BF5' },
  { key: 'member',  name: 'Üzv',        description: 'Standart əməkdaş icazələri', color: '#10B981' },
  { key: 'viewer',  name: 'İzləyici',   description: 'Yalnız oxuma icazəsi', color: '#64748B' },
]

async function seedSystemRoles(workspaceId: string) {
  const now = new Date().toISOString()
  const batch = adminDb.batch()
  for (const role of SYSTEM_ROLES) {
    const ref = adminDb.collection('roles').doc(`${workspaceId}-${role.key}`)
    const snap = await ref.get()
    if (!snap.exists) {
      batch.set(ref, {
        id: ref.id,
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: DEFAULT_ROLE_PERMISSIONS[role.key] || [],
        isSystem: true,
        workspaceId,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  await batch.commit()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    let query: FirebaseFirestore.Query = adminDb.collection('roles')
    if (workspaceId) query = query.where('workspaceId', '==', workspaceId)

    const snapshot = await query.get()

    // Auto-seed system roles if workspace has none
    if (snapshot.empty && workspaceId) {
      await seedSystemRoles(workspaceId)
      const seeded = await adminDb.collection('roles').where('workspaceId', '==', workspaceId).get()
      const roles = seeded.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .sort((a: any, b: any) => {
          const order = ['admin', 'manager', 'member', 'viewer']
          const ai = order.findIndex(o => (a.name as string).toLowerCase().includes(o))
          const bi = order.findIndex(o => (b.name as string).toLowerCase().includes(o))
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
      return NextResponse.json({ success: true, data: roles })
    }

    const roles = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .sort((a: any, b: any) => {
        // System roles first, then by name
        if (a.isSystem && !b.isSystem) return -1
        if (!a.isSystem && b.isSystem) return 1
        return (a.name as string).localeCompare(b.name as string)
      })

    return NextResponse.json({ success: true, data: roles })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const now = new Date().toISOString()

    // Validate permissions
    const validPerms = (data.permissions || []).filter((p: string) =>
      (ALL_PERMISSIONS as string[]).includes(p)
    ) as PermissionKey[]

    const docRef = await adminDb.collection('roles').add({
      ...data,
      permissions: validPerms,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      id: '',
    })
    await docRef.update({ id: docRef.id })

    return NextResponse.json({
      success: true,
      data: { ...data, permissions: validPerms, isSystem: false, id: docRef.id, createdAt: now },
    }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
