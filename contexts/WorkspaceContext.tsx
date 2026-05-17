'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import { Workspace } from '@/lib/types'
import { useAuth } from './AuthContext'

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  currentWorkspaceId: string | null
  setCurrentWorkspace: (ws: Workspace) => void
  loading: boolean
  refresh: () => Promise<void>
  createWorkspace: (data: { name: string; description?: string; color?: string }) => Promise<Workspace | null>
  needsSetup: boolean
  setNeedsSetup: (v: boolean) => void
  runSetup: (name?: string) => Promise<string | null>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: null,
  setCurrentWorkspace: () => {},
  loading: true,
  refresh: async () => {},
  createWorkspace: async () => null,
  needsSetup: false,
  setNeedsSetup: () => {},
  runSetup: async () => null,
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await db.workspaces.getAll()
      if (res.success && res.data) {
        const list = res.data as Workspace[]
        setWorkspaces(list)
        if (list.length === 0) {
          setNeedsSetup(true)
          setCurrentWorkspaceState(null)
        } else {
          setNeedsSetup(false)
          const savedId = typeof window !== 'undefined'
            ? localStorage.getItem('birtask-workspace-id')
            : null
          const saved = savedId ? list.find(w => w.id === savedId) : null
          const active = saved || list[0]
          setCurrentWorkspaceState(active)
          if (typeof window !== 'undefined') {
            localStorage.setItem('birtask-workspace-id', active.id)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) refresh()
  }, [user, refresh])

  const setCurrentWorkspace = (ws: Workspace) => {
    setCurrentWorkspaceState(ws)
    if (typeof window !== 'undefined') {
      localStorage.setItem('birtask-workspace-id', ws.id)
    }
  }

  const createWorkspace = async (data: { name: string; description?: string; color?: string }) => {
    const res = await db.workspaces.create({
      ...data,
      color: data.color || '#5B5BF5',
      ownerId: user?.id || '',
      memberIds: [],
    })
    if (res.success && res.data) {
      await refresh()
      return res.data as Workspace
    }
    return null
  }

  const runSetup = async (name?: string) => {
    const res = await db.workspaces.setup({
      name: name || 'Ana İş Sahəsi',
      color: '#5B5BF5',
      ownerId: user?.id || '',
    })
    if (res.success && res.data) {
      await refresh()
      return res.data.workspaceId
    }
    // If setup endpoint failed, try creating workspace directly
    const createRes = await db.workspaces.create({
      name: name || 'Ana İş Sahəsi',
      color: '#5B5BF5',
      ownerId: user?.id || '',
      memberIds: [],
    })
    if (createRes.success) {
      await refresh()
      return createRes.data?.id || null
    }
    return null
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      currentWorkspaceId: currentWorkspace?.id || null,
      setCurrentWorkspace,
      loading,
      refresh,
      createWorkspace,
      needsSetup,
      setNeedsSetup,
      runSetup,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
