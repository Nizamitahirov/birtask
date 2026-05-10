import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Priority, ProjectStatus, TaskStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(2)
    return `${dd}.${mm}.${yy}`
  } catch {
    return dateStr
  }
}

export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function getDaysLeft(dateStr: string): number {
  if (!dateStr) return 0
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const STATUS_COLORS: Record<ProjectStatus | TaskStatus, string> = {
  'Planlaşdırılır': 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20',
  'Davam edir': 'text-accent-blue bg-accent-blue/10 border-accent-blue/20',
  'Tamamlandı': 'text-accent-green bg-accent-green/10 border-accent-green/20',
  'Dayandırıldı': 'text-text-secondary bg-white/5 border-white/10',
  'Gözləyir': 'text-text-secondary bg-white/5 border-white/10',
  'Yoxlanılır': 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  'Aşağı': 'text-text-secondary',
  'Orta': 'text-accent-cyan',
  'Yüksək': 'text-accent-yellow',
  'Kritik': 'text-accent-red',
}

export const PRIORITY_DOT: Record<Priority, string> = {
  'Aşağı': 'bg-text-muted',
  'Orta': 'bg-accent-cyan',
  'Yüksək': 'bg-accent-yellow',
  'Kritik': 'bg-accent-red',
}

export const PROJECT_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981',
  '#F59E0B', '#EC4899', '#EF4444', '#F97316',
]

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateProgress(tasks: { status: string }[]): number {
  if (!tasks.length) return 0
  const done = tasks.filter(t => t.status === 'Tamamlandı').length
  return Math.round((done / tasks.length) * 100)
}
