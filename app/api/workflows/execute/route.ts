export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { executeWorkflows } from '@/lib/workflow-engine'

export async function POST(req: NextRequest) {
  try {
    const { triggerType, workspaceId, data: triggerData, workflowId, retriedFromRunId } = await req.json()
    const runIds = await executeWorkflows(triggerType, workspaceId, triggerData || {}, { workflowId, retriedFromRunId })
    return NextResponse.json({ success: true, runs: runIds })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
