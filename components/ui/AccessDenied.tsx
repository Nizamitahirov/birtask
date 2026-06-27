'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export function AccessDenied({
  title = 'Giriş icazəniz yoxdur',
  message = 'Bu bölməyə baxmaq üçün lazımi icazəniz yoxdur. Giriş tələb olunarsa, iş sahəsi adminizə müraciət edin.',
  compact = false,
}: {
  title?: string
  message?: string
  /** Render inline (inside an existing page) rather than full-height. */
  compact?: boolean
}) {
  return (
    <div
      style={{
        minHeight: compact ? 280 : '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldAlert size={34} style={{ color: '#EF4444' }} />
      </div>
      <div style={{ maxWidth: 380 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--muted-2)', margin: 0, lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
      {!compact && (
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 12,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>space_dashboard</span>
          İdarə panelinə qayıt
        </Link>
      )}
    </div>
  )
}
