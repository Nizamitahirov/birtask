export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest, { params }: { params: { workflowId: string } }) {
  try {
    const wfDoc = await adminDb.collection('workflows').doc(params.workflowId).get()
    if (!wfDoc.exists) return NextResponse.json({ success: false, error: 'Workflow tapılmadı' }, { status: 404 })
    const wf = wfDoc.data()!
    if (!wf.isActive) return NextResponse.json({ success: false, error: 'Workflow aktiv deyil' }, { status: 400 })

    const secret = wf.triggerConfig?.webhookSecret
    if (secret) {
      const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
      if (headerSecret !== secret) return NextResponse.json({ success: false, error: 'Yanlış secret' }, { status: 401 })
    }

    const payload = await req.json().catch(() => ({}))
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    fetch(`${baseUrl}/api/workflows/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: 'webhook_incoming', workspaceId: wf.workspaceId, workflowId: params.workflowId, data: payload }),
    }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Workflow triggered' })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
