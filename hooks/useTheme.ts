'use client'

import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('birtask-theme') as 'dark' | 'light') || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('birtask-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return { theme, toggle }
}
