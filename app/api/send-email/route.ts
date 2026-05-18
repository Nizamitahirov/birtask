export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { trigger, workspaceId, data: eventData } = await req.json()

    // Get matching active workflow rules
    const snapshot = await adminDb.collection('workflows')
      .where('workspaceId', '==', workspaceId)
      .where('trigger', '==', trigger)
      .where('isActive', '==', true)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    let sent = 0
    for (const doc of snapshot.docs) {
      const rule = doc.data()
      // Replace template placeholders
      const subject = rule.emailSubject
        .replace('{{taskTitle}}', eventData.taskTitle || '')
        .replace('{{projectName}}', eventData.projectName || '')
        .replace('{{assignee}}', eventData.assignee || '')
        .replace('{{status}}', eventData.status || '')

      const body = rule.emailBody
        .replace(/\{\{taskTitle\}\}/g, eventData.taskTitle || '')
        .replace(/\{\{projectName\}\}/g, eventData.projectName || '')
        .replace(/\{\{assignee\}\}/g, eventData.assignee || '')
        .replace(/\{\{status\}\}/g, eventData.status || '')

      try {
        await resend.emails.send({
          from: 'BirTask <noreply@birtask.app>',
          to: rule.emailTo,
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#5B5BF5;margin-bottom:16px">BirTask Bildirişi</h2>
            <p style="white-space:pre-wrap;color:#333">${body}</p>
            <hr style="margin:24px 0;border-color:#eee"/>
            <p style="font-size:12px;color:#999">Bu e-poçt BirTask tərəfindən avtomatik göndərilmişdir.</p>
          </div>`,
        })
        sent++
      } catch {}
    }

    return NextResponse.json({ success: true, sent })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Xəta' }, { status: 500 })
  }
}
