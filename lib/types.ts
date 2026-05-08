export type ProjectStatus = 'Planlaşdırılır' | 'Davam edir' | 'Tamamlandı' | 'Dayandırıldı'
export type TaskStatus = 'Gözləyir' | 'Davam edir' | 'Yoxlanılır' | 'Tamamlandı'
export type Priority = 'Aşağı' | 'Orta' | 'Yüksək' | 'Kritik'

export interface Project {
  id: string
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
