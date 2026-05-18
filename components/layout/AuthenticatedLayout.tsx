'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import toast from 'react-hot-toast'

function WorkspaceSetup() {
  const { runSetup, setNeedsSetup, refresh } = useWorkspace()
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    try {
      const wsId = await runSetup(name.trim() || undefined)
      if (wsId) {
        setNeedsSetup(false)
        router.push('/')
      } else {
        // Fallback: force refresh and check again
        await refresh()
        setNeedsSetup(false)
        router.push('/')
      }
    } catch {
      toast.error('Xəta baş verdi, yenidən cəhd edin')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 40,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--primary-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: 'var(--primary)' }}>
            workspaces
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>
            Xoş gəldiniz!
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted-2)', margin: 0, lineHeight: 1.6 }}>
            Başlamaq üçün bir iş sahəsi yaradın. Bütün layihə və tapşırıqlarınız burada toplanacaq.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) handleCreate() }}
            placeholder="İş sahəsinin adı (məs. PMO, Marketing...)"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 24px',
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Yaradılır...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>rocket_launch</span>
                İş sahəsi yarat
              </>
            )}
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted-2)', margin: 0 }}>
          Mövcud məlumatlarınız avtomatik bu iş sahəsinə köçürüləcək
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { loading: wsLoading, needsSetup } = useWorkspace()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  const loading = authLoading || (!!user && !isLoginPage && wsLoading)

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

  if (isLoginPage || !user) {
    return <>{children}</>
  }

  if (needsSetup) {
    return <WorkspaceSetup />
  }

  return (
    <div className="appM">
      <Sidebar />
      <main className="mainM">
        <TopBar />
        {children}
      </main>
      <GlobalSearch />
    </div>
  )
}
