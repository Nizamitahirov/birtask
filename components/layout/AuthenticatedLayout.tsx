'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Workspace setup screen ────────────────────────────────────────────────────

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

// ── Force change password modal ───────────────────────────────────────────────

function ForceChangePasswordModal() {
  const { user, refresh } = useAuth()

  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [pwStrength, setPwStrength]           = useState(0)

  // Password strength
  useEffect(() => {
    if (!newPassword) { setPwStrength(0); return }
    let s = 0
    if (newPassword.length >= 6)             s++
    if (newPassword.length >= 10)            s++
    if (/[A-Z]/.test(newPassword))           s++
    if (/[0-9]/.test(newPassword))           s++
    if (/[^A-Za-z0-9]/.test(newPassword))   s++
    setPwStrength(s)
  }, [newPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) { setError('Şifrə ən az 6 simvol olmalıdır'); return }
    if (newPassword !== confirmPassword) { setError('Şifrələr uyğun gəlmir'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/force-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Şifrəniz uğurla yeniləndi')
        await refresh() // clears mustChangePassword in user context
      } else {
        setError(data.error || 'Şifrə dəyişdirilə bilmədi')
      }
    } catch {
      setError('Şəbəkə xətası. Yenidən cəhd edin.')
    }
    setLoading(false)
  }

  const strengthLabel = ['', 'Çox zəif', 'Zəif', 'Orta', 'Güclü', 'Çox güclü'][pwStrength]
  const strengthColor = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'][pwStrength]

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '11px 44px 11px 40px',
    borderRadius: 12,
    border: '1.5px solid var(--border)',
    fontSize: 14, fontWeight: 500,
    fontFamily: 'Montserrat, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    color: 'var(--ink)', background: 'var(--surface)',
    transition: 'border-color .15s, box-shadow .15s',
  }

  const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword && !loading

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pwModalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pw-force-modal { animation: pwModalIn .3s cubic-bezier(.2,.7,.1,1) both; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px var(--surface) inset !important;
          -webkit-text-fill-color: var(--ink) !important;
        }
      `}</style>

      {/* Full-screen backdrop — blocks all app interaction */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(10, 12, 30, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        <div className="pw-force-modal" style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 24,
          padding: '32px',
          boxShadow: '0 40px 100px rgba(10,12,30,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'rgba(245,158,11,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={24} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 5px', letterSpacing: '-0.02em' }}>
                Daimi şifrə təyin edin
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
                Salam, <strong style={{ color: 'var(--ink-2)' }}>{user?.displayName || user?.username}</strong>!
                Hesabınıza ilk dəfə daxil oldunuz. Müvəqqəti şifrənizi dəyişdirmədən sistemdən istifadə edə bilməzsiniz.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* New password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', marginBottom: 7,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Yeni şifrə
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--muted)',
                  pointerEvents: 'none',
                }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Yeni şifrənizi daxil edin"
                  required
                  minLength={6}
                  autoFocus
                  autoComplete="new-password"
                  style={inputBase}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 3,
                        background: i <= pwStrength ? strengthColor : 'var(--surface-3)',
                        transition: 'background .2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', marginBottom: 7,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Şifrəni təsdiqlə
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--muted)',
                  pointerEvents: 'none',
                }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Şifrəni təkrar daxil edin"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{
                    ...inputBase,
                    borderColor: confirmPassword && confirmPassword !== newPassword
                      ? '#EF4444' : 'var(--border)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = confirmPassword !== newPassword ? '#EF4444' : 'var(--primary)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== newPassword
                      ? '#EF4444' : 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <div style={{
                    position: 'absolute', right: 40, top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {confirmPassword === newPassword
                      ? <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                      : <AlertCircle size={14} style={{ color: '#EF4444' }} />
                    }
                  </div>
                )}
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: 11, color: '#EF4444', margin: '5px 0 0', fontWeight: 600 }}>
                  Şifrələr uyğun gəlmir
                </p>
              )}
            </div>

            {/* Requirements */}
            <div style={{
              padding: '10px 12px',
              background: 'var(--surface-2)',
              borderRadius: 10,
              fontSize: 11, color: 'var(--muted)', lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink-2)', fontSize: 11 }}>
                Şifrə tələbləri:
              </div>
              {[
                { text: 'Ən azı 6 simvol',  met: newPassword.length >= 6 },
                { text: 'Böyük hərf (A-Z)', met: /[A-Z]/.test(newPassword) },
                { text: 'Rəqəm (0-9)',       met: /[0-9]/.test(newPassword) },
              ].map(r => (
                <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: r.met ? '#10B981' : 'var(--muted-2)', fontWeight: 700 }}>
                    {r.met ? '✓' : '·'}
                  </span>
                  <span style={{ color: r.met ? 'var(--ink-2)' : 'var(--muted)' }}>{r.text}</span>
                </div>
              ))}
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
              disabled={!canSubmit}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                background: canSubmit
                  ? 'linear-gradient(135deg, #5B5BF5 0%, #8B5CF6 100%)'
                  : 'var(--surface-3)',
                color: canSubmit ? '#fff' : 'var(--muted)',
                border: 'none',
                fontSize: 14, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: canSubmit ? '0 4px 16px rgba(91,91,245,0.3)' : 'none',
                fontFamily: 'Montserrat, sans-serif',
                marginTop: 4,
                transition: 'filter .15s',
              }}
              onMouseEnter={e => { if (canSubmit) e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = '' }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />
                  Yenilənir...
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  Şifrəni təsdiqlə və daxil ol
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

// ── Authenticated layout ──────────────────────────────────────────────────────

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
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--primary-soft)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (isLoginPage || !user) return <>{children}</>

  if (needsSetup) return <WorkspaceSetup />

  return (
    <div className="appM">
      <Sidebar />
      <main className="mainM">
        <TopBar />
        {children}
      </main>
      <GlobalSearch />

      {/* Block access until password is changed */}
      {user.mustChangePassword && <ForceChangePasswordModal />}
    </div>
  )
}
