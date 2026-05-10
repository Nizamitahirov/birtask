'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (val: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({ options, value, onChange, placeholder = 'Seçin...', className }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }

  const remove = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== opt))
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div
        onClick={() => setOpen(!open)}
        className="min-h-[42px] bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 flex flex-wrap gap-1.5 cursor-pointer hover:border-accent-blue/40 transition-all"
      >
        {value.length === 0 && (
          <span className="text-text-muted text-sm self-center">{placeholder}</span>
        )}
        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs px-2 py-0.5 rounded-lg">
            {v}
            <button type="button" onClick={e => remove(v, e)} className="hover:text-white transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        <ChevronDown size={14} className={cn('ml-auto self-center text-text-muted transition-transform flex-shrink-0', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-bg-card border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-text-muted text-sm">Komanda üzvü yoxdur</div>
          ) : (
            options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-sm text-text-primary text-left"
              >
                <div className={cn(
                  'w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
                  value.includes(opt)
                    ? 'bg-accent-blue border-accent-blue'
                    : 'border-white/20'
                )}>
                  {value.includes(opt) && <Check size={10} className="text-white" />}
                </div>
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
