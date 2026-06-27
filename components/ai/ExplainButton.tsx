'use client'

import { useState, ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { AIExplainModal } from './AIExplainModal'
import type { AILang } from '@/lib/ai'

interface ExplainButtonProps {
  title: string
  subtitle?: string
  fetcher: (language: AILang) => Promise<string>
  showLanguage?: boolean
  defaultLanguage?: AILang
  className?: string
  /** Custom button content; defaults to a Sparkles icon + label. */
  children?: ReactNode
  label?: string
}

export function ExplainButton({
  title,
  subtitle,
  fetcher,
  showLanguage,
  defaultLanguage,
  className = 'cta ghost',
  children,
  label = 'AI izah',
}: ExplainButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {children ?? (
          <>
            <Sparkles size={14} />
            {label}
          </>
        )}
      </button>
      <AIExplainModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        fetcher={fetcher}
        showLanguage={showLanguage}
        defaultLanguage={defaultLanguage}
      />
    </>
  )
}
