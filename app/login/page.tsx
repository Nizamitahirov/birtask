'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, Eye, EyeOff, AlertCircle, Loader2, Lock, User } from 'lucide-react'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px 11px 40px',
  borderRadius: 12,
  border: '1.5px solid var(--border)',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'Montserrat, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  color: 'var(--ink)',
  background: 'var(--surface)',
  transition: 'border-color .15s, box-shadow .15s',
}

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  // Redirect to main app if already authenticated
  useEffect(() => {
    if (!authLoading && user) router.replace('/')
  }, [user, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (result.success) {
      // Always redirect to /; AuthenticatedLayout handles mustChangePassword
      router.replace('/')
    } else {
      setError(result.error || 'Giriş zamanı xəta baş verdi')
    }
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'rgb(var(--bg-primary))',
      }}>
        <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--surface) inset !important;
          -webkit-text-fill-color: var(--ink) !important;
          caret-color: var(--ink) !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-card { animation: fadeInUp .35s cubic-bezier(.2,.7,.1,1) both; }
        .login-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px var(--primary-soft) !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgb(var(--bg-primary))',
        position: 'relative',
      }}>
        {/* Background glow */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: -160, left: -160,
            width: 400, height: 400, borderRadius: '50%', opacity: 0.25,
            background: 'radial-gradient(circle, rgba(91,91,245,0.25) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: -160, right: -160,
            width: 400, height: 400, borderRadius: '50%', opacity: 0.2,
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          }} />
        </div>

        <div className="login-card" style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
          <div style={{
            borderRadius: 24,
            padding: '36px 32px 32px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(15,17,41,0.14), 0 4px 16px rgba(15,17,41,0.06)',
          }}>
            {/* Brand */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, #5B5BF5 0%, #8B5CF6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
                boxShadow: '0 8px 24px rgba(91,91,245,0.35)',
              }}>
                <Zap size={24} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', margin: 0 }}>
                BirTask
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                Layihə İdarəetmə Platforması
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Username */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, color: 'var(--muted)',
                  marginBottom: 7, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  İstifadəçi adı
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--muted)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="İstifadəçi adınızı daxil edin"
                    required
                    autoComplete="username"
                    autoFocus
                    className="login-input"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, color: 'var(--muted)',
                  marginBottom: 7, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  Şifrə
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--muted)',
                    pointerEvents: 'none',
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Şifrənizi daxil edin"
                    required
                    autoComplete="current-password"
                    className="login-input"
                    style={{ ...INPUT_STYLE, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--muted)', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: '#EF4444',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: loading || !username || !password
                    ? 'var(--surface-3)'
                    : 'linear-gradient(135deg, #5B5BF5 0%, #8B5CF6 100%)',
                  color: loading || !username || !password ? 'var(--muted)' : '#fff',
                  border: 'none',
                  fontSize: 14, fontWeight: 700,
                  cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading || !username || !password
                    ? 'none'
                    : '0 4px 16px rgba(91,91,245,0.35)',
                  fontFamily: 'Montserrat, sans-serif',
                  marginTop: 4,
                  transition: 'filter .15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = '' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />
                    Giriş edilir...
                  </>
                ) : 'Daxil ol'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 16 }}>
            BirTask v1.0 — Firebase ilə işləyir
          </p>
        </div>
      </div>
    </>
  )
}
