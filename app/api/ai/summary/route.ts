export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { groqComplete } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const { project, tasks } = await req.json()
  if (!project) {
    return NextResponse.json({ error: 'Layihə məlumatları çatışmır.' }, { status: 400 })
  }

  const totalTasks = tasks?.length || 0
  const doneTasks = tasks?.filter((t: { status: string }) => t.status === 'Tamamlandı').length || 0
  const inProgressTasks = tasks?.filter((t: { status: string }) => t.status === 'Davam edir').length || 0
  const waitingTasks = tasks?.filter((t: { status: string }) => t.status === 'Gözləyir').length || 0
  const reviewingTasks = tasks?.filter((t: { status: string }) => t.status === 'Yoxlanılır').length || 0
  const overdueTasks = tasks?.filter((t: { status: string; dueDate: string }) => {
    if (!t.dueDate || t.status === 'Tamamlandı') return false
    return new Date(t.dueDate) < new Date()
  }).length || 0

  const taskTitles = tasks?.slice(0, 15).map((t: { title: string; status: string; priority: string }) =>
    `- ${t.title} [${t.status}, ${t.priority}]`
  ).join('\n') || 'Tapşırıq yoxdur'

  const prompt = `Aşağıdakı layihə haqqında Azərbaycan dilində peşəkar, lakin oxunaqlı bir xülasə yaz.
Xülasə 3-5 abzasdan ibarət olsun: ümumi vəziyyət, irəliləyiş, diqqət tələb edən sahələr, tövsiyələr.
Markdown formatından istifadə et (## başlıqlar, **qalın**, - siyahılar).

**Layihə məlumatları:**
- Ad: ${project.name}
- Təsvir: ${project.description || 'Yoxdur'}
- Status: ${project.status}
- Prioritet: ${project.priority}
- Rəhbər: ${project.owner || 'Təyin edilməyib'}
- Başlanğıc: ${project.startDate || 'Qeyd edilməyib'}
- Son tarix: ${project.endDate || 'Qeyd edilməyib'}
- Büdcə: ${project.budget ? `₼${Number(project.budget).toLocaleString()}` : 'Qeyd edilməyib'}
- İrəliləyiş: ${project.progress}%

**Tapşırıq statistikası:**
- Ümumi: ${totalTasks}
- Tamamlandı: ${doneTasks}
- Davam edir: ${inProgressTasks}
- Gözləyir: ${waitingTasks}
- Yoxlanılır: ${reviewingTasks}
- Gecikmiş: ${overdueTasks}

**Tapşırıqlardan nümunələr:**
${taskTitles}

Xülasəni peşəkar, analitik və Azərbaycan dilinin rəsmi üslubunda yaz.`

  try {
    const summary = await groqComplete({ prompt, temperature: 0.7, maxTokens: 1024 })
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return NextResponse.json({ error: `Groq API xətası: ${message}` }, { status: 500 })
  }
}
