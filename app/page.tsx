'use client'

import { useDashboard } from '@/hooks/useSheets'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import {
  FolderKanban, CheckSquare, Users, AlertCircle,
  TrendingUp, Clock, Award, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { stats, activities, loading } = useDashboard()

  const completionRate = stats
    ? stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
    : 0

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">İdarə Paneli</h1>
          <p className="text-text-secondary text-sm mt-1">
            {new Date().toLocaleDateString('az-AZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-text-secondary text-xs">Google Sheets ilə sinxron</span>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Ümumi Layihə"
            value={stats?.totalProjects ?? 0}
            subtitle={`${stats?.activeProjects ?? 0} aktiv`}
            icon={FolderKanban}
            color="blue"
          />
          <StatsCard
            title="Tapşırıqlar"
            value={stats?.totalTasks ?? 0}
            subtitle={`${stats?.completedTasks ?? 0} tamamlandı`}
            icon={CheckSquare}
            color="purple"
          />
          <StatsCard
            title="Komanda"
            value={stats?.teamSize ?? 0}
            subtitle="aktiv üzv"
            icon={Users}
            color="cyan"
          />
          <StatsCard
            title="Gecikmiş"
            value={stats?.overdueTasks ?? 0}
            subtitle="tapşırıq"
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-accent-blue" />
              Ümumi İrəliləyiş
            </h2>
            <Link href="/projects" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              Hamısı <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressRow
                label="Layihə tamamlanma"
                value={stats?.completedProjects ?? 0}
                total={stats?.totalProjects ?? 1}
                color="#3B82F6"
              />
              <ProgressRow
                label="Tapşırıq tamamlanma"
                value={stats?.completedTasks ?? 0}
                total={stats?.totalTasks ?? 1}
                color="#8B5CF6"
              />
              <ProgressRow
                label="Aktiv layihələr"
                value={stats?.activeProjects ?? 0}
                total={stats?.totalProjects ?? 1}
                color="#06B6D4"
              />
            </div>
          )}

          {/* Big completion rate */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#3B82F6" strokeWidth="2"
                  strokeDasharray={`${completionRate} ${100 - completionRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-text-primary">{completionRate}%</span>
              </div>
            </div>
            <div>
              <div className="text-text-primary font-semibold">Ümumi tamamlanma</div>
              <div className="text-text-muted text-sm">{stats?.completedTasks}/{stats?.totalTasks} tapşırıq</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <QuickStatCard
            icon={Award}
            label="Tamamlanan layihələr"
            value={stats?.completedProjects ?? 0}
            color="text-accent-green"
            bg="bg-accent-green/10"
            loading={loading}
          />
          <QuickStatCard
            icon={Clock}
            label="Gecikmiş tapşırıqlar"
            value={stats?.overdueTasks ?? 0}
            color="text-accent-red"
            bg="bg-accent-red/10"
            loading={loading}
          />
          <QuickStatCard
            icon={CheckSquare}
            label="Yoxlanılır"
            value={0}
            color="text-accent-yellow"
            bg="bg-accent-yellow/10"
            loading={loading}
          />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Clock size={18} className="text-accent-purple" />
            Son Aktivliklər
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ActivityFeed activities={activities} />
        )}
      </div>
    </div>
  )
}

function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-text-secondary text-sm">{label}</span>
        <span className="text-text-primary text-sm font-medium">{pct}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-text-muted text-xs mt-1">{value} / {total}</div>
    </div>
  )
}

function QuickStatCard({
  icon: Icon, label, value, color, bg, loading
}: {
  icon: typeof Award; label: string; value: number
  color: string; bg: string; loading: boolean
}) {
  if (loading) return <Skeleton className="h-20 rounded-2xl" />
  return (
    <div className="card p-4 flex items-center gap-4 hover:border-white/[0.12] transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <div className="text-xl font-bold text-text-primary">{value}</div>
        <div className="text-text-secondary text-xs">{label}</div>
      </div>
    </div>
  )
}
