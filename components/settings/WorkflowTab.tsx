'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import {
  WorkflowRule, WorkflowRun, WorkflowAction, WorkflowCondition,
  WorkflowTriggerType, WorkflowActionType, WorkflowConditionOperator,
} from '@/lib/types'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Plus, Trash2, Zap, Loader2, ChevronDown, ChevronUp,
  RefreshCw, Copy, CheckCircle, XCircle, AlertCircle, Clock,
  Play, RotateCcw, Info, GripVertical, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

function relativeTime(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'İndicə'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dəq əvvəl`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat əvvəl`
  return `${Math.floor(diff / 86400000)} gün əvvəl`
}

function fmtDuration(ms?: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Labels & options ──────────────────────────────────────────────────────────

const TRIGGER_GROUPS: { label: string; items: { value: WorkflowTriggerType; label: string }[] }[] = [
  {
    label: 'Tapşırıq Hadisələri',
    items: [
      { value: 'task_created', label: 'Tapşırıq yaradıldı' },
      { value: 'task_updated', label: 'Tapşırıq yeniləndi' },
      { value: 'task_deleted', label: 'Tapşırıq silindi' },
      { value: 'task_completed', label: 'Tapşırıq tamamlandı' },
      { value: 'task_assigned', label: 'Tapşırıq təyin edildi' },
      { value: 'task_commented', label: 'Tapşırığa şərh əlavə edildi' },
    ],
  },
  {
    label: 'Sahə Dəyişikliyi',
    items: [
      { value: 'field_status', label: 'Status dəyişdi' },
      { value: 'field_due_date', label: 'Son tarix dəyişdi' },
      { value: 'field_assignee', label: 'İcraçı dəyişdi' },
      { value: 'field_priority', label: 'Prioritet dəyişdi' },
    ],
  },
  {
    label: 'Layihə Hadisələri',
    items: [
      { value: 'project_created', label: 'Layihə yaradıldı' },
      { value: 'project_completed', label: 'Layihə tamamlandı' },
    ],
  },
  {
    label: 'Zamanlama',
    items: [
      { value: 'scheduled_interval', label: 'Müntəzəm interval' },
      { value: 'scheduled_cron', label: 'Cron ifadəsi' },
    ],
  },
  {
    label: 'Webhook',
    items: [{ value: 'webhook_incoming', label: 'Gələn Webhook' }],
  },
]

const TRIGGER_LABEL_MAP: Record<WorkflowTriggerType, string> = Object.fromEntries(
  TRIGGER_GROUPS.flatMap(g => g.items.map(i => [i.value, i.label]))
) as Record<WorkflowTriggerType, string>

const ACTION_TYPE_OPTIONS: { value: WorkflowActionType; label: string }[] = [
  { value: 'send_email', label: 'E-poçt göndər' },
  { value: 'in_app_notification', label: 'Tətbiq bildirişi' },
  { value: 'outgoing_webhook', label: 'Webhook göndər' },
  { value: 'create_task', label: 'Tapşırıq yarat' },
  { value: 'update_field', label: 'Sahə yenilə' },
  { value: 'add_comment', label: 'Şərh əlavə et' },
  { value: 'add_label', label: 'Etiket əlavə et' },
  { value: 'delay', label: 'Gecikmə' },
]

const ACTION_VIS: Record<WorkflowActionType, { icon: string; color: string }> = {
  send_email:           { icon: 'mail',          color: '#3B82F6' },
  in_app_notification:  { icon: 'notifications', color: '#8B5CF6' },
  outgoing_webhook:     { icon: 'webhook',       color: '#06B6D4' },
  create_task:          { icon: 'add_task',      color: '#10B981' },
  update_field:         { icon: 'edit',          color: '#F59E0B' },
  add_comment:          { icon: 'comment',       color: '#EC4899' },
  add_label:            { icon: 'label',         color: '#84CC16' },
  delay:                { icon: 'timer',         color: '#6B7280' },
}

const CONDITION_FIELD_OPTIONS = [
  { value: 'title', label: 'Başlıq' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Prioritet' },
  { value: 'assignee', label: 'İcraçı' },
  { value: 'projectId', label: 'Layihə ID' },
  { value: 'dueDate', label: 'Son tarix' },
  { value: 'tags', label: 'Etiketlər' },
]

const CONDITION_OPERATOR_OPTIONS: { value: WorkflowConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Bərabərdir' },
  { value: 'not_equals', label: 'Bərabər deyil' },
  { value: 'contains', label: 'İçerir' },
  { value: 'not_contains', label: 'İçermir' },
  { value: 'is_empty', label: 'Boşdur' },
  { value: 'is_not_empty', label: 'Boş deyil' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'between', label: 'Arasında' },
  { value: 'before', label: 'Əvvəl (tarix)' },
  { value: 'after', label: 'Sonra (tarix)' },
  { value: 'matches_regex', label: 'Regex' },
]

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
}

function Hint() {
  return (
    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'var(--muted)' }}>
      {' '}(&#123;&#123;taskTitle&#125;&#125;, &#123;&#123;assignee&#125;&#125;...)
    </span>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    success: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'Uğurlu', icon: <CheckCircle size={10} /> },
    failure: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Uğursuz', icon: <XCircle size={10} /> },
    partial: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Qismən', icon: <AlertCircle size={10} /> },
    running: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'İşləyir', icon: <Loader2 size={10} className="animate-spin" /> },
    skipped: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Keçildi', icon: <Info size={10} /> },
  }
  const s = map[status] || map.skipped
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {s.icon} {s.label}
    </span>
  )
}

// ── Action form fields (type-specific) ───────────────────────────────────────

function ActionFormFields({ action, onChange }: { action: WorkflowAction; onChange: (a: WorkflowAction) => void }) {
  const set = (k: keyof WorkflowAction, v: unknown) => onChange({ ...action, [k]: v })

  if (action.type === 'send_email') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={labelStyle}>Kimə *</label><input className="inputM" value={action.emailTo || ''} onChange={e => set('emailTo', e.target.value)} placeholder="email@example.com" /></div>
        <div><label style={labelStyle}>CC</label><input className="inputM" value={action.emailCc || ''} onChange={e => set('emailCc', e.target.value)} placeholder="cc@example.com" /></div>
      </div>
      <div><label style={labelStyle}>Mövzu <Hint /></label><input className="inputM" value={action.emailSubject || ''} onChange={e => set('emailSubject', e.target.value)} placeholder="{{taskTitle}} tamamlandı" /></div>
      <div><label style={labelStyle}>Mətn <Hint /></label><textarea className="inputM" rows={3} style={{ resize: 'vertical' }} value={action.emailBody || ''} onChange={e => set('emailBody', e.target.value)} /></div>
    </div>
  )

  if (action.type === 'in_app_notification') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div><label style={labelStyle}>Mesaj <Hint /></label><input className="inputM" value={action.notifyMessage || ''} onChange={e => set('notifyMessage', e.target.value)} placeholder="{{taskTitle}} tapşırığı..." /></div>
      <div><label style={labelStyle}>İstifadəçi ID-ləri (vergüllə)</label><input className="inputM" value={(action.notifyUserIds || []).join(', ')} onChange={e => set('notifyUserIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="uid1, uid2" /></div>
    </div>
  )

  if (action.type === 'outgoing_webhook') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <div><label style={labelStyle}>URL *</label><input className="inputM" value={action.webhookUrl || ''} onChange={e => set('webhookUrl', e.target.value)} placeholder="https://..." /></div>
        <div><label style={labelStyle}>Metod</label>
          <select className="inputM" value={action.webhookMethod || 'POST'} onChange={e => set('webhookMethod', e.target.value as 'GET' | 'POST' | 'PUT' | 'PATCH')}>
            {['GET', 'POST', 'PUT', 'PATCH'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={labelStyle}>Auth tipi</label>
          <select className="inputM" value={action.webhookAuthType || 'none'} onChange={e => set('webhookAuthType', e.target.value as 'none' | 'bearer' | 'api_key' | 'basic')}>
            <option value="none">Yoxdur</option><option value="bearer">Bearer Token</option><option value="api_key">API Key</option><option value="basic">Basic Auth</option>
          </select>
        </div>
        {action.webhookAuthType && action.webhookAuthType !== 'none' && (
          <div><label style={labelStyle}>Auth dəyəri</label><input className="inputM" type="password" value={action.webhookAuthValue || ''} onChange={e => set('webhookAuthValue', e.target.value)} /></div>
        )}
      </div>
      <div><label style={labelStyle}>Başlıqlar (JSON)</label><textarea className="inputM" rows={2} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} value={action.webhookHeaders || ''} onChange={e => set('webhookHeaders', e.target.value)} placeholder={'{"X-Custom": "value"}'} /></div>
      <div><label style={labelStyle}>Gövdə (JSON) <Hint /></label><textarea className="inputM" rows={3} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} value={action.webhookBody || ''} onChange={e => set('webhookBody', e.target.value)} placeholder={'{"event": "{{triggerType}}"}'} /></div>
    </div>
  )

  if (action.type === 'create_task') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={labelStyle}>Tapşırıq adı <Hint /></label><input className="inputM" value={action.newTaskName || ''} onChange={e => set('newTaskName', e.target.value)} placeholder="Yeni tapşırıq" /></div>
        <div><label style={labelStyle}>Prioritet</label>
          <select className="inputM" value={action.newTaskPriority || 'Orta'} onChange={e => set('newTaskPriority', e.target.value)}>
            {['Aşağı', 'Orta', 'Yüksək', 'Kritik'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={labelStyle}>İcraçı</label><input className="inputM" value={action.newTaskAssignee || ''} onChange={e => set('newTaskAssignee', e.target.value)} placeholder="{{assignee}}" /></div>
        <div><label style={labelStyle}>Son tarix</label><input className="inputM" type="date" value={action.newTaskDueDate || ''} onChange={e => set('newTaskDueDate', e.target.value)} /></div>
      </div>
      <div><label style={labelStyle}>Açıqlama</label><textarea className="inputM" rows={2} style={{ resize: 'vertical' }} value={action.newTaskDescription || ''} onChange={e => set('newTaskDescription', e.target.value)} /></div>
    </div>
  )

  if (action.type === 'update_field') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div><label style={labelStyle}>Sahə</label>
        <select className="inputM" value={action.updateField || 'status'} onChange={e => set('updateField', e.target.value)}>
          {['status', 'priority', 'assignee', 'dueDate', 'tags'].map(f => <option key={f}>{f}</option>)}
        </select>
      </div>
      <div><label style={labelStyle}>Dəyər <Hint /></label><input className="inputM" value={action.updateValue || ''} onChange={e => set('updateValue', e.target.value)} placeholder="Tamamlandı" /></div>
    </div>
  )

  if (action.type === 'add_comment') return (
    <div><label style={labelStyle}>Şərh mətni <Hint /></label><textarea className="inputM" rows={3} style={{ resize: 'vertical' }} value={action.commentText || ''} onChange={e => set('commentText', e.target.value)} placeholder="Avtomatik şərh..." /></div>
  )

  if (action.type === 'add_label') return (
    <div><label style={labelStyle}>Etiket adı</label><input className="inputM" value={action.labelName || ''} onChange={e => set('labelName', e.target.value)} placeholder="urgent" /></div>
  )

  if (action.type === 'delay') return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div><label style={labelStyle}>Müddət</label><input className="inputM" type="number" min={1} value={action.delayAmount || 1} onChange={e => set('delayAmount', Number(e.target.value))} /></div>
      <div><label style={labelStyle}>Vahid</label>
        <select className="inputM" value={action.delayUnit || 'minutes'} onChange={e => set('delayUnit', e.target.value as 'minutes' | 'hours' | 'days')}>
          <option value="minutes">Dəqiqə</option><option value="hours">Saat</option><option value="days">Gün</option>
        </select>
      </div>
    </div>
  )

  return null
}

// ── ConditionRow ──────────────────────────────────────────────────────────────

function ConditionRow({ cond, onChange, onRemove }: { cond: WorkflowCondition; onChange: (c: WorkflowCondition) => void; onRemove: () => void }) {
  const needsValue = !['is_empty', 'is_not_empty'].includes(cond.operator)
  const needsValue2 = cond.operator === 'between'
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 110px', minWidth: 90 }}>
        <label style={labelStyle}>Sahə</label>
        <select className="inputM" value={cond.field} onChange={e => onChange({ ...cond, field: e.target.value })}>
          {CONDITION_FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ flex: '1 1 130px', minWidth: 110 }}>
        <label style={labelStyle}>Operator</label>
        <select className="inputM" value={cond.operator} onChange={e => onChange({ ...cond, operator: e.target.value as WorkflowConditionOperator })}>
          {CONDITION_OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {needsValue && (
        <div style={{ flex: '1 1 110px', minWidth: 90 }}>
          <label style={labelStyle}>Dəyər</label>
          <input className="inputM" value={cond.value || ''} onChange={e => onChange({ ...cond, value: e.target.value })} placeholder="Dəyər" />
        </div>
      )}
      {needsValue2 && (
        <div style={{ flex: '1 1 90px', minWidth: 80 }}>
          <label style={labelStyle}>Dəyər 2</label>
          <input className="inputM" value={cond.value2 || ''} onChange={e => onChange({ ...cond, value2: e.target.value })} placeholder="Üst hədd" />
        </div>
      )}
      <button type="button" onClick={onRemove} style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── RunHistoryPanel ───────────────────────────────────────────────────────────

function RunHistoryPanel({ workflowId }: { workflowId: string }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    const res = await db.workflowRuns.getAll(workflowId)
    if (res.success && res.data) setRuns(res.data)
    setLoading(false)
  }, [workflowId])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  const handleRetry = async (runId: string) => {
    setRetrying(runId)
    const res = await db.workflowRuns.retry(runId)
    if (res.success) { toast.success('Yenidən işə salındı'); await fetchRuns() }
    else toast.error(res.error || 'Xəta')
    setRetrying(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(3)].map((_, i) => <div key={i} style={{ height: 48, borderRadius: 10, background: 'var(--surface-2)', animation: 'pulse 1.5s infinite' }} />)}
    </div>
  )

  if (!runs.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Clock size={36} style={{ color: 'var(--muted)', opacity: 0.3, margin: '0 auto 12px' }} />
      <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>Hələ heç bir run yoxdur</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{runs.length} run</span>
        <button type="button" onClick={fetchRuns} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={12} /> Yenilə
        </button>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px 80px 80px 80px', padding: '8px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          {['Status', 'Trigger', 'Başlanğıc', 'Müddət', 'Addımlar', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>
        {runs.map((run, idx) => {
          const totalSteps = run.steps?.length || 0
          const okSteps = run.steps?.filter(s => s.status === 'success').length || 0
          const isExpanded = expandedRunId === run.id
          const canRetry = run.status === 'failure' || run.status === 'partial'
          return (
            <div key={run.id} style={{ borderBottom: idx < runs.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div onClick={() => setExpandedRunId(isExpanded ? null : run.id)} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px 80px 80px 80px', padding: '10px 14px', cursor: 'pointer', alignItems: 'center', background: isExpanded ? 'var(--surface-2)' : 'transparent' }}>
                <div><StatusBadge status={run.status} /></div>
                <div style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{TRIGGER_LABEL_MAP[run.triggerType as WorkflowTriggerType] || run.triggerType}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{relativeTime(run.startedAt)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDuration(run.durationMs)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{totalSteps ? `${okSteps}/${totalSteps}` : '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  {canRetry && (
                    <button type="button" onClick={e => { e.stopPropagation(); handleRetry(run.id) }} disabled={retrying === run.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--primary)', cursor: retrying === run.id ? 'not-allowed' : 'pointer', opacity: retrying === run.id ? 0.5 : 1 }}>
                      {retrying === run.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />} Cəhd et
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', background: 'var(--surface-2)' }}>
                  {run.steps && run.steps.length > 0 ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 1fr', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                        {['Status', 'Tip', 'Müddət', 'Nəticə / Xəta'].map((h, i) => <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>)}
                      </div>
                      {run.steps.map((step, si) => (
                        <div key={si} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 1fr', padding: '8px 12px', borderBottom: si < run.steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div><StatusBadge status={step.status} /></div>
                          <div style={{ fontSize: 12, color: 'var(--ink)' }}>{ACTION_TYPE_OPTIONS.find(a => a.value === step.type)?.label || step.type}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDuration(step.durationMs)}</div>
                          <div style={{ fontSize: 12, color: step.error ? '#EF4444' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.error || step.result || '—'}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>Addım məlumatı yoxdur</p>}
                  {run.error && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#EF4444' }}>{run.error}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Flow primitives ───────────────────────────────────────────────────────────

function FlowConnector({ onAdd }: { onAdd?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0', userSelect: 'none' }}>
      <div style={{ width: 2, height: 18, background: 'var(--border)' }} />
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          title="Addım əlavə et"
          style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px dashed var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', transition: 'all 0.15s', zIndex: 1 }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--primary)'; b.style.color = 'var(--primary)'; b.style.background = 'var(--primary-soft)' }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--muted)'; b.style.background = 'var(--surface)' }}
        >
          <Plus size={13} />
        </button>
      ) : (
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid var(--border)' }} />
      )}
      <div style={{ width: 2, height: 18, background: 'var(--border)' }} />
    </div>
  )
}

interface StepCardProps {
  badge?: string
  badgeColor?: string
  icon: React.ReactNode
  color: string
  title: string
  subtitle?: string
  isExpanded: boolean
  onToggle: () => void
  onRemove?: () => void
  showDrag?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  dragProps?: React.DragEventHandler<HTMLDivElement>
  onDragStart?: React.DragEventHandler<HTMLDivElement>
  onDragEnd?: React.DragEventHandler<HTMLDivElement>
  onDragOver?: React.DragEventHandler<HTMLDivElement>
  onDrop?: React.DragEventHandler<HTMLDivElement>
  children: React.ReactNode
}

function StepCard({ badge, badgeColor, icon, color, title, subtitle, isExpanded, onToggle, onRemove, showDrag, isDragging, isDropTarget, onDragStart, onDragEnd, onDragOver, onDrop, children }: StepCardProps) {
  return (
    <div
      draggable={showDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        borderRadius: 14,
        border: `1.5px solid ${isDropTarget ? 'var(--primary)' : 'var(--border)'}`,
        borderLeft: `3px solid ${color}`,
        background: 'var(--surface)',
        opacity: isDragging ? 0.45 : 1,
        boxShadow: isDropTarget ? `0 0 0 3px ${color}22` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s, opacity 0.15s',
      }}
    >
      {/* Header */}
      <div onClick={onToggle} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
        {showDrag && (
          <div style={{ color: 'var(--muted)', cursor: 'grab', display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <GripVertical size={15} />
          </div>
        )}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {badge && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: badgeColor || color, background: `${badgeColor || color}18`, padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                {badge}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
              {subtitle}
            </div>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove() }}
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Trash2 size={12} />
          </button>
        )}
        <div style={{ color: 'var(--muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14 }}>
            {children}
          </div></div>
      )}
    </div>
  )
}

// ── Action subtitle summary ───────────────────────────────────────────────────

function actionSubtitle(action: WorkflowAction): string {
  if (action.type === 'send_email') return action.emailTo ? `→ ${action.emailTo}` : 'E-poçt ünvanını daxil edin...'
  if (action.type === 'in_app_notification') return action.notifyMessage?.slice(0, 60) || 'Bildiriş mesajı...'
  if (action.type === 'outgoing_webhook') return action.webhookUrl ? `${action.webhookMethod || 'POST'} ${action.webhookUrl}` : 'URL daxil edin...'
  if (action.type === 'create_task') return action.newTaskName || 'Tapşırıq adı...'
  if (action.type === 'update_field') return action.updateField ? `${action.updateField} → ${action.updateValue || '?'}` : 'Sahə seçin...'
  if (action.type === 'add_comment') return action.commentText?.slice(0, 60) || 'Şərh mətni...'
  if (action.type === 'add_label') return action.labelName || 'Etiket adı...'
  if (action.type === 'delay') return action.delayAmount ? `${action.delayAmount} ${action.delayUnit === 'minutes' ? 'dəqiqə' : action.delayUnit === 'hours' ? 'saat' : 'gün'}` : 'Müddət...'
  return ''
}

// ── Add step picker (like Power Automate action picker) ───────────────────────

function ActionPicker({ onPick, onClose }: { onPick: (type: WorkflowActionType) => void; onClose: () => void }) {
  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 14, background: 'var(--surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Əməliyyat seçin</span>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
        {ACTION_TYPE_OPTIONS.map(opt => {
          const vis = ACTION_VIS[opt.value]
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onPick(opt.value); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${vis.color}30`, background: `${vis.color}08`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${vis.color}18`; (e.currentTarget as HTMLButtonElement).style.borderColor = vis.color }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${vis.color}08`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${vis.color}30` }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${vis.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: vis.color }}>{vis.icon}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Flow canvas (visual builder) ──────────────────────────────────────────────

type FormState = Omit<WorkflowRule, 'id' | 'createdAt'>

interface FlowCanvasProps {
  form: FormState
  setF: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  webhookUrl: string
  saving: boolean
  onSave: (e: React.FormEvent) => void
  isNew: boolean
}

function FlowCanvas({ form, setF, webhookUrl, saving, onSave, isNew }: FlowCanvasProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['trigger']))
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [pickerAfter, setPickerAfter] = useState<number | null>(null) // -1 = before first, N = after index N

  const toggle = (key: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const addActionAt = (type: WorkflowActionType, afterIdx: number) => {
    const newAct: WorkflowAction = { id: uid(), type }
    const acts = [...form.actions]
    acts.splice(afterIdx + 1, 0, newAct)
    setF('actions', acts)
    setTimeout(() => setExpanded(prev => { const n = new Set(prev); n.add(`action-${newAct.id}`); return n }), 30)
  }

  const removeAction = (idx: number) => setF('actions', form.actions.filter((_, i) => i !== idx))
  const updateAction = (idx: number, a: WorkflowAction) => { const acts = [...form.actions]; acts[idx] = a; setF('actions', acts) }

  const addCondition = () => {
    setF('conditions', [...form.conditions, { id: uid(), field: 'status', operator: 'equals' as WorkflowConditionOperator, value: '' }])
    setExpanded(prev => { const n = new Set(prev); n.add('filter'); return n })
  }
  const removeCondition = (idx: number) => setF('conditions', form.conditions.filter((_, i) => i !== idx))
  const updateCondition = (idx: number, c: WorkflowCondition) => { const conds = [...form.conditions]; conds[idx] = c; setF('conditions', conds) }

  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIdx(i) }
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== i) {
      const acts = [...form.actions]
      const [m] = acts.splice(dragIdx, 1)
      acts.splice(i, 0, m)
      setF('actions', acts)
    }
    setDragIdx(null); setOverIdx(null)
  }

  const filterSubtitle = form.conditions.length === 0
    ? 'Şərtsiz — workflow həmişə işləyir'
    : `${form.conditions.length} şərt • ${form.conditionLogic}`

  return (
    <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, padding: '0 0 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Workflow adı *</label>
            <input className="inputM" required value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Məs: Tapşırıq tamamlandıqda bildiriş" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Aktiv</span>
            <button type="button" onClick={() => setF('isActive', !form.isActive)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer', background: form.isActive ? 'var(--primary)' : 'var(--border)', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: form.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Açıqlama</label>
          <input className="inputM" value={form.description || ''} onChange={e => setF('description', e.target.value)} placeholder="Bu workflow nə edir..." />
        </div>
      </div>

      {/* ── FLOW ── */}
      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>

        {/* 1 · TRIGGER */}
        <StepCard
          badge="Tetikləyici"
          badgeColor="#8B5CF6"
          icon={<Zap size={17} color="#8B5CF6" />}
          color="#8B5CF6"
          title={TRIGGER_LABEL_MAP[form.triggerType] || form.triggerType}
          subtitle="Workflow bu hadisə baş verdikdə işləyir"
          isExpanded={expanded.has('trigger')}
          onToggle={() => toggle('trigger')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tetikləyici hadisə</label>
              <select className="inputM" value={form.triggerType} onChange={e => setF('triggerType', e.target.value as WorkflowTriggerType)}>
                {TRIGGER_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {form.triggerType === 'scheduled_interval' && (
              <div>
                <label style={labelStyle}>İnterval</label>
                <select className="inputM" value={form.triggerConfig?.scheduledInterval || 'daily'} onChange={e => setF('triggerConfig', { ...form.triggerConfig, scheduledInterval: e.target.value as 'hourly' | 'daily' | 'weekly' | 'monthly' })}>
                  <option value="hourly">Saatlıq</option><option value="daily">Gündəlik</option><option value="weekly">Həftəlik</option><option value="monthly">Aylıq</option>
                </select>
              </div>
            )}
            {form.triggerType === 'scheduled_cron' && (
              <div>
                <label style={labelStyle}>Cron ifadəsi</label>
                <input className="inputM" value={form.triggerConfig?.cronExpression || ''} onChange={e => setF('triggerConfig', { ...form.triggerConfig, cronExpression: e.target.value })} placeholder="0 9 * * 1  (B.ertəsi 09:00)" />
              </div>
            )}
            {form.triggerType === 'webhook_incoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Gizli açar (isteğe bağlı)</label>
                  <input className="inputM" type="password" value={form.triggerConfig?.webhookSecret || ''} onChange={e => setF('triggerConfig', { ...form.triggerConfig, webhookSecret: e.target.value })} placeholder="secret..." />
                </div>
                {webhookUrl && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Webhook URL</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 12, color: 'var(--primary)', fontFamily: 'monospace' }}>POST {typeof window !== 'undefined' ? window.location.origin : ''}{webhookUrl}</code>
                      <button type="button" onClick={() => { navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + webhookUrl); toast.success('Kopyalandı') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><Copy size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </StepCard>

        {/* Connector */}
        <FlowConnector />

        {/* 2 · FILTER */}
        <StepCard
          badge="Süzgəc"
          badgeColor="#F59E0B"
          icon={<Filter size={17} color="#F59E0B" />}
          color="#F59E0B"
          title="Şərtlər"
          subtitle={filterSubtitle}
          isExpanded={expanded.has('filter')}
          onToggle={() => toggle('filter')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.conditions.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {(['AND', 'OR'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setF('conditionLogic', l)} style={{ padding: '3px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: form.conditionLogic === l ? 'var(--primary)' : 'transparent', color: form.conditionLogic === l ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            )}
            {form.conditions.length === 0 ? (
              <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                Şərt yoxdur — workflow həmişə işləyir
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.conditions.map((cond, i) => (
                  <div key={cond.id}>
                    {i > 0 && <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary)', padding: '4px 0' }}>{form.conditionLogic}</div>}
                    <ConditionRow cond={cond} onChange={c => updateCondition(i, c)} onRemove={() => removeCondition(i)} />
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addCondition} className="btn-ghostM" style={{ fontSize: 12 }}>
              <Plus size={13} /> Şərt əlavə et
            </button>
          </div>
        </StepCard>

        {/* Connector with + before first action */}
        <FlowConnector onAdd={() => setPickerAfter(-1)} />
        {pickerAfter === -1 && (
          <div style={{ marginBottom: 8 }}>
            <ActionPicker onPick={t => addActionAt(t, -1)} onClose={() => setPickerAfter(null)} />
          </div>
        )}

        {/* 3 · ACTIONS */}
        {form.actions.map((action, i) => {
          const vis = ACTION_VIS[action.type] || { icon: 'settings', color: '#6B7280' }
          const label = ACTION_TYPE_OPTIONS.find(o => o.value === action.type)?.label || action.type
          return (
            <div key={action.id}>
              <StepCard
                badge={`Addım ${i + 1}`}
                badgeColor={vis.color}
                icon={<span className="material-symbols-rounded" style={{ fontSize: 17, color: vis.color }}>{vis.icon}</span>}
                color={vis.color}
                title={label}
                subtitle={actionSubtitle(action)}
                isExpanded={expanded.has(`action-${action.id}`)}
                onToggle={() => toggle(`action-${action.id}`)}
                onRemove={() => removeAction(i)}
                showDrag={true}
                isDragging={dragIdx === i}
                isDropTarget={overIdx === i && dragIdx !== i}
                onDragStart={() => setDragIdx(i)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Əməliyyat tipi</label>
                    <select className="inputM" value={action.type} onChange={e => updateAction(i, { ...action, type: e.target.value as WorkflowActionType })}>
                      {ACTION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <ActionFormFields action={action} onChange={a => updateAction(i, a)} />
                </div>
              </StepCard>

              {/* Connector with + after each action */}
              <FlowConnector onAdd={() => setPickerAfter(pickerAfter === i ? null : i)} />
              {pickerAfter === i && (
                <div style={{ marginBottom: 8 }}>
                  <ActionPicker onPick={t => { addActionAt(t, i); setPickerAfter(null) }} onClose={() => setPickerAfter(null)} />
                </div>
              )}
            </div>
          )
        })}

        {/* Empty state */}
        {form.actions.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: 14, color: 'var(--muted)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }}>add_circle</span>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Hələ heç bir addım yoxdur</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Yuxarıdakı + düyməsinə klikləyin</div>
          </div>
        )}

        {/* Save */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button type="submit" disabled={saving} className="btn-primaryM" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14, opacity: saving ? 0.5 : 1 }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saxlanılır...</> : isNew ? '⚡ Workflow yarat' : 'Dəyişiklikləri saxla'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ── Editor panel ──────────────────────────────────────────────────────────────

function emptyRule(wsId: string): FormState {
  return {
    name: '', description: '', workspaceId: wsId, isActive: true,
    triggerType: 'task_completed', triggerConfig: {},
    conditions: [], conditionLogic: 'AND',
    actions: [{ id: uid(), type: 'send_email', emailTo: '', emailSubject: '{{taskTitle}} tamamlandı', emailBody: '' }],
  }
}

interface EditorPanelProps { rule: WorkflowRule | null; wsId: string; onSaved: () => void }

function EditorPanel({ rule, wsId, onSaved }: EditorPanelProps) {
  const isNew = !rule
  const [form, setForm] = useState<FormState>(() =>
    rule ? { name: rule.name, description: rule.description || '', workspaceId: rule.workspaceId, isActive: rule.isActive, triggerType: rule.triggerType, triggerConfig: rule.triggerConfig || {}, conditions: rule.conditions || [], conditionLogic: rule.conditionLogic || 'AND', actions: rule.actions || [] }
         : emptyRule(wsId)
  )
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (rule) setForm({ name: rule.name, description: rule.description || '', workspaceId: rule.workspaceId, isActive: rule.isActive, triggerType: rule.triggerType, triggerConfig: rule.triggerConfig || {}, conditions: rule.conditions || [], conditionLogic: rule.conditionLogic || 'AND', actions: rule.actions || [] })
    else setForm(emptyRule(wsId))
    setActiveTab('builder')
  }, [rule, wsId])

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Ad tələb olunur'); return }
    setSaving(true)
    try {
      if (isNew) {
        const res = await db.workflows.create({ ...form, workspaceId: wsId })
        if (res.success) { toast.success('Workflow yaradıldı'); onSaved() } else toast.error(res.error || 'Xəta')
      } else {
        const res = await db.workflows.update(rule!.id, form)
        if (res.success) { toast.success('Yeniləndi'); onSaved() } else toast.error(res.error || 'Xəta')
      }
    } finally { setSaving(false) }
  }

  const webhookUrl = rule ? `/api/webhooks/${rule.id}` : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 2 }}>
        {([['builder', '⚡ Builder'], ['history', '📋 Run Tarixçəsi']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === id ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer', marginBottom: -1, transition: 'color 0.12s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
        {activeTab === 'builder' ? (
          <FlowCanvas form={form} setF={setF} webhookUrl={webhookUrl} saving={saving} onSave={handleSave} isNew={isNew} />
        ) : rule ? (
          <RunHistoryPanel workflowId={rule.id} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Run tarixçəsi görmək üçün bir workflow seçin</div>
        )}
      </div>
    </div>
  )
}

// ── Workflow list item ────────────────────────────────────────────────────────

function WorkflowListItem({ rule, isSelected, onSelect, onToggle, onDelete, deleting }: {
  rule: WorkflowRule; isSelected: boolean; onSelect: () => void; onToggle: () => void; onDelete: () => void; deleting: boolean
}) {
  const total = rule.runCount || 0
  const success = rule.successCount || 0
  const failure = rule.failureCount || 0
  const rate = total > 0 ? Math.round((success / total) * 100) : null
  const statusColor = rule.lastRunStatus === 'success' ? '#10B981' : rule.lastRunStatus === 'failure' ? '#EF4444' : rule.lastRunStatus === 'partial' ? '#F59E0B' : 'transparent'

  return (
    <div onClick={onSelect} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--primary-soft)' : 'transparent', transition: 'background 0.1s', position: 'relative' }}>
      {rule.lastRunStatus && <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 3px 3px 0', background: statusColor }} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rule.isActive ? 'var(--primary-soft)' : 'var(--surface-2)' }}>
          <Zap size={14} style={{ color: rule.isActive ? 'var(--primary)' : 'var(--muted)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>{TRIGGER_LABEL_MAP[rule.triggerType] || rule.triggerType || '—'}</span>
          </div>
          {total > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 11, color: 'var(--muted)' }}>
              <span><Play size={9} style={{ display: 'inline', marginRight: 2 }} />{total}</span>
              {rate !== null && <span style={{ color: rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444' }}>✓ {rate}%</span>}
              {failure > 0 && <span style={{ color: '#EF4444' }}>✗ {failure}</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <button type="button" onClick={e => { e.stopPropagation(); onToggle() }} style={{ position: 'relative', width: 30, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: rule.isActive ? 'var(--primary)' : 'var(--border)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, left: rule.isActive ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete() }} disabled={deleting} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: '#EF4444', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main WorkflowTab ──────────────────────────────────────────────────────────

export function WorkflowTab() {
  const { currentWorkspace } = useWorkspace()
  const wsId = currentWorkspace?.id || ''
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!wsId) return
    setLoading(true)
    const res = await db.workflows.getAll(wsId)
    if (res.success && res.data) setRules(res.data)
    setLoading(false)
  }, [wsId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const selectedRule = selectedId === 'new' ? null : rules.find(r => r.id === selectedId) || null

  const handleToggle = async (rule: WorkflowRule) => {
    const res = await db.workflows.update(rule.id, { isActive: !rule.isActive })
    if (res.success) setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
    else toast.error(res.error || 'Xəta')
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await db.workflows.delete(id)
    if (res.success) { toast.success('Silindi'); if (selectedId === id) setSelectedId(null); await fetchRules() }
    else toast.error(res.error || 'Xəta')
    setDeletingId(null)
  }

  const handleSaved = async () => { await fetchRules(); if (selectedId === 'new') setSelectedId(null) }

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 240px)', minHeight: 500, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Left: workflow list */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Workflows</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '1px 7px', borderRadius: 999 }}>{rules.length}</span>
          </div>
          <button type="button" onClick={() => setSelectedId('new')} className="btn-primaryM" style={{ padding: '5px 10px', fontSize: 12 }}>
            <Plus size={13} /> Yeni
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--surface-2)', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Zap size={28} style={{ color: 'var(--muted)', opacity: 0.3, margin: '0 auto 10px' }} />
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Workflow yoxdur</p>
              <button type="button" onClick={() => setSelectedId('new')} className="btn-primaryM" style={{ marginTop: 10, fontSize: 12, padding: '6px 12px' }}><Plus size={13} /> Yarat</button>
            </div>
          ) : (
            rules.map(r => (
              <WorkflowListItem key={r.id} rule={r} isSelected={selectedId === r.id} onSelect={() => setSelectedId(r.id)} onToggle={() => handleToggle(r)} onDelete={() => handleDelete(r.id)} deleting={deletingId === r.id} />
            ))
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--surface)' }}>
        {selectedId === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Zap size={40} style={{ color: 'var(--primary)', opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Workflow seçin və ya yeni yaradın</p>
            <button type="button" onClick={() => setSelectedId('new')} className="btn-primaryM"><Plus size={14} /> Yeni Workflow</button>
          </div>
        ) : (
          <EditorPanel key={selectedId} rule={selectedRule} wsId={wsId} onSaved={handleSaved} />
        )}
      </div>
    </div>
  )
}