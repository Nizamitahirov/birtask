export interface Workspace {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'Planlaşdırılır' | 'Davam edir' | 'Tamamlandı' | 'Dayandırıldı'
export type TaskStatus = 'Gözləyir' | 'Davam edir' | 'Yoxlanılır' | 'Tamamlandı'
export type Priority = 'Aşağı' | 'Orta' | 'Yüksək' | 'Kritik'

export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  startDate: string
  endDate: string
  budget: string
  owner: string
  color: string
  progress: number | string
  createdAt: string
}

export interface Task {
  id: string
  workspaceId: string
  projectId: string
  projectName: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assignee: string
  dueDate: string
  tags: string
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  workspaceId: string
  name: string
  email: string
  role: string
  department: string
  phone: string
  avatar: string
  createdAt: string
}

export interface Activity {
  id: string
  type: 'create' | 'update' | 'delete' | 'complete'
  message: string
  entityId: string
  entityType: 'project' | 'task' | 'team'
  userId: string
  createdAt: string
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  teamSize: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  role: UserRole
  department: string
  passwordHash: string
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface Comment {
  id: string
  entityType: 'project' | 'task'
  entityId: string
  userId: string
  userDisplayName: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface ActivityLog {
  id: string
  workspaceId?: string
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'complete' | 'comment'
  entityType: 'project' | 'task' | 'team' | 'user' | 'comment'
  entityId: string
  entityName: string
  userId: string
  userDisplayName: string
  changes?: Record<string, { from: unknown; to: unknown }>
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: 'task_assigned' | 'comment_added' | 'project_updated' | 'task_due_soon' | 'task_overdue'
  title: string
  message: string
  entityType: 'project' | 'task'
  entityId: string
  read: boolean
  createdAt: string
}

export interface TimeEntry {
  id: string
  workspaceId?: string
  taskId: string
  projectId: string
  userId: string
  userDisplayName: string
  description: string
  startTime: string
  endTime?: string
  durationMinutes?: number
  createdAt: string
}

export interface RecurringTask {
  id: string
  workspaceId?: string
  projectId: string
  title: string
  description: string
  priority: Priority
  assignee: string
  tags: string
  recurrence: 'daily' | 'weekly' | 'monthly'
  nextDueDate: string
  isActive: boolean
  createdAt: string
}
