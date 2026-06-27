'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { aiGenerate } from '@/lib/ai'
import toast from 'react-hot-toast'

interface AIWriteButtonProps {
  /** Builds the payload for the description generation (called at click time). */
  getContext: () => Record<string, unknown>
  onResult: (text: string) => void
  /** Disable when there isn't enough context yet (e.g. empty title). */
  disabled?: boolean
}

/** Small inline button that generates a description via AI and fills the field. */
export function AIWriteButton({ getContext, onResult, disabled }: AIWriteButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const ctx = getContext()
      const text = await aiGenerate('description', ctx, {
        instruction: (ctx.name || ctx.title || '') as string,
      })
      onResult(text.trim())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI mətn yarada bilmədi')
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, padding: '4px 10px',
        borderRadius: 8, cursor: disabled || loading ? 'default' : 'pointer',
        color: '#8B5CF6', background: 'rgba(139,92,246,0.10)',
        border: '1px solid rgba(139,92,246,0.22)',
        opacity: disabled ? 0.5 : 1,
      }}
      title="AI ilə təsvir yaz"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
      AI ilə yaz
    </button>
  )
}
