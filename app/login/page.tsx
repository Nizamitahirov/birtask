'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, Eye, EyeOff, AlertCircle, Loader2, Lock, User, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Password change state
  const [mustChange, setMustChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [changeError, setChangeError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/')
    }
  }, [user, authLoading, router])

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-primary))' }}>
        <Loader2 size={32} className="text-accent-blue animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'rgb(var(--bg-primary))' }}
    >
      {/* Subtle mesh background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgb(var(--bg-card))',
            border: '1px solid var(--border)',
          }}
        >
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center mb-4 shadow-glow-blue">
              <Zap size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">BirTask</h1>
            <p className="text-text-muted text-sm mt-1">Layihə İdarəetmə Platforması</p>
          </div>

          {!mustChange ? (
            /* Login form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  İstifadəçi adı
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="input pl-9 w-full"
                    placeholder="username"
                    required
                    autoComplete="username"
                    autoFocus
                    style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Şifrə
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pl-9 pr-10 w-full"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Giriş edilir...
                  </>
                ) : 'Daxil ol'}
              </button>
            </form>
          ) : (
            /* Must change password form */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20 mb-2">
                <KeyRound size={16} className="text-accent-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-text-primary text-sm font-medium">Şifrənizi dəyişdirin</div>
                  <div className="text-text-secondary text-xs mt-0.5">
                    İlk daxil olma üçün yeni şifrə təyin etməlisiniz.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Yeni şifrə
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input pl-9 pr-10 w-full"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoFocus
                    style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Şifrəni təsdiqlə
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input pl-9 pr-10 w-full"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {changeError && (
                <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={changingPw}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {changingPw ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Yenilənir...
                  </>
                ) : 'Şifrəni təsdiqlə'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          BirTask v1.0.0 — Firebase ilə işləyir
        </p>
      </div>
    </div>
  )
}
