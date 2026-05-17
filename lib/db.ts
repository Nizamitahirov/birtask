import {
  Project,
  Task,
  TeamMember,
  ApiResponse,
  Comment,
  ActivityLog,
  Notification,
  User,
  TimeEntry,
  RecurringTask,
  Workspace,
} from './types'

const API_BASE = '/api/db'

async function callApi<T>(
  path: string,
  method: string = 'GET',
  data?: object
): Promise<ApiResponse<T>> {
  try {
    if (method === 'GET') {
      const params = data
        ? '?' +
          new URLSearchParams(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          )
        : ''
      const res = await fetch(`${API_BASE}${path}${params}`, {
        cache: 'no-store',
      })
      return res.json()
    } else {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinməyən xəta',
    }
  }
}

export const db = {
  workspaces: {
    getAll: () => callApi<Workspace[]>('/workspaces'),
    getById: (id: string) => callApi<Workspace>(`/workspaces/${id}`),
    create: (data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) =>
      callApi<Workspace>('/workspaces', 'POST', data),
    update: (id: string, data: Partial<Workspace>) =>
      callApi<Workspace>(`/workspaces/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/workspaces/${id}`, 'DELETE'),
    setup: (data: { name?: string; color?: string; ownerId?: string }) =>
      callApi<{ workspaceId: string; migrated: number }>('/workspaces/setup', 'POST', data),
  },
  projects: {
    getAll: (workspaceId?: string) =>
      callApi<Project[]>('/projects', 'GET', workspaceId ? { workspaceId } : undefined),
    getById: (id: string) => callApi<Project>(`/projects/${id}`),
    create: (data: Omit<Project, 'id' | 'createdAt'>) =>
      callApi<Project>('/projects', 'POST', data),
    update: (id: string, data: Partial<Project>) =>
      callApi<Project>(`/projects/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/projects/${id}`, 'DELETE'),
  },
  tasks: {
    getAll: (projectId?: string, workspaceId?: string) =>
      callApi<Task[]>('/tasks', 'GET', { ...(workspaceId ? { workspaceId } : {}), ...(projectId ? { projectId } : {}) }),
    getById: (id: string) => callApi<Task>(`/tasks/${id}`),
    create: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      callApi<Task>('/tasks', 'POST', data),
    update: (id: string, data: Partial<Task>) =>
      callApi<Task>(`/tasks/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/tasks/${id}`, 'DELETE'),
    relink: () => callApi<{ relinked: number; total: number }>('/tasks/relink', 'POST'),
  },
  team: {
    getAll: (workspaceId?: string) =>
      callApi<TeamMember[]>('/team', 'GET', workspaceId ? { workspaceId } : undefined),
    create: (data: Omit<TeamMember, 'id' | 'createdAt'>) =>
      callApi<TeamMember>('/team', 'POST', data),
    update: (id: string, data: Partial<TeamMember>) =>
      callApi<TeamMember>(`/team/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/team/${id}`, 'DELETE'),
  },
  comments: {
    getAll: (entityType: string, entityId: string) =>
      callApi<Comment[]>('/comments', 'GET', { entityType, entityId }),
    create: (data: Omit<Comment, 'id' | 'createdAt'>) =>
      callApi<Comment>('/comments', 'POST', data),
    delete: (id: string) => callApi<void>(`/comments/${id}`, 'DELETE'),
  },
  activity: {
    getAll: (workspaceId?: string) =>
      callApi<ActivityLog[]>('/activity', 'GET', workspaceId ? { workspaceId } : undefined),
  },
  notifications: {
    getAll: (userId: string) =>
      callApi<Notification[]>('/notifications', 'GET', { userId }),
    markRead: (id: string) =>
      callApi<void>(`/notifications/${id}/read`, 'PUT'),
    markAllRead: (userId: string) =>
      callApi<void>('/notifications/read-all', 'PUT', { userId }),
  },
  users: {
    getAll: () => callApi<User[]>('/users'),
    getById: (id: string) => callApi<User>(`/users/${id}`),
    create: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
      callApi<User>('/users', 'POST', data),
    update: (id: string, data: Partial<User>) =>
      callApi<User>(`/users/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/users/${id}`, 'DELETE'),
  },
  timeEntries: {
    getAll: (filter?: { taskId?: string; projectId?: string; userId?: string }) =>
      callApi<TimeEntry[]>('/time-entries', 'GET', filter),
    create: (data: Omit<TimeEntry, 'id' | 'createdAt'>) =>
      callApi<TimeEntry>('/time-entries', 'POST', data),
    update: (id: string, data: Partial<TimeEntry>) =>
      callApi<TimeEntry>(`/time-entries/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/time-entries/${id}`, 'DELETE'),
  },
  recurringTasks: {
    getAll: (projectId?: string) =>
      callApi<RecurringTask[]>('/recurring-tasks', 'GET', projectId ? { projectId } : undefined),
    create: (data: Omit<RecurringTask, 'id' | 'createdAt'>) =>
      callApi<RecurringTask>('/recurring-tasks', 'POST', data),
    update: (id: string, data: Partial<RecurringTask>) =>
      callApi<RecurringTask>(`/recurring-tasks/${id}`, 'PUT', data),
    delete: (id: string) => callApi<void>(`/recurring-tasks/${id}`, 'DELETE'),
    generate: (id: string) => callApi<Task>(`/recurring-tasks/${id}/generate`, 'POST'),
  },
}
