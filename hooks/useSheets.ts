'use client'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { Project, Task, TeamMember, Activity, ActivityLog, DashboardStats } from '@/lib/types'
import toast from 'react-hot-toast'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const res = await db.projects.getAll()
    if (res.success && res.data) setProjects(res.data)
    else setError(res.error || 'Xəta baş verdi')
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<Project, 'id' | 'createdAt'>) => {
    const res = await db.projects.create(data)
    if (res.success) { toast.success('Layihə yaradıldı'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<Project>) => {
    const res = await db.projects.update(id, data)
    if (res.success) { toast.success('Layihə yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await db.projects.delete(id)
    if (res.success) { toast.success('Layihə silindi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  return { projects, loading, error, refresh: fetch, create, update, remove }
}

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const res = await db.tasks.getAll(projectId)
    if (res.success && res.data) setTasks(res.data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await db.tasks.create(data)
    if (res.success) { toast.success('Tapşırıq yaradıldı'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<Task>) => {
    const res = await db.tasks.update(id, data)
    if (res.success) { toast.success('Tapşırıq yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await db.tasks.delete(id)
    if (res.success) { toast.success('Tapşırıq silindi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  return { tasks, loading, refresh: fetch, create, update, remove }
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const res = await db.team.getAll()
    if (res.success && res.data) setMembers(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const res = await db.team.create(data)
    if (res.success) { toast.success('Üzv əlavə edildi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<TeamMember>) => {
    const res = await db.team.update(id, data)
    if (res.success) { toast.success('Üzv yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await db.team.delete(id)
    if (res.success) { toast.success('Üzv silindi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  return { members, loading, refresh: fetch, create, update, remove }
}

// Batch load for dashboard - parallel API calls
export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const [projectsRes, tasksRes, teamRes, activityRes] = await Promise.all([
        db.projects.getAll(),
        db.tasks.getAll(),
        db.team.getAll(),
        db.activity.getAll(),
      ])

      const projects = (projectsRes.success && projectsRes.data) ? projectsRes.data : []
      const tasks = (tasksRes.success && tasksRes.data) ? tasksRes.data : []
      const team = (teamRes.success && teamRes.data) ? teamRes.data : []
      const activity = (activityRes.success && activityRes.data) ? activityRes.data : []

      const today = new Date()
      setStats({
        totalProjects: projects.length,
        activeProjects: projects.filter((p: Project) => p.status === 'Davam edir').length,
        completedProjects: projects.filter((p: Project) => p.status === 'Tamamlandı').length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: Task) => t.status === 'Tamamlandı').length,
        overdueTasks: tasks.filter((t: Task) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Tamamlandı').length,
        teamSize: team.length,
      })

      // Map ActivityLog to Activity shape for the feed
      const mapped: Activity[] = activity.slice(0, 20).map((a: ActivityLog) => ({
        id: a.id,
        type: (a.action === 'complete' ? 'complete'
          : a.action === 'create' ? 'create'
          : a.action === 'delete' ? 'delete'
          : 'update') as Activity['type'],
        message: `${a.userDisplayName}: ${a.entityName}`,
        entityId: a.entityId,
        entityType: a.entityType as Activity['entityType'],
        userId: a.userId,
        createdAt: a.createdAt,
      }))
      setActivities(mapped)
      setLoading(false)
    }
    fetchAll()
  }, [])

  return { stats, activities, loading }
}

// For forms - get team member names as string array
export function useTeamNames(): string[] {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    db.team.getAll().then(res => {
      if (res.success && res.data) setNames(res.data.map(m => m.name))
    })
  }, [])
  return names
}

// For lookups - get Record<id, name> mapping
export function useTeamMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    db.team.getAll().then(res => {
      if (res.success && res.data) {
        const m: Record<string, string> = {}
        res.data.forEach(member => { m[member.id] = member.name })
        setMap(m)
      }
    })
  }, [])
  return map
}
