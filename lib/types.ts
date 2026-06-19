export type PermissionKey =
  | 'projects.view' | 'projects.create' | 'projects.edit' | 'projects.delete'
  | 'tasks.view' | 'tasks.create' | 'tasks.edit' | 'tasks.delete' | 'tasks.assign' | 'tasks.complete'
  | 'team.view' | 'team.invite' | 'team.edit' | 'team.remove'
  | 'analytics.view' | 'reports.export'
  | 'time.view' | 'time.log' | 'time.manage'
  | 'workflows.view' | 'workflows.manage'
  | 'activity.view' | 'calendar.view' | 'roadmap.view' | 'recurring.view' | 'recurring.manage'
  | 'settings.view' | 'settings.workspace' | 'settings.users' | 'settings.roles'

export interface Role {
  id: string
  name: string
  description?: string
  color?: string
  permissions: PermissionKey[]
  isSystem: boolean
  workspaceId: string
  createdAt: string
  updatedAt?: string
}

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
  division?: string
  section?: string
  position?: string
  phone: string
  avatar: string
  personalCode?: string
  finCode?: string
  company?: string
  managerId?: string
  functionalManagerId?: string
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
  memberId?: string        // linked TeamMember.id
  workspaceIds?: string[]  // workspaces this user can access
  projectIds?: string[]    // explicit project access list (member/viewer)
}

export type WorkspacePermission = 'read' | 'write' | 'admin'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  userDisplayName: string
  userRole: UserRole
  permission: WorkspacePermission
  addedAt: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  userDisplayName: string
  userRole: UserRole
  permission: WorkspacePermission
  addedAt: string
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

export type WorkflowTriggerType =
  | 'task_created' | 'task_updated' | 'task_deleted' | 'task_completed' | 'task_assigned' | 'task_commented'
  | 'field_status' | 'field_due_date' | 'field_assignee' | 'field_priority'
  | 'project_created' | 'project_completed'
  | 'scheduled_interval' | 'scheduled_cron'
  | 'webhook_incoming'

export type WorkflowConditionOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'is_empty' | 'is_not_empty'
  | 'gt' | 'lt' | 'between'
  | 'before' | 'after' | 'matches_regex'

export interface WorkflowCondition {
  id: string
  field: string
  operator: WorkflowConditionOperator
  value?: string
  value2?: string
}

export type WorkflowActionType =
  | 'send_email' | 'in_app_notification' | 'outgoing_webhook'
  | 'create_task' | 'update_field' | 'add_comment' | 'add_label' | 'delay'

export interface WorkflowAction {
  id: string
  type: WorkflowActionType
  label?: string
  emailTo?: string; emailCc?: string; emailSubject?: string; emailBody?: string
  notifyMessage?: string; notifyUserIds?: string[]
  webhookUrl?: string; webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  webhookHeaders?: string; webhookBody?: string
  webhookAuthType?: 'none' | 'bearer' | 'api_key' | 'basic'; webhookAuthValue?: string
  newTaskName?: string; newTaskProjectId?: string; newTaskAssignee?: string
  newTaskPriority?: string; newTaskDueDate?: string; newTaskDescription?: string
  updateField?: string; updateValue?: string
  commentText?: string
  labelName?: string
  delayAmount?: number; delayUnit?: 'minutes' | 'hours' | 'days'
}

export interface WorkflowRule {
  id: string
  name: string
  description?: string
  workspaceId: string
  isActive: boolean
  triggerType: WorkflowTriggerType
  triggerConfig?: {
    scheduledInterval?: 'hourly' | 'daily' | 'weekly' | 'monthly'
    cronExpression?: string
    webhookSecret?: string
    fieldName?: string
    projectId?: string
  }
  conditions: WorkflowCondition[]
  conditionLogic: 'AND' | 'OR'
  actions: WorkflowAction[]
  runCount?: number
  successCount?: number
  failureCount?: number
  lastRunAt?: string
  lastRunStatus?: 'success' | 'failure' | 'partial'
  // Legacy fields kept for backward compat
  trigger?: string; action?: string
  emailTo?: string; emailSubject?: string; emailBody?: string
  createdAt: string
  updatedAt?: string
}

export type WorkflowRunStatus = 'running' | 'success' | 'failure' | 'partial' | 'skipped'

export interface WorkflowRunStep {
  actionId: string
  type: string
  status: 'success' | 'failure' | 'skipped'
  startedAt: string
  finishedAt: string
  durationMs: number
  result?: string
  error?: string
}

export interface WorkflowRun {
  id: string
  workflowId: string
  workflowName: string
  workspaceId: string
  status: WorkflowRunStatus
  triggerType: string
  triggerData: Record<string, unknown>
  steps: WorkflowRunStep[]
  startedAt: string
  finishedAt?: string
  durationMs?: number
  error?: string
  retriedFromRunId?: string
}
