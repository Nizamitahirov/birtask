export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { executeWorkflows } from '@/lib/workflow-engine'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const runDoc = await adminDb.collection('workflow-runs').doc(params.id).get()
    if (!runDoc.exists) return NextResponse.json({ success: false, error: 'Run tapılmadı' }, { status: 404 })
    const run = runDoc.data()!

    const runIds = await executeWorkflows(
      String(run.triggerType || ''),
      String(run.workspaceId || ''),
      (run.triggerData as Record<string, unknown>) || {},
      { workflowId: String(run.workflowId || ''), retriedFromRunId: params.id }
    )

    return NextResponse.json({ success: true, runs: runIds })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
