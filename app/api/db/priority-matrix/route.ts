export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId)
    return NextResponse.json({ success: false, error: 'workspaceId tələb olunur' }, { status: 400 })

  const doc = await adminDb.collection('priority-matrix').doc(workspaceId).get()
  if (!doc.exists)
    return NextResponse.json({ success: true, data: { do: [], plan: [], delegate: [], elim: [] } })

  const data = doc.data()!
  return NextResponse.json({
    success: true,
    data: {
      do:       (data.do       || []) as string[],
      plan:     (data.plan     || []) as string[],
      delegate: (data.delegate || []) as string[],
      elim:     (data.elim     || []) as string[],
    },
  })
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, do: doIds, plan, delegate, elim } = body
    if (!workspaceId)
      return NextResponse.json({ success: false, error: 'workspaceId tələb olunur' }, { status: 400 })

    await adminDb.collection('priority-matrix').doc(workspaceId).set({
      workspaceId,
      do:       doIds     || [],
      plan:     plan      || [],
      delegate: delegate  || [],
      elim:     elim      || [],
      updatedAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Xəta' },
      { status: 500 }
    )
  }
}
