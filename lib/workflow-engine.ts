import { adminDb } from '@/lib/firebase-admin'

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function buildVars(data: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(data)) flat[k] = String(v ?? '')
  return flat
}

function getVal(data: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce((obj: unknown, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key]
    return undefined
  }, data)
}

function evalCondition(cond: Record<string, unknown>, data: Record<string, unknown>): boolean {
  const fv = String(getVal(data, String(cond.field)) ?? '')
  const val = String(cond.value ?? '')
  const val2 = String(cond.value2 ?? '')
  switch (cond.operator) {
    case 'equals':       return fv === val
    case 'not_equals':   return fv !== val
    case 'contains':     return fv.toLowerCase().includes(val.toLowerCase())
    case 'not_contains': return !fv.toLowerCase().includes(val.toLowerCase())
    case 'is_empty':     return !fv.trim()
    case 'is_not_empty': return !!fv.trim()
    case 'gt':           return Number(fv) > Number(val)
    case 'lt':           return Number(fv) < Number(val)
    case 'between':      return Number(fv) >= Number(val) && Number(fv) <= Number(val2)
    case 'before':       return new Date(fv) < new Date(val)
    case 'after':        return new Date(fv) > new Date(val)
    case 'matches_regex': try { return new RegExp(val).test(fv) } catch { return false }
    default:             return true
  }
}

function evalConditions(
  conditions: Record<string, unknown>[],
  logic: string,
  data: Record<string, unknown>
): boolean {
  if (!conditions.length) return true
  const results = conditions.map(c => evalCondition(c, data))
  return logic === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

async function execAction(
  action: Record<string, unknown>,
  triggerData: Record<string, unknown>,
  workspaceId: string
): Promise<string> {
  const vars = buildVars(triggerData)

  switch (action.type) {
    case 'send_email': {
      const to = interpolate(String(action.emailTo || ''), vars)
      if (!to) throw new Error('E-poçt ünvanı boşdur')
      const subject = interpolate(String(action.emailSubject || ''), vars)
      const bodyText = interpolate(String(action.emailBody || ''), vars)
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#5B5BF5;margin-bottom:16px">BirTask Bildirişi</h2>
        <p style="white-space:pre-wrap;color:#333">${bodyText}</p>
        <hr style="margin:24px 0;border-color:#eee"/>
        <p style="font-size:12px;color:#999">Bu e-poçt BirTask tərəfindən avtomatik göndərilmişdir.</p>
      </div>`

      const gmailUser = process.env.GMAIL_USER
      const gmailPass = process.env.GMAIL_APP_PASSWORD

      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'BirTask <onboarding@resend.dev>',
          to,
          cc: action.emailCc ? interpolate(String(action.emailCc), vars) : undefined,
          subject,
          html,
        })
      } else if (gmailUser && gmailPass) {
        // Gmail SMTP via nodemailer
        const nodemailer = await import('nodemailer')
        const transporter = nodemailer.default.createTransport({
          service: 'gmail',
          auth: { user: gmailUser, pass: gmailPass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        })
        const sendPromise = transporter.sendMail({
          from: `BirTask <${gmailUser}>`,
          to,
          cc: action.emailCc ? interpolate(String(action.emailCc), vars) : undefined,
          subject,
          html,
        })
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gmail SMTP timeout (15s)')), 15000)
        )
        await Promise.race([sendPromise, timeout])
      } else if (process.env.RESEND_API_KEY) {
        // Resend fallback
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'BirTask <onboarding@resend.dev>',
          to,
          cc: action.emailCc ? interpolate(String(action.emailCc), vars) : undefined,
          subject,
          html,
        })
      } else {
        throw new Error('E-poçt konfiqurasyonu yoxdur. GMAIL_USER + GMAIL_APP_PASSWORD və ya RESEND_API_KEY tələb olunur.')
      }

      return `E-poçt göndərildi: ${to}`
    }

    case 'in_app_notification': {
      const message = interpolate(String(action.notifyMessage || ''), vars)
      const userIds = (action.notifyUserIds as string[]) || []
      for (const userId of userIds) {
        const now = new Date().toISOString()
        const ref = await adminDb.collection('notifications').add({
          id: '', userId, workspaceId, type: 'workflow',
          title: 'Workflow Bildirişi', message,
          entityId: '', entityType: 'task', read: false, createdAt: now,
        })
        await ref.update({ id: ref.id })
      }
      return `Bildiriş göndərildi: ${userIds.length} istifadəçi`
    }

    case 'outgoing_webhook': {
      const url = interpolate(String(action.webhookUrl || ''), vars)
      if (!url) throw new Error('Webhook URL boşdur')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (action.webhookAuthType === 'bearer')
        headers['Authorization'] = `Bearer ${action.webhookAuthValue}`
      else if (action.webhookAuthType === 'api_key')
        headers['X-API-Key'] = String(action.webhookAuthValue || '')
      else if (action.webhookAuthType === 'basic')
        headers['Authorization'] = `Basic ${Buffer.from(String(action.webhookAuthValue || '')).toString('base64')}`
      try { Object.assign(headers, JSON.parse(String(action.webhookHeaders || '{}'))) } catch { /* invalid JSON */ }
      const method = String(action.webhookMethod || 'POST')
      const body = action.webhookBody
        ? interpolate(String(action.webhookBody), vars)
        : JSON.stringify({ triggerData, ts: new Date().toISOString() })
      const res = await fetch(url, { method, headers, body: method !== 'GET' ? body : undefined })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return `Webhook ${method} ${url} → ${res.status}`
    }

    case 'create_task': {
      const now = new Date().toISOString()
      const title = interpolate(String(action.newTaskName || 'Yeni tapşırıq'), vars)
      const ref = await adminDb.collection('tasks').add({
        id: '', workspaceId,
        title,
        description: interpolate(String(action.newTaskDescription || ''), vars),
        projectId: action.newTaskProjectId || '',
        projectName: '',
        status: 'Gözləyir',
        priority: action.newTaskPriority || 'Orta',
        assignee: interpolate(String(action.newTaskAssignee || ''), vars),
        dueDate: action.newTaskDueDate || '',
        tags: '',
        createdAt: now, updatedAt: now,
      })
      await ref.update({ id: ref.id })
      return `Tapşırıq yaradıldı: "${title}" (${ref.id})`
    }

    case 'update_field': {
      const taskId = String(triggerData.taskId || triggerData.id || '')
      if (!taskId) throw new Error('taskId yoxdur')
      const value = interpolate(String(action.updateValue || ''), vars)
      await adminDb.collection('tasks').doc(taskId).update({
        [String(action.updateField || 'status')]: value,
        updatedAt: new Date().toISOString(),
      })
      return `"${action.updateField}" = "${value}" yeniləndi`
    }

    case 'add_comment': {
      const taskId = String(triggerData.taskId || triggerData.id || '')
      if (!taskId) throw new Error('taskId yoxdur')
      const text = interpolate(String(action.commentText || ''), vars)
      const ref = await adminDb.collection('comments').add({
        id: '', entityType: 'task', entityId: taskId,
        userId: 'workflow-bot', userDisplayName: 'Workflow Bot',
        content: text, createdAt: new Date().toISOString(),
      })
      await ref.update({ id: ref.id })
      return `Şərh əlavə edildi`
    }

    case 'add_label': {
      const taskId = String(triggerData.taskId || triggerData.id || '')
      if (!taskId) throw new Error('taskId yoxdur')
      const doc = await adminDb.collection('tasks').doc(taskId).get()
      const tags = String(doc.data()?.tags || '')
      const label = String(action.labelName || '')
      await adminDb.collection('tasks').doc(taskId).update({
        tags: tags ? `${tags}, ${label}` : label,
      })
      return `Etiket əlavə edildi: "${label}"`
    }

    case 'delay':
      return `Gecikdirmə: ${action.delayAmount} ${action.delayUnit}`

    default:
      throw new Error(`Naməlum action növü: ${action.type}`)
  }
}

export async function executeWorkflows(
  triggerType: string,
  workspaceId: string,
  triggerData: Record<string, unknown>,
  options?: { workflowId?: string; retriedFromRunId?: string }
): Promise<string[]> {
  const snapshot = await adminDb.collection('workflows')
    .where('workspaceId', '==', workspaceId)
    .where('isActive', '==', true)
    .get()

  const rules = (snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as (Record<string, unknown> & { id: string })[])
    .filter(r => {
      if (options?.workflowId) return r.id === options.workflowId
      // Match new triggerType field OR legacy trigger field
      return r.triggerType === triggerType || r.trigger === triggerType
    })

  const runIds: string[] = []

  for (const rule of rules) {
    const startedAt = new Date().toISOString()
    const conditions = (rule.conditions as Record<string, unknown>[]) || []
    const condLogic = String(rule.conditionLogic || 'AND')

    if (!evalConditions(conditions, condLogic, triggerData)) continue

    const runRef = adminDb.collection('workflow-runs').doc()
    await runRef.set({
      id: runRef.id,
      workflowId: rule.id,
      workflowName: rule.name,
      workspaceId,
      status: 'running',
      triggerType,
      triggerData,
      steps: [],
      startedAt,
      retriedFromRunId: options?.retriedFromRunId || null,
    })

    const steps: Record<string, unknown>[] = []
    let overallStatus = 'success'

    // Support legacy email-only workflows
    const actions = (rule.actions as Record<string, unknown>[]) || []
    if (!actions.length && rule.emailTo) {
      actions.push({
        id: 'legacy',
        type: 'send_email',
        emailTo: rule.emailTo,
        emailSubject: rule.emailSubject,
        emailBody: rule.emailBody,
      })
    }

    try {
      for (const action of actions) {
        const stepStart = Date.now()
        const step: Record<string, unknown> = {
          actionId: action.id,
          type: action.type,
          status: 'success',
          startedAt: new Date().toISOString(),
          finishedAt: '',
          durationMs: 0,
        }
        try {
          step.result = await execAction(action, triggerData, workspaceId)
        } catch (err) {
          step.status = 'failure'
          step.error = err instanceof Error ? err.message : 'Xəta'
          overallStatus = 'partial'
        }
        step.finishedAt = new Date().toISOString()
        step.durationMs = Date.now() - stepStart
        steps.push(step)
      }
      if (steps.length && steps.every(s => s.status === 'failure')) overallStatus = 'failure'
    } catch (fatalErr) {
      overallStatus = 'failure'
      steps.push({
        actionId: 'fatal', type: 'unknown', status: 'failure',
        startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
        durationMs: 0,
        error: fatalErr instanceof Error ? fatalErr.message : 'Gözlənilməz xəta',
      })
    }

    const finishedAt = new Date().toISOString()
    const durationMs = Date.now() - new Date(startedAt).getTime()
    await runRef.update({ status: overallStatus, steps, finishedAt, durationMs })

    await adminDb.collection('workflows').doc(rule.id).update({
      runCount:      (Number(rule.runCount)      || 0) + 1,
      successCount:  overallStatus === 'success'  ? (Number(rule.successCount)  || 0) + 1 : (Number(rule.successCount)  || 0),
      failureCount:  overallStatus === 'failure'  ? (Number(rule.failureCount)  || 0) + 1 : (Number(rule.failureCount)  || 0),
      lastRunAt:     finishedAt,
      lastRunStatus: overallStatus,
      updatedAt:     finishedAt,
    })

    runIds.push(runRef.id)
  }

  return runIds
}
