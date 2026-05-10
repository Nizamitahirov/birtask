import { Project, Task, TeamMember, Activity, ApiResponse } from './types'

const API_BASE = '/api/sheets'

async function callApi<T>(action: string, method: string = 'GET', data?: object): Promise<ApiResponse<T>> {
  try {
    if (method === 'GET') {
      const params = new URLSearchParams({ action })
      if (data) {
        Object.entries(data).forEach(([k, v]) => params.set(k, String(v)))
      }
      const res = await fetch(`${API_BASE}?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      return json
    } else {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })
      const json = await res.json()
      return json
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinməyən xəta'
    return { success: false, error: message }
  }
}

interface BatchData {
  projects: Project[]
  tasks: Task[]
  team: TeamMember[]
  activity: Activity[]
}

export const sheetsApi = {
  projects: {
    getAll: () => callApi<Project[]>('getProjects'),
    getById: (id: string) => callApi<Project>('getProject', 'GET', { id }),
    create: (data: Omit<Project, 'id' | 'createdAt'>) =>
      callApi<Project>('createProject', 'POST', { ...data }),
    update: (id: string, data: Partial<Project>) =>
      callApi<Project>('updateProject', 'POST', { id, ...data }),
    delete: (id: string) => callApi<void>('deleteProject', 'POST', { id }),
  },
  tasks: {
    getAll: (projectId?: string) =>
      callApi<Task[]>('getTasks', 'GET', projectId ? { projectId } : undefined),
    getById: (id: string) => callApi<Task>('getTask', 'GET', { id }),
    create: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      callApi<Task>('createTask', 'POST', { ...data }),
    update: (id: string, data: Partial<Task>) =>
      callApi<Task>('updateTask', 'POST', { id, ...data }),
    delete: (id: string) => callApi<void>('deleteTask', 'POST', { id }),
  },
  team: {
    getAll: () => callApi<TeamMember[]>('getTeam'),
    create: (data: Omit<TeamMember, 'id' | 'createdAt'>) =>
      callApi<TeamMember>('createMember', 'POST', { ...data }),
    update: (id: string, data: Partial<TeamMember>) =>
      callApi<TeamMember>('updateMember', 'POST', { id, ...data }),
    delete: (id: string) => callApi<void>('deleteMember', 'POST', { id }),
  },
  activity: {
    getAll: () => callApi<Activity[]>('getActivity'),
  },
  batch: {
    getAll: () => callApi<BatchData>('getBatch'),
  },
  setup: {
    init: () => callApi<void>('initSheet', 'POST', {}),
    importData: () => callApi<void>('importExcelData', 'POST', {}),
  },
}

