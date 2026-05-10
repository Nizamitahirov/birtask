'use client'

import { useState, useEffect, useCallback } from 'react'
import { sheetsApi } from '@/lib/sheets'
import { Project, Task, TeamMember, Activity, DashboardStats } from '@/lib/types'
import toast from 'react-hot-toast'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const res = await sheetsApi.projects.getAll()
    if (res.success && res.data) setProjects(res.data)
    else setError(res.error || 'Xəta baş verdi')
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<Project, 'id' | 'createdAt'>) => {
    const res = await sheetsApi.projects.create(data)
    if (res.success) { toast.success('Layihə yaradıldı'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<Project>) => {
    const res = await sheetsApi.projects.update(id, data)
    if (res.success) { toast.success('Layihə yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await sheetsApi.projects.delete(id)
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
    const res = await sheetsApi.tasks.getAll(projectId)
    if (res.success && res.data) setTasks(res.data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await sheetsApi.tasks.create(data)
    if (res.success) { toast.success('Tapşırıq yaradıldı'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<Task>) => {
    const res = await sheetsApi.tasks.update(id, data)
    if (res.success) { toast.success('Tapşırıq yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await sheetsApi.tasks.delete(id)
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
    const res = await sheetsApi.team.getAll()
    if (res.success && res.data) setMembers(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = async (data: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const res = await sheetsApi.team.create(data)
    if (res.success) { toast.success('Üzv əlavə edildi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const update = async (id: string, data: Partial<TeamMember>) => {
    const res = await sheetsApi.team.update(id, data)
    if (res.success) { toast.success('Üzv yeniləndi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  const remove = async (id: string) => {
    const res = await sheetsApi.team.delete(id)
    if (res.success) { toast.success('Üzv silindi'); await fetch() }
    else toast.error(res.error || 'Xəta baş verdi')
    return res
  }

  return { members, loading, refresh: fetch, create, update, remove }
}

// Batch load for dashboard - single API call
export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const res = await sheetsApi.batch.getAll()
      if (res.success && res.data) {
        const { projects = [], tasks = [], team = [], activity = [] } = res.data
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
        setActivities(activity.slice(0, 20))
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  return { stats, activities, loading }
}

// For forms - get team member names
export function useTeamNames() {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    sheetsApi.team.getAll().then(res => {
      if (res.success && res.data) setNames(res.data.map(m => m.name))
    })
  }, [])
  return names
}
