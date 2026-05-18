'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, Eye, EyeOff, AlertCircle, Loader2, Lock, User, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react'

// ── Autofill-safe input style (overrides browser yellow/blue bg) ──────────────
const INPUT_AUTOFILL_FIX: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--ink)',
  WebkitBoxShadow: '0 0 0 1000px transparent inset',
  WebkitTextFillColor: 'var(--ink)',
  transition: 'background-color 9999s ease-in-out 0s',
}

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [username, setUsername]           = useState('')
  const [password, setPassword]           = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  // Password change modal state
  const [mustChange, setMustChange]       = useState(false)
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [changingPw, setChangingPw]       = useState(false)
  const [changeError, setChangeError]     = useState('')
  const [pwStrength, setPwStrength]       = useState(0)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) router.replace('/')
  }, [user, authLoading, router])

  // Password strength scorer
  useEffect(() => {
    if (!newPassword) { setPwStrength(0); return }
    let score = 0
    if (newPassword.length >= 6)  score++
    if (newPassword.length >= 10) score++
    if (/[A-Z]/.test(newPassword)) score++
    if (/[0-9]/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++
    setPwStrength(score)
  }, [newPassword])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (result.success) {
      if (result.mustChangePassword) {
        setMustChange(true)
      } else {
        router.replace('/')
      }
    } else {
      setError(result.error || 'Giriş zamanı xəta baş verdi')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangeError('')
    if (newPassword.length < 6) {
      setChangeError('Şifrə ən azı 6 simvol olmalıdır')
      return
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Şifrələr uyğun gəlmir')
      return
    }
    setChangingPw(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        router.replace('/')
      } else {
        setChangeError(data.error || 'Şifrə dəyişdirilə bilmədi')
      }
    } catch {
      setChangeError('Şəbəkə xətası')
    }
    setChangingPw(false)
  }

  const pwStrengthLabel = ['', 'Çox zəif', 'Zəif', 'Orta', 'Güclü', 'Çox güclü'][pwStrength]
  const pwStrengthColor = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'][pwStrength]

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--bg-primary))' }}>
        <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      {/* Autofill override — targets webkit autofill background */}
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
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .login-card { animation: fadeInUp .35s cubic-bezier(.2,.7,.1,1) both; }
        .pw-modal-overlay { animation: overlayIn .2s ease both; }
        .pw-modal-card { animation: fadeInUp .25s cubic-bezier(.2,.7,.1,1) both; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgb(var(--bg-primary))',
          position: 'relative',
        }}
      >
        {/* Subtle background glow */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-160px', left: '-160px',
            width: '400px', height: '400px', borderRadius: '50%', opacity: 0.25,
            background: 'radial-gradient(circle, rgba(91,91,245,0.25) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-160px', right: '-160px',
            width: '400px', height: '400px', borderRadius: '50%', opacity: 0.2,
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          }} />
        </div>

        {/* Login card */}
        <div className="login-card" style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
          <div style={{
            borderRadius: 24,
            padding: '36px 32px 32px',
            boxShadow: '0 24px 64px rgba(15,17,41,0.14), 0 4px 16px rgba(15,17,41,0.06)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
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

            {/* Login form */}
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
                    style={{
                      ...INPUT_AUTOFILL_FIX,
                      width: '100%',
                      padding: '11px 14px 11px 40px',
                      borderRadius: 12,
                      border: '1.5px solid var(--border)',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color .15s, box-shadow .15s',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
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
                    style={{
                      ...INPUT_AUTOFILL_FIX,
                      width: '100%',
                      padding: '11px 44px 11px 40px',
                      borderRadius: 12,
                      border: '1.5px solid var(--border)',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color .15s, box-shadow .15s',
                    }}
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
                  transition: 'filter .15s, transform .1s',
                  boxShadow: loading || !username || !password
                    ? 'none'
                    : '0 4px 16px rgba(91,91,245,0.35)',
                  fontFamily: 'Montserrat, sans-serif',
                  marginTop: 4,
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

      {/* ── Change Password Modal ────────────────────────────────────────────── */}
      {mustChange && (
        <div
          className="pw-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(10,12,30,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="pw-modal-card"
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: '32px',
              boxShadow: '0 32px 80px rgba(10,12,30,0.35)',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: 'rgba(245,158,11,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={22} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Şifrənizi dəyişdirin
                </h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                  Hesabınıza ilk dəfə daxil olursunuz. Təhlükəsizlik üçün müvəqqəti şifrənizi dəyişdirməlisiniz.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* New password */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, color: 'var(--muted)',
                  marginBottom: 7, fontWeight: 700,
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
                    style={{
                      ...INPUT_AUTOFILL_FIX,
                      width: '100%',
                      padding: '11px 44px 11px 40px',
                      borderRadius: 12,
                      border: '1.5px solid var(--border)',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color .15s',
                    }}
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

                {/* Password strength */}
                {newPassword.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 3,
                          background: i <= pwStrength ? pwStrengthColor : 'var(--surface-3)',
                          transition: 'background .2s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: pwStrengthColor, fontWeight: 700 }}>
                      {pwStrengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, color: 'var(--muted)',
                  marginBottom: 7, fontWeight: 700,
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
                      ...INPUT_AUTOFILL_FIX,
                      width: '100%',
                      padding: '11px 44px 11px 40px',
                      borderRadius: 12,
                      border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#EF4444' : 'var(--border)'}`,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color .15s',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = confirmPassword !== newPassword ? '#EF4444' : 'var(--primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== newPassword ? '#EF4444' : 'var(--border)'
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

              {/* Password requirements */}
              <div style={{
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 10,
                fontSize: 11,
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink-2)' }}>Şifrə tələbləri:</div>
                {[
                  { text: 'Ən azı 6 simvol', met: newPassword.length >= 6 },
                  { text: 'Böyük hərf (A-Z)', met: /[A-Z]/.test(newPassword) },
                  { text: 'Rəqəm (0-9)',       met: /[0-9]/.test(newPassword) },
                ].map(r => (
                  <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: r.met ? '#10B981' : 'var(--muted-2)', fontSize: 12 }}>
                      {r.met ? '✓' : '·'}
                    </span>
                    <span style={{ color: r.met ? 'var(--ink-2)' : 'var(--muted)' }}>{r.text}</span>
                  </div>
                ))}
              </div>

              {changeError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: '#EF4444',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{changeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={changingPw || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: changingPw || !newPassword || !confirmPassword || newPassword !== confirmPassword
                    ? 'var(--surface-3)'
                    : 'linear-gradient(135deg, #5B5BF5 0%, #8B5CF6 100%)',
                  color: changingPw || !newPassword || !confirmPassword || newPassword !== confirmPassword
                    ? 'var(--muted)'
                    : '#fff',
                  border: 'none',
                  fontSize: 14, fontWeight: 700,
                  cursor: changingPw || !newPassword || !confirmPassword || newPassword !== confirmPassword
                    ? 'not-allowed'
                    : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: changingPw || newPassword !== confirmPassword
                    ? 'none'
                    : '0 4px 16px rgba(91,91,245,0.3)',
                  fontFamily: 'Montserrat, sans-serif',
                  marginTop: 4,
                  transition: 'filter .15s',
                }}
              >
                {changingPw ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />
                    Yenilənir...
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    Şifrəni təsdiqlə
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
