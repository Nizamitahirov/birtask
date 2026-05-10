'use client'

import { Toaster } from 'react-hot-toast'
import { useTheme } from '@/hooks/useTheme'

export function ClientToaster() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: dark ? '#111827' : '#ffffff',
          color: dark ? '#F1F5F9' : '#0F172A',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: dark
            ? '0 4px 24px rgba(0,0,0,0.5)'
            : '0 4px 24px rgba(0,0,0,0.12)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: dark ? '#111827' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: dark ? '#111827' : '#ffffff',
          },
        },
      }}
    />
  )
}
