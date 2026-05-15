'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import { Project, Task } from '@/lib/types'
import { Search, FolderKanban, CheckSquare, X, ArrowRight, Loader2, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'project' | 'task'
  id: string
  title: string
  subtitle?: string
  href: string
  color?: string
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-blue/30 text-accent-blue rounded px-0.5 not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dataFetched = useRef(false)

  const fetchData = useCallback(async () => {
    if (dataFetched.current) return
    setDataLoading(true)
    dataFetched.current = true
    const [pRes, tRes] = await Promise.all([
      db.projects.getAll(),
      db.tasks.getAll(),
    ])
    if (pRes.success && pRes.data) setProjects(pRes.data)
    if (tRes.success && tRes.data) setTasks(tRes.data)
    setDataLoading(false)
  }, [])

  // Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened + fetch data
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      fetchData()
    } else {
      setQuery('')
      setCursor(0)
    }
  }, [open, fetchData])

  // Compute filtered results
  const results: SearchResult[] = []
  const q = query.trim().toLowerCase()

  if (q.length >= 1) {
    const matchedProjects = projects
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map<SearchResult>(p => ({
        type: 'project',
        id: p.id,
        title: p.name,
        subtitle: p.description || p.status,
        href: `/projects/${p.id}`,
        color: p.color,
      }))

    const matchedTasks = tasks
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map<SearchResult>(t => ({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: t.projectName || t.description,
        href: `/projects/${t.projectId}`,
      }))

    results.push(...matchedProjects, ...matchedTasks)
  }

  const projectResults = results.filter(r => r.type === 'project')
  const taskResults = results.filter(r => r.type === 'task')
  const allResults = [...projectResults, ...taskResults]

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = allResults[cursor]
      if (selected) navigate(selected.href)
    }
  }

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-result-item]')
    items[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {dataLoading
            ? <Loader2 size={18} className="text-text-muted animate-spin flex-shrink-0" />
            : <Search size={18} className="text-text-muted flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Layihə və tapşırıq axtar..."
            className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-all"
            >
              <X size={13} />
            </button>
          )}
          <kbd
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-muted flex-shrink-0"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {!q ? (
            /* Empty state - show hint */
            <div className="py-12 text-center space-y-3">
              <div
                className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <Search size={20} className="text-text-muted opacity-60" />
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium">Axtarışa başlayın</p>
                <p className="text-text-muted text-xs mt-1">Layihə və tapşırıq adı yazın</p>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted mt-2">
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <Command size={9} className="inline" /> K
                </kbd>
                <span>ilə açıb bağlaya bilərsiniz</span>
              </div>
            </div>
          ) : allResults.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-secondary text-sm font-medium">Nəticə tapılmadı</p>
              <p className="text-text-muted text-xs mt-1">&ldquo;{query}&rdquo; üçün heç bir nəticə yoxdur</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Projects section */}
              {projectResults.length > 0 && (
                <div>
                  <div className="px-4 py-2">
                    <span className="section-label flex items-center gap-1.5">
                      <FolderKanban size={10} /> Layihələr
                      <span className="ml-1 text-text-muted normal-case tracking-normal font-normal">({projectResults.length})</span>
                    </span>
                  </div>
                  {projectResults.map((result, i) => {
                    const globalIdx = i
                    const isActive = cursor === globalIdx
                    return (
                      <button
                        key={result.id}
                        data-result-item
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setCursor(globalIdx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-all group',
                          isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        )}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: result.color || '#3B82F6' }}
                        >
                          {result.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary text-sm font-medium truncate">
                            {highlightMatch(result.title, query)}
                          </div>
                          {result.subtitle && (
                            <div className="text-text-muted text-xs truncate mt-0.5">
                              {highlightMatch(result.subtitle, query)}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={13} className={cn('text-text-muted flex-shrink-0 transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Tasks section */}
              {taskResults.length > 0 && (
                <div className={cn(projectResults.length > 0 && 'border-t mt-1 pt-1')} style={projectResults.length > 0 ? { borderColor: 'var(--border)' } : {}}>
                  <div className="px-4 py-2">
                    <span className="section-label flex items-center gap-1.5">
                      <CheckSquare size={10} /> Tapşırıqlar
                      <span className="ml-1 text-text-muted normal-case tracking-normal font-normal">({taskResults.length})</span>
                    </span>
                  </div>
                  {taskResults.map((result, i) => {
                    const globalIdx = projectResults.length + i
                    const isActive = cursor === globalIdx
                    return (
                      <button
                        key={result.id}
                        data-result-item
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setCursor(globalIdx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-all group',
                          isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        )}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        >
                          <CheckSquare size={13} className="text-accent-purple" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary text-sm font-medium truncate">
                            {highlightMatch(result.title, query)}
                          </div>
                          {result.subtitle && (
                            <div className="text-text-muted text-xs truncate mt-0.5">
                              {highlightMatch(result.subtitle, query)}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={13} className={cn('text-text-muted flex-shrink-0 transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {allResults.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 border-t text-[11px] text-text-muted"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>↑↓</kbd>
              naviqasiya
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>↵</kbd>
              keç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>ESC</kbd>
              bağla
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Trigger button for sidebar
export function GlobalSearchTrigger({ collapsed }: { collapsed?: boolean }) {
  const handleClick = () => {
    // Dispatch a fake Ctrl+K to open the search
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  }

  return (
    <button
      onClick={handleClick}
      title="Axtar (Ctrl+K)"
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-text-secondary hover:text-text-primary w-full',
        collapsed && 'justify-center px-0 mx-auto w-10 h-10'
      )}
      style={{ background: 'var(--surface-1)' }}
    >
      <Search size={18} className="flex-shrink-0" />
      {!collapsed && (
        <span className="flex-1 text-left text-sm font-medium text-text-muted">Axtar...</span>
      )}
      {!collapsed && (
        <kbd
          className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-text-muted"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          ⌃K
        </kbd>
      )}
      {collapsed && (
        <div
          className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
          style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
        >
          Axtar (Ctrl+K)
        </div>
      )}
    </button>
  )
}
