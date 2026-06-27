'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X, Copy, Check, RefreshCw, Loader2 } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import type { AILang } from '@/lib/ai'

interface AIExplainModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Produce the AI text for the given language. */
  fetcher: (language: AILang) => Promise<string>
  /** Show the AZ/EN language switch (re-runs the fetcher on change). */
  showLanguage?: boolean
  defaultLanguage?: AILang
}

export function AIExplainModal({
  open,
  onClose,
  title,
  subtitle,
  fetcher,
  showLanguage = false,
  defaultLanguage = 'az',
}: AIExplainModalProps) {
  const [lang, setLang] = useState<AILang>(defaultLanguage)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Keep the latest fetcher without making it a hook dependency (avoids re-run loops).
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(async (l: AILang) => {
    setLoading(true)
    setError('')
    setContent('')
    try {
      const text = await fetcherRef.current(l)
      setContent(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI xətası baş verdi')
    }
    setLoading(false)
  }, [])

  // Run once when the modal opens.
  useEffect(() => {
    if (open) run(lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const changeLang = (l: AILang) => {
    if (l === lang) return
    setLang(l)
    run(l)
  }

  const copy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,12,30,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="cardM w-full max-w-2xl max-h-[88vh] flex flex-col" style={{ padding: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #5B5BF5, #8B5CF6)' }}
          >
            <Sparkles size={18} style={{ color: '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-text-primary font-semibold text-sm truncate">{title}</div>
            <div className="text-text-muted text-xs truncate">{subtitle || 'Groq · Llama 3.3'}</div>
          </div>

          {showLanguage && (
            <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden mr-1">
              {(['az', 'en'] as AILang[]).map(l => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  disabled={loading}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 10px',
                    background: lang === l ? 'var(--primary)' : 'transparent',
                    color: lang === l ? '#fff' : 'var(--muted)',
                    border: 'none', cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <button onClick={copy} disabled={!content} className="icon-btn" title="Kopyala">
            {copied ? <Check size={15} style={{ color: '#10B981' }} /> : <Copy size={15} />}
          </button>
          <button onClick={() => run(lang)} disabled={loading} className="icon-btn" title="Yenidən yarat">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="icon-btn" title="Bağla"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-muted">
              <Loader2 size={26} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span className="text-sm">AI analiz edir...</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
              {error}
            </div>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
