export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { groqComplete, GROQ_MODEL } from '@/lib/groq'

type Lang = 'az' | 'en'

interface TaskLike { title?: string; status?: string; priority?: string; dueDate?: string }
interface ProjectLike {
  name?: string; description?: string; status?: string; priority?: string
  owner?: string; startDate?: string; endDate?: string; budget?: string | number; progress?: string | number
}

const DONE = 'Tamamlandı'

function langDirective(lang: Lang): string {
  return lang === 'en'
    ? 'Respond in clear, professional English.'
    : 'Cavabı aydın, peşəkar Azərbaycan dilində yaz.'
}

function taskStats(tasks: TaskLike[]) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === DONE).length
  const inProgress = tasks.filter(t => t.status === 'Davam edir').length
  const waiting = tasks.filter(t => t.status === 'Gözləyir').length
  const reviewing = tasks.filter(t => t.status === 'Yoxlanılır').length
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === DONE) return false
    return new Date(t.dueDate) < new Date()
  }).length
  return { total, done, inProgress, waiting, reviewing, overdue }
}

function buildProjectPrompt(project: ProjectLike, tasks: TaskLike[], lang: Lang): string {
  const s = taskStats(tasks)
  const sample = tasks.slice(0, 15).map(t => `- ${t.title} [${t.status}, ${t.priority}]`).join('\n') || '—'
  const budget = project.budget ? `₼${Number(project.budget).toLocaleString()}` : '—'
  return `${langDirective(lang)}
You are an experienced project analyst. Analyse the project below and produce a concise, insightful report.
Use Markdown (## headings, **bold**, - lists). Sections: ümumi vəziyyət / overview, irəliləyiş / progress, ri/risks & blockers, tövsiyələr / recommendations.

PROJECT
- Name: ${project.name}
- Description: ${project.description || '—'}
- Status: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress ?? 0}%
- Owner: ${project.owner || '—'}
- Dates: ${project.startDate || '?'} → ${project.endDate || '?'}
- Budget: ${budget}

TASKS (total ${s.total}): done ${s.done}, in-progress ${s.inProgress}, waiting ${s.waiting}, reviewing ${s.reviewing}, overdue ${s.overdue}
SAMPLE:
${sample}

Be specific and actionable. 3-5 short sections.`
}

function buildDashboardPrompt(payload: Record<string, unknown>, lang: Lang): string {
  const stats = (payload.stats || {}) as Record<string, unknown>
  const projects = (payload.projects || []) as ProjectLike[]
  const tasks = (payload.tasks || []) as TaskLike[]
  const s = taskStats(tasks)
  const projLine = projects.slice(0, 12).map(p => `- ${p.name} [${p.status}, ${p.progress ?? 0}%]`).join('\n') || '—'
  return `${langDirective(lang)}
You are a productivity coach reviewing a user's dashboard. Give a short, motivating but honest briefing.
Use Markdown (## headings, **bold**, - lists). Sections: where things stand, what needs attention today, 2-3 concrete next steps.

OVERVIEW
- Projects: ${JSON.stringify(stats.totalProjects ?? projects.length)} (active ${JSON.stringify(stats.activeProjects ?? '—')})
- Tasks total ${s.total}: done ${s.done}, in-progress ${s.inProgress}, waiting ${s.waiting}, overdue ${s.overdue}

PROJECTS:
${projLine}

Keep it tight (max ~4 short sections). Prioritise overdue and high-priority items.`
}

function buildAnalyticsPrompt(payload: Record<string, unknown>, lang: Lang): string {
  const stats = (payload.stats || {}) as Record<string, unknown>
  const extra = payload.context ? `\nADDITIONAL CONTEXT:\n${JSON.stringify(payload.context)}` : ''
  return `${langDirective(lang)}
You are a data analyst explaining KPI analytics to a manager in plain language.
Use Markdown (## headings, **bold**, - lists). Explain what the numbers mean, notable trends, and recommendations.

METRICS:
${JSON.stringify(stats, null, 2)}${extra}

Interpret the metrics — do not just restate them. 3-4 short sections with concrete recommendations.`
}

function buildWorkspacePrompt(payload: Record<string, unknown>, lang: Lang): string {
  const ws = (payload.workspace || {}) as { name?: string; description?: string }
  const projects = (payload.projects || []) as ProjectLike[]
  const tasks = (payload.tasks || []) as TaskLike[]
  const team = (payload.team || []) as { name?: string }[]
  const s = taskStats(tasks)
  const projLine = projects.slice(0, 20).map(p => `- ${p.name} [${p.status}, ${p.priority}, ${p.progress ?? 0}%]`).join('\n') || '—'
  return `${langDirective(lang)}
You are a chief of staff writing an executive summary of an entire workspace.
Use Markdown (## headings, **bold**, - lists). Sections: ümumi mənzərə / big picture, layihələrin vəziyyəti / project health, komanda yükü / workload, risklər / risks, tövsiyələr / recommendations.

WORKSPACE: ${ws.name || '—'}${ws.description ? ` — ${ws.description}` : ''}
- Projects: ${projects.length}
- Tasks total ${s.total}: done ${s.done}, in-progress ${s.inProgress}, waiting ${s.waiting}, reviewing ${s.reviewing}, overdue ${s.overdue}
- Team members: ${team.length}

PROJECTS:
${projLine}

Be executive and decisive. Highlight what matters most. 4-6 short sections.`
}

function buildDescriptionPrompt(payload: Record<string, unknown>, lang: Lang, instruction?: string): string {
  const type = (payload.type as string) || 'task'
  const isTask = type === 'task'
  const name = (payload.name || payload.title || instruction || '') as string
  const ctx = [
    payload.projectName ? `Project: ${payload.projectName}` : '',
    payload.status ? `Status: ${payload.status}` : '',
    payload.priority ? `Priority: ${payload.priority}` : '',
  ].filter(Boolean).join(' | ')
  return `${langDirective(lang)}
Write a clear, professional ${isTask ? 'task' : 'project'} description for: "${name}".
${ctx ? `Context: ${ctx}` : ''}
Rules:
- 2-4 sentences (or a few short bullet points if it improves clarity).
- Plain text only — NO markdown headings, no preamble like "Here is...". Output ONLY the description text.
- Concrete and specific about the goal/scope${isTask ? ' and what "done" looks like' : ' and expected outcome'}.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const kind = body.kind as string
    const lang: Lang = body.language === 'en' ? 'en' : 'az'
    const payload = (body.payload || {}) as Record<string, unknown>
    const instruction = body.instruction as string | undefined

    let prompt: string
    let maxTokens = 1300
    let temperature = 0.55

    switch (kind) {
      case 'project':
        prompt = buildProjectPrompt((payload.project || {}) as ProjectLike, (payload.tasks || []) as TaskLike[], lang)
        break
      case 'dashboard':
        prompt = buildDashboardPrompt(payload, lang)
        break
      case 'analytics':
        prompt = buildAnalyticsPrompt(payload, lang)
        break
      case 'workspace':
        prompt = buildWorkspacePrompt(payload, lang)
        maxTokens = 1800
        break
      case 'description':
        prompt = buildDescriptionPrompt(payload, lang, instruction)
        maxTokens = 350
        temperature = 0.7
        break
      default:
        return NextResponse.json({ error: 'Naməlum AI əməliyyatı (kind).' }, { status: 400 })
    }

    const text = await groqComplete({ prompt, temperature, maxTokens })
    return NextResponse.json({ text, model: GROQ_MODEL })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ error: `AI xətası: ${message}` }, { status: 500 })
  }
}
