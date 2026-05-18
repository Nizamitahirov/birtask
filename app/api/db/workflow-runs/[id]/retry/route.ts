export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const runDoc = await adminDb.collection('workflow-runs').doc(params.id).get()
    if (!runDoc.exists) return NextResponse.json({ success: false, error: 'Run tapılmadı' }, { status: 404 })
    const run = runDoc.data()!

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/workflows/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggerType: run.triggerType,
        workspaceId: run.workspaceId,
        workflowId: run.workflowId,
        data: run.triggerData || {},
        retriedFromRunId: params.id,
      }),
    })
    const result = await res.json()
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
