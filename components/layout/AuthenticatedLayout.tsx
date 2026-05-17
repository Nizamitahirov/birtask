'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { GlobalSearch } from '@/components/ui/GlobalSearch'

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--primary-soft)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Login page: render children without sidebar
  if (isLoginPage || !user) {
    return <>{children}</>
  }

  // Authenticated: render with new grid shell
  return (
    <div className="appM">
      <Sidebar />
      <main className="mainM">
        {children}
      </main>
      <GlobalSearch />
    </div>
  )
}
